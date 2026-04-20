package com.aplus.score.youtube

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.PorterDuff
import android.hardware.camera2.CameraMetadata
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.UIManagerModule
import java.io.File
import java.io.FileOutputStream

class YouTubeLiveModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "YouTubeLiveEngine"
  }

  private var activeSourceType: String = "phone"

  init {
    YouTubeLiveEngine.init(reactContext)
    UvcYouTubeLiveEngine.init(reactContext)
  }

  override fun getName(): String = "YouTubeLiveModule"

  @ReactMethod
  fun captureOverlayView(tag: Int, width: Int, height: Int, promise: Promise) {
    val safeWidth = width.coerceAtLeast(1)
    val safeHeight = height.coerceAtLeast(1)

    UiThreadUtil.runOnUiThread {
      var bitmap: Bitmap? = null
      try {
        val uiManager = reactApplicationContext.getNativeModule(UIManagerModule::class.java)
        val view = uiManager?.resolveView(tag)

        if (view == null) {
          promise.reject(
            "OVERLAY_VIEW_NOT_FOUND",
            "Không tìm thấy native view để capture overlay live. tag=$tag",
          )
          return@runOnUiThread
        }

        val viewWidth = view.width.coerceAtLeast(1)
        val viewHeight = view.height.coerceAtLeast(1)
        val scaleFactorX = safeWidth.toFloat() / viewWidth.toFloat()
        val scaleFactorY = safeHeight.toFloat() / viewHeight.toFloat()
        val density = reactApplicationContext.resources.displayMetrics.density
        bitmap = Bitmap.createBitmap(safeWidth, safeHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap!!)
        canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
        canvas.scale(scaleFactorX, scaleFactorY)
        view.draw(canvas)

        val file = File(
          reactApplicationContext.cacheDir,
          "youtube_live_overlay_" + System.currentTimeMillis().toString() + ".png",
        )

        FileOutputStream(file).use { output ->
          bitmap!!.compress(Bitmap.CompressFormat.PNG, 100, output)
        }

        val bytes = file.length()
        Log.i(
          TAG,
          "[Live Overlay Quality] devicePixelRatio=${density} viewLayout=${viewWidth}x${viewHeight} snapshotSize=${safeWidth}x${safeHeight} scaleFactorX=${scaleFactorX} scaleFactorY=${scaleFactorY}",
        )
        Log.i(
          TAG,
          "[Live Overlay Snapshot] nativeCaptured=true source=gameplay-overlay view=${view.width}x${view.height} output=${safeWidth}x${safeHeight} bytes=${bytes} tag=${tag} format=png quality=lossless",
        )
        promise.resolve("file://${file.absolutePath}")
      } catch (error: Throwable) {
        Log.e(TAG, "[Live Overlay Snapshot] nativeCaptured=false source=gameplay-overlay reason=${error.message}", error)
        promise.reject("OVERLAY_CAPTURE_FAILED", error.message ?: "Không capture được overlay live.", error)
      } finally {
        try {
          bitmap?.recycle()
        } catch (_: Throwable) {
        }
      }
    }
  }

  @ReactMethod
  fun preparePreview(cameraFacing: String?, sourceType: String?, promise: Promise) {
    activeSourceType = if (sourceType == "webcam") "webcam" else "phone"

    try {
      if (activeSourceType == "webcam") {
        promise.reject(
          "UVC_NOT_READY",
          "Chưa nhận được webcam USB. Hãy kiểm tra OTG/nguồn và mở preview webcam trước khi live.",
        )
        return
      }

      val facing = if (cameraFacing == "front") {
        CameraMetadata.LENS_FACING_FRONT
      } else {
        CameraMetadata.LENS_FACING_BACK
      }
      YouTubeLiveEngine.ensurePreview(facing)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("PREPARE_PREVIEW_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun startStream(url: String?, options: ReadableMap?, promise: Promise) {
    try {
      val safeUrl = url?.trim().orEmpty()
      val width = options?.getInt("width") ?: 1280
      val height = options?.getInt("height") ?: 720
      val fps = options?.getInt("fps") ?: 30
      val bitrate = options?.getInt("bitrate") ?: 4500 * 1024
      val audioBitrate = options?.getInt("audioBitrate") ?: 128 * 1024
      val sampleRate = options?.getInt("sampleRate") ?: 44100
      val isStereo = options?.getBoolean("isStereo") ?: true
      val sourceType = options?.getString("sourceType") ?: activeSourceType

      Log.i(
        TAG,
        "[YouTube Live] validating params hasUrl=${safeUrl.isNotBlank()} hasStreamKey=${safeUrl.length > 24} width=${width} height=${height} fps=${fps} sourceType=${sourceType}",
      )

      if (safeUrl.isBlank()) {
        promise.reject("INVALID_RTMP_URL", "Thiếu RTMP URL/stream key, không thể bắt đầu live YouTube.")
        return
      }

      if (width <= 0 || height <= 0 || fps <= 0) {
        promise.reject("INVALID_STREAM_CONFIG", "Thông số encoder không hợp lệ: ${width}x${height}@${fps}.")
        return
      }

      activeSourceType = if (sourceType == "webcam") "webcam" else "phone"

      if (activeSourceType == "webcam") {
        promise.reject(
          "UVC_STREAM_NOT_READY",
          "Chưa nhận được webcam USB. Tạm thời chỉ live bằng camera điện thoại để tránh crash.",
        )
        return
      }

      val facing = if (options?.getString("cameraFacing") == "front") {
        CameraMetadata.LENS_FACING_FRONT
      } else {
        CameraMetadata.LENS_FACING_BACK
      }

      Log.i(TAG, "[YouTube Live] calling native startStream")
      YouTubeLiveEngine.startStream(
        YouTubeLiveEngine.StreamConfig(
          url = safeUrl,
          width = width,
          height = height,
          fps = fps,
          bitrate = bitrate,
          audioBitrate = audioBitrate,
          sampleRate = sampleRate,
          isStereo = isStereo,
          facing = facing,
        ),
      )
      Log.i(TAG, "[YouTubeLiveEngine] start success request accepted")
      promise.resolve(true)
    } catch (error: Throwable) {
      Log.e(TAG, "[YouTubeLiveEngine] start failed reason=${error.message}", error)
      promise.reject("START_STREAM_FAILED", error.message ?: "Không thể bắt đầu live YouTube.", error)
    }
  }

  @ReactMethod
  fun updateOverlay(options: ReadableMap?, promise: Promise) {
    try {
      YouTubeLiveEngine.updateOverlay(options)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("UPDATE_OVERLAY_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun startRecord(path: String?, promise: Promise) {
    if (activeSourceType == "webcam") {
      promise.resolve(false)
      return
    }

    try {
      promise.resolve(YouTubeLiveEngine.startRecord(path ?: ""))
    } catch (error: Throwable) {
      promise.reject("START_RECORD_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun stopRecord(promise: Promise) {
    if (activeSourceType == "webcam") {
      promise.resolve(null)
      return
    }

    try {
      promise.resolve(YouTubeLiveEngine.stopRecord())
    } catch (error: Throwable) {
      promise.reject("STOP_RECORD_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun stopStream(promise: Promise) {
    if (activeSourceType == "webcam") {
      UvcYouTubeLiveEngine.stopStream()
      promise.resolve(true)
      return
    }
    YouTubeLiveEngine.stopStream()
    promise.resolve(true)
  }

  @ReactMethod
  fun switchCamera(promise: Promise) {
    if (activeSourceType == "webcam") {
      UvcYouTubeLiveEngine.switchCamera()
      promise.resolve(false)
      return
    }
    YouTubeLiveEngine.switchCamera()
    promise.resolve(true)
  }

  @ReactMethod
  fun getZoomInfo(promise: Promise) {
    val snapshot = if (activeSourceType == "webcam") {
      UvcYouTubeLiveEngine.getZoomSnapshot()
    } else {
      YouTubeLiveEngine.getZoomSnapshot()
    }

    val data = Arguments.createMap()
    snapshot.forEach { (key, value) ->
      when (value) {
        is Boolean -> data.putBoolean(key, value)
        is Double -> data.putDouble(key, value)
        is String -> data.putString(key, value)
      }
    }
    promise.resolve(data)
  }

  @ReactMethod
  fun setZoom(level: Double, promise: Promise) {
    val result = if (activeSourceType == "webcam") {
      UvcYouTubeLiveEngine.setZoom(level)
    } else {
      YouTubeLiveEngine.setZoom(level)
    }
    promise.resolve(result)
  }
}
