package com.aplus.score.youtube

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.net.Uri
import com.aplus.score.R
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

internal class YouTubeLiveOverlayBitmapRenderer(private val context: Context) {
  private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    typeface = Typeface.DEFAULT_BOLD
    isSubpixelText = true
  }
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
  }
  private val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG or Paint.DITHER_FLAG)
  private val imageCache = mutableMapOf<String, Bitmap>()
  private val reusableOverlayBitmaps = mutableListOf<Bitmap>()
  private var reusableOverlayBitmapIndex = 0

  fun render(config: NativeLiveOverlayConfig, width: Int, height: Int): Bitmap {
    val safeWidth = width.coerceAtLeast(1)
    val safeHeight = height.coerceAtLeast(1)
    val bitmap = obtainReusableOverlayBitmap(safeWidth, safeHeight)

    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)

    if (!config.visible) return bitmap

    renderThumbnailLayer(canvas, config.thumbnails, safeWidth, safeHeight)
    if (config.variant == "carom") {
      renderCaromScoreboard(canvas, config, safeWidth, safeHeight)
    } else {
      renderPoolScoreboard(canvas, config, safeWidth, safeHeight)
    }
    return bitmap
  }

  fun release() {
    reusableOverlayBitmaps.forEach { bitmap ->
      if (!bitmap.isRecycled) bitmap.recycle()
    }
    reusableOverlayBitmaps.clear()
    reusableOverlayBitmapIndex = 0
    imageCache.values.forEach { bitmap ->
      if (!bitmap.isRecycled) bitmap.recycle()
    }
    imageCache.clear()
  }

  private fun obtainReusableOverlayBitmap(width: Int, height: Int): Bitmap {
    // Keep a tiny ring buffer instead of drawing into the same Bitmap object that
    // ImageObjectFilterRender may still be uploading on the GL thread. Reusing a
    // single mutable bitmap caused one-frame transparent flashes whenever the
    // countdown/score model updated.
    if (
      reusableOverlayBitmaps.isEmpty() ||
      reusableOverlayBitmaps.any { it.isRecycled || it.width != width || it.height != height }
    ) {
      reusableOverlayBitmaps.forEach { bitmap ->
        if (!bitmap.isRecycled) bitmap.recycle()
      }
      reusableOverlayBitmaps.clear()
      repeat(3) {
        reusableOverlayBitmaps += Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
      }
      reusableOverlayBitmapIndex = 0
    }

    val bitmap = reusableOverlayBitmaps[reusableOverlayBitmapIndex % reusableOverlayBitmaps.size]
    reusableOverlayBitmapIndex = (reusableOverlayBitmapIndex + 1) % reusableOverlayBitmaps.size
    return bitmap
  }

  private fun u(width: Int, height: Int): Float = min(width / 1280f, height / 720f).coerceAtLeast(0.45f)
  private fun px(width: Int, height: Int, value: Float): Float = value * u(width, height)
  private fun sw(width: Int, value: Float): Float = max(1f, width * value)
  private fun sh(height: Int, value: Float): Float = max(1f, height * value)
  private fun overlayPadding(width: Int, height: Int): Float = max(px(width, height, 8f), min(sw(width, 0.018f), sh(height, 0.04f)))

  private fun renderThumbnailLayer(
    canvas: Canvas,
    thumbnails: NativeLiveOverlayThumbnails,
    width: Int,
    height: Int,
  ) {
    val hasAnyConfigImage = thumbnails.topLeft.isNotEmpty() ||
      thumbnails.topRight.isNotEmpty() ||
      thumbnails.bottomLeft.isNotEmpty() ||
      thumbnails.bottomRight.isNotEmpty()

    if (thumbnails.enabled && hasAnyConfigImage) {
      renderThumbnailSlot(canvas, thumbnails.topLeft, width, height, Slot.TOP_LEFT)
      renderThumbnailSlot(canvas, thumbnails.topRight, width, height, Slot.TOP_RIGHT)
      renderThumbnailSlot(canvas, thumbnails.bottomLeft, width, height, Slot.BOTTOM_LEFT)
      renderThumbnailSlot(canvas, thumbnails.bottomRight, width, height, Slot.BOTTOM_RIGHT)
      return
    }

    drawLogo(canvas, null, width, height, Slot.TOP_LEFT)
  }

  private enum class Slot { TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT }

  private fun renderThumbnailSlot(canvas: Canvas, images: List<String>, width: Int, height: Int, slot: Slot) {
    val uri = images.firstOrNull()?.takeIf { it.isNotBlank() } ?: return
    drawLogo(canvas, uri, width, height, slot)
  }

  private fun drawLogo(canvas: Canvas, uri: String?, width: Int, height: Int, slot: Slot) {
    val source = getCachedBitmap(uri) ?: return
    val unit = u(width, height)
    val padding = overlayPadding(width, height)
    val boxWidth = 120f * unit
    val boxHeight = 70f * unit
    val left = when (slot) {
      Slot.TOP_LEFT, Slot.BOTTOM_LEFT -> padding
      Slot.TOP_RIGHT, Slot.BOTTOM_RIGHT -> width - padding - boxWidth
    }
    val top = when (slot) {
      Slot.TOP_LEFT, Slot.TOP_RIGHT -> padding
      Slot.BOTTOM_LEFT, Slot.BOTTOM_RIGHT -> height - padding - boxHeight
    }
    canvas.drawBitmap(source, null, RectF(left, top, left + boxWidth, top + boxHeight), imagePaint)
  }

  private fun getCachedBitmap(uri: String?): Bitmap? {
    val key = uri?.takeIf { it.isNotBlank() } ?: "__aplus_default_logo__"
    imageCache[key]?.takeIf { !it.isRecycled }?.let { return it }

    val decoded = if (key == "__aplus_default_logo__") {
      BitmapFactory.decodeResource(context.resources, R.drawable.src_assets_images_logofilled)
    } else {
      try {
        context.contentResolver.openInputStream(Uri.parse(key))?.use { input ->
          BitmapFactory.decodeStream(input)
        }
      } catch (_: Throwable) {
        null
      }
    } ?: if (key != "__aplus_default_logo__") {
      BitmapFactory.decodeResource(context.resources, R.drawable.src_assets_images_logofilled)
    } else {
      null
    }

    if (decoded != null) {
      imageCache[key] = decoded
    }
    return decoded
  }

  private data class PoolMetrics(
    val wrapperWidth: Float,
    val barHeight: Float,
    val bottomGap: Float,
    val playerNameSize: Float,
    val playerScoreSize: Float,
    val centerLabelSize: Float,
    val centerValueSize: Float,
    val timerHeight: Float,
    val timerTextSize: Float,
    val flagWidth: Float,
    val scoreMinWidth: Float,
    val horizontalPadding: Float,
  )

  private fun poolMetrics(width: Int, height: Int): PoolMetrics {
    val unit = u(width, height)
    return PoolMetrics(
      wrapperWidth = width * 0.88f,
      barHeight = 36f * unit,
      bottomGap = 10f * unit,
      playerNameSize = 13f * unit,
      playerScoreSize = 20f * unit,
      centerLabelSize = 8f * unit,
      centerValueSize = 15f * unit,
      timerHeight = 12f * unit,
      timerTextSize = 9f * unit,
      flagWidth = 24f * unit,
      scoreMinWidth = 40f * unit,
      horizontalPadding = 8f * unit,
    )
  }

  private fun renderPoolScoreboard(canvas: Canvas, config: NativeLiveOverlayConfig, width: Int, height: Int) {
    val p1 = config.players.getOrNull(0) ?: NativeLiveOverlayPlayer(name = "Player 1")
    val p2 = config.players.getOrNull(1) ?: NativeLiveOverlayPlayer(name = "Player 2")
    val m = poolMetrics(width, height)
    val progressGap = 6f * u(width, height)
    val boardWidth = m.wrapperWidth
    val timerTopGap = progressGap
    val totalHeight = m.barHeight + timerTopGap + m.timerHeight
    val left = (width - boardWidth) / 2f
    val top = height - m.bottomGap - totalHeight

    val flagW = m.flagWidth
    val centerW = m.scoreMinWidth + 44f * u(width, height)
    val playerW = max(1f, (boardWidth - flagW * 2f - centerW) / 2f)
    val barRect = RectF(left, top, left + boardWidth, top + m.barHeight)
    val radius = 10f * u(width, height)

    // RN PoolBroadcastScoreboard: rounded top bar, white border, red flag slots,
    // gradient player panels, black center goal panel, black translucent score boxes.
    fillPaint.shader = null
    fillPaint.style = Paint.Style.FILL
    fillPaint.color = Color.rgb(22, 22, 22)
    canvas.drawRoundRect(barRect, radius, radius, fillPaint)

    val clipPath = Path().apply { addRoundRect(barRect, radius, radius, Path.Direction.CW) }
    canvas.save()
    canvas.clipPath(clipPath)

    var x = left
    drawFlagSlot(canvas, RectF(x, top, x + flagW, top + m.barHeight), p1.flag, config.currentPlayerIndex == 0, m)
    x += flagW
    drawPoolPlayerPanel(canvas, RectF(x, top, x + playerW, top + m.barHeight), p1, config.currentPlayerIndex == 0, true, m)
    x += playerW
    drawPoolGoalPanel(canvas, RectF(x, top, x + centerW, top + m.barHeight), config.goal, m)
    x += centerW
    drawPoolPlayerPanel(canvas, RectF(x, top, x + playerW, top + m.barHeight), p2, config.currentPlayerIndex == 1, false, m)
    x += playerW
    drawFlagSlot(canvas, RectF(x, top, x + flagW, top + m.barHeight), p2.flag, config.currentPlayerIndex == 1, m)

    canvas.restore()

    strokePaint.shader = null
    strokePaint.color = Color.argb(230, 255, 255, 255)
    strokePaint.strokeWidth = max(1f, 1f * u(width, height))
    canvas.drawRoundRect(barRect, radius, radius, strokePaint)

    drawPoolTimer(canvas, config, RectF(left, top + m.barHeight + timerTopGap, left + boardWidth, top + totalHeight), m, width, height)
  }

  private fun drawFlagSlot(canvas: Canvas, rect: RectF, flagValue: String, active: Boolean, metrics: PoolMetrics) {
    fillPaint.shader = null
    fillPaint.style = Paint.Style.FILL
    fillPaint.color = Color.rgb(255, 91, 87)
    canvas.drawRect(rect, fillPaint)

    textPaint.shader = null
    textPaint.color = if (active) Color.WHITE else Color.argb(140, 255, 255, 255)
    textPaint.typeface = Typeface.DEFAULT_BOLD
    textPaint.textSize = max(14f * (metrics.flagWidth / 24f), metrics.flagWidth * 0.72f)
    textPaint.textAlign = Paint.Align.CENTER
    drawCenteredText(canvas, normalizeFlag(flagValue), rect.centerX(), rect.centerY(), textPaint)
  }

  private fun drawPoolPlayerPanel(canvas: Canvas, rect: RectF, player: NativeLiveOverlayPlayer, active: Boolean, leftSide: Boolean, metrics: PoolMetrics) {
    val start = if (leftSide) Color.rgb(255, 91, 87) else Color.rgb(204, 18, 18)
    val end = if (leftSide) Color.rgb(204, 18, 18) else Color.rgb(255, 91, 87)
    fillPaint.style = Paint.Style.FILL
    fillPaint.shader = LinearGradient(rect.left, rect.top, rect.right, rect.top, start, end, Shader.TileMode.CLAMP)
    canvas.drawRect(rect, fillPaint)
    fillPaint.shader = null

    if (active) {
      fillPaint.color = Color.rgb(255, 91, 87)
      val activeStroke = max(2f, 2f * (metrics.flagWidth / 24f))
      canvas.drawRect(rect.left, rect.top, rect.right, rect.top + activeStroke, fillPaint)
      canvas.drawRect(rect.left, rect.bottom - activeStroke, rect.right, rect.bottom, fillPaint)
    }

    val padding = metrics.horizontalPadding
    val scoreBoxW = metrics.scoreMinWidth
    val scoreBoxH = max(1f, rect.height() - 8f * (metrics.flagWidth / 24f))
    val scoreTop = rect.centerY() - scoreBoxH / 2f
    val scoreRect = if (leftSide) {
      RectF(rect.right - padding - scoreBoxW, scoreTop, rect.right - padding, scoreTop + scoreBoxH)
    } else {
      RectF(rect.left + padding, scoreTop, rect.left + padding + scoreBoxW, scoreTop + scoreBoxH)
    }

    fillPaint.color = Color.argb(72, 0, 0, 0)
    canvas.drawRoundRect(scoreRect, 6f * (metrics.flagWidth / 24f), 6f * (metrics.flagWidth / 24f), fillPaint)

    textPaint.color = Color.WHITE
    textPaint.typeface = Typeface.DEFAULT_BOLD
    textPaint.textSize = metrics.playerScoreSize
    textPaint.textAlign = Paint.Align.CENTER
    drawCenteredText(canvas, player.score.toString(), scoreRect.centerX(), scoreRect.centerY(), textPaint)

    textPaint.textSize = metrics.playerNameSize
    textPaint.textAlign = if (leftSide) Paint.Align.LEFT else Paint.Align.RIGHT
    val name = player.name.ifBlank { if (leftSide) "Player 1" else "Player 2" }
    val nameLeft = if (leftSide) rect.left + padding else scoreRect.right + 8f * (metrics.flagWidth / 24f)
    val nameRight = if (leftSide) scoreRect.left - 8f * (metrics.flagWidth / 24f) else rect.right - padding
    val nameX = if (leftSide) nameLeft else nameRight
    drawCenteredText(canvas, ellipsize(name, max(0f, nameRight - nameLeft), textPaint), nameX, rect.centerY(), textPaint)
  }

  private fun drawPoolGoalPanel(canvas: Canvas, rect: RectF, goal: Int, metrics: PoolMetrics) {
    fillPaint.style = Paint.Style.FILL
    fillPaint.shader = LinearGradient(rect.left, rect.top, rect.right, rect.top, Color.rgb(17, 17, 17), Color.rgb(39, 39, 39), Shader.TileMode.CLAMP)
    canvas.drawRect(rect, fillPaint)
    fillPaint.shader = null

    textPaint.color = Color.rgb(230, 230, 230)
    textPaint.typeface = Typeface.DEFAULT_BOLD
    textPaint.textAlign = Paint.Align.CENTER
    textPaint.textSize = metrics.centerLabelSize
    drawCenteredText(canvas, "MỤC TIÊU", rect.centerX(), rect.top + rect.height() * 0.34f, textPaint)

    textPaint.color = Color.WHITE
    textPaint.textSize = metrics.centerValueSize
    drawCenteredText(canvas, goal.toString(), rect.centerX(), rect.top + rect.height() * 0.70f, textPaint)
  }

  private fun drawPoolTimer(canvas: Canvas, config: NativeLiveOverlayConfig, rect: RectF, metrics: PoolMetrics, width: Int, height: Int) {
    val radius = 999f
    fillPaint.shader = null
    fillPaint.style = Paint.Style.FILL
    fillPaint.color = Color.argb(210, 0, 0, 0)
    canvas.drawRoundRect(rect, radius, radius, fillPaint)

    strokePaint.color = Color.argb(102, 255, 255, 255)
    strokePaint.strokeWidth = max(1f, 1f * u(width, height))
    canvas.drawRoundRect(rect, radius, radius, strokePaint)

    val baseCountdown = max(config.baseCountdown, 0)
    val countdown = max(config.countdownTime, 0)
    val ratio = if (baseCountdown > 0) (countdown.toFloat() / baseCountdown.toFloat()).coerceIn(0f, 1f) else 0f
    if (ratio > 0f) {
      fillPaint.color = timerColor(countdown)
      canvas.drawRoundRect(RectF(rect.left, rect.top, rect.left + rect.width() * ratio, rect.bottom), radius, radius, fillPaint)
    }

    textPaint.color = Color.WHITE
    textPaint.typeface = Typeface.DEFAULT_BOLD
    textPaint.textSize = metrics.timerTextSize
    textPaint.textAlign = Paint.Align.CENTER
    drawCenteredText(canvas, if (baseCountdown > 0) "${countdown}s" else "--", rect.centerX(), rect.centerY(), textPaint)
  }

  private fun timerColor(countdown: Int): Int = when {
    countdown <= 5 -> Color.rgb(255, 77, 79)
    countdown <= 10 -> Color.rgb(247, 181, 0)
    else -> Color.rgb(52, 199, 89)
  }

  private fun renderCaromScoreboard(canvas: Canvas, config: NativeLiveOverlayConfig, width: Int, height: Int) {
    val p1 = config.players.getOrNull(0) ?: NativeLiveOverlayPlayer(name = "Người chơi 1")
    val p2 = config.players.getOrNull(1) ?: NativeLiveOverlayPlayer(name = "Người chơi 2")
    val unit = u(width, height)
    val boardWidth = 360f * unit
    val boardHeight = 148f * unit
    val left = 8f * unit
    val top = height - 10f * unit - boardHeight
    val root = RectF(left, top, left + boardWidth, top + boardHeight)
    val radius = 18f * unit

    fillPaint.shader = null
    fillPaint.style = Paint.Style.FILL
    fillPaint.color = Color.rgb(117, 118, 112)
    canvas.drawRoundRect(root, radius, radius, fillPaint)

    val borderRight = 10f * unit
    val contentRight = root.right - borderRight
    val topRowsHeight = 96f * unit
    val bottomRowTop = root.top + topRowsHeight
    val turnWidth = 54f * unit
    val rowsLeft = root.left + turnWidth + 4f * unit
    val rowsRight = contentRight
    val rowHeight = topRowsHeight / 2f

    fillPaint.color = Color.rgb(117, 118, 112)
    canvas.drawRect(root.left, root.top, root.left + turnWidth, bottomRowTop, fillPaint)
    textPaint.color = Color.WHITE
    textPaint.typeface = Typeface.DEFAULT_BOLD
    textPaint.textAlign = Paint.Align.CENTER
    textPaint.textSize = 40f * unit
    drawCenteredText(canvas, max(1, config.totalTurns).toString(), root.left + turnWidth / 2f, root.top + topRowsHeight / 2f, textPaint)

    drawCaromPlayerRow(canvas, RectF(rowsLeft, root.top, rowsRight, root.top + rowHeight), p1, config.currentPlayerIndex == 0, true, unit)
    drawCaromPlayerRow(canvas, RectF(rowsLeft, root.top + rowHeight, rowsRight, bottomRowTop), p2, config.currentPlayerIndex == 1, false, unit)
    drawCaromCountdownRow(canvas, config, RectF(root.left, bottomRowTop + 4f * unit, contentRight, root.bottom - 4f * unit), unit)
  }

  private fun drawCaromPlayerRow(canvas: Canvas, rect: RectF, player: NativeLiveOverlayPlayer, active: Boolean, first: Boolean, unit: Float) {
    val rowRadius = 10f * unit
    fillPaint.shader = null
    fillPaint.style = Paint.Style.FILL
    fillPaint.color = parseColor(player.color, if (first) Color.rgb(218, 20, 38) else Color.rgb(54, 54, 62))
    val path = Path().apply {
      if (first) {
        addRoundRect(rect, floatArrayOf(rowRadius, rowRadius, rowRadius, rowRadius, 0f, 0f, 0f, 0f), Path.Direction.CW)
      } else {
        addRoundRect(rect, floatArrayOf(0f, 0f, 0f, 0f, rowRadius, rowRadius, rowRadius, rowRadius), Path.Direction.CW)
      }
    }
    canvas.drawPath(path, fillPaint)

    val flagW = 24f * unit
    val flagH = 18f * unit
    val inset = 10f * unit
    val flagRect = RectF(rect.left + inset, rect.centerY() - flagH / 2f, rect.left + inset + flagW, rect.centerY() + flagH / 2f)
    val flag = normalizeFlag(player.flag)
    if (flag.isNotBlank()) {
      fillPaint.color = Color.WHITE
      canvas.drawRoundRect(flagRect, 4f * unit, 4f * unit, fillPaint)
      textPaint.color = Color.BLACK
      textPaint.typeface = Typeface.DEFAULT_BOLD
      textPaint.textSize = 13f * unit
      textPaint.textAlign = Paint.Align.CENTER
      drawCenteredText(canvas, flag, flagRect.centerX(), flagRect.centerY(), textPaint)
    }

    val currentW = 32f * unit
    val scoreW = 54f * unit
    val scoreLeft = rect.right - inset - scoreW
    val currentLeft = scoreLeft - currentW

    fillPaint.color = Color.BLACK
    canvas.drawRect(scoreLeft, rect.top, scoreLeft + scoreW, rect.bottom, fillPaint)

    textPaint.color = Color.WHITE
    textPaint.typeface = Typeface.DEFAULT_BOLD
    textPaint.textAlign = Paint.Align.LEFT
    textPaint.textSize = 16f * unit
    val nameLeft = if (flag.isNotBlank()) flagRect.right + 4f * unit else rect.left + inset
    val nameRight = currentLeft - 6f * unit
    val name = player.name.ifBlank { if (first) "NGƯỜI CHƠI 1" else "NGƯỜI CHƠI 2" }.uppercase()
    drawCenteredText(canvas, ellipsize(name, max(0f, nameRight - nameLeft), textPaint), nameLeft, rect.centerY(), textPaint)

    textPaint.textAlign = Paint.Align.CENTER
    textPaint.textSize = 22f * unit
    drawCenteredText(canvas, player.currentPoint.toString(), currentLeft + currentW / 2f, rect.centerY(), textPaint)
    textPaint.textSize = if (player.score >= 100) 24f * unit else 30f * unit
    drawCenteredText(canvas, player.score.toString(), scoreLeft + scoreW / 2f, rect.centerY(), textPaint)
  }

  private fun drawCaromCountdownRow(canvas: Canvas, config: NativeLiveOverlayConfig, rect: RectF, unit: Float) {
    val timeW = 44f * unit
    val gap = 10f * unit
    fillPaint.shader = null
    fillPaint.style = Paint.Style.FILL
    fillPaint.color = Color.rgb(117, 118, 112)
    canvas.drawRect(rect, fillPaint)

    textPaint.color = Color.WHITE
    textPaint.typeface = Typeface.DEFAULT_BOLD
    textPaint.textAlign = Paint.Align.CENTER
    textPaint.textSize = 16f * unit
    drawCenteredText(canvas, max(0, config.countdownTime).toString(), rect.left + timeW / 2f, rect.centerY(), textPaint)

    val track = RectF(rect.left + timeW + gap, rect.centerY() - 6f * unit, rect.right - 10f * unit, rect.centerY() + 6f * unit)
    val segments = 18
    val segGap = 1.5f * unit
    val segW = (track.width() - segGap * (segments - 1)) / segments
    val base = max(config.baseCountdown, 1)
    val activeCount = ((max(config.countdownTime, 0).toFloat() / base.toFloat()) * segments).roundToInt().coerceIn(0, segments)
    for (i in 0 until segments) {
      val rightToLeftIndex = segments - 1 - i
      val x = track.left + i * (segW + segGap)
      fillPaint.color = if (rightToLeftIndex < activeCount) timerColor(config.countdownTime) else Color.argb(72, 255, 255, 255)
      canvas.drawRoundRect(RectF(x, track.top, x + segW, track.bottom), 2f * unit, 2f * unit, fillPaint)
    }
  }

  private fun drawCenteredText(canvas: Canvas, text: String, x: Float, centerY: Float, paint: Paint) {
    val metrics = paint.fontMetrics
    val y = centerY - (metrics.ascent + metrics.descent) / 2f
    canvas.drawText(text, x, y, paint)
  }

  private fun ellipsize(value: String, maxWidth: Float, paint: Paint): String {
    if (maxWidth <= 0 || paint.measureText(value) <= maxWidth) return value
    var result = value
    while (result.length > 1 && paint.measureText("$result…") > maxWidth) {
      result = result.dropLast(1)
    }
    return "$result…"
  }

  private fun normalizeFlag(value: String): String {
    return when (value.trim().lowercase()) {
      "vn", "vi", "vietnam", "viet nam" -> "🇻🇳"
      "us", "usa", "en", "english" -> "🇺🇸"
      else -> value
    }
  }

  private fun parseColor(value: String, fallback: Int): Int {
    val raw = value.trim()
    if (raw.isBlank()) return fallback
    return try {
      Color.parseColor(raw)
    } catch (_: Throwable) {
      fallback
    }
  }
}
