package com.aplus.score.youtube

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import java.io.File

internal class YouTubeLiveOverlayBitmapRenderer(private val context: Context) {
  private val TAG = "LiveOverlayNative"
  private var lastSnapshotUri: String = ""
  private var lastSourceBitmap: Bitmap? = null
  var lastRenderHadOverlay: Boolean = false
    private set
  var lastDecodedWidth: Int = 0
    private set
  var lastDecodedHeight: Int = 0
    private set
  var lastScaleFactorX: Float = 0f
    private set
  var lastScaleFactorY: Float = 0f
    private set

  fun render(config: NativeLiveOverlayConfig, width: Int, height: Int): Bitmap {
    val safeWidth = width.coerceAtLeast(1)
    val safeHeight = height.coerceAtLeast(1)

    lastRenderHadOverlay = false
    lastDecodedWidth = 0
    lastDecodedHeight = 0
    lastScaleFactorX = 0f
    lastScaleFactorY = 0f

    if (!config.visible || config.snapshotUri.isBlank()) {
      Log.i(TAG, "[Live Overlay Snapshot] bitmap decoded=false source=${config.source} reason=overlay-not-visible-or-empty-uri output=${safeWidth}x${safeHeight}")
      return Bitmap.createBitmap(safeWidth, safeHeight, Bitmap.Config.ARGB_8888)
    }

    Log.i(TAG, "[LiveOverlayNative] overlayBitmapReceived=true source=${config.source} mode=${config.variant} requestedOutput=${safeWidth}x${safeHeight} hasUri=true")

    val source = loadSnapshotBitmap(config.snapshotUri)
      ?: return Bitmap.createBitmap(safeWidth, safeHeight, Bitmap.Config.ARGB_8888)

    lastRenderHadOverlay = true
    lastDecodedWidth = source.width
    lastDecodedHeight = source.height
    lastScaleFactorX = safeWidth.toFloat() / source.width.coerceAtLeast(1).toFloat()
    lastScaleFactorY = safeHeight.toFloat() / source.height.coerceAtLeast(1).toFloat()
    Log.i(TAG, "[LiveOverlayNative] overlayBitmapDecoded=true source=${config.source} mode=${config.variant} input=${source.width}x${source.height} output=${safeWidth}x${safeHeight}")
    Log.i(TAG, "[Live Overlay Snapshot] bitmap decoded=true source=${config.source} mode=${config.variant} input=${source.width}x${source.height} output=${safeWidth}x${safeHeight}")
    Log.i(TAG, "[Live Overlay Quality] bitmapDecoded=${source.width}x${source.height} videoOutput=${safeWidth}x${safeHeight} overlayDrawRect=0,0,${safeWidth},${safeHeight} scaleFactorX=${lastScaleFactorX} scaleFactorY=${lastScaleFactorY} smoothing=false")

    if (source.width == safeWidth && source.height == safeHeight) {
      return source.copy(Bitmap.Config.ARGB_8888, false)
    }

    return Bitmap.createScaledBitmap(source, safeWidth, safeHeight, false)
  }

  fun release() {
    lastSourceBitmap?.takeIf { !it.isRecycled }?.recycle()
    lastSourceBitmap = null
    lastSnapshotUri = ""
    lastRenderHadOverlay = false
    lastDecodedWidth = 0
    lastDecodedHeight = 0
    lastScaleFactorX = 0f
    lastScaleFactorY = 0f
  }

  private fun loadSnapshotBitmap(uriOrPath: String): Bitmap? {
    val normalized = uriOrPath.trim()
    if (normalized.isBlank()) return null

    if (normalized == lastSnapshotUri) {
      val cached = lastSourceBitmap
      if (cached != null && !cached.isRecycled) {
        return cached
      }
    }

    val decoded = try {
      when {
        normalized.startsWith("file://") -> {
          val path = Uri.parse(normalized).path ?: normalized.removePrefix("file://")
          BitmapFactory.decodeFile(path, BitmapFactory.Options().apply {
            inPreferredConfig = Bitmap.Config.ARGB_8888
            inScaled = false
          })
        }
        normalized.startsWith("content://") -> {
          context.contentResolver.openInputStream(Uri.parse(normalized)).use { input ->
            BitmapFactory.decodeStream(input, null, BitmapFactory.Options().apply {
              inPreferredConfig = Bitmap.Config.ARGB_8888
              inScaled = false
            })
          }
        }
        else -> BitmapFactory.decodeFile(File(normalized).absolutePath, BitmapFactory.Options().apply {
          inPreferredConfig = Bitmap.Config.ARGB_8888
          inScaled = false
        })
      }
    } catch (error: Throwable) {
      Log.e(TAG, "snapshot decode failed uri=$normalized", error)
      null
    }

    if (decoded == null) {
      lastRenderHadOverlay = false
      Log.e(TAG, "snapshot decode returned null uri=$normalized")
      return null
    }

    lastSourceBitmap?.takeIf { it !== decoded && !it.isRecycled }?.recycle()
    lastSourceBitmap = decoded
    lastSnapshotUri = normalized
    return decoded
  }
}
