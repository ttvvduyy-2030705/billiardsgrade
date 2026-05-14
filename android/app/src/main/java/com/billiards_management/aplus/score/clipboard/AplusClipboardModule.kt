package com.aplus.score.clipboard

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AplusClipboardModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AplusClipboardModule"

  @ReactMethod
  fun setString(value: String, promise: Promise) {
    try {
      val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      val clip = ClipData.newPlainText("ScoreMenu QR", value)
      clipboard.setPrimaryClip(clip)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("E_CLIPBOARD_COPY_FAILED", "Không thể copy vào bộ nhớ tạm.", error)
    }
  }
}
