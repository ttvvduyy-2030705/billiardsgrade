package com.aplus.score.immersive

import android.app.AlertDialog
import android.text.InputType
import android.view.KeyEvent
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import com.aplus.score.MainActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CartImmersiveModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartImmersiveModule"

  @ReactMethod
  fun pauseForCartInput(source: String) {
    (currentActivity as? MainActivity)?.pauseImmersiveForCartInput(source)
  }

  @ReactMethod
  fun resumeAfterCartInput(source: String) {
    (currentActivity as? MainActivity)?.resumeImmersiveAfterCartInput(source)
  }

  @ReactMethod
  fun showCartTextInputDialog(
    title: String,
    placeholder: String,
    initialValue: String,
    keyboardType: String,
    source: String,
    promise: Promise,
  ) {
    val activity = currentActivity
    if (activity == null || activity.isFinishing) {
      promise.reject("NO_ACTIVITY", "Cannot show cart input dialog without an active Activity")
      return
    }

    activity.runOnUiThread {
      val mainActivity = activity as? MainActivity
      var resolved = false

      fun resolveOnce(value: String?) {
        if (resolved) {
          return
        }
        resolved = true
        promise.resolve(value)
      }

      mainActivity?.pauseImmersiveForCartInput("$source:native-dialog-open")

      val density = activity.resources.displayMetrics.density
      val horizontalPadding = (22 * density).toInt()
      val verticalPadding = (10 * density).toInt()

      val input = EditText(activity).apply {
        hint = placeholder
        setSingleLine(true)
        setText(initialValue)
        setSelection(text?.length ?: 0)
        imeOptions = EditorInfo.IME_ACTION_DONE
        inputType = when (keyboardType) {
          "number" -> InputType.TYPE_CLASS_NUMBER
          else -> InputType.TYPE_CLASS_TEXT or
            InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or
            InputType.TYPE_TEXT_FLAG_AUTO_CORRECT
        }
      }

      val container = FrameLayout(activity).apply {
        setPadding(horizontalPadding, verticalPadding, horizontalPadding, 0)
        addView(
          input,
          FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
          ),
        )
      }

      val dialog = AlertDialog.Builder(activity)
        .setTitle(title)
        .setView(container)
        .setNegativeButton("Huỷ", null)
        .setPositiveButton("Xong", null)
        .create()

      dialog.setCanceledOnTouchOutside(false)

      input.setOnEditorActionListener { _, actionId, event ->
        val isDoneAction = actionId == EditorInfo.IME_ACTION_DONE
        val isEnterUp = event?.keyCode == KeyEvent.KEYCODE_ENTER &&
          event.action == KeyEvent.ACTION_UP

        if (isDoneAction || isEnterUp) {
          resolveOnce(input.text?.toString() ?: "")
          dialog.dismiss()
          true
        } else {
          false
        }
      }

      dialog.setOnCancelListener {
        resolveOnce(null)
      }

      dialog.setOnDismissListener {
        resolveOnce(null)
        mainActivity?.resumeImmersiveAfterCartInput("$source:native-dialog-dismiss")
      }

      dialog.setOnShowListener {
        dialog.window?.setSoftInputMode(
          WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE or
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE,
        )

        dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.setOnClickListener {
          resolveOnce(input.text?.toString() ?: "")
          dialog.dismiss()
        }

        dialog.getButton(AlertDialog.BUTTON_NEGATIVE)?.setOnClickListener {
          resolveOnce(null)
          dialog.dismiss()
        }

        input.requestFocus()
        input.postDelayed({
          val imm = activity.getSystemService(InputMethodManager::class.java)
          imm?.showSoftInput(input, InputMethodManager.SHOW_IMPLICIT)
        }, 80L)
      }

      dialog.show()
    }
  }
}
