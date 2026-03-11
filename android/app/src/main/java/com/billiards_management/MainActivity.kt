package com.billiards_management

import android.os.Bundle
import android.view.KeyEvent
import com.billiards_management.RemoteControl.RemoteControlModule
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "billiards_management"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
    return true
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    val map = Arguments.createMap()
    map.putString("keyCode", keyCode.toString())
    RemoteControlModule.sendEvent("onRemoteKeyDown", map)
    return true
  }
}