package com.billiards_management.RemoteControl;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class RemoteControlModule extends ReactContextBaseJavaModule {
    private static final String TAG = "RemoteControlModule";
    private static ReactApplicationContext reactContext;

    public RemoteControlModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @NonNull
    @Override
    public String getName() {
        return "RemoteControl";
    }

    // Required for NativeEventEmitter on Android
    @ReactMethod
    public void addListener(String eventName) {
        // no-op
    }

    // Required for NativeEventEmitter on Android
    @ReactMethod
    public void removeListeners(Integer count) {
        // no-op
    }

    @ReactMethod
    public void ping() {
        // chỉ để module chắc chắn được export sang JS
    }

    public static boolean isReady() {
        return reactContext != null
                && reactContext.hasActiveReactInstance()
                && reactContext.getCatalystInstance() != null;
    }

    public static void sendEvent(String eventName, @Nullable WritableMap params) {
        if (!isReady()) {
            Log.w(TAG, "sendEvent skipped: React context not ready. event=" + eventName);
            return;
        }

        try {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params != null ? params : Arguments.createMap());
        } catch (Exception e) {
            Log.e(TAG, "sendEvent failed for event=" + eventName, e);
        }
    }
}