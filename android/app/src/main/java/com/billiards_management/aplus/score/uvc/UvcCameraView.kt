package com.aplus.score.uvc

import android.content.Context
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.util.Log
import android.view.Surface
import android.view.TextureView
import android.view.ViewGroup
import com.herohan.uvcapp.CameraException
import com.herohan.uvcapp.CameraHelper
import com.herohan.uvcapp.ICameraHelper
import com.herohan.uvcapp.VideoCapture
import java.io.File
import kotlin.math.roundToInt

object UvcCameraRegistry {
    @Volatile
    var activeView: UvcCameraView? = null
}

class UvcCameraView(context: Context) : TextureView(context), TextureView.SurfaceTextureListener {
    companion object {
        private const val TAG = "UVC_VIEW"
        private const val VIRTUAL_MIN_ZOOM = 1.0
        private const val VIRTUAL_MAX_ZOOM = 10.0
        private const val ZOOM_CURVE_EXPONENT = 0.55
    }

    data class ZoomInfo(
        val supported: Boolean,
        val minZoom: Double,
        val maxZoom: Double,
        val zoom: Double,
    )

    private var cameraHelper: ICameraHelper? = null
    private var isReleased = false
    private var isTextureReady = false
    private var isCameraOpened = false
    private var previewStarted = false
    private var currentSurface: Surface? = null
    private var selectedDeviceName: String? = null
    private var isRecording = false
    private var currentRecordingPath: String? = null
    private var lastSavedPath: String? = null
    private val pendingStopCallbacks = mutableListOf<(String?) -> Unit>()

    // mặc định fallback 16:9
    private var previewWidth = 16
    private var previewHeight = 9

    private var zoomSupported = false
    private var currentZoom = VIRTUAL_MIN_ZOOM

