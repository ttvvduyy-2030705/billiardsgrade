const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const escape = p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pathsToIgnore = [
  path.resolve(__dirname, 'android/app/build'),
  path.resolve(__dirname, 'android/build'),
  path.resolve(__dirname, 'android/.gradle'),
  path.resolve(__dirname, 'ios/build'),
  path.resolve(__dirname, 'node_modules/react-native-vision-camera/android/build'),
];

const blockList = pathsToIgnore.flatMap(p => {
  const e = escape(p);
  return [
    new RegExp(`^${e}\\/.*`),
    new RegExp(`^${e}\\\\.*`),
  ];
});

const config = {
  resolver: {
    ...defaultConfig.resolver,
    extraNodeModules: {
      path: require.resolve('path-browserify'),
    },
    blockList,
  },
};

module.exports = mergeConfig(defaultConfig, config);