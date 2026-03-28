import {NativeModules, NativeEventEmitter} from 'react-native';
import {RemoteControlKeysNative} from 'types/bluetooth';

const RemoteControl = NativeModules.RemoteControl ?? null;

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
    console.log('[RemoteControl] native module not available');
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
    RemoteControlEventEmitter.removeAllListeners(eventNames[i]);
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