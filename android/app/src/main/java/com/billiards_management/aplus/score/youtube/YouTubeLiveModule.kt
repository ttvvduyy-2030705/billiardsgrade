package com.aplus.score.youtube

import android.hardware.camera2.CameraMetadata
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class YouTubeLiveModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var activeSourceType: String = "phone"

  init {
    YouTubeLiveEngine.init(reactContext)
    UvcYouTubeLiveEngine.init(reactContext)
  }

  override fun getName(): String = "YouTubeLiveModule"

  @ReactMethod
  fun preparePreview(cameraFacing: String?, sourceType: String?, promise: Promise) {
    activeSourceType = if (sourceType == "webcam") "webcam" else "phone"

    try {
      if (activeSourceType == "webcam") {
        promise.reject(
          "UVC_NOT_READY",
          "Chưa nhận được webcam USB. Hãy kiểm tra OTG/nguồn và mở preview webcam trước khi live.",
        )
        return
      }

      val facing = if (cameraFacing == "front") {
        CameraMetadata.LENS_FACING_FRONT
      } else {
        CameraMetadata.LENS_FACING_BACK
      }
      YouTubeLiveEngine.ensurePreview(facing)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("PREPARE_PREVIEW_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun startStream(url: String, options: ReadableMap?, promise: Promise) {
    val width = options?.getInt("width") ?: 1280
    val height = options?.getInt("height") ?: 720
    val fps = options?.getInt("fps") ?: 30
    val bitrate = options?.getInt("bitrate") ?: 4500 * 1024
    val audioBitrate = options?.getInt("audioBitrate") ?: 128 * 1024
    val sampleRate = options?.getInt("sampleRate") ?: 44100
    val isStereo = options?.getBoolean("isStereo") ?: true
    val sourceType = options?.getString("sourceType") ?: activeSourceType
    val orientation = options?.getString("orientation") ?: "landscape"

    activeSourceType = if (sourceType == "webcam") "webcam" else "phone"

    if (activeSourceType == "webcam") {
      promise.reject(
        "UVC_STREAM_NOT_READY",
        "Chưa nhận được webcam USB. Tạm thời chỉ live bằng camera điện thoại để tránh crash.",
      )
      return
    }

    val facing = if (options?.getString("cameraFacing") == "front") {
      CameraMetadata.LENS_FACING_FRONT
    } else {
      CameraMetadata.LENS_FACING_BACK
    }
    YouTubeLiveEngine.startStream(
      YouTubeLiveEngine.StreamConfig(
        url = url,
        width = width,
        height = height,
        fps = fps,
        bitrate = bitrate,
        audioBitrate = audioBitrate,
        sampleRate = sampleRate,
        isStereo = isStereo,
        facing = facing,
        orientation = orientation,
      ),
    )
    promise.resolve(true)
  }

  @ReactMethod
  fun updateOverlay(model: ReadableMap?, promise: Promise) {
    try {
      val enabled = if (model?.hasKey("enabled") == true && !model.isNull("enabled")) model.getBoolean("enabled") else false
      val mode = if (model?.hasKey("mode") == true && !model.isNull("mode")) model.getString("mode") ?: "unknown" else "unknown"
      val currentPlayerIndex = if (model?.hasKey("currentPlayerIndex") == true) {
        model.getInt("currentPlayerIndex")
      } else {
        0
      }
      val players = parseOverlayPlayers(model?.getArray("players"), currentPlayerIndex)
      val target = readOverlayValue(model, "target")
      val inning = readOverlayValue(model, "inning")
      val timer = readOverlayValue(model, "timer")
      val logo = if (model?.hasKey("logo") == true && !model.isNull("logo")) model.getString("logo") ?: "config-thumbnail" else "config-thumbnail"
      val logos = parseOverlayLogos(model?.getArray("logos"))

      val overlay = YouTubeLiveEngine.LiveOverlayModel(
        enabled = enabled,
        mode = mode,
        currentPlayerIndex = currentPlayerIndex,
        players = players,
        target = target,
        inning = inning,
        timer = timer,
        logo = logo,
        logos = logos,
      )

      YouTubeLiveEngine.updateOverlay(overlay)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("YOUTUBE_OVERLAY_FAILED", error.message, error)
    }
  }

  private fun readOverlayValue(model: ReadableMap?, key: String): String {
    if (model == null || !model.hasKey(key) || model.isNull(key)) return ""
    return try {
      model.getString(key) ?: ""
    } catch (_: Throwable) {
      try {
        model.getDouble(key).toInt().toString()
      } catch (_: Throwable) {
        ""
      }
    }
  }

  private fun parseOverlayPlayers(
    array: ReadableArray?,
    currentPlayerIndex: Int,
  ): List<YouTubeLiveEngine.LiveOverlayPlayer> {
    if (array == null) return emptyList()
    val players = mutableListOf<YouTubeLiveEngine.LiveOverlayPlayer>()
    for (index in 0 until minOf(array.size(), 2)) {
      val item = array.getMap(index) ?: continue
      val score = try {
        item.getDouble("score").toInt()
      } catch (_: Throwable) {
        0
      }
      players.add(
        YouTubeLiveEngine.LiveOverlayPlayer(
          name = if (item.hasKey("name") && !item.isNull("name")) item.getString("name") ?: "Người chơi ${index + 1}" else "Người chơi ${index + 1}",
          score = score,
          countryCode = if (item.hasKey("countryCode") && !item.isNull("countryCode")) item.getString("countryCode") ?: "" else "",
          isActive = if (item.hasKey("isActive") && !item.isNull("isActive")) item.getBoolean("isActive") else currentPlayerIndex == index,
        ),
      )
    }
    return players
  }

  private fun parseOverlayLogos(array: ReadableArray?): List<YouTubeLiveEngine.LiveOverlayLogo> {
    if (array == null) return emptyList()
    val logos = mutableListOf<YouTubeLiveEngine.LiveOverlayLogo>()
    for (index in 0 until minOf(array.size(), 4)) {
      val item = array.getMap(index) ?: continue
      val uri = if (item.hasKey("uri") && !item.isNull("uri")) item.getString("uri") ?: "" else ""
      if (uri.isBlank()) continue
      val slot = if (item.hasKey("slot") && !item.isNull("slot")) item.getString("slot") ?: "" else ""
      logos.add(
        YouTubeLiveEngine.LiveOverlayLogo(
          slot = slot,
          uri = uri,
          locked = if (item.hasKey("locked") && !item.isNull("locked")) item.getBoolean("locked") else false,
          showOnLivestream = if (item.hasKey("showOnLivestream") && !item.isNull("showOnLivestream")) item.getBoolean("showOnLivestream") else false,
          showOnSavedVideo = if (item.hasKey("showOnSavedVideo") && !item.isNull("showOnSavedVideo")) item.getBoolean("showOnSavedVideo") else true,
        ),
      )
    }
    return logos
  }

  @ReactMethod
  fun stopStream(promise: Promise) {
    if (activeSourceType == "webcam") {
      UvcYouTubeLiveEngine.stopStream()
      promise.resolve(true)
      return
    }
    YouTubeLiveEngine.stopStream()
    promise.resolve(true)
  }

  @ReactMethod
  fun switchCamera(promise: Promise) {
    if (activeSourceType == "webcam") {
      UvcYouTubeLiveEngine.switchCamera()
      promise.resolve(false)
      return
    }
    YouTubeLiveEngine.switchCamera()
    promise.resolve(true)
  }

  @ReactMethod
  fun getZoomInfo(promise: Promise) {
    val snapshot = if (activeSourceType == "webcam") {
      UvcYouTubeLiveEngine.getZoomSnapshot()
    } else {
      YouTubeLiveEngine.getZoomSnapshot()
    }

    val data = Arguments.createMap()
    snapshot.forEach { (key, value) ->
      when (value) {
        is Boolean -> data.putBoolean(key, value)
        is Double -> data.putDouble(key, value)
        is String -> data.putString(key, value)
      }
    }
    promise.resolve(data)
  }

  @ReactMethod
  fun setZoom(level: Double, promise: Promise) {
    val result = if (activeSourceType == "webcam") {
      UvcYouTubeLiveEngine.setZoom(level)
    } else {
      YouTubeLiveEngine.setZoom(level)
    }
    promise.resolve(result)
  }
}
