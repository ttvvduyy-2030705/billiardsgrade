import {NativeModules, NativeEventEmitter} from 'react-native';
import {RemoteControlKeysNative} from 'types/bluetooth';

const RemoteControl = NativeModules.RemoteControl;
const RemoteControlEventEmitter = new NativeEventEmitter(RemoteControl);

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
  if (!handlers) {
    console.warn(`Event with type ${type} does not exist.`);
    return;
  }

  if (handlers.has(handler)) {
    console.warn(`Event with type ${type} and handler has already been added.`);
    return;
  }

  handlers.set(handler, RemoteControlEventEmitter.addListener(type, handler));
};

const removeAllRemoteControlListeners = () => {
  const count = eventNames.length;
  for (let i = 0; i < count; i++) {
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
