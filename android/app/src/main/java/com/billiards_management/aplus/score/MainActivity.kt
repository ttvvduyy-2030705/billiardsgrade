// android/app/src/main/java/com/billiards_management/aplus/score/MainActivity.kt
package com.aplus.score

import android.content.Intent
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.KeyEvent
import com.billiards_management.RemoteControl.RemoteControlModule
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    companion object {
        private const val NEW_GAME_HOLD_DURATION_MS = 5_000L
    }

    private var mediaSession: MediaSession? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingNewGameHoldRunnable: Runnable? = null
    private var heldNewGameKeyCode: Int? = null
    private var newGameHoldTriggered = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        setupRemoteMediaSession()
    }

    override fun onDestroy() {
        clearPendingNewGameHold(resetTriggered = true)
        mediaSession?.isActive = false
        mediaSession?.release()
        mediaSession = null
        super.onDestroy()
    }

    override fun getMainComponentName(): String = "billiards_management"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    private fun emitRemoteEvent(eventName: String, keyCodeValue: String, event: KeyEvent) {
        Log.d(
            "REMOTE_KEY",
            "event=$eventName logical=$keyCodeValue keyCode=${event.keyCode} action=${event.action} scanCode=${event.scanCode}"
        )

        val map = Arguments.createMap()
        map.putString("keyCode", keyCodeValue)
        map.putInt("keyCodeInt", event.keyCode)
        map.putInt("scanCode", event.scanCode)
        map.putInt("action", event.action)
        map.putInt("repeatCount", event.repeatCount)

        RemoteControlModule.sendEvent(eventName, map)
    }

    private fun emitRawRemoteEvent(eventName: String, event: KeyEvent): Boolean {
        Log.d(
            "REMOTE_KEY",
            "raw event=$eventName keyCode=${event.keyCode} action=${event.action} scanCode=${event.scanCode}"
        )

        val map = Arguments.createMap()
        map.putString("keyCode", event.keyCode.toString())
        map.putInt("keyCodeInt", event.keyCode)
        map.putInt("scanCode", event.scanCode)
        map.putInt("action", event.action)
        map.putInt("repeatCount", event.repeatCount)

        RemoteControlModule.sendEvent(eventName, map)
        return true
    }

    private fun isNewGameHoldKey(keyCode: Int): Boolean {
        return keyCode == KeyEvent.KEYCODE_ENTER ||
            keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER ||
            keyCode == KeyEvent.KEYCODE_DPAD_CENTER
    }

    private fun clearPendingNewGameHold(resetTriggered: Boolean) {
        pendingNewGameHoldRunnable?.let { mainHandler.removeCallbacks(it) }
        pendingNewGameHoldRunnable = null
        heldNewGameKeyCode = null
        if (resetTriggered) {
            newGameHoldTriggered = false
        }
    }

    private fun emitHeldNewGameEvent() {
        val syntheticEvent = KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER)
        emitRawRemoteEvent("onRemoteKeyDown", syntheticEvent)
    }

    private fun handleNewGameHold(event: KeyEvent): Boolean {
        when (event.action) {
            KeyEvent.ACTION_DOWN -> {
                if (event.repeatCount > 0) {
                    return true
                }

                if (pendingNewGameHoldRunnable != null || newGameHoldTriggered) {
                    return true
                }

                heldNewGameKeyCode = event.keyCode
                newGameHoldTriggered = false

                val holdRunnable = Runnable {
                    if (heldNewGameKeyCode != event.keyCode) {
                        return@Runnable
                    }

                    pendingNewGameHoldRunnable = null
                    newGameHoldTriggered = true
                    Log.d("REMOTE_KEY", "new game hold completed keyCode=${event.keyCode}")
                    emitHeldNewGameEvent()
                }

                pendingNewGameHoldRunnable = holdRunnable
                mainHandler.postDelayed(holdRunnable, NEW_GAME_HOLD_DURATION_MS)
                Log.d("REMOTE_KEY", "new game hold started keyCode=${event.keyCode}")
                return true
            }

            KeyEvent.ACTION_UP -> {
                if (!newGameHoldTriggered) {
                    Log.d("REMOTE_KEY", "new game hold cancelled keyCode=${event.keyCode}")
                }
                clearPendingNewGameHold(resetTriggered = true)
                return true
            }
        }

        return true
    }

    private fun setupRemoteMediaSession() {
        val session = MediaSession(this, "AplusRemoteSession")

        session.setCallback(object : MediaSession.Callback() {
            override fun onMediaButtonEvent(mediaButtonIntent: Intent): Boolean {
                val keyEvent: KeyEvent? =
                    mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT)

                if (keyEvent == null) {
                    return super.onMediaButtonEvent(mediaButtonIntent)
                }

                val logicalKey = when (keyEvent.keyCode) {
                    KeyEvent.KEYCODE_MEDIA_PLAY,
                    KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
                    KeyEvent.KEYCODE_MEDIA_PAUSE -> "START"

                    KeyEvent.KEYCODE_MEDIA_STOP -> "STOP"

                    KeyEvent.KEYCODE_MEDIA_NEXT,
                    KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> "BREAK"

                    KeyEvent.KEYCODE_MEDIA_PREVIOUS,
                    KeyEvent.KEYCODE_MEDIA_REWIND -> "WARM_UP"

                    else -> null
                }

                if (logicalKey != null) {
                    when (keyEvent.action) {
                        KeyEvent.ACTION_DOWN -> emitRemoteEvent("onRemoteKeyDown", logicalKey, keyEvent)
                        KeyEvent.ACTION_UP -> emitRemoteEvent("onRemoteKeyUp", logicalKey, keyEvent)
                    }
                    return true
                }

                return super.onMediaButtonEvent(mediaButtonIntent)
            }
        })

        val playbackState = PlaybackState.Builder()
            .setActions(
                PlaybackState.ACTION_PLAY or
                    PlaybackState.ACTION_PAUSE or
                    PlaybackState.ACTION_PLAY_PAUSE or
                    PlaybackState.ACTION_STOP or
                    PlaybackState.ACTION_SKIP_TO_NEXT or
                    PlaybackState.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackState.ACTION_FAST_FORWARD or
                    PlaybackState.ACTION_REWIND
            )
            .setState(PlaybackState.STATE_PAUSED, 0L, 1.0f)
            .build()

        session.setPlaybackState(playbackState)
        session.isActive = true
        mediaSession = session
    }

    private fun isTextInputFocused(): Boolean {
        val focusedView = currentFocus ?: return false
        val className = focusedView.javaClass.name

        return focusedView.onCheckIsTextEditor() ||
            className.contains("EditText", ignoreCase = true) ||
            className.contains("ReactEditText", ignoreCase = true)
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // Khi đang focus ô nhập tên, trả toàn bộ key event lại cho TextInput,
        // để xóa từng chữ / sửa giữa chuỗi / gõ tiếp như nhập văn bản bình thường.
        if (isTextInputFocused()) {
            return super.dispatchKeyEvent(event)
        }

        if (isNewGameHoldKey(event.keyCode)) {
            return handleNewGameHold(event)
        }

        Log.d(
            "REMOTE_KEY",
            "dispatch keyCode=${event.keyCode} action=${event.action} scanCode=${event.scanCode}"
        )

        return when (event.action) {
            KeyEvent.ACTION_DOWN -> emitRawRemoteEvent("onRemoteKeyDown", event)
            KeyEvent.ACTION_UP -> emitRawRemoteEvent("onRemoteKeyUp", event)
            else -> super.dispatchKeyEvent(event)
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        return super.onKeyUp(keyCode, event)
    }
}