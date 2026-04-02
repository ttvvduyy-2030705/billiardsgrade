package com.aplus.score.youtube

import android.view.SurfaceHolder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.pedro.rtplibrary.view.OpenGlView

class YouTubeLivePreviewViewManager : SimpleViewManager<OpenGlView>() {
  override fun getName(): String = "YouTubeLivePreviewView"

  override fun createViewInstance(reactContext: ThemedReactContext): OpenGlView {
    return OpenGlView(reactContext).also { view ->
      YouTubeLiveEngine.attachView(view)
      view.holder.addCallback(object : SurfaceHolder.Callback {
        override fun surfaceCreated(holder: SurfaceHolder) = Unit

        override fun surfaceChanged(
          holder: SurfaceHolder,
          format: Int,
          width: Int,
          height: Int,
        ) {
          YouTubeLiveEngine.onSurfaceReady(view)
        }

        override fun surfaceDestroyed(holder: SurfaceHolder) {
          YouTubeLiveEngine.onSurfaceDestroyed(view)
        }
      })
    }
  }

  override fun onDropViewInstance(view: OpenGlView) {
    YouTubeLiveEngine.detachView(view)
    super.onDropViewInstance(view)
  }
}
