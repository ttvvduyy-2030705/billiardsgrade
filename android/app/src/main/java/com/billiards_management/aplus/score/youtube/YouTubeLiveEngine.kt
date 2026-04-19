package com.aplus.score.youtube

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.net.Uri
import android.util.Log
import android.util.Range
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.pedro.encoder.input.video.CameraHelper
import com.pedro.encoder.input.gl.render.filters.`object`.ImageObjectFilterRender
import com.pedro.encoder.utils.gl.TranslateTo
import com.pedro.rtmp.utils.ConnectCheckerRtmp
import com.pedro.rtplibrary.rtmp.RtmpCamera2
import com.pedro.rtplibrary.view.OpenGlView
import java.io.File

object YouTubeLiveEngine : ConnectCheckerRtmp {
  private const val TAG = "YouTubeLiveEngine"
  private const val LIVE_OVERLAY_VERBOSE_LOGS = false

  private var reactContext: ReactApplicationContext? = null
  private var previewView: OpenGlView? = null
  private var rtmpCamera: RtmpCamera2? = null
  private var pendingConfig: StreamConfig? = null
  private var currentFacing: Int = CameraMetadata.LENS_FACING_BACK
  private var surfaceReady: Boolean = false
  private var overlayModel: LiveOverlayModel = LiveOverlayModel(enabled = false)
  private var overlayFilter: ImageObjectFilterRender? = null
  private var overlayBitmap: Bitmap? = null
  private var overlayStreamWidth: Int = 1280
  private var overlayStreamHeight: Int = 720
  private var rtmpConnected: Boolean = false
  private var overlayApplyScheduled: Boolean = false
  private var overlayFilterRegistered: Boolean = false
  private var lastAppliedOverlaySignature: String = ""
  private var lastOverlayApplyMs: Long = 0L
  private var lastOverlaySummaryLogSignature: String = ""
  private var lastOverlaySummaryLogMs: Long = 0L

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
    val orientation: String = "landscape",
  )

  private data class VideoProfile(
    val width: Int,
    val height: Int,
    val fps: Int,
    val bitrate: Int,
  )

  data class LiveOverlayPlayer(
    val name: String,
    val score: Int,
    val countryCode: String = "",
    val isActive: Boolean = false,
  )

  data class LiveOverlayLogo(
    val slot: String,
    val uri: String,
    val locked: Boolean = false,
    val showOnLivestream: Boolean = false,
    val showOnSavedVideo: Boolean = true,
  )

  data class LiveOverlayModel(
    val enabled: Boolean,
    val mode: String = "unknown",
    val currentPlayerIndex: Int = 0,
    val players: List<LiveOverlayPlayer> = emptyList(),
    val target: String = "",
    val inning: String = "",
    val timer: String = "",
    val logo: String = "config-thumbnail",
    val logos: List<LiveOverlayLogo> = emptyList(),
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
  fun updateOverlay(model: LiveOverlayModel) {
    overlayModel = model
    logOverlayModelSummary(model)
    emitState("overlay_model", "enabled=${model.enabled} mode=${model.mode}")

    val camera = rtmpCamera
    if (camera != null && camera.isStreaming && rtmpConnected) {
      scheduleOverlayApply("model_update", 650L)
    } else {
      emitState("overlay_deferred", "waiting_connected_stream")
    }
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

      overlayStreamWidth = selectedAttempt.width
      overlayStreamHeight = selectedAttempt.height

      emitState("camera_orientation", config.orientation)
      rtmpConnected = false
      overlayFilterRegistered = false
      lastAppliedOverlaySignature = ""
      camera.startStream(config.url)
      emitState("audio_live", "microphone audio enabled")
      emitState("starting", null)
      emitState("overlay_deferred", "waiting_rtmp_connected")
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
    val forceLandscape = profile.width >= profile.height
    val attempts = mutableListOf<VideoAttempt>()

    if (forceLandscape) {
      // App chạy landscape nên ưu tiên output encoder 16:9 thật sự trước.
      // Các cấu hình sensor-native 720x1280 + 90/270 chỉ còn là fallback để tránh máy
      // không hỗ trợ profile 1280x720 bị fail hoàn toàn.
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, 0, "landscape-0-fill")
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, 180, "landscape-180-fill")
      attempts += VideoAttempt(profile.width, profile.height, profile.fps, profile.bitrate, autoRotation, "landscape-auto")
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
    rtmpConnected = false
    overlayApplyScheduled = false
    overlayFilterRegistered = false
    lastAppliedOverlaySignature = ""
    overlayModel = overlayModel.copy(enabled = false)
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

  private fun applyOverlayFilter(camera: RtmpCamera2, streamWidth: Int, streamHeight: Int) {
    try {
      if (!camera.isStreaming || !rtmpConnected) {
        emitState("overlay_deferred", "stream_not_connected")
        return
      }

      val width = streamWidth.coerceAtLeast(1)
      val height = streamHeight.coerceAtLeast(1)
      val signature = buildOverlaySignature(width, height, overlayModel)
      val now = System.currentTimeMillis()
      if (signature == lastAppliedOverlaySignature && overlayFilter != null) {
        emitState("overlay_skipped", "same_model")
        return
      }
      if (now - lastOverlayApplyMs < 900L && overlayFilter != null) {
        scheduleOverlayApply("throttled", 950L)
        emitState("overlay_deferred", "throttled")
        return
      }

      val bitmap = buildOverlayBitmap(width, height, overlayModel)
      val filter = overlayFilter ?: ImageObjectFilterRender().also {
        overlayFilter = it
      }

      filter.setImage(bitmap)
      filter.setDefaultScale(width, height)
      filter.setPosition(TranslateTo.CENTER)

      if (!overlayFilterRegistered) {
        val registered = applySingleOverlayFilter(camera, filter)
        if (!registered) {
          recycleBitmapLater(bitmap)
          return
        }
      }

      val previousBitmap = overlayBitmap
      overlayBitmap = bitmap
      lastAppliedOverlaySignature = signature
      lastOverlayApplyMs = now
      recycleBitmapLater(previousBitmap)

      if (overlayModel.enabled) {
        if (LIVE_OVERLAY_VERBOSE_LOGS) {
          Log.i(TAG, "[Live Overlay Native] draw overlay frame mode=${overlayModel.mode} ${width}x${height}")
        }
        emitState("overlay_ready", "mode=${overlayModel.mode} ${width}x${height}")
      } else {
        emitState("overlay_disabled", "disabled")
      }
    } catch (error: Throwable) {
      Log.e(TAG, "[Live Overlay Native] apply overlay failed", error)
      emitState("overlay_error", error.message ?: "overlay failed")
    }
  }

  private fun applySingleOverlayFilter(camera: RtmpCamera2, filter: ImageObjectFilterRender): Boolean {
    return try {
      // IMPORTANT:
      // - Do NOT call camera.setFilter(filter) directly: this RootEncoder version used in
      //   the project does not expose that method, so release build fails.
      // - Do NOT call glInterface.setFilter(index, filter): if the internal filter list is
      //   empty, ManagerRender.setFilter(index) throws IndexOutOfBoundsException on glThread
      //   and kills the app.
      //
      // Use the non-indexed API when it exists, otherwise append the filter once. If the
      // current RootEncoder build does not expose a safe API, disable overlay and keep the
      // YouTube camera stream alive instead of crashing the match.
      val glInterface = camera.glInterface
      val applied = invokeFilterMethod(glInterface, "setFilter", filter)
        || if (!overlayFilterRegistered) invokeFilterMethod(glInterface, "addFilter", filter) else true

      if (!applied) {
        Log.w(TAG, "[Live Overlay Native] overlay disabled: no safe non-indexed filter API")
        emitState("overlay_disabled", "no_safe_filter_api")
        overlayFilterRegistered = false
        return false
      }

      overlayFilterRegistered = true
      emitState("overlay_filter", "safe_filter_applied")
      true
    } catch (error: Throwable) {
      overlayFilterRegistered = false
      Log.e(TAG, "[Live Overlay Native] set overlay filter failed", error)
      emitState("overlay_error", error.message ?: "set overlay filter failed")
      false
    }
  }

  private fun invokeFilterMethod(target: Any?, methodName: String, filter: ImageObjectFilterRender): Boolean {
    if (target == null) return false
    return try {
      val method = target.javaClass.methods.firstOrNull { method ->
        method.name == methodName &&
          method.parameterTypes.size == 1 &&
          method.parameterTypes[0].isAssignableFrom(filter.javaClass)
      } ?: return false

      method.invoke(target, filter)
      true
    } catch (error: Throwable) {
      Log.w(TAG, "[Live Overlay Native] $methodName(filter) unavailable", error)
      false
    }
  }

  private fun buildOverlayBitmap(width: Int, height: Int, model: LiveOverlayModel): Bitmap {
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.TRANSPARENT)

    if (!model.enabled) {
      return bitmap
    }

    val density = width / 1280f
    val scale = density.coerceAtLeast(0.72f)

    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      textAlign = Paint.Align.CENTER
    }
    val smallTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.rgb(210, 210, 210)
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      textAlign = Paint.Align.CENTER
    }
    val scorePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      textAlign = Paint.Align.CENTER
    }
    val redPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.rgb(180, 24, 30)
      style = Paint.Style.FILL
    }
    val darkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.argb(208, 8, 8, 10)
      style = Paint.Style.FILL
    }
    val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.argb(230, 210, 210, 210)
      style = Paint.Style.STROKE
      strokeWidth = 2.4f * scale
    }
    val activePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.rgb(225, 32, 42)
      style = Paint.Style.STROKE
      strokeWidth = 4.2f * scale
    }

    drawConfiguredLogos(canvas, width, height, scale, model, redPaint, textPaint)

    val boardWidth = (width * 0.88f).coerceAtMost(1120f * scale)
    val boardHeight = 92f * scale
    val left = (width - boardWidth) / 2f
    val top = height - boardHeight - 18f * scale
    val board = RectF(left, top, left + boardWidth, top + boardHeight)
    val radius = 22f * scale
    canvas.drawRoundRect(board, radius, radius, darkPaint)
    canvas.drawRoundRect(board, radius, radius, borderPaint)

    val centerWidth = 180f * scale
    val playerWidth = (boardWidth - centerWidth) / 2f
    val leftBox = RectF(board.left + 10f * scale, board.top + 10f * scale, board.left + playerWidth - 5f * scale, board.bottom - 10f * scale)
    val centerBox = RectF(leftBox.right + 10f * scale, board.top + 10f * scale, leftBox.right + 10f * scale + centerWidth, board.bottom - 10f * scale)
    val rightBox = RectF(centerBox.right + 10f * scale, board.top + 10f * scale, board.right - 10f * scale, board.bottom - 10f * scale)

    val leftPlayer = model.players.getOrNull(0) ?: LiveOverlayPlayer("Người chơi 1", 0, isActive = model.currentPlayerIndex == 0)
    val rightPlayer = model.players.getOrNull(1) ?: LiveOverlayPlayer("Người chơi 2", 0, isActive = model.currentPlayerIndex == 1)

    drawPlayerBox(canvas, leftBox, leftPlayer, scale, darkPaint, redPaint, borderPaint, activePaint, textPaint, scorePaint, alignLeft = true)
    drawCenterBox(canvas, centerBox, model, scale, redPaint, smallTextPaint, scorePaint)
    drawPlayerBox(canvas, rightBox, rightPlayer, scale, darkPaint, redPaint, borderPaint, activePaint, textPaint, scorePaint, alignLeft = false)

    return bitmap
  }

  private fun drawConfiguredLogos(
    canvas: Canvas,
    width: Int,
    height: Int,
    scale: Float,
    model: LiveOverlayModel,
    redPaint: Paint,
    textPaint: Paint,
  ) {
    val livestreamLogos = model.logos.filter { logo ->
      logo.uri.isNotBlank() && (logo.locked || logo.showOnLivestream)
    }

    if (livestreamLogos.isEmpty()) {
      drawNativeLogo(canvas, width, height, scale, redPaint, textPaint)
      emitState("overlay_logo", "source=fallback_builtin")
      return
    }

    livestreamLogos.forEach { logo ->
      val dst = logoDestination(width, height, scale, logo.slot)
      val bitmap = loadOverlayLogoBitmap(logo.uri) ?: if (logo.locked) loadLogoBitmap() else null
      if (bitmap != null) {
        canvas.drawBitmap(bitmap, null, dst, Paint(Paint.ANTI_ALIAS_FLAG))
        emitState("overlay_logo", "slot=${logo.slot} loaded=true locked=${logo.locked}")
      } else {
        emitState("overlay_logo", "slot=${logo.slot} loaded=false locked=${logo.locked}")
        if (logo.locked) {
          drawNativeLogo(canvas, width, height, scale, redPaint, textPaint)
        }
      }
    }
  }

  private fun logoDestination(width: Int, height: Int, scale: Float, slot: String): RectF {
    val logoWidth = 120f * scale
    val logoHeight = 54f * scale
    val margin = 22f * scale
    return when (slot) {
      "topRight" -> RectF(width - logoWidth - margin, margin, width - margin, margin + logoHeight)
      "bottomLeft" -> RectF(margin, height - logoHeight - margin, margin + logoWidth, height - margin)
      "bottomRight" -> RectF(width - logoWidth - margin, height - logoHeight - margin, width - margin, height - margin)
      else -> RectF(margin, margin, margin + logoWidth, margin + logoHeight)
    }
  }

  private fun loadOverlayLogoBitmap(uriValue: String): Bitmap? {
    val context = reactContext ?: return null
    if (uriValue.isBlank()) return null

    return try {
      when {
        uriValue.startsWith("file://") -> BitmapFactory.decodeFile(uriValue.removePrefix("file://"))
        uriValue.startsWith("/") -> BitmapFactory.decodeFile(uriValue)
        uriValue.startsWith("content://") || uriValue.startsWith("android.resource://") -> {
          context.contentResolver.openInputStream(Uri.parse(uriValue))?.use { stream ->
            BitmapFactory.decodeStream(stream)
          }
        }
        uriValue.startsWith("asset:/") -> {
          val assetPath = uriValue.removePrefix("asset:/").removePrefix("/")
          context.assets.open(assetPath).use { stream -> BitmapFactory.decodeStream(stream) }
        }
        uriValue.startsWith("res:/") -> {
          val resourceName = File(uriValue).nameWithoutExtension
          val resId = context.resources.getIdentifier(resourceName, "drawable", context.packageName)
          if (resId != 0) BitmapFactory.decodeResource(context.resources, resId) else null
        }
        else -> {
          val resourceName = File(uriValue).nameWithoutExtension
          val resId = context.resources.getIdentifier(resourceName, "drawable", context.packageName)
          if (resId != 0) BitmapFactory.decodeResource(context.resources, resId) else null
        }
      }
    } catch (error: Throwable) {
      Log.w(TAG, "[Live Overlay Native] logo decode failed uri=$uriValue", error)
      null
    }
  }

  private fun drawNativeLogo(
    canvas: Canvas,
    width: Int,
    height: Int,
    scale: Float,
    redPaint: Paint,
    textPaint: Paint,
  ) {
    val logoBitmap = loadLogoBitmap()
    val logoWidth = 116f * scale
    val logoHeight = 52f * scale
    val logoLeft = (width - logoWidth) / 2f
    val logoTop = 18f * scale
    val dst = RectF(logoLeft, logoTop, logoLeft + logoWidth, logoTop + logoHeight)

    if (logoBitmap != null) {
      canvas.drawBitmap(logoBitmap, null, dst, Paint(Paint.ANTI_ALIAS_FLAG))
      emitState("overlay_logo", "loaded=true")
      return
    }

    val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.argb(210, 10, 10, 12)
      style = Paint.Style.FILL
    }
    canvas.drawRoundRect(dst, 18f * scale, 18f * scale, pillPaint)
    canvas.drawRoundRect(dst, 18f * scale, 18f * scale, redPaint)
    textPaint.textSize = 22f * scale
    textPaint.color = Color.WHITE
    canvas.drawText("APLUS", dst.centerX(), dst.centerY() + 8f * scale, textPaint)
    emitState("overlay_logo", "loaded=false")
  }

  private fun drawPlayerBox(
    canvas: Canvas,
    rect: RectF,
    player: LiveOverlayPlayer,
    scale: Float,
    darkPaint: Paint,
    redPaint: Paint,
    borderPaint: Paint,
    activePaint: Paint,
    textPaint: Paint,
    scorePaint: Paint,
    alignLeft: Boolean,
  ) {
    canvas.drawRoundRect(rect, 16f * scale, 16f * scale, darkPaint)
    canvas.drawRoundRect(rect, 16f * scale, 16f * scale, borderPaint)
    if (player.isActive) {
      canvas.drawRoundRect(rect, 16f * scale, 16f * scale, activePaint)
    }

    val scoreW = 88f * scale
    val scoreRect = if (alignLeft) {
      RectF(rect.right - scoreW, rect.top, rect.right, rect.bottom)
    } else {
      RectF(rect.left, rect.top, rect.left + scoreW, rect.bottom)
    }
    canvas.drawRoundRect(scoreRect, 14f * scale, 14f * scale, redPaint)

    scorePaint.textSize = 42f * scale
    scorePaint.color = Color.WHITE
    canvas.drawText(player.score.toString(), scoreRect.centerX(), scoreRect.centerY() + 15f * scale, scorePaint)

    textPaint.textSize = 24f * scale
    textPaint.color = Color.WHITE
    textPaint.textAlign = if (alignLeft) Paint.Align.LEFT else Paint.Align.RIGHT
    val nameX = if (alignLeft) rect.left + 22f * scale else rect.right - 22f * scale
    val availableWidth = rect.width() - scoreW - 34f * scale
    val name = ellipsizeForPaint(player.name, textPaint, availableWidth)
    canvas.drawText(name, nameX, rect.centerY() + 9f * scale, textPaint)
    textPaint.textAlign = Paint.Align.CENTER
  }

  private fun drawCenterBox(
    canvas: Canvas,
    rect: RectF,
    model: LiveOverlayModel,
    scale: Float,
    redPaint: Paint,
    smallTextPaint: Paint,
    scorePaint: Paint,
  ) {
    canvas.drawRoundRect(rect, 16f * scale, 16f * scale, redPaint)
    scorePaint.textSize = 20f * scale
    scorePaint.color = Color.WHITE
    val modeLabel = if (model.mode == "carom") "CAROM" else "POOL"
    val target = if (model.target.isNotBlank()) "Mục tiêu ${model.target}" else modeLabel
    canvas.drawText(target, rect.centerX(), rect.top + 27f * scale, scorePaint)

    smallTextPaint.textSize = 17f * scale
    smallTextPaint.color = Color.WHITE
    val bottom = buildString {
      if (model.timer.isNotBlank()) append(model.timer)
      if (model.inning.isNotBlank()) {
        if (isNotEmpty()) append("  •  ")
        append("Lượt ${model.inning}")
      }
    }
    canvas.drawText(bottom.ifBlank { modeLabel }, rect.centerX(), rect.bottom - 20f * scale, smallTextPaint)
  }

  private fun ellipsizeForPaint(text: String, paint: Paint, maxWidth: Float): String {
    if (paint.measureText(text) <= maxWidth) return text
    var value = text
    while (value.length > 1 && paint.measureText("$value…") > maxWidth) {
      value = value.dropLast(1)
    }
    return "$value…"
  }

  private fun loadLogoBitmap(): Bitmap? {
    val context = reactContext ?: return null
    val names = listOf(
      "src_assets_images_logo_small",
      "assets_images_logo_small",
      "logo_small",
      "logo_small_png",
      "src_assets_images_logo",
      "logo",
    )
    for (name in names) {
      val resId = context.resources.getIdentifier(name, "drawable", context.packageName)
      if (resId != 0) {
        return BitmapFactory.decodeResource(context.resources, resId)
      }
    }
    return null
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
      }
      if (method != null) {
        method.invoke(camera, view)
      } else {
        Log.i(TAG, "replaceView compatible overload not found; keeping existing preview view")
      }
    } catch (error: Throwable) {
      Log.w(TAG, "replaceView invoke failed", error)
    }
  }

  private fun logOverlayModelSummary(model: LiveOverlayModel) {
    val signature = buildString {
      append(model.enabled).append('|')
      append(model.mode).append('|')
      append(model.currentPlayerIndex).append('|')
      append(model.target).append('|')
      append(model.inning).append('|')
      model.players.forEach { player ->
        append('|').append(player.name)
        append(':').append(player.score)
        append(':').append(player.countryCode)
        append(':').append(player.isActive)
      }
      model.logos.forEach { logo ->
        append('|').append(logo.slot)
        append(':').append(logo.uri.isNotBlank())
        append(':').append(logo.locked)
        append(':').append(logo.showOnLivestream)
        append(':').append(logo.showOnSavedVideo)
      }
    }
    val now = System.currentTimeMillis()
    if (!LIVE_OVERLAY_VERBOSE_LOGS && signature == lastOverlaySummaryLogSignature && now - lastOverlaySummaryLogMs < 30000L) {
      return
    }
    lastOverlaySummaryLogSignature = signature
    lastOverlaySummaryLogMs = now
    Log.i(TAG, "[Live Overlay Native] overlay model enabled=${model.enabled} mode=${model.mode} players=${model.players.size}")
  }

  private fun scheduleOverlayApply(reason: String, delayMs: Long = 900L) {
    val view = previewView ?: return
    if (overlayApplyScheduled) {
      emitState("overlay_deferred", "already_scheduled:$reason")
      return
    }
    overlayApplyScheduled = true
    view.postDelayed({
      synchronized(this) {
        overlayApplyScheduled = false
        applyOverlayIfStreaming(reason)
      }
    }, delayMs.coerceAtLeast(250L))
  }

  private fun applyOverlayIfStreaming(reason: String) {
    val camera = rtmpCamera ?: return
    if (!camera.isStreaming || !rtmpConnected) {
      emitState("overlay_deferred", reason)
      return
    }
    if (LIVE_OVERLAY_VERBOSE_LOGS) {
      Log.i(TAG, "[Live Overlay Native] applying overlay after stream connected reason=$reason")
    }
    applyOverlayFilter(camera, overlayStreamWidth, overlayStreamHeight)
  }

  private fun buildOverlaySignature(width: Int, height: Int, model: LiveOverlayModel): String {
    return buildString {
      append(width).append('x').append(height)
      append('|').append(model.enabled)
      append('|').append(model.mode)
      append('|').append(model.currentPlayerIndex)
      append('|').append(model.target)
      append('|').append(model.inning)
      append('|').append(model.timer)
      model.logos.forEach { logo ->
        append('|').append(logo.slot)
        append(':').append(logo.uri)
        append(':').append(logo.locked)
        append(':').append(logo.showOnLivestream)
      }
      model.players.forEach { player ->
        append('|').append(player.name)
        append(':').append(player.score)
        append(':').append(player.countryCode)
        append(':').append(player.isActive)
      }
    }
  }

  private fun recycleBitmapLater(bitmap: Bitmap?) {
    if (bitmap == null || bitmap.isRecycled) return
    val view = previewView
    if (view == null) {
      try {
        bitmap.recycle()
      } catch (_: Throwable) {
      }
      return
    }
    view.postDelayed({
      try {
        if (!bitmap.isRecycled) bitmap.recycle()
      } catch (_: Throwable) {
      }
    }, 8_000L)
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
    emitState("overlay_deferred", "waiting_connection_success")
  }

  override fun onConnectionSuccessRtmp() {
    rtmpConnected = true
    emitState("connected", null)
    scheduleOverlayApply("connected", 1_400L)
  }

  override fun onConnectionFailedRtmp(reason: String) {
    rtmpConnected = false
    emitState("error", reason)
  }

  override fun onNewBitrateRtmp(bitrate: Long) {
    emitState("bitrate", bitrate.toString())
  }

  override fun onDisconnectRtmp() {
    rtmpConnected = false
    emitState("disconnected", null)
  }

  override fun onAuthErrorRtmp() {
    emitState("auth_error", null)
  }

  override fun onAuthSuccessRtmp() {
    emitState("auth_success", null)
  }
}
