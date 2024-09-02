import {RemoteControlModule} from 'services/native-modules';
import {RemoteControlKeys, RemoteControlKeysNative} from 'types/bluetooth';

class RemoteControl {
  private static _instance: RemoteControl;
  private _keyEvents: {[key in string]: Function | null};

  private constructor() {
    RemoteControlModule.registerRemoteControlListener(this.onKeyDown);
    const _keys = Object.keys(RemoteControlKeys);

    this._keyEvents = _keys.reduce((prev, current) => {
      return {...prev, [current]: null};
    }, {});
  }

  public static get instance() {
    return this._instance || (this._instance = new this());
  }

  private onKeyDown = (data: RemoteControlKeysNative) => {
    const callback = this._keyEvents[data.keyCode];

    if (!callback) {
      return;
    }

    callback();
  };

  public registerKeyEvents = (event: RemoteControlKeys, callback: Function) => {
    this._keyEvents[event] = callback;
  };

  public removeAllListeners = () => {
    RemoteControlModule.removeAllRemoteControlListeners();
  };
}

export default RemoteControl;