    private val stateCallback = object : ICameraHelper.StateCallback {
        override fun onAttach(device: UsbDevice) {
            Log.e(TAG, "onAttach: ${device.deviceName}")
            selectDeviceOnce(device)
        }

        override fun onDeviceOpen(device: UsbDevice, isFirstOpen: Boolean) {
            Log.e(TAG, "onDeviceOpen: ${device.deviceName}, first=$isFirstOpen")
            try {
                cameraHelper?.openCamera()
            } catch (e: Exception) {
                Log.e(TAG, "openCamera failed", e)
            }
        }

        override fun onCameraOpen(device: UsbDevice) {
            Log.e(TAG, "onCameraOpen: ${device.deviceName}")
            isCameraOpened = true

            try {
                val size = cameraHelper?.previewSize
                if (size != null && size.width > 0 && size.height > 0) {
                    setPreviewSizeCandidate(size.width, size.height)
                    Log.e(TAG, "previewSize(raw) = ${size.width}x${size.height}, normalized=${previewWidth}x${previewHeight}")
                    post { updatePreviewLayoutAndTransform(width, height) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "read previewSize failed", e)
            }

            refreshZoomInfo()
            maybeStartPreview()
        }

        override fun onCameraClose(device: UsbDevice) {
            Log.e(TAG, "onCameraClose: ${device.deviceName}")
            previewStarted = false
            isCameraOpened = false
            isRecording = false
            resetZoomState()
            flushPendingStopCallbacks(lastSavedPath)
            removeCurrentSurface()
        }

        override fun onDeviceClose(device: UsbDevice) {
            Log.e(TAG, "onDeviceClose: ${device.deviceName}")
        }

        override fun onDetach(device: UsbDevice) {
            Log.e(TAG, "onDetach: ${device.deviceName}")
            previewStarted = false
            isCameraOpened = false
            isRecording = false
            resetZoomState()
            if (selectedDeviceName == device.deviceName) {
                selectedDeviceName = null
            }
            flushPendingStopCallbacks(lastSavedPath)
            removeCurrentSurface()
        }

        override fun onCancel(device: UsbDevice) {
            Log.e(TAG, "onCancel: ${device.deviceName}")
        }

        override fun onError(device: UsbDevice, e: CameraException) {
            Log.e(TAG, "onError: ${device.deviceName}", e)
        }
    }

    init {
        surfaceTextureListener = this
        isOpaque = false
        initCameraHelper()
    }

    private fun initCameraHelper() {
        if (cameraHelper != null) return

        Log.e(TAG, "initCameraHelper")
        cameraHelper = CameraHelper()
        cameraHelper?.setStateCallback(stateCallback)

        try {
            val helper = cameraHelper ?: return
            val config = helper.videoCaptureConfig
                .setAudioCaptureEnable(false)
                .setBitRate((1024 * 1024 * 25 * 0.25).toInt())
                .setVideoFrameRate(25)
                .setIFrameInterval(1)
            helper.setVideoCaptureConfig(config)
        } catch (e: Exception) {
            Log.e(TAG, "setVideoCaptureConfig failed", e)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        UvcCameraRegistry.activeView = this
        Log.e(TAG, "onAttachedToWindow")

        if (isAvailable && surfaceTexture != null) {
            Log.e(TAG, "texture already available on attach")
            onSurfaceTextureAvailable(surfaceTexture!!, width, height)
        }

        post { updatePreviewLayoutAndTransform(width, height) }
        postDelayed({
            if (selectedDeviceName == null) {
                selectExistingVideoDevice()
            }
        }, 500)
    }

    private fun selectExistingVideoDevice() {
        try {
            val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
            val device = usbManager.deviceList.values.firstOrNull { looksLikeVideoDevice(it) }
            if (device != null) {
                Log.e(TAG, "selectExistingVideoDevice: ${device.deviceName}")
                selectDeviceOnce(device)
            } else {
                Log.e(TAG, "selectExistingVideoDevice: none")
            }
        } catch (e: Exception) {
            Log.e(TAG, "selectExistingVideoDevice failed", e)
        }
    }

    private fun selectDeviceOnce(device: UsbDevice) {
        if (selectedDeviceName == device.deviceName) {
            Log.e(TAG, "selectDeviceOnce skipped: already selected ${device.deviceName}")
            return
        }

        selectedDeviceName = device.deviceName
        try {
            cameraHelper?.selectDevice(device)
        } catch (e: Exception) {
            Log.e(TAG, "selectDevice failed", e)
        }
    }

    private fun maybeStartPreview() {
        val helper = cameraHelper
        val surface = currentSurface

        Log.e(
            TAG,
            "maybeStartPreview textureReady=$isTextureReady cameraOpened=$isCameraOpened previewStarted=$previewStarted surface=${surface != null}",
        )

        if (helper == null || surface == null) return
        if (!isTextureReady || !isCameraOpened || previewStarted) return

        try {
            updatePreviewLayoutAndTransform(width, height)
            helper.addSurface(surface, false)
            helper.startPreview()
            previewStarted = true
            post { updatePreviewLayoutAndTransform(width, height) }
            Log.e(TAG, "preview started")
        } catch (e: Exception) {
            Log.e(TAG, "startPreview failed", e)
        }
    }

    private fun removeCurrentSurface() {
        val helper = cameraHelper ?: return
        val surface = currentSurface ?: return

        try {
            helper.removeSurface(surface)
            Log.e(TAG, "surface removed")
        } catch (e: Exception) {
            Log.e(TAG, "removeSurface failed", e)
        }

        try {
            surface.release()
        } catch (_: Exception) {
        }

        currentSurface = null
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

    private fun setPreviewSizeCandidate(rawWidth: Int, rawHeight: Int) {
        if (rawWidth <= 0 || rawHeight <= 0) return

        if (rawWidth >= rawHeight) {
            previewWidth = rawWidth
            previewHeight = rawHeight
        } else {
            previewWidth = rawHeight
            previewHeight = rawWidth
        }
    }

    private fun updatePreviewLayoutAndTransform(viewWidth: Int = width, viewHeight: Int = height) {
        if (viewWidth <= 0 || previewWidth <= 0 || previewHeight <= 0) return

        val normalizedWidth = maxOf(previewWidth, previewHeight)
        val normalizedHeight = minOf(previewWidth, previewHeight)
        val ratio = normalizedHeight.toFloat() / normalizedWidth.toFloat()
        val targetHeight = (viewWidth * ratio).roundToInt().coerceAtLeast(1)

        val currentParams = layoutParams
        if (currentParams != null && currentParams.height != targetHeight) {
            currentParams.height = targetHeight
            layoutParams = currentParams
            minimumHeight = targetHeight
            requestLayout()
        } else if (height <= 0) {
            forceNonZeroHeight(viewWidth)
        }

        val actualViewHeight = if (viewHeight > 0) viewHeight else targetHeight
        if (actualViewHeight <= 0) return

        try {
            surfaceTexture?.setDefaultBufferSize(normalizedWidth, normalizedHeight)
        } catch (e: Exception) {
            Log.e(TAG, "setDefaultBufferSize failed", e)
        }

        val sx = viewWidth.toFloat() / normalizedWidth.toFloat()
        val sy = actualViewHeight.toFloat() / normalizedHeight.toFloat()
        val scale = maxOf(sx, sy)
        val scaledWidth = normalizedWidth * scale
        val scaledHeight = normalizedHeight * scale
        val dx = (viewWidth - scaledWidth) / 2f
        val dy = (actualViewHeight - scaledHeight) / 2f

        val matrix = Matrix()
        matrix.setScale(scale, scale)
        matrix.postTranslate(dx, dy)
        setTransform(matrix)
        invalidate()
    }

    private fun forceNonZeroHeight(currentWidth: Int) {
        if (currentWidth <= 0) return

        val normalizedWidth = maxOf(previewWidth, previewHeight)
        val normalizedHeight = minOf(previewWidth, previewHeight)
        val ratio = normalizedHeight.toFloat() / normalizedWidth.toFloat()
        val computedHeight = (currentWidth * ratio).roundToInt().coerceAtLeast(1)

        if (height <= 0) {
            Log.e(
                TAG,
                "forceNonZeroHeight width=$currentWidth oldHeight=$height -> newHeight=$computedHeight ratio=${normalizedWidth}x${normalizedHeight}",
            )
            val lp = layoutParams ?: ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                computedHeight,
            )
            lp.height = computedHeight
            layoutParams = lp
            minimumHeight = computedHeight
            requestLayout()
            invalidate()
        }
    }

    override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
        Log.e(TAG, "onSurfaceTextureAvailable: ${width}x${height}")
        currentSurface = Surface(surface)
        isTextureReady = true

        updatePreviewLayoutAndTransform(width, height)
        maybeStartPreview()
    }

    override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {
        Log.e(TAG, "onSurfaceTextureSizeChanged: ${width}x${height}")
        updatePreviewLayoutAndTransform(width, height)
    }

    override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
        Log.e(TAG, "onSurfaceTextureDestroyed")
        isTextureReady = false
        previewStarted = false
        removeCurrentSurface()
        return true
    }

