package com.aplus.score.youtube

import android.util.Log
import com.aplus.score.uvc.UvcCameraRegistry
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

object UvcYouTubeLiveEngine {
  private const val TAG = "UvcYouTubeLiveEngine"

  private var reactContext: ReactApplicationContext? = null

  fun init(context: ReactApplicationContext) {
    reactContext = context
  }

  @Synchronized
  fun ensurePreview(): Boolean {
    val view = UvcCameraRegistry.activeView
    if (view == null) {
      emitState("error", "Chưa nhận được webcam USB hoặc preview webcam chưa mở.")
      return false
    }

    val opened = readBooleanField(view, "isCameraOpened")
    val previewStarted = readBooleanField(view, "previewStarted")
    if (!opened || !previewStarted) {
      emitState("error", "Webcam UVC chưa sẵn sàng. Hãy đợi preview hiện lên rồi thử lại.")
      return false
    }

    emitState("preview", "uvc-preview")
    return true
  }

  @Synchronized
  fun startStream(config: Any?): Boolean {
    Log.w(TAG, "UVC live guard-only mode: stream blocked to avoid crash")
    emitState(
      "error",
      "Chưa nhận được webcam USB ổn định. Tạm thời chỉ live bằng camera điện thoại để tránh crash.",
    )
    return false
  }

  @Synchronized
  fun stopStream() {
    emitState("stopped", null)
  }

  @Synchronized
  fun switchCamera() {
    emitState("camera_locked", "external")
  }

  @Synchronized
  fun getZoomSnapshot(): Map<String, Any> {
    return mapOf(
      "supported" to false,
      "minZoom" to 1.0,
      "maxZoom" to 1.0,
      "zoom" to 1.0,
      "source" to "external",
    )
  }

  @Synchronized
  fun setZoom(level: Double): Double = level

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

  private fun readBooleanField(target: Any, name: String): Boolean {
    return try {
      val field = target.javaClass.getDeclaredField(name)
      field.isAccessible = true
      field.getBoolean(target)
    } catch (_: Throwable) {
      false
    }
  }
}
