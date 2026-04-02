import {NativeModules, NativeEventEmitter} from 'react-native';
import {RemoteControlKeysNative} from 'types/bluetooth';

const RemoteControl =
  NativeModules.RemoteControl ??
  NativeModules.RemoteControlModule ??
  NativeModules.AplusRemoteControl ??
  null;

const RemoteControlEventEmitter = RemoteControl
  ? new NativeEventEmitter(RemoteControl)
  : null;

const eventNames = ['onRemoteKeyDown'];

const eventHandlers = eventNames.reduce((result, eventName) => {
  result[eventName] = new Map();
  return result;
}, {} as any);

const addEventListener = (
  type: string,
  handler: (data: RemoteControlKeysNative) => void,
) => {
  const handlers = eventHandlers[type];
  if (!handlers || !RemoteControlEventEmitter) {
    console.log(
      '[RemoteControl] native module not available',
      Object.keys(NativeModules || {}).filter(name =>
        /remote/i.test(String(name)),
      ),
    );
    return;
  }

  if (handlers.has(handler)) {
    return;
  }

  handlers.set(handler, RemoteControlEventEmitter.addListener(type, handler));
};

const removeAllRemoteControlListeners = () => {
  if (!RemoteControlEventEmitter) {
    return;
  }

  for (let i = 0; i < eventNames.length; i++) {
    const eventName = eventNames[i];
    const handlers = eventHandlers[eventName];

    handlers?.forEach((subscription: any) => {
      try {
        subscription?.remove?.();
      } catch {}
    });

    handlers?.clear?.();
    RemoteControlEventEmitter.removeAllListeners(eventName);
  }
};

const registerRemoteControlListener = (
  callback: (data: RemoteControlKeysNative) => void,
) => {
  addEventListener('onRemoteKeyDown', callback);
};

export const RemoteControlModule = {
  registerRemoteControlListener,
  removeAllRemoteControlListeners,
};