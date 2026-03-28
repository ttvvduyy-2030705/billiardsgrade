package com.aplus.score.uvc

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

class UvcCameraViewManager : SimpleViewManager<UvcCameraView>() {
    override fun getName(): String = "UvcCameraView"

    override fun createViewInstance(reactContext: ThemedReactContext): UvcCameraView {
        return UvcCameraView(reactContext)
    }

    override fun onDropViewInstance(view: UvcCameraView) {
        view.releaseCamera()
        super.onDropViewInstance(view)
    }
}