    override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {
        // no-op
    }

    fun startRecording(outputPath: String, callback: (Boolean, String?) -> Unit) {
        val helper = cameraHelper
        if (helper == null) {
            callback(false, "camera-helper-null")
            return
        }

        if (!isCameraOpened || !previewStarted) {
            callback(false, "camera-not-ready")
            return
        }

        if (isRecording) {
            callback(true, null)
            return
        }

        try {
            val file = File(outputPath)
            file.parentFile?.mkdirs()
            currentRecordingPath = file.absolutePath
            lastSavedPath = null

            val options = VideoCapture.OutputFileOptions.Builder(file).build()
            var startNotified = false

            helper.startRecording(options, object : VideoCapture.OnVideoCaptureCallback {
                override fun onStart() {
                    Log.e(TAG, "recording started: $outputPath")
                    isRecording = true
                    if (!startNotified) {
                        startNotified = true
                        callback(true, null)
                    }
                }

                override fun onVideoSaved(outputFileResults: VideoCapture.OutputFileResults) {
                    val savedPath = currentRecordingPath ?: outputPath
                    Log.e(TAG, "recording saved: $savedPath")
                    isRecording = false
                    lastSavedPath = savedPath
                    flushPendingStopCallbacks(savedPath)
                }

                override fun onError(
                    videoCaptureError: Int,
                    message: String,
                    cause: Throwable?,
                ) {
                    Log.e(TAG, "recording error: $message", cause)
                    isRecording = false
                    if (!startNotified) {
                        startNotified = true
                        callback(false, message)
                    }
                    flushPendingStopCallbacks(null)
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "startRecording failed", e)
            isRecording = false
            callback(false, e.message ?: "start-recording-failed")
        }
    }

    fun stopRecording(callback: (String?) -> Unit) {
        val helper = cameraHelper
        if (helper == null) {
            callback(lastSavedPath)
            return
        }

        if (!isRecording) {
            callback(lastSavedPath)
            return
        }

        pendingStopCallbacks.add(callback)
        try {
            Log.e(TAG, "stopRecording requested")
            helper.stopRecording()
        } catch (e: Exception) {
            Log.e(TAG, "stopRecording failed", e)
            isRecording = false
            flushPendingStopCallbacks(lastSavedPath)
        }
    }

    fun getZoomInfo(): ZoomInfo {
        return refreshZoomInfo()
    }

    fun setZoom(zoom: Double): Double {
        val control = getUvcControl()
        if (control == null) {
            resetZoomState()
            return currentZoom
        }

        val normalizedZoom = zoom.coerceIn(VIRTUAL_MIN_ZOOM, VIRTUAL_MAX_ZOOM)
        val percent = zoomToPercent(normalizedZoom)

        try {
            if (hasMethod(control, "setZoomAbsolutePercent", Int::class.javaPrimitiveType)) {
                invokeSingleArg(control, "setZoomAbsolutePercent", percent)
                currentZoom = normalizedZoom
                refreshZoomInfo()
                return currentZoom
            }

            val limits = readZoomLimits(control)
            if (!zoomSupported || limits == null) {
                return currentZoom
            }

            val absValue = (limits.first + ((percent / 100.0) * (limits.second - limits.first))).roundToInt()
                .coerceIn(limits.first, limits.second)

            invokeSingleArg(control, "setZoomAbsolute", absValue)
            currentZoom = normalizedZoom
            refreshZoomInfo()
            return currentZoom
        } catch (e: Exception) {
            Log.e(TAG, "setZoom failed", e)
            return currentZoom
        }
    }

    private fun refreshZoomInfo(): ZoomInfo {
        val control = getUvcControl()
        if (control == null) {
            resetZoomState()
            return ZoomInfo(false, 1.0, 1.0, 1.0)
        }

        return try {
            val enabled = readBoolean(control, "isZoomAbsoluteEnable")
            if (!enabled) {
                resetZoomState()
                return ZoomInfo(false, 1.0, 1.0, 1.0)
            }

            zoomSupported = true

            val percent = readInt(control, "getZoomAbsolutePercent")
            currentZoom = if (percent != null) {
                percentToVirtualZoom(percent)
            } else {
                val limits = readZoomLimits(control)
                val absolute = readInt(control, "getZoomAbsolute")
                if (limits != null && absolute != null && limits.second > limits.first) {
                    val ratio = (absolute - limits.first).toDouble() / (limits.second - limits.first).toDouble()
                    (VIRTUAL_MIN_ZOOM + ratio * (VIRTUAL_MAX_ZOOM - VIRTUAL_MIN_ZOOM))
                        .coerceIn(VIRTUAL_MIN_ZOOM, VIRTUAL_MAX_ZOOM)
                } else {
                    currentZoom.coerceIn(VIRTUAL_MIN_ZOOM, VIRTUAL_MAX_ZOOM)
                }
            }

            ZoomInfo(true, VIRTUAL_MIN_ZOOM, VIRTUAL_MAX_ZOOM, currentZoom)
        } catch (e: Exception) {
            Log.e(TAG, "refreshZoomInfo failed", e)
            resetZoomState()
            ZoomInfo(false, 1.0, 1.0, 1.0)
        }
    }

    private fun zoomToPercent(zoom: Double): Int {
        val ratio = ((zoom.coerceIn(VIRTUAL_MIN_ZOOM, VIRTUAL_MAX_ZOOM) - VIRTUAL_MIN_ZOOM) /
            (VIRTUAL_MAX_ZOOM - VIRTUAL_MIN_ZOOM)).coerceIn(0.0, 1.0)
        return (Math.pow(ratio, ZOOM_CURVE_EXPONENT) * 100.0).roundToInt().coerceIn(0, 100)
    }

    private fun percentToVirtualZoom(percent: Int): Double {
        val clampedRatio = (percent.coerceIn(0, 100) / 100.0).coerceIn(0.0, 1.0)
        return (
            VIRTUAL_MIN_ZOOM +
                Math.pow(clampedRatio, 1.0 / ZOOM_CURVE_EXPONENT) *
                    (VIRTUAL_MAX_ZOOM - VIRTUAL_MIN_ZOOM)
            ).coerceIn(VIRTUAL_MIN_ZOOM, VIRTUAL_MAX_ZOOM)
    }

    private fun readZoomLimits(control: Any): Pair<Int, Int>? {
        val raw = invokeNoArg(control, "updateZoomAbsoluteLimit") ?: return null
        val values = when (raw) {
            is IntArray -> raw.toList()
            is Array<*> -> raw.filterIsInstance<Number>().map { it.toInt() }
            is List<*> -> raw.filterIsInstance<Number>().map { it.toInt() }
            else -> emptyList()
        }

        if (values.size < 2) {
            return null
        }

        val min = values[0]
        val max = values[1]
        return if (max >= min) min to max else max to min
    }

    private fun getUvcControl(): Any? {
        val helper = cameraHelper ?: return null
        return try {
            invokeNoArg(helper, "getUVCControl")
        } catch (e: Exception) {
            Log.e(TAG, "getUVCControl failed", e)
            null
        }
    }

    private fun invokeNoArg(target: Any, methodName: String): Any? {
        val method = target.javaClass.methods.firstOrNull {
            it.name == methodName && it.parameterTypes.isEmpty()
        } ?: return null
        return method.invoke(target)
    }

    private fun invokeSingleArg(target: Any, methodName: String, arg: Any): Any? {
        val method = target.javaClass.methods.firstOrNull {
            it.name == methodName && it.parameterTypes.size == 1
        } ?: return null
        return method.invoke(target, arg)
    }

    private fun hasMethod(target: Any, methodName: String, parameterType: Class<*>?): Boolean {
        return target.javaClass.methods.any {
            it.name == methodName &&
                it.parameterTypes.size == 1 &&
                (parameterType == null || it.parameterTypes[0] == parameterType || it.parameterTypes[0].isAssignableFrom(parameterType))
        }
    }

    private fun readBoolean(target: Any, methodName: String): Boolean {
        return (invokeNoArg(target, methodName) as? Boolean) ?: false
    }

    private fun readInt(target: Any, methodName: String): Int? {
        return (invokeNoArg(target, methodName) as? Number)?.toInt()
    }

    private fun resetZoomState() {
        zoomSupported = false
        currentZoom = VIRTUAL_MIN_ZOOM
    }

    private fun flushPendingStopCallbacks(path: String?) {
        if (pendingStopCallbacks.isEmpty()) return

        val callbacks = pendingStopCallbacks.toList()
        pendingStopCallbacks.clear()
        callbacks.forEach { cb ->
            try {
                cb(path)
            } catch (_: Exception) {
            }
        }
    }

    fun releaseCamera() {
        if (isReleased) return
        isReleased = true

        Log.e(TAG, "releaseCamera")
        try {
            removeCurrentSurface()
        } catch (_: Exception) {
        }

        try {
            cameraHelper?.release()
        } catch (e: Exception) {
            Log.e(TAG, "release failed", e)
        } finally {
            cameraHelper = null
            isRecording = false
            resetZoomState()
            flushPendingStopCallbacks(lastSavedPath)
        }
    }

    override fun onDetachedFromWindow() {
        Log.e(TAG, "onDetachedFromWindow")
        if (UvcCameraRegistry.activeView === this) {
            UvcCameraRegistry.activeView = null
        }
        releaseCamera()
        super.onDetachedFromWindow()
    }
}
