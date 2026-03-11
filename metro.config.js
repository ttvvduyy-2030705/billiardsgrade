const {getDefaultConfig} = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  path: require.resolve('path-browserify'),
};

config.resolver.blockList = [
  /android[\/\\]\.cxx[\/\\].*/,
  /node_modules[\/\\]realm[\/\\]binding[\/\\]android[\/\\]\.cxx[\/\\].*/,
];

module.exports = config;