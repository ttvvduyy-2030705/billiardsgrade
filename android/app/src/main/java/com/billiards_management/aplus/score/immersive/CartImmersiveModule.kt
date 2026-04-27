package com.aplus.score.immersive

import com.aplus.score.MainActivity
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CartImmersiveModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartImmersiveModule"

  @ReactMethod
  fun pauseForCartInput(source: String) {
    (currentActivity as? MainActivity)?.pauseImmersiveForCartInput(source)
  }

  @ReactMethod
  fun resumeAfterCartInput(source: String) {
    (currentActivity as? MainActivity)?.resumeImmersiveAfterCartInput(source)
  }
}
