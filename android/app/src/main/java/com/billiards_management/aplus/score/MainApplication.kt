package com.aplus.score

import android.app.Application
import android.util.Log
import com.aplus.score.BuildConfig
import com.aplus.score.billing.AplusBillingPackage
import com.aplus.score.deviceconfig.ScreenMetricsPackage
import com.aplus.score.immersive.CartImmersivePackage
import com.aplus.score.youtube.YouTubeLiveModulePackage
import com.aplus.score.youtube.YouTubeLivePreviewViewPackage
import com.billiards_management.RemoteControl.RemoteControlPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.google.mlkit.common.MlKit

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
    override fun getPackages() = PackageList(this).packages.apply {
      add(RemoteControlPackage())
      add(ScreenMetricsPackage())
      add(CartImmersivePackage())
      add(YouTubeLiveModulePackage())
      add(YouTubeLivePreviewViewPackage())
      add(AplusBillingPackage())
    }

    override fun getJSMainModuleName(): String = "index"
    override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
    override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
    override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
  }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    initializeMlKitForQrScanner()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }

  private fun initializeMlKitForQrScanner() {
    try {
      MlKit.initialize(this)
      Log.d("ScoreMenuQR", "ML Kit initialized for VisionCamera QR scanner")
    } catch (error: Throwable) {
      // Do not block the whole app if QR scanning is unavailable on a device.
      Log.w("ScoreMenuQR", "Failed to initialize ML Kit for QR scanner", error)
    }
  }
}
