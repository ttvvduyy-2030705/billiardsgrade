package com.aplus.score.youtube

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.aplus.score.R
import kotlin.math.max
import kotlin.math.min

internal data class NativeLiveOverlayPlayer(
  val name: String = "",
  val flag: String = "",
  val score: Int = 0,
  val currentPoint: Int = 0,
  val color: String = "",
  val highestRate: Int = 0,
  val average: Float = 0f,
)

internal data class NativeLiveOverlayThumbnails(
  val enabled: Boolean = false,
  val topLeft: List<String> = emptyList(),
  val topRight: List<String> = emptyList(),
  val bottomLeft: List<String> = emptyList(),
  val bottomRight: List<String> = emptyList(),
) {
  fun totalCount(): Int = topLeft.size + topRight.size + bottomLeft.size + bottomRight.size
}

internal data class NativeLiveOverlayConfig(
  val visible: Boolean = false,
  val variant: String = "pool",
  val currentPlayerIndex: Int = 0,
  val countdownTime: Int = 0,
  val baseCountdown: Int = 0,
  val goal: Int = 0,
  val totalTurns: Int = 1,
  val players: List<NativeLiveOverlayPlayer> = emptyList(),
  val thumbnails: NativeLiveOverlayThumbnails = NativeLiveOverlayThumbnails(),
)

internal class YouTubeLiveOverlayView(context: Context) : FrameLayout(context) {
  private var targetWidth = 1280
  private var targetHeight = 720

  init {
    setBackgroundColor(Color.TRANSPARENT)
    clipChildren = false
    clipToPadding = false
  }

  fun update(config: NativeLiveOverlayConfig, width: Int, height: Int) {
    targetWidth = max(width, 1)
    targetHeight = max(height, 1)
    removeAllViews()

    if (!config.visible) {
      finishLayout()
      return
    }

    renderThumbnailLayer(config.thumbnails)
    if (config.variant == "carom") {
      renderCaromScoreboard(config)
    } else {
      renderPoolScoreboard(config)
    }
    finishLayout()
  }

