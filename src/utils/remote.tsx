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
    console.log('REMOTE_JS keyCode =', data?.keyCode, 'data =', JSON.stringify(data));

    const callback = this._keyEvents[data.keyCode];

    if (!callback) {
      console.log('REMOTE_JS no callback for keyCode =', data?.keyCode);
      return;
    }

    callback();
  };

  public registerKeyEvents = (event: RemoteControlKeys, callback: Function) => {
    this._keyEvents[event] = callback;
  };

  public clearKeyEvents = () => {
    Object.keys(this._keyEvents).forEach(key => {
      this._keyEvents[key] = null;
    });
  };

  public removeAllListeners = () => {
    RemoteControlModule.removeAllRemoteControlListeners();
  };
}

export default RemoteControl;