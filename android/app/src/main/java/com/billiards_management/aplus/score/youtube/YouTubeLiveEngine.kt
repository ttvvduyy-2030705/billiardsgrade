package com.aplus.score.youtube

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.util.Log
import android.util.Range
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.pedro.encoder.input.video.CameraHelper
import com.pedro.rtmp.utils.ConnectCheckerRtmp
import com.pedro.rtplibrary.rtmp.RtmpCamera2
import com.pedro.rtplibrary.view.OpenGlView

object YouTubeLiveEngine : ConnectCheckerRtmp {
  private const val TAG = "YouTubeLiveEngine"

  private var reactContext: ReactApplicationContext? = null
  private var previewView: OpenGlView? = null
  private var rtmpCamera: RtmpCamera2? = null
  private var pendingConfig: StreamConfig? = null
  private var currentFacing: Int = CameraMetadata.LENS_FACING_BACK
  private var surfaceReady: Boolean = false

  data class StreamConfig(
    val url: String,
    val width: Int,
    val height: Int,
    val fps: Int,
    val bitrate: Int,
    val audioBitrate: Int,
    val sampleRate: Int,
    val isStereo: Boolean,
    val facing: Int,
  )

  private data class VideoProfile(
    val width: Int,
    val height: Int,
    val fps: Int,
    val bitrate: Int,
  )

  private data class VideoAttempt(
    val width: Int,
    val height: Int,
    val fps: Int,
    val bitrate: Int,
    val rotation: Int,
    val label: String,
  )

  fun init(context: ReactApplicationContext) {
    reactContext = context
  }

  @Synchronized
  fun attachView(view: OpenGlView) {
    previewView = view
    view.keepScreenOn = true
    surfaceReady = false
    ensureCamera()
  }

  @Synchronized
  fun onSurfaceReady(view: OpenGlView) {
    previewView = view
    surfaceReady = true
    val camera = ensureCamera() ?: return

    try {
      replaceViewIfPossible(camera, view)
      if (pendingConfig != null) {
        startStreamInternal(pendingConfig!!)
      } else {
        ensurePreview(currentFacing)
      }
    } catch (error: Throwable) {
      Log.e(TAG, "onSurfaceReady failed", error)
      emitState("error", error.message ?: "onSurfaceReady failed")
    }
  }

  @Synchronized
  fun onSurfaceDestroyed(view: OpenGlView) {
    if (previewView !== view) return
    surfaceReady = false

    val camera = rtmpCamera ?: return
    try {
      if (camera.isOnPreview && !camera.isStreaming) {
        camera.stopPreview()
      }
    } catch (error: Throwable) {
      Log.e(TAG, "onSurfaceDestroyed stopPreview failed", error)
    }
  }

  @Synchronized
  fun detachView(view: OpenGlView) {
    if (previewView === view) {
      onSurfaceDestroyed(view)
      previewView = null
    }
  }

  @Synchronized
  fun ensurePreview(facing: Int = currentFacing) {
    currentFacing = facing
    if (!surfaceReady) {
      emitState("waiting_surface", null)
      return
    }

    val camera = ensureCamera() ?: return
    try {
      if (!camera.isStreaming && !camera.isOnPreview) {
        startPreviewSafely(camera, facing)
      }
      emitState("preview", null)
    } catch (error: Throwable) {
      Log.e(TAG, "ensurePreview failed", error)
      emitState("error", error.message ?: "ensurePreview failed")
    }
  }

  @Synchronized
  fun startStream(config: StreamConfig) {
    pendingConfig = config
    currentFacing = config.facing

    if (!surfaceReady) {
      emitState("waiting_surface", null)
      return
    }

    startStreamInternal(config)
  }