  private fun finishLayout() {
    measure(
      MeasureSpec.makeMeasureSpec(targetWidth, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(targetHeight, MeasureSpec.EXACTLY),
    )
    layout(0, 0, targetWidth, targetHeight)
    invalidate()
  }

  private fun dp(value: Float): Int = (value * resources.displayMetrics.density + 0.5f).toInt()
  private fun sw(value: Float): Int = max(1, (targetWidth * value).toInt())
  private fun sh(value: Float): Int = max(1, (targetHeight * value).toInt())
  private fun overlayPadding(): Int = max(dp(8f), min(sw(0.018f), sh(0.04f)))

  private fun renderThumbnailLayer(thumbnails: NativeLiveOverlayThumbnails) {
    val hasAnyConfigImage = thumbnails.topLeft.isNotEmpty() ||
      thumbnails.topRight.isNotEmpty() ||
      thumbnails.bottomLeft.isNotEmpty() ||
      thumbnails.bottomRight.isNotEmpty()

    if (thumbnails.enabled && hasAnyConfigImage) {
      renderThumbnailSlot(thumbnails.topLeft, Gravity.TOP or Gravity.START)
      renderThumbnailSlot(thumbnails.topRight, Gravity.TOP or Gravity.END)
      renderThumbnailSlot(thumbnails.bottomLeft, Gravity.BOTTOM or Gravity.START)
      renderThumbnailSlot(thumbnails.bottomRight, Gravity.BOTTOM or Gravity.END)
      return
    }

    // Overlay logo is part of the match overlay. When config has no custom logo,
    // use the bundled transparent APlus logo directly on the video frame.
    renderFallbackLogo(Gravity.TOP or Gravity.START)
  }

  private fun renderThumbnailSlot(images: List<String>, slotGravity: Int) {
    if (images.isEmpty()) return

    val slot = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      this.gravity = Gravity.CENTER
      setBackgroundColor(Color.TRANSPARENT)
    }

    images.take(1).forEach { uri ->
      val image = ImageView(context).apply {
        setBackgroundColor(Color.TRANSPARENT)
        scaleType = ImageView.ScaleType.FIT_CENTER
        adjustViewBounds = true
        try {
          setImageURI(Uri.parse(uri))
        } catch (_: Throwable) {
          setImageResource(R.drawable.src_assets_images_logofilled)
        }
      }
      slot.addView(image, LinearLayout.LayoutParams(sw(0.14f), sh(0.10f)))
    }

    addView(slot, FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT,
      slotGravity,
    ).apply {
      setMargins(overlayPadding(), overlayPadding(), overlayPadding(), overlayPadding())
    })
  }

  private fun renderFallbackLogo(logoGravity: Int) {
    val image = ImageView(context).apply {
      setBackgroundColor(Color.TRANSPARENT)
      scaleType = ImageView.ScaleType.FIT_CENTER
      setImageResource(R.drawable.src_assets_images_logofilled)
    }

    addView(image, FrameLayout.LayoutParams(sw(0.14f), sh(0.10f), logoGravity).apply {
      setMargins(overlayPadding(), overlayPadding(), overlayPadding(), overlayPadding())
    })
  }

  private fun renderPoolScoreboard(config: NativeLiveOverlayConfig) {
    val p1 = config.players.getOrNull(0) ?: NativeLiveOverlayPlayer(name = "Người chơi 1")
    val p2 = config.players.getOrNull(1) ?: NativeLiveOverlayPlayer(name = "Người chơi 2")
    val boardWidth = min(sw(0.70f), dp(920f))
    val boardHeight = max(sh(0.090f), dp(58f))
    val bottom = max(sh(0.055f), dp(26f))

    val root = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.TRANSPARENT)
    }

    val row = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.TRANSPARENT)
    }

    row.addView(poolPlayerBlock(p1, config.currentPlayerIndex == 0, true), LinearLayout.LayoutParams(0, boardHeight, 1.2f))
    row.addView(scoreBlock(p1.score), LinearLayout.LayoutParams(sw(0.080f), boardHeight))
    row.addView(goalBlock(config.goal), LinearLayout.LayoutParams(sw(0.13f), boardHeight))
    row.addView(scoreBlock(p2.score), LinearLayout.LayoutParams(sw(0.080f), boardHeight))
    row.addView(poolPlayerBlock(p2, config.currentPlayerIndex == 1, false), LinearLayout.LayoutParams(0, boardHeight, 1.2f))
    root.addView(row, LinearLayout.LayoutParams(boardWidth, boardHeight))

    val progress = FrameLayout(context).apply {
      setBackgroundColor(Color.rgb(15, 214, 45))
    }
    root.addView(progress, LinearLayout.LayoutParams(boardWidth, max(dp(7f), sh(0.012f))).apply {
      topMargin = max(dp(5f), sh(0.008f))
    })

    addView(root, FrameLayout.LayoutParams(boardWidth, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL).apply {
      bottomMargin = bottom
    })
  }

  private fun poolPlayerBlock(player: NativeLiveOverlayPlayer, active: Boolean, leftSide: Boolean): View {
    val root = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(10f), 0, dp(10f), 0)
      setBackgroundColor(if (active) Color.rgb(255, 46, 64) else Color.rgb(238, 48, 62))
    }

    val flag = TextView(context).apply {
      text = normalizeFlag(player.flag)
      textSize = 16f
      gravity = Gravity.CENTER
      includeFontPadding = false
    }

    val name = TextView(context).apply {
      text = player.name.ifBlank { if (leftSide) "Người chơi 1" else "Người chơi 2" }
      setTextColor(Color.WHITE)
      textSize = 14f
      typeface = Typeface.DEFAULT_BOLD
      maxLines = 1
      includeFontPadding = false
      gravity = if (leftSide) Gravity.START or Gravity.CENTER_VERTICAL else Gravity.END or Gravity.CENTER_VERTICAL
    }

    if (leftSide) {
      root.addView(flag, LinearLayout.LayoutParams(dp(26f), ViewGroup.LayoutParams.MATCH_PARENT))
      root.addView(name, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f))
    } else {
      root.addView(name, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f))
      root.addView(flag, LinearLayout.LayoutParams(dp(26f), ViewGroup.LayoutParams.MATCH_PARENT))
    }
    return root
  }

  private fun scoreBlock(score: Int): View {
    return TextView(context).apply {
      text = score.toString()
      setTextColor(Color.WHITE)
      textSize = 22f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      includeFontPadding = false
      setBackgroundColor(Color.rgb(224, 19, 35))
    }
  }

  private fun goalBlock(goal: Int): View {
    return LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.rgb(38, 38, 44))
      addView(TextView(context).apply {
        text = "MỤC TIÊU"
        setTextColor(Color.WHITE)
        textSize = 9f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        includeFontPadding = false
      }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
      addView(TextView(context).apply {
        text = goal.toString()
        setTextColor(Color.WHITE)
        textSize = 18f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        includeFontPadding = false
      }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.4f))
    }
  }

  private fun renderCaromScoreboard(config: NativeLiveOverlayConfig) {
    val p1 = config.players.getOrNull(0) ?: NativeLiveOverlayPlayer(name = "Người chơi 1")
    val p2 = config.players.getOrNull(1) ?: NativeLiveOverlayPlayer(name = "Người chơi 2")
    val boardWidth = min(sw(0.48f), dp(620f))
    val boardHeight = max(sh(0.18f), dp(118f))
    val bottom = max(sh(0.055f), dp(26f))

    val root = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(12f), dp(8f), dp(12f), dp(8f))
      setBackgroundColor(Color.argb(218, 18, 18, 22))
    }

    val title = TextView(context).apply {
      text = "CAROM  |  Lượt ${config.totalTurns}  |  Mục tiêu ${config.goal}"
      setTextColor(Color.WHITE)
      textSize = 13f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      includeFontPadding = false
    }
    root.addView(title, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(28f)))

    root.addView(caromPlayerRow(p1, config.currentPlayerIndex == 0, true), LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
    root.addView(caromPlayerRow(p2, config.currentPlayerIndex == 1, false), LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

    val time = TextView(context).apply {
      val remain = max(config.countdownTime, 0)
      text = "${remain}s"
      setTextColor(Color.rgb(22, 230, 57))
      textSize = 12f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      includeFontPadding = false
    }
    root.addView(time, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(22f)))

    addView(root, FrameLayout.LayoutParams(boardWidth, boardHeight, Gravity.BOTTOM or Gravity.START).apply {
      leftMargin = overlayPadding()
      bottomMargin = bottom
    })
  }

  private fun caromPlayerRow(player: NativeLiveOverlayPlayer, active: Boolean, first: Boolean): View {
    val root = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(8f), 0, dp(8f), 0)
      setBackgroundColor(if (active) Color.argb(240, 222, 20, 38) else Color.argb(160, 45, 45, 52))
    }

    val flag = TextView(context).apply {
      text = normalizeFlag(player.flag)
      textSize = 15f
      gravity = Gravity.CENTER
      includeFontPadding = false
    }
    root.addView(flag, LinearLayout.LayoutParams(dp(26f), ViewGroup.LayoutParams.MATCH_PARENT))

    val name = TextView(context).apply {
      text = player.name.ifBlank { if (first) "Người chơi 1" else "Người chơi 2" }
      setTextColor(Color.WHITE)
      textSize = 13f
      typeface = Typeface.DEFAULT_BOLD
      maxLines = 1
      gravity = Gravity.CENTER_VERTICAL
      includeFontPadding = false
    }
    root.addView(name, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f))

    val current = TextView(context).apply {
      text = player.currentPoint.toString()
      setTextColor(Color.WHITE)
      textSize = 16f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      includeFontPadding = false
    }
    root.addView(current, LinearLayout.LayoutParams(dp(46f), ViewGroup.LayoutParams.MATCH_PARENT))

    val score = TextView(context).apply {
      text = player.score.toString()
      setTextColor(Color.WHITE)
      textSize = 22f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      includeFontPadding = false
    }
    root.addView(score, LinearLayout.LayoutParams(dp(58f), ViewGroup.LayoutParams.MATCH_PARENT))
    return root
  }

  private fun normalizeFlag(value: String): String {
    return when (value.trim().lowercase()) {
      "vn", "vi", "vietnam", "viet nam" -> "🇻🇳"
      "us", "usa", "en", "english" -> "🇺🇸"
      else -> value.ifBlank { "★" }
    }
  }
}
