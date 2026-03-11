import {RemoteControlModule} from 'services/native-modules';
import {RemoteControlKeys, RemoteControlKeysNative} from 'types/bluetooth';

class RemoteControl {
  private static _instance: RemoteControl;
  private _keyEvents: {[key in string]: Function | null};

  private constructor() {
    const keys = Object.values(RemoteControlKeys);
    this._keyEvents = keys.reduce((prev, current) => {
      return {...prev, [current]: null};
    }, {});

    try {
      RemoteControlModule.registerRemoteControlListener(this.onKeyDown);
    } catch (error) {
      console.log('REMOTE init error =', error);
    }
  }

  public static get instance() {
    return this._instance || (this._instance = new this());
  }

  private onKeyDown = (data: RemoteControlKeysNative) => {
    try {
      console.log(
        'REMOTE_JS keyCode =',
        data?.keyCode,
        'data =',
        JSON.stringify(data),
      );

      const callback = this._keyEvents[data.keyCode];
      if (!callback) {
        console.log('REMOTE_JS no callback for keyCode =', data?.keyCode);
        return;
      }

      callback();
    } catch (error) {
      console.log('REMOTE onKeyDown error =', error);
    }
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