  @Synchronized
  private fun startStreamInternal(config: StreamConfig) {
    if (!surfaceReady) {
      emitState("waiting_surface", null)
      return
    }

    val camera = ensureCamera() ?: return
    try {
      if (!camera.isOnPreview && !camera.isStreaming) {
        startPreviewSafely(camera, config.facing)
      }
      if (camera.isStreaming) return

      val ctx = reactContext ?: run {
        emitState("error", "React context unavailable")
        return
      }

      val audioOk = try {
        camera.prepareAudio(
          config.audioBitrate,
          config.sampleRate,
          config.isStereo,
          false,
          false,
        )
      } catch (error: Throwable) {
        Log.e(TAG, "prepareAudio failed", error)
        false
      }

      if (!audioOk) {
        emitState(
          "error",
          "prepareAudio failed. Hãy cấp quyền micro (RECORD_AUDIO). YouTube cần 1 audio stream AAC.",
        )
        return
      }

      emitState(
        "audio_profile",
        "AAC ${config.sampleRate}Hz ${if (config.isStereo) "stereo" else "mono"} ${config.audioBitrate}",
      )

      val profiles = buildProfiles(config)
      var selectedProfile: VideoProfile? = null
      var selectedAttempt: VideoAttempt? = null
      for (profile in profiles) {
        val attempt = tryPrepareVideo(camera, ctx, profile)
        if (attempt != null) {
          selectedProfile = profile
          selectedAttempt = attempt
          break
        }
      }

      if (selectedProfile == null || selectedAttempt == null) {
        emitState("error", "prepareVideo failed for all profiles")
        return
      }

      emitState(
        "stream_rotation",
        "encoder-only selected=${selectedAttempt.rotation} ${selectedAttempt.label}",
      )

      emitState(
        "video_profile",
        "${selectedProfile.width}x${selectedProfile.height}@${selectedProfile.fps} ${selectedProfile.bitrate}",
      )

      camera.startStream(config.url)
      emitState("audio_live", "microphone audio enabled")
      emitState("starting", null)
    } catch (error: Throwable) {
      Log.e(TAG, "startStream failed", error)
      emitState("error", error.message ?: "startStream failed")
    }
  }

  private fun buildProfiles(config: StreamConfig): List<VideoProfile> {
    val requested = VideoProfile(
      width = config.width,
      height = config.height,
      fps = config.fps,
      bitrate = config.bitrate,
    )
    val safe720 = VideoProfile(1280, 720, 24, 2_500_000)
    val safe540 = VideoProfile(960, 540, 24, 1_800_000)
    val safe480 = VideoProfile(640, 480, 24, 1_200_000)

    return listOf(requested, safe720, safe540, safe480)
      .distinctBy { "${it.width}x${it.height}-${it.fps}-${it.bitrate}" }
  }

  private fun tryPrepareVideo(
    camera: RtmpCamera2,
    ctx: ReactApplicationContext,
    profile: VideoProfile,
  ): VideoAttempt? {
    val attempts = buildVideoAttempts(ctx, profile)
    attempts.forEach { attempt ->
      try {
        Log.i(
          TAG,
          "Trying video profile ${attempt.width}x${attempt.height}@${attempt.fps} bitrate=${attempt.bitrate} rotation=${attempt.rotation} (${attempt.label})",
        )
        val ok = camera.prepareVideo(
          attempt.width,
          attempt.height,
          attempt.fps,
          attempt.bitrate,
          attempt.rotation,
        )
        if (ok) {
          emitState(
            "video_attempt",
            "${attempt.width}x${attempt.height}@${attempt.fps} rot=${attempt.rotation} ${attempt.label}",
          )
          return attempt
        }
      } catch (error: Throwable) {
        Log.w(
          TAG,
          "prepareVideo failed for ${attempt.width}x${attempt.height}@${attempt.fps} rot=${attempt.rotation} (${attempt.label})",
          error,
        )
      }
    }
    return null
  }

