import {Screens} from 'types/scenes';

const screens: Screens = {
  home: 'home',
  livePlatform: 'livePlatform',
  livePlatformSetup: 'livePlatformSetup',
  livePlatformSetupFacebook: 'livePlatformSetupFacebook',
  livePlatformSetupYoutube: 'livePlatformSetupYoutube',
  livePlatformSetupTiktok: 'livePlatformSetupTiktok',
  gameSettings: 'gameSettings',
  gamePlay: 'gamePlay',
  history: 'history',
  playback: 'playback',
  configs: 'configs',
  restaurantMenu: 'restaurantMenu',
  restaurantAdminLogin: 'restaurantAdminLogin',
  restaurantAdminDashboard: 'restaurantAdminDashboard',
  overlay: 'overlay',
};

const sceneKeys = Object.keys(screens);

export {screens, sceneKeys};
