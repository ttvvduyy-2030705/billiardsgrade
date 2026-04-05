const isProduction =
  (process.env.BABEL_ENV || process.env.NODE_ENV || 'development') === 'production';

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        cwd: 'babelrc',
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '': './src',
        },
      },
    ],

    ...(isProduction
      ? [
          [
            'transform-remove-console',
            {
              exclude: ['error', 'warn'],
            },
          ],
        ]
      : []),

    ['react-native-worklets-core/plugin'],
    ['react-native-reanimated/plugin'],
  ],
  sourceMaps: !isProduction,
};