  private fun buildVideoAttempts(
    ctx: ReactApplicationContext,
    profile: VideoProfile,
  ): List<VideoAttempt> {
    val autoRotation = normalizeRotation(CameraHelper.getCameraOrientation(ctx))
    val isLandscape = profile.width >= profile.height
    val attempts = mutableListOf<VideoAttempt>()

    if (isLandscape) {
      // Với device của bạn, 1280x720 rot=0 đang live ra "ngang nhưng bị xoay dọc".
      // Vì thư viện sẽ tự swap width/height khi rotation=90/270,
      // nên ưu tiên khung sensor-native 720x1280 + rot=90/270 để vừa xoay đúng 90° vừa fill ra 16:9.
      attempts += VideoAttempt(profile.height, profile.width, profile.fps, profile.bitrate, 90, "sensor-90-fill")
      attempts += VideoAttempt(profile.height, profile.width, profile.fps, profile.bitrate, 270, "sensor-270-fill")

      // Fallback phụ nếu máy không nhận cấu hình sensor-native.
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, autoRotation, "landscape-auto")
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, 0, "landscape-0")
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, 180, "landscape-180")
    } else {
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, autoRotation, "portrait-auto")
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, 90, "portrait-90")
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, 270, "portrait-270")
    }

    return attempts.distinctBy {
      "${it.width}x${it.height}-${it.fps}-${it.bitrate}-${it.rotation}"
    }
  }

  private fun normalizeRotation(rotation: Int): Int {
    val value = rotation % 360
    return if (value < 0) value + 360 else value
  }

  @Synchronized
  fun stopStream() {
    pendingConfig = null
    val camera = rtmpCamera ?: return
    try {
      if (camera.isStreaming) {
        camera.stopStream()
      }
      if (camera.isOnPreview) {
        camera.stopPreview()
      }
      emitState("stopped", null)
    } catch (error: Throwable) {
      Log.e(TAG, "stopStream failed", error)
      emitState("error", error.message ?: "stopStream failed")
    }
  }

  @Synchronized
  fun switchCamera() {
    val camera = rtmpCamera ?: return
    val facings = getAvailableLensFacings()
    if (facings.distinct().size <= 1) {
      emitState(
        "camera_switched",
        if (currentFacing == CameraMetadata.LENS_FACING_FRONT) "front" else "back",
      )
      return
    }

    try {
      camera.switchCamera()
      currentFacing = if (currentFacing == CameraMetadata.LENS_FACING_BACK) {
        CameraMetadata.LENS_FACING_FRONT
      } else {
        CameraMetadata.LENS_FACING_BACK
      }
      emitState(
        "camera_switched",
        if (currentFacing == CameraMetadata.LENS_FACING_FRONT) "front" else "back",
      )
    } catch (error: Throwable) {
      Log.e(TAG, "switchCamera failed", error)
      emitState("error", error.message ?: "switchCamera failed")
    }
  }

  @Synchronized
  fun getZoomSnapshot(): Map<String, Any> {
    val camera = rtmpCamera ?: return mapOf(
      "supported" to false,
      "minZoom" to 1.0,
      "maxZoom" to 1.0,
      "zoom" to 1.0,
      "source" to if (currentFacing == CameraMetadata.LENS_FACING_FRONT) "front" else "back",
    )

    val zoomRange = invoke(camera, "getZoomRange") as? Range<*>
    val minZoom = (zoomRange?.lower as? Float ?: 1f).toDouble()
    val maxZoom = (zoomRange?.upper as? Float ?: 1f).toDouble()
    val zoom = ((invoke(camera, "getZoom") as? Float) ?: 1f).toDouble()

    return mapOf(
      "supported" to (maxZoom > 1.001),
      "minZoom" to minZoom,
      "maxZoom" to maxZoom,
      "zoom" to zoom,
      "source" to if (currentFacing == CameraMetadata.LENS_FACING_FRONT) "front" else "back",
    )
  }

  @Synchronized
  fun setZoom(level: Double): Double {
    val camera = rtmpCamera ?: return 1.0
    return try {
      invoke(camera, "setZoom", level.toFloat())
      ((invoke(camera, "getZoom") as? Float) ?: level.toFloat()).toDouble()
    } catch (error: Throwable) {
      Log.e(TAG, "setZoom failed", error)
      level
    }
  }

  private fun startPreviewSafely(camera: RtmpCamera2, requestedFacing: Int) {
    val attempts = buildFacingAttempts(requestedFacing)
    var lastError: Throwable? = null

    for (facing in attempts) {
      try {
        camera.startPreview(toCameraFacing(facing))
        currentFacing = facing
        if (facing != requestedFacing) {
          emitState(
            "camera_fallback",
            if (facing == CameraMetadata.LENS_FACING_FRONT) "front" else "back",
          )
        }
        return
      } catch (error: Throwable) {
        lastError = error
        Log.w(TAG, "startPreview failed for facing=$facing", error)
      }
    }

    throw lastError ?: IllegalStateException("Không thể mở camera preview")
  }

  private fun buildFacingAttempts(requestedFacing: Int): List<Int> {
    val facings = getAvailableLensFacings().distinct()
    if (facings.isEmpty()) {
      return listOf(requestedFacing)
    }

    val ordered = mutableListOf<Int>()
    if (facings.contains(requestedFacing)) {
      ordered.add(requestedFacing)
    }

    facings.forEach { facing ->
      if (!ordered.contains(facing)) {
        ordered.add(facing)
      }
    }

    return ordered
  }

  private fun getAvailableLensFacings(): List<Int> {
    val context = reactContext ?: return emptyList()
    return try {
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
        ?: return emptyList()
      manager.cameraIdList.mapNotNull { cameraId ->
        try {
          manager
            .getCameraCharacteristics(cameraId)
            .get(CameraCharacteristics.LENS_FACING)
        } catch (_: Throwable) {
          null
        }
      }
    } catch (_: Throwable) {
      emptyList()
    }
  }

  private fun invoke(target: Any, methodName: String, vararg args: Any): Any? {
    val method = target::class.java.methods.firstOrNull {
      it.name == methodName && it.parameterTypes.size == args.size
    } ?: return null
    return method.invoke(target, *args)
  }

  private fun replaceViewIfPossible(camera: RtmpCamera2, view: OpenGlView) {
    try {
      val method = camera.javaClass.methods.firstOrNull {
        it.name == "replaceView" && it.parameterTypes.size == 1
      }
      method?.invoke(camera, view)
    } catch (error: Throwable) {
      Log.w(TAG, "replaceView not available", error)
    }
  }

  private fun ensureCamera(): RtmpCamera2? {
    val view = previewView ?: return null
    if (rtmpCamera == null) {
      rtmpCamera = RtmpCamera2(view, this)
    }
    return rtmpCamera
  }

  private fun toCameraFacing(facing: Int): CameraHelper.Facing {
    return if (facing == CameraMetadata.LENS_FACING_FRONT) {
      CameraHelper.Facing.FRONT
    } else {
      CameraHelper.Facing.BACK
    }
  }

  private fun emitState(type: String, message: String?) {
    val context = reactContext ?: return
    val params = Arguments.createMap().apply {
      putString("type", type)
      if (message != null) putString("message", message)
    }
    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("youtubeLiveNativeState", params)
  }

  override fun onConnectionStartedRtmp(rtmpUrl: String) {
    emitState("connection_started", rtmpUrl)
  }

  override fun onConnectionSuccessRtmp() {
    emitState("connected", null)
  }

  override fun onConnectionFailedRtmp(reason: String) {
    emitState("error", reason)
  }

  override fun onNewBitrateRtmp(bitrate: Long) {
    emitState("bitrate", bitrate.toString())
  }

  override fun onDisconnectRtmp() {
    emitState("disconnected", null)
  }

  override fun onAuthErrorRtmp() {
    emitState("auth_error", null)
  }

  override fun onAuthSuccessRtmp() {
    emitState("auth_success", null)
  }
}
