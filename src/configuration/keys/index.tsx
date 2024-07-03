import { Platform } from 'react-native';

const keys = {
  JWT: 'JWT',
  ColorThemeIndex: 'ColorThemeIndex',
  FirebaseToken: 'FirebaseToken',
  LoginSource: 'LoginSource',
  IRON_SOURCE_KEY: Platform.OS === 'ios' ? '16d79c4bd' : '16d7a37cd',
};

export { keys };
