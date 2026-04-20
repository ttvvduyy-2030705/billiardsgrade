package com.aplus.score.youtube

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.util.Log
import android.util.Range
import android.os.Handler
import android.os.Looper
import android.graphics.Bitmap
import kotlin.math.max
import kotlin.math.min
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.pedro.encoder.input.gl.render.filters.`object`.ImageObjectFilterRender
import com.pedro.encoder.input.video.CameraHelper
import com.pedro.encoder.utils.gl.TranslateTo
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
  private var overlayConfig: NativeLiveOverlayConfig = NativeLiveOverlayConfig()
  private var overlayBitmapRenderer: YouTubeLiveOverlayBitmapRenderer? = null
  private var overlayFilter: ImageObjectFilterRender? = null
  private var lastOverlayBitmap: Bitmap? = null
  private var overlayRevision: Long = 0L
  private var overlayLastConfigSignature: String = ""
  private var overlayLastAppliedSignature: String = ""
  private var overlayLastAppliedSizeSignature: String = ""
  private var overlayFilterAttached: Boolean = false
  private val retiredOverlayBitmaps = mutableListOf<Bitmap>()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var activeRecordingPath: String? = null
  private var currentEncoderWidth: Int = 0
  private var currentEncoderHeight: Int = 0
  private var currentEncoderBitrate: Int = 0
  private var currentEncoderFps: Int = 0

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
      markOverlayFilterDirty("surface-ready")
      Log.i(
        TAG,
        "[Live Overlay Fullscreen] fullscreenSurfaceChanged=true activeSource=offscreen-live-overlay overlayBitmapStillAvailable=${overlayConfig.visible && overlayConfig.snapshotUri.isNotBlank()} reason=surface-ready",
      )
      if (pendingConfig != null) {
        startStreamInternal(pendingConfig!!)
      } else {
        ensurePreview(currentFacing)
        scheduleOverlayFilterApply(camera, 0L, "surface-ready")
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
    Log.i(
      TAG,
      "[Live Overlay Fullscreen] fullscreenSurfaceChanged=true activeSource=offscreen-live-overlay overlayBitmapStillAvailable=${overlayConfig.visible && overlayConfig.snapshotUri.isNotBlank()} reason=surface-destroyed keepLastGoodOverlay=true",
    )
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
      if (camera.isStreaming) {
        // Fullscreen/local preview swaps can recreate the OpenGlView while the
        // RTMP encoder is still alive. Do not restart the stream here, but force
        // the last good gameplay overlay bitmap to be reattached to the new GL
        // surface/filter chain.
        markOverlayFilterDirty("already-streaming-view-swap")
        Log.i(
          TAG,
          "[Live Overlay Fullscreen] activeSource=offscreen-live-overlay overlayBitmapStillAvailable=${overlayConfig.visible && overlayConfig.snapshotUri.isNotBlank()} reason=already-streaming-view-swap",
        )
        scheduleOverlayFilterApply(camera, 0L, "already-streaming")
        scheduleOverlayFilterApply(camera, 350L, "already-streaming-retry")
        scheduleOverlayFilterApply(camera, 900L, "already-streaming-retry-900")
        return
      }

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

      currentEncoderWidth = selectedAttempt.width
      currentEncoderHeight = selectedAttempt.height
      currentEncoderBitrate = selectedAttempt.bitrate
      currentEncoderFps = selectedAttempt.fps
      emitState(
        "video_profile",
        "${selectedAttempt.width}x${selectedAttempt.height}@${selectedAttempt.fps} ${selectedAttempt.bitrate}",
      )
      Log.i(
        TAG,
        "[Live Encoder] resolution=${selectedAttempt.width}x${selectedAttempt.height} bitrate=${selectedAttempt.bitrate} fps=${selectedAttempt.fps}",
      )

      camera.startStream(config.url)
      emitState("audio_live", "microphone audio enabled")
      emitState("live_output", "frameSource=raw-camera+snapshot-overlay overlayIncluded=${overlayConfig.visible && overlayConfig.snapshotUri.isNotBlank()}")
      scheduleOverlayFilterApply(camera, 0L, "after-start")
      scheduleOverlayFilterApply(camera, 350L, "after-start-retry-350")
      scheduleOverlayFilterApply(camera, 1200L, "after-start-retry-1200")
      emitState("starting", null)
    } catch (error: Throwable) {
      Log.e(TAG, "startStream failed", error)
      emitState("error", error.message ?: "startStream failed")
    }
  }

  private fun buildProfiles(config: StreamConfig): List<VideoProfile> {
    val requestedWidth = max(config.width, config.height)
    val requestedHeight = min(config.width, config.height)
    val requested = VideoProfile(
      width = requestedWidth,
      height = requestedHeight,
      fps = config.fps,
      bitrate = config.bitrate,
    )
    val safe720 = VideoProfile(1280, 720, min(config.fps, 30), 5_500_000)
    val safe540 = VideoProfile(960, 540, min(config.fps, 30), 3_000_000)
    val safe480 = VideoProfile(854, 480, min(config.fps, 30), 2_000_000)

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
      // YouTube output must be a real landscape stream. Keep encoder width > height
      // and do not start with a portrait 720x1280 profile, otherwise YouTube shows
      // the broadcast as a vertical video.
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, 0, "landscape-0")
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, 180, "landscape-180")
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, autoRotation, "landscape-auto")

      // Last-resort fallback only for devices that reject landscape prepareVideo.
      attempts += VideoAttempt(profile.height, profile.width, profile.fps, profile.bitrate, 90, "sensor-90-fallback")
      attempts += VideoAttempt(profile.height, profile.width, profile.fps, profile.bitrate, 270, "sensor-270-fallback")
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
    activeRecordingPath = null
    currentEncoderWidth = 0
    currentEncoderHeight = 0
    currentEncoderBitrate = 0
    currentEncoderFps = 0
    val camera = rtmpCamera ?: return
    try {
      clearOverlayFilter(camera)
      releaseOverlayResources()
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
  fun startRecord(path: String): Boolean {
    val camera = rtmpCamera ?: return false
    val normalizedPath = path.trim()
    if (normalizedPath.isBlank()) return false

    if (activeRecordingPath != null) {
      return true
    }

    return try {
      invoke(camera, "startRecord", normalizedPath)
      activeRecordingPath = normalizedPath
      emitState("recording", normalizedPath)
      true
    } catch (error: Throwable) {
      Log.e(TAG, "startRecord failed", error)
      emitState("record_error", error.message ?: "startRecord failed")
      false
    }
  }

  @Synchronized
  fun stopRecord(): String? {
    val camera = rtmpCamera ?: return activeRecordingPath.also { activeRecordingPath = null }
    val recordedPath = activeRecordingPath
    if (recordedPath == null) {
      return null
    }

    return try {
      invoke(camera, "stopRecord")
      activeRecordingPath = null
      emitState("record_stopped", recordedPath)
      recordedPath
    } catch (error: Throwable) {
      Log.e(TAG, "stopRecord failed", error)
      activeRecordingPath = null
      emitState("record_error", error.message ?: "stopRecord failed")
      recordedPath
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


  @Synchronized
  fun updateOverlay(payload: ReadableMap?) {
    val nextConfig = parseOverlaySnapshotConfig(payload)
    val nextSignature = overlayConfigSignature(nextConfig)

    if (nextSignature == overlayLastConfigSignature) {
      return
    }

    overlayConfig = nextConfig
    overlayLastConfigSignature = nextSignature
    overlayRevision += 1

    Log.i(
      TAG,
      "[Live Overlay] source=${nextConfig.source} mode=${nextConfig.variant} " +
        "visible=${nextConfig.visible} snapshot=${nextConfig.snapshotUri.isNotBlank()} " +
        "size=${nextConfig.snapshotWidth}x${nextConfig.snapshotHeight} rev=$overlayRevision",
    )
    Log.i(
      TAG,
      "[LiveOverlayNative] overlayBitmapReceived=${nextConfig.visible && nextConfig.snapshotUri.isNotBlank()} " +
        "source=${nextConfig.source} mode=${nextConfig.variant} " +
        "width=${nextConfig.snapshotWidth} height=${nextConfig.snapshotHeight}",
    )
    Log.i(
      TAG,
      "[Live Overlay Quality] snapshotSize=${nextConfig.snapshotWidth}x${nextConfig.snapshotHeight} " +
        "videoOutput=${currentEncoderWidth.coerceAtLeast(0)}x${currentEncoderHeight.coerceAtLeast(0)} " +
        "bitrate=${currentEncoderBitrate} fps=${currentEncoderFps}",
    )
    emitState(
      "overlay_snapshot_update",
      "source=${nextConfig.source} mode=${nextConfig.variant} visible=${nextConfig.visible} updated=true",
    )

    val camera = rtmpCamera
    if (camera?.isStreaming == true) {
      scheduleOverlayFilterApply(camera, 0L, "snapshot-update")
    } else if (nextConfig.visible) {
      emitState("overlay_waiting_stream", "snapshot-update")
    }
  }

  private fun parseOverlaySnapshotConfig(payload: ReadableMap?): NativeLiveOverlayConfig {
    if (payload == null) return NativeLiveOverlayConfig(visible = false)

    val visible = readBoolean(payload, "visible", false)
    val variant = readString(payload, "variant", "pool")
    val source = readString(payload, "source", "gameplay-shared-overlay-snapshot")
    val snapshotUri = readString(payload, "snapshotUri", "")
    val snapshotWidth = readInt(payload, "snapshotWidth", 0)
    val snapshotHeight = readInt(payload, "snapshotHeight", 0)
    val updatedAt = readDouble(payload, "updatedAt", 0.0)

    return NativeLiveOverlayConfig(
      visible = visible && snapshotUri.isNotBlank(),
      variant = if (variant == "carom") "carom" else "pool",
      source = source,
      snapshotUri = snapshotUri,
      snapshotWidth = snapshotWidth,
      snapshotHeight = snapshotHeight,
      updatedAt = updatedAt,
    )
  }

  private fun overlayConfigSignature(config: NativeLiveOverlayConfig): String {
    return listOf(
      config.visible.toString(),
      config.variant,
      config.source,
      config.snapshotUri,
      config.snapshotWidth.toString(),
      config.snapshotHeight.toString(),
      config.updatedAt.toString(),
    ).joinToString("|")
  }

  private fun scheduleOverlayFilterApply(
    camera: RtmpCamera2?,
    delayMs: Long = 0L,
    reason: String = "apply",
  ) {
    if (camera == null) return
    val revisionAtSchedule = overlayRevision
    val task = Runnable {
      val latestCamera = rtmpCamera ?: return@Runnable
      try {
        applyOverlayFilterIfNeeded(latestCamera, revisionAtSchedule, reason)
      } catch (error: Throwable) {
        Log.e(TAG, "apply live overlay snapshot failed reason=$reason", error)
        emitState("overlay_error", error.message ?: "apply live overlay snapshot failed")
      }
    }

    if (delayMs <= 0L) {
      mainHandler.post(task)
    } else {
      mainHandler.postDelayed(task, delayMs)
    }
  }

  private fun applyOverlayFilterIfNeeded(
    camera: RtmpCamera2,
    revisionAtSchedule: Long,
    reason: String,
  ) {
    if (!camera.isStreaming) {
      emitState("overlay_waiting_stream", reason)
      return
    }

    val context = reactContext ?: return
    val glInterface = invoke(camera, "getGlInterface") ?: run {
      emitState("overlay_waiting_gl", reason)
      return
    }
    val (width, height) = resolveEncoderSize(glInterface)
    val sizeSignature = "${width}x${height}"
    val applySignature = "${overlayLastConfigSignature}:$sizeSignature"

    if (overlayFilterAttached && applySignature == overlayLastAppliedSignature) {
      Log.i(TAG, "[Live Output] overlayBitmapStillAvailable=${overlayConfig.visible && overlayConfig.snapshotUri.isNotBlank()} overlayAppliedToEncodedFrame=${overlayConfig.visible && overlayConfig.snapshotUri.isNotBlank()} reason=$reason duplicateApplySkipped=true")
      return
    }

    val renderer = overlayBitmapRenderer ?: YouTubeLiveOverlayBitmapRenderer(context).also {
      overlayBitmapRenderer = it
    }
    val bitmap = renderer.render(overlayConfig, width, height)
    val renderedOverlayIncluded = renderer.lastRenderHadOverlay
    Log.i(
      TAG,
      "[Live Overlay Quality] snapshotSize=${overlayConfig.snapshotWidth}x${overlayConfig.snapshotHeight} " +
        "bitmapDecoded=${renderer.lastDecodedWidth}x${renderer.lastDecodedHeight} " +
        "videoOutput=${width}x${height} overlayDrawRect=0,0,${width},${height} " +
        "scaleFactorX=${renderer.lastScaleFactorX} scaleFactorY=${renderer.lastScaleFactorY} " +
        "bitrate=${currentEncoderBitrate} fps=${currentEncoderFps}",
    )

    val filter = overlayFilter ?: ImageObjectFilterRender().also {
      overlayFilter = it
    }

    filter.setImage(bitmap)
    invoke(filter, "setDefaultScale", width, height)
    filter.setScale(100f, 100f)
    filter.setPosition(TranslateTo.TOP_LEFT)

    val mustAttachFilter = !overlayFilterAttached || overlayLastAppliedSizeSignature != sizeSignature
    if (mustAttachFilter) {
      val attached = attachOverlayFilter(glInterface, filter)
      if (!attached) {
        emitState("overlay_error", "Cannot attach snapshot ImageObjectFilterRender to GL interface")
        Log.e(TAG, "Cannot attach snapshot ImageObjectFilterRender to GL interface ${glInterface.javaClass.name}")
        return
      }
      overlayFilterAttached = true
      overlayLastAppliedSizeSignature = sizeSignature
    }

    lastOverlayBitmap?.let { retiredOverlayBitmaps += it }
    lastOverlayBitmap = bitmap
    cleanupRetiredOverlayBitmaps()
    overlayLastAppliedSignature = applySignature

    val included = overlayConfig.visible && overlayConfig.snapshotUri.isNotBlank() && renderedOverlayIncluded
    Log.i(TAG, "[Live Output] frameSource=raw-camera overlayCompositePath=bitmap-over-camera overlayDrawnOnFrame=$included frameIndex=filter-apply-$overlayRevision reason=$reason")
    Log.i(TAG, "[Live Output] frameSource=raw-camera+snapshot-overlay overlayIncluded=$included size=$sizeSignature reason=$reason")
    Log.i(TAG, "[Live Output] overlayAppliedToEncodedFrame=$included source=${overlayConfig.source} mode=${overlayConfig.variant} size=$sizeSignature reason=$reason")
    emitState(
      if (included) "overlay_bitmap_applied" else "overlay_cleared",
      "overlayBitmapApplied=$included overlayAppliedToEncodedFrame=$included source=${overlayConfig.source} ${overlayConfig.variant}:${width}x${height}:rev=$revisionAtSchedule:$reason",
    )
  }

  private fun attachOverlayFilter(glInterface: Any, filter: ImageObjectFilterRender): Boolean {
    val methods = glInterface.javaClass.methods.filter { it.name == "setFilter" }

    methods.firstOrNull { method ->
      method.parameterTypes.size == 1 &&
        method.parameterTypes[0].isAssignableFrom(filter.javaClass)
    }?.let { method ->
      return try {
        method.invoke(glInterface, filter)
        true
      } catch (error: Throwable) {
        Log.w(TAG, "setFilter(filter) failed", error)
        false
      }
    }

    methods.firstOrNull { method ->
      method.parameterTypes.size == 2 &&
        method.parameterTypes[0] == Int::class.javaPrimitiveType &&
        method.parameterTypes[1].isAssignableFrom(filter.javaClass)
    }?.let { method ->
      return try {
        method.invoke(glInterface, 0, filter)
        true
      } catch (error: Throwable) {
        Log.w(TAG, "setFilter(index, filter) failed", error)
        false
      }
    }

    methods.forEach { method ->
      if (method.parameterTypes.size == 1) {
        try {
          method.invoke(glInterface, filter)
          return true
        } catch (_: Throwable) {
        }
      }
    }

    return false
  }

  private fun markOverlayFilterDirty(reason: String) {
    overlayFilterAttached = false
    overlayLastAppliedSignature = ""
    overlayLastAppliedSizeSignature = ""
    overlayFilter = null
    Log.i(
      TAG,
      "[Live Overlay Fullscreen] markOverlayFilterDirty=true reason=$reason overlayBitmapStillAvailable=${overlayConfig.visible && overlayConfig.snapshotUri.isNotBlank()}",
    )
  }

  private fun clearOverlayFilter(camera: RtmpCamera2) {
    try {
      val glInterface = invoke(camera, "getGlInterface") ?: return
      invoke(glInterface, "clearFilters")
      overlayFilterAttached = false
      overlayLastAppliedSignature = ""
      overlayLastAppliedSizeSignature = ""
    } catch (error: Throwable) {
      Log.w(TAG, "clear live overlay snapshot filter failed", error)
    }
  }

  private fun resolveEncoderSize(glInterface: Any): Pair<Int, Int> {
    if (currentEncoderWidth > 0 && currentEncoderHeight > 0) {
      return Pair(currentEncoderWidth.coerceAtLeast(1), currentEncoderHeight.coerceAtLeast(1))
    }

    val streamWidth = invoke(glInterface, "getStreamWidth") as? Int
    val streamHeight = invoke(glInterface, "getStreamHeight") as? Int
    if (streamWidth != null && streamHeight != null && streamWidth > 0 && streamHeight > 0) {
      return Pair(streamWidth, streamHeight)
    }

    val width = (invoke(glInterface, "getWidth") as? Int) ?: 1280
    val height = (invoke(glInterface, "getHeight") as? Int) ?: 720
    return Pair(width.coerceAtLeast(1), height.coerceAtLeast(1))
  }

  private fun cleanupRetiredOverlayBitmaps() {
    while (retiredOverlayBitmaps.size > 6) {
      val bitmap = retiredOverlayBitmaps.removeAt(0)
      try {
        if (!bitmap.isRecycled) bitmap.recycle()
      } catch (_: Throwable) {
      }
    }
  }

  private fun releaseOverlayResources() {
    overlayBitmapRenderer?.release()
    overlayBitmapRenderer = null
    overlayFilter = null
    lastOverlayBitmap?.takeIf { !it.isRecycled }?.recycle()
    lastOverlayBitmap = null
    retiredOverlayBitmaps.forEach { bitmap ->
      try {
        if (!bitmap.isRecycled) bitmap.recycle()
      } catch (_: Throwable) {
      }
    }
    retiredOverlayBitmaps.clear()
    overlayFilterAttached = false
    overlayLastAppliedSignature = ""
    overlayLastAppliedSizeSignature = ""
    overlayLastConfigSignature = ""
    overlayConfig = NativeLiveOverlayConfig()
  }

  private fun readString(map: ReadableMap, key: String, fallback: String): String {
    return try {
      if (map.hasKey(key) && !map.isNull(key)) map.getString(key) ?: fallback else fallback
    } catch (_: Throwable) {
      fallback
    }
  }

  private fun readBoolean(map: ReadableMap, key: String, fallback: Boolean): Boolean {
    return try {
      if (map.hasKey(key) && !map.isNull(key)) map.getBoolean(key) else fallback
    } catch (_: Throwable) {
      fallback
    }
  }

  private fun readInt(map: ReadableMap, key: String, fallback: Int): Int {
    return try {
      if (map.hasKey(key) && !map.isNull(key)) map.getDouble(key).toInt() else fallback
    } catch (_: Throwable) {
      fallback
    }
  }

  private fun readDouble(map: ReadableMap, key: String, fallback: Double): Double {
    return try {
      if (map.hasKey(key) && !map.isNull(key)) map.getDouble(key) else fallback
    } catch (_: Throwable) {
      fallback
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
        it.name == "replaceView" &&
          it.parameterTypes.size == 1 &&
          it.parameterTypes[0].isAssignableFrom(view.javaClass)
      } ?: return
      method.invoke(camera, view)
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
    scheduleOverlayFilterApply(rtmpCamera, 0L, "rtmp-connected")
    scheduleOverlayFilterApply(rtmpCamera, 700L, "rtmp-connected-retry")
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
