package com.aplus.score.youtube

import android.content.Context
import android.widget.FrameLayout

internal data class NativeLiveOverlayConfig(
  val visible: Boolean = false,
  val variant: String = "pool",
  val source: String = "gameplay-shared-overlay-snapshot",
  val snapshotUri: String = "",
  val snapshotWidth: Int = 0,
  val snapshotHeight: Int = 0,
  val updatedAt: Double = 0.0,
)

internal class YouTubeLiveOverlayView(context: Context) : FrameLayout(context) {
  fun update(config: NativeLiveOverlayConfig, width: Int, height: Int) {
    removeAllViews()
  }
}
