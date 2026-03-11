import {
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
} from 'react-native';
import {RemoteControlKeysNative} from 'types/bluetooth';

const NativeRemoteControl = NativeModules?.RemoteControl ?? null;

const RemoteControlEventEmitter = NativeRemoteControl
  ? new NativeEventEmitter(NativeRemoteControl)
  : null;

const subscriptions = new Map<
  (data: RemoteControlKeysNative) => void,
  EmitterSubscription
>();

const registerRemoteControlListener = (
  callback: (data: RemoteControlKeysNative) => void,
) => {
  if (!RemoteControlEventEmitter) {
    console.log('[RemoteControl] Native module not found');
    return;
  }

  if (subscriptions.has(callback)) {
    return;
  }

  const sub = RemoteControlEventEmitter.addListener(
    'onRemoteKeyDown',
    callback,
  );
  subscriptions.set(callback, sub);
};

const removeAllRemoteControlListeners = () => {
  subscriptions.forEach(sub => {
    try {
      sub.remove();
    } catch (error) {
      console.log('[RemoteControl] remove listener error', error);
    }
  });
  subscriptions.clear();
};

export const RemoteControlModule = {
  registerRemoteControlListener,
  removeAllRemoteControlListeners,
};
