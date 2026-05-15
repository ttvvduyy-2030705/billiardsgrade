package com.aplus.score.imagepicker

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max

class AplusMenuImagePickerModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  companion object {
    private const val REQUEST_PICK_MENU_IMAGE = 54241
    private const val MAX_IMAGE_SIDE = 1280
    private const val JPEG_QUALITY = 82
  }

  private var pendingPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "AplusMenuImagePickerModule"

  @ReactMethod
  fun pickMenuImage(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Không mở được thư viện ảnh vì app chưa sẵn sàng.")
      return
    }

    if (pendingPromise != null) {
      promise.reject("PICKER_BUSY", "Đang chọn ảnh. Vui lòng chờ thao tác hiện tại hoàn tất.")
      return
    }

    pendingPromise = promise

    try {
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "image/*"
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
      }
      activity.startActivityForResult(
        Intent.createChooser(intent, "Chọn ảnh món"),
        REQUEST_PICK_MENU_IMAGE,
      )
    } catch (error: Throwable) {
      pendingPromise = null
      promise.reject("PICKER_OPEN_FAILED", "Không thể mở thư viện ảnh trên thiết bị này.", error)
    }
  }

  override fun onActivityResult(
    activity: Activity?,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    if (requestCode != REQUEST_PICK_MENU_IMAGE) {
      return
    }

    val promise = pendingPromise ?: return
    pendingPromise = null

    if (resultCode != Activity.RESULT_OK || data?.data == null) {
      promise.resolve(Arguments.createMap().apply { putBoolean("cancelled", true) })
      return
    }

    val uri = data.data!!
    try {
      tryPersistReadPermission(data, uri)
      val picked = createStableMenuImage(uri)
      promise.resolve(picked)
    } catch (error: Throwable) {
      promise.reject("IMAGE_READ_FAILED", "Không lấy được ảnh đã chọn. Vui lòng chọn ảnh khác.", error)
    }
  }

  override fun onNewIntent(intent: Intent?) = Unit

  private fun tryPersistReadPermission(data: Intent, uri: Uri) {
    try {
      val flags = data.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION
      reactContext.contentResolver.takePersistableUriPermission(uri, flags)
    } catch (_: Throwable) {
      // Some gallery providers do not support persistable grants. We already copy
      // the image into app cache below, so this is only a best-effort backup.
    }
  }

  private fun createStableMenuImage(uri: Uri): com.facebook.react.bridge.WritableMap {
    val originalName = queryDisplayName(uri)
    val output = decodeAndCompress(uri)
    val imageDir = File(reactContext.cacheDir, "aplus-menu-picked-images")
    if (!imageDir.exists()) {
      imageDir.mkdirs()
    }

    val safeBaseName = (originalName.substringBeforeLast('.', "menu_image"))
      .replace(Regex("[^a-zA-Z0-9_-]"), "_")
      .replace(Regex("_+"), "_")
      .take(48)
      .ifBlank { "menu_image" }
    val fileName = "${safeBaseName}_${System.currentTimeMillis()}.jpg"
    val file = File(imageDir, fileName)

    FileOutputStream(file).use { stream -> stream.write(output.bytes) }

    return Arguments.createMap().apply {
      putBoolean("cancelled", false)
      putString("uri", Uri.fromFile(file).toString())
      putString("base64", Base64.encodeToString(output.bytes, Base64.NO_WRAP))
      putString("mimeType", output.mimeType)
      putString("fileName", file.name)
      putDouble("sizeBytes", output.bytes.size.toDouble())
    }
  }

  private data class EncodedImage(val bytes: ByteArray, val mimeType: String)

  private fun decodeAndCompress(uri: Uri): EncodedImage {
    val resolver = reactContext.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }

    val sampleSize = calculateSampleSize(bounds.outWidth, bounds.outHeight)
    val options = BitmapFactory.Options().apply {
      inSampleSize = sampleSize
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }

    val bitmap = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
    if (bitmap != null) {
      val output = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, output)
      bitmap.recycle()
      return EncodedImage(output.toByteArray(), "image/jpeg")
    }

    val rawBytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0)
    if (rawBytes.isEmpty()) {
      throw IllegalStateException("Ảnh đã chọn đang rỗng hoặc không đọc được.")
    }
    return EncodedImage(rawBytes, resolver.getType(uri) ?: "image/jpeg")
  }

  private fun calculateSampleSize(width: Int, height: Int): Int {
    if (width <= 0 || height <= 0) {
      return 1
    }

    var sample = 1
    val largestSide = max(width, height)
    while (largestSide / sample > MAX_IMAGE_SIDE) {
      sample *= 2
    }
    return sample
  }

  private fun queryDisplayName(uri: Uri): String {
    return try {
      reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (nameIndex >= 0 && cursor.moveToFirst()) {
          cursor.getString(nameIndex) ?: "menu_image.jpg"
        } else {
          "menu_image.jpg"
        }
      } ?: "menu_image.jpg"
    } catch (_: Throwable) {
      "menu_image.jpg"
    }
  }
}
