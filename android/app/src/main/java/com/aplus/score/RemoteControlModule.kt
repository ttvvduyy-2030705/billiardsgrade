package com.aplus.score

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule

class RemoteControlModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private var reactAppContext: ReactApplicationContext? = null

    fun setReactContext(context: ReactApplicationContext) {
      reactAppContext = context
    }

    fun sendEvent(eventName: String, keyCode: String) {
      val context = reactAppContext ?: return
      val params = Arguments.createMap().apply {
        putString("keyCode", keyCode)
      }

      context
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    }
  }

  init {
    setReactContext(reactContext)
  }

  override fun getName(): String {
    return "RemoteControl"
  }
}
