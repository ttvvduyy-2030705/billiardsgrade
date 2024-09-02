package com.billiards_management

import android.view.KeyEvent
import com.billiards_management.RemoteControl.RemoteControlModule
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate


class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "billiards_management"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        val map = Arguments.createMap();
        map.putString("keyCode", keyCode.toString());
        RemoteControlModule.sendEvent("onRemoteKeyDown", map);

        return super.onKeyDown(keyCode, event);
    }
}
