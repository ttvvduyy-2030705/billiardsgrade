package com.aplus.score.uvc

import android.content.Context
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = UvcProbeModule.NAME)
class UvcProbeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "UvcProbe"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun listUsbDevices(promise: Promise) {
        try {
            val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
            val result = Arguments.createArray()

            usbManager.deviceList.values.forEach { device ->
                val item = Arguments.createMap()
                item.putString("deviceName", device.deviceName)
                item.putInt("vendorId", device.vendorId)
                item.putInt("productId", device.productId)
                item.putInt("deviceClass", device.deviceClass)
                item.putInt("deviceSubclass", device.deviceSubclass)
                item.putBoolean("looksLikeVideo", looksLikeVideoDevice(device))
                result.pushMap(item)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("UVC_LIST_ERROR", e)
        }
    }

    @ReactMethod
    fun startRecording(outputPath: String, promise: Promise) {
        val view = UvcCameraRegistry.activeView
        if (view == null) {
            promise.reject("UVC_START_ERROR", "active-view-null")
            return
        }

        view.startRecording(outputPath) { ok, message ->
            if (ok) {
                promise.resolve(outputPath)
            } else {
                promise.reject("UVC_START_ERROR", message ?: "start-failed")
            }
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        val view = UvcCameraRegistry.activeView
        if (view == null) {
            promise.resolve(null)
            return
        }

        view.stopRecording { savedPath ->
            promise.resolve(savedPath)
        }
    }

    @ReactMethod
    fun setZoom(zoom: Double, promise: Promise) {
        val view = UvcCameraRegistry.activeView
        if (view == null) {
            promise.resolve(1.0)
            return
        }

        try {
            promise.resolve(view.setZoom(zoom))
        } catch (e: Exception) {
            promise.reject("UVC_ZOOM_ERROR", e)
        }
    }

    @ReactMethod
    fun getZoomInfo(promise: Promise) {
        val view = UvcCameraRegistry.activeView
        val map = Arguments.createMap()

        if (view == null) {
            map.putBoolean("supported", false)
            map.putDouble("minZoom", 1.0)
            map.putDouble("maxZoom", 1.0)
            map.putDouble("zoom", 1.0)
            map.putString("source", "external")
            promise.resolve(map)
            return
        }

        try {
            val info = view.getZoomInfo()
            map.putBoolean("supported", info.supported)
            map.putDouble("minZoom", info.minZoom)
            map.putDouble("maxZoom", info.maxZoom)
            map.putDouble("zoom", info.zoom)
            map.putString("source", "external")
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("UVC_ZOOM_INFO_ERROR", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String?) {
        // Required for NativeEventEmitter compatibility on RN Android
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter compatibility on RN Android
    }

    private fun looksLikeVideoDevice(device: UsbDevice): Boolean {
        if (device.deviceClass == UsbConstants.USB_CLASS_VIDEO) return true

        for (i in 0 until device.interfaceCount) {
            val intf = device.getInterface(i)
            if (intf.interfaceClass == UsbConstants.USB_CLASS_VIDEO) {
                return true
            }
        }

        return false
    }
}
