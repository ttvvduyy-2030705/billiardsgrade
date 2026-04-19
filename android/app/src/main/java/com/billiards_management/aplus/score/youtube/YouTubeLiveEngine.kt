package com.aplus.score.youtube

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Range
import kotlin.math.max
import kotlin.math.min
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.graphics.Bitmap
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
  private var currentEncoderWidth: Int = 1280
  private var currentEncoderHeight: Int = 720
  private var activeRecordingPath: String? = null

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
        scheduleOverlayFilterApply(camera)
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
      if (camera.isStreaming) {
        // Fullscreen/local preview swaps can recreate the OpenGlView while the
        // RTMP encoder is still alive. Do not treat that as a stream restart,
        // but do re-apply the overlay filter to the current GL interface so
        // YouTube does not lose the scoreboard/logo.
        scheduleOverlayFilterApply(camera, 0L, "already-streaming")
        scheduleOverlayFilterApply(camera, 350L, "already-streaming-retry")
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

      emitState(
        "video_profile",
        "${selectedProfile.width}x${selectedProfile.height}@${selectedProfile.fps} ${selectedProfile.bitrate}",
      )

      currentEncoderWidth = selectedAttempt.width
      currentEncoderHeight = selectedAttempt.height

      // prepareVideo/startStream can recreate RootEncoder's GL pipeline internally.
      // Force the overlay filter to attach after the stream starts; otherwise the
      // app preview can show RN overlay locally while YouTube receives raw frames.
      overlayFilter = null
      overlayFilterAttached = false
      overlayLastAppliedSignature = ""
      overlayLastAppliedSizeSignature = ""
      lastOverlayBitmap = null
      camera.startStream(config.url)
      scheduleOverlayFilterApply(camera, 0L, "after-start")
      scheduleOverlayFilterApply(camera, 350L, "after-start-retry-350")
      scheduleOverlayFilterApply(camera, 1200L, "after-start-retry-1200")
      emitState("audio_live", "microphone audio enabled")
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
    val safe720 = VideoProfile(1280, 720, 24, 2_500_000)
    val safe540 = VideoProfile(960, 540, 24, 1_800_000)
    val safe480 = VideoProfile(854, 480, 24, 1_200_000)

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
    val camera = rtmpCamera ?: return
    try {
      if (camera.isStreaming) {
        camera.stopStream()
      }
      if (camera.isOnPreview) {
        camera.stopPreview()
      }
      clearOverlayFilter(camera)
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
    val nextConfig = parseOverlayConfig(payload)
    val nextSignature = overlayConfigSignature(nextConfig)

    if (nextSignature == overlayLastConfigSignature) {
      return
    }

    overlayConfig = nextConfig
    overlayLastConfigSignature = nextSignature
    overlayRevision += 1

    Log.i(
      TAG,
      "overlay_update rev=$overlayRevision visible=${overlayConfig.visible} " +
        "variant=${overlayConfig.variant} players=${overlayConfig.players.size} " +
        "thumbs=${overlayConfig.thumbnails.totalCount()}",
    )

    val camera = rtmpCamera
    if (camera?.isStreaming == true) {
      scheduleOverlayFilterApply(camera, 0L, "update")
    } else if (overlayConfig.visible) {
      emitState("overlay_waiting_stream", "update")
    }
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
        Log.e(TAG, "apply live overlay failed reason=$reason", error)
        emitState("overlay_error", error.message ?: "apply live overlay failed")
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
      return
    }

    val renderer = overlayBitmapRenderer ?: YouTubeLiveOverlayBitmapRenderer(context).also {
      overlayBitmapRenderer = it
    }
    val bitmap = renderer.render(overlayConfig, width, height)

    val filter = overlayFilter ?: ImageObjectFilterRender().also {
      overlayFilter = it
    }

    filter.setImage(bitmap)
    invoke(filter, "setDefaultScale", width, height)
    filter.setScale(100f, 100f)
    filter.setPosition(TranslateTo.TOP_LEFT)

    // Attach once per encoder size. Re-attaching the GL filter every countdown
    // update rebuilds RootEncoder's filter chain and shows up as live overlay
    // flicker. Score/timer changes only update the bitmap on the same filter.
    val mustAttachFilter = !overlayFilterAttached || overlayLastAppliedSizeSignature != sizeSignature
    if (mustAttachFilter) {
      val attached = attachOverlayFilter(glInterface, filter)
      if (!attached) {
        emitState("overlay_error", "Cannot attach ImageObjectFilterRender to GL interface")
        Log.e(TAG, "Cannot attach ImageObjectFilterRender to GL interface ${glInterface.javaClass.name}")
        return
      }
      overlayFilterAttached = true
      overlayLastAppliedSizeSignature = sizeSignature
    }

    lastOverlayBitmap = bitmap
    overlayLastAppliedSignature = applySignature

    emitState(
      if (overlayConfig.visible) "overlay_ready" else "overlay_cleared",
      "${overlayConfig.variant}:${width}x${height}:players=${overlayConfig.players.size}:rev=$revisionAtSchedule:$reason",
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

    // Last-resort fallback for shaded/obfuscated API variants.
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

  private fun clearOverlayFilter(camera: RtmpCamera2) {
    try {
      val glInterface = invoke(camera, "getGlInterface") ?: return
      invoke(glInterface, "clearFilters")
    } catch (error: Throwable) {
      Log.w(TAG, "clear live overlay filter failed", error)
    }
    overlayFilter = null
    overlayFilterAttached = false
    overlayLastAppliedSignature = ""
    overlayLastAppliedSizeSignature = ""
    lastOverlayBitmap = null
    overlayBitmapRenderer?.release()
    overlayBitmapRenderer = null
    retiredOverlayBitmaps.forEach { bitmap ->
      if (!bitmap.isRecycled) bitmap.recycle()
    }
    retiredOverlayBitmaps.clear()
  }

  private fun retireOverlayBitmap(bitmap: Bitmap?) {
    if (bitmap == null || bitmap.isRecycled) return
    retiredOverlayBitmaps += bitmap
    while (retiredOverlayBitmaps.size > 6) {
      val old = retiredOverlayBitmaps.removeAt(0)
      if (!old.isRecycled) old.recycle()
    }
  }

  private fun resolveEncoderSize(glInterface: Any): Pair<Int, Int> {
    val encoderSize = invoke(glInterface, "getEncoderSize")
    val xValue = encoderSize?.javaClass?.fields?.firstOrNull { it.name == "x" }?.get(encoderSize)
    val yValue = encoderSize?.javaClass?.fields?.firstOrNull { it.name == "y" }?.get(encoderSize)
    val width = (xValue as? Number)?.toInt()?.takeIf { it > 0 } ?: currentEncoderWidth
    val height = (yValue as? Number)?.toInt()?.takeIf { it > 0 } ?: currentEncoderHeight
    return Pair(width.coerceAtLeast(1), height.coerceAtLeast(1))
  }

  private fun overlayConfigSignature(config: NativeLiveOverlayConfig): String {
    val players = config.players.joinToString("|") { player ->
      listOf(
        player.name,
        player.flag,
        player.score.toString(),
        player.currentPoint.toString(),
        player.color,
        player.highestRate.toString(),
        player.average.toString(),
      ).joinToString("^")
    }
    val thumbnails = listOf(
      config.thumbnails.enabled.toString(),
      config.thumbnails.topLeft.joinToString(","),
      config.thumbnails.topRight.joinToString(","),
      config.thumbnails.bottomLeft.joinToString(","),
      config.thumbnails.bottomRight.joinToString(","),
    ).joinToString("|")

    return listOf(
      config.visible.toString(),
      config.variant,
      config.currentPlayerIndex.toString(),
      config.countdownTime.toString(),
      config.baseCountdown.toString(),
      config.goal.toString(),
      config.totalTurns.toString(),
      players,
      thumbnails,
    ).joinToString("~")
  }

  private fun parseOverlayConfig(payload: ReadableMap?): NativeLiveOverlayConfig {
    if (payload == null) return NativeLiveOverlayConfig(visible = false)

    return try {
      val players = mutableListOf<NativeLiveOverlayPlayer>()
      val playersArray = if (payload.hasKey("players") && !payload.isNull("players")) {
        payload.getArray("players")
      } else {
        null
      }
      if (playersArray != null) {
        for (index in 0 until kotlin.math.min(playersArray.size(), 2)) {
          val playerMap = playersArray.getMap(index) ?: continue
          players += NativeLiveOverlayPlayer(
            name = readString(playerMap, "name"),
            flag = readString(playerMap, "flag"),
            score = readInt(playerMap, "score"),
            currentPoint = readInt(playerMap, "currentPoint"),
            color = readString(playerMap, "color"),
            highestRate = readInt(playerMap, "highestRate"),
            average = readDouble(playerMap, "average").toFloat(),
          )
        }
      }

      NativeLiveOverlayConfig(
        visible = readBoolean(payload, "visible"),
        variant = readString(payload, "variant").ifBlank { "pool" },
        currentPlayerIndex = readInt(payload, "currentPlayerIndex"),
        countdownTime = readInt(payload, "countdownTime"),
        baseCountdown = readInt(payload, "baseCountdown"),
        goal = readInt(payload, "goal"),
        totalTurns = readInt(payload, "totalTurns").coerceAtLeast(1),
        players = players,
        thumbnails = parseThumbnails(if (payload.hasKey("thumbnails") && !payload.isNull("thumbnails")) payload.getMap("thumbnails") else null),
      )
    } catch (error: Throwable) {
      Log.e(TAG, "parse live overlay payload failed", error)
      NativeLiveOverlayConfig(visible = false)
    }
  }

  private fun parseThumbnails(map: ReadableMap?): NativeLiveOverlayThumbnails {
    if (map == null) return NativeLiveOverlayThumbnails()
    return NativeLiveOverlayThumbnails(
      enabled = readBoolean(map, "enabled"),
      topLeft = readStringList(if (map.hasKey("topLeft") && !map.isNull("topLeft")) map.getArray("topLeft") else null),
      topRight = readStringList(if (map.hasKey("topRight") && !map.isNull("topRight")) map.getArray("topRight") else null),
      bottomLeft = readStringList(if (map.hasKey("bottomLeft") && !map.isNull("bottomLeft")) map.getArray("bottomLeft") else null),
      bottomRight = readStringList(if (map.hasKey("bottomRight") && !map.isNull("bottomRight")) map.getArray("bottomRight") else null),
    )
  }

  private fun readStringList(array: ReadableArray?): List<String> {
    if (array == null) return emptyList()
    val result = mutableListOf<String>()
    for (index in 0 until array.size()) {
      if (!array.isNull(index)) {
        result += array.getString(index) ?: ""
      }
    }
    return result.filter { it.isNotBlank() }
  }

  private fun readString(map: ReadableMap, key: String): String {
    return try {
      if (map.hasKey(key) && !map.isNull(key)) map.getString(key) ?: "" else ""
    } catch (_: Throwable) {
      ""
    }
  }

  private fun readBoolean(map: ReadableMap, key: String): Boolean {
    return try {
      map.hasKey(key) && !map.isNull(key) && map.getBoolean(key)
    } catch (_: Throwable) {
      false
    }
  }

  private fun readInt(map: ReadableMap, key: String): Int {
    return try {
      if (map.hasKey(key) && !map.isNull(key)) map.getDouble(key).toInt() else 0
    } catch (_: Throwable) {
      0
    }
  }

  private fun readDouble(map: ReadableMap, key: String): Double {
    return try {
      if (map.hasKey(key) && !map.isNull(key)) map.getDouble(key) else 0.0
    } catch (_: Throwable) {
      0.0
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
