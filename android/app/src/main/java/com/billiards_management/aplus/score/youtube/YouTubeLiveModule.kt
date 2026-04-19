package com.aplus.score.youtube

import android.hardware.camera2.CameraMetadata
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class YouTubeLiveModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var activeSourceType: String = "phone"

  init {
    YouTubeLiveEngine.init(reactContext)
    UvcYouTubeLiveEngine.init(reactContext)
  }

  override fun getName(): String = "YouTubeLiveModule"

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
  fun startStream(url: String, options: ReadableMap?, promise: Promise) {
    val width = options?.getInt("width") ?: 1280
    val height = options?.getInt("height") ?: 720
    val fps = options?.getInt("fps") ?: 30
    val bitrate = options?.getInt("bitrate") ?: 4500 * 1024
    val audioBitrate = options?.getInt("audioBitrate") ?: 128 * 1024
    val sampleRate = options?.getInt("sampleRate") ?: 44100
    val isStereo = options?.getBoolean("isStereo") ?: true
    val sourceType = options?.getString("sourceType") ?: activeSourceType
    val orientation = options?.getString("orientation") ?: "landscape"

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
    YouTubeLiveEngine.startStream(
      YouTubeLiveEngine.StreamConfig(
        url = url,
        width = width,
        height = height,
        fps = fps,
        bitrate = bitrate,
        audioBitrate = audioBitrate,
        sampleRate = sampleRate,
        isStereo = isStereo,
        facing = facing,
        orientation = orientation,
      ),
    )
    promise.resolve(true)
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
