export enum DiscoverableDevices {
  remote = 'AJBHJZ001',
  remote2 = 'MOCUTE-052Fe-AUTO',
  remote3 = 'M585/M590',
}

export enum RemoteControlKeys {
  START = '30',
  WARM_UP = '31',

  NEW_GAME = '29',
  BREAK = '32',
  TIMER = '25',
  EXTENSION = '24',

  STOP = '85',
  SOUND = '164',

  UP = '19',
  LEFT = '22',
  DOWN = '20',
  RIGHT = '21',
  OK = '4',
}

export type RemoteControlKeysNative = {
  keyCode: RemoteControlKeys;
};