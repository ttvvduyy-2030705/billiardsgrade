export enum DiscoverableDevices {
  remote = 'AJBHJZ001',
  remote2 = 'MOCUTE-052Fe-AUTO',
  remote3 = 'M585/M590',
}

export enum RemoteControlKeys {
  PLAY_OR_PAUSE = '85',
  LIGHT = '82',
  PAGE_UP = '92',
  PAGE_DOWN = '93',
  VOL_UP = '24',
  VOL_DOWN = '25',
  DEL = '67',
  MUTE = '164',
  UP = '19',
  LEFT = '22',
  DOWN = '20',
  RIGHT = '21',
  OK = '4'
}

export type RemoteControlKeysNative = {
  keyCode: RemoteControlKeys;
};
