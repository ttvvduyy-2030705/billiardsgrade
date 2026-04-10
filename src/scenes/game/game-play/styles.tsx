import {StyleSheet} from 'react-native';

import colors from 'configuration/colors';

import {AdaptiveLayout} from '../useAdaptiveLayout';

const createStyles = (a: AdaptiveLayout) => {
  const boardGap = a.layoutPreset === 'phone' ? a.s(8) : a.s(12);
  const shortLandscape = a.isLandscape && a.height <= 720;
  const screenHorizontal =
    shortLandscape
      ? a.s(6)
      : a.layoutPreset === 'tv'
        ? a.s(16)
        : a.layoutPreset === 'wideTablet'
          ? a.s(12)
          : a.layoutPreset === 'tablet'
            ? a.s(10)
            : a.s(8);

  return StyleSheet.create({
    warmUpContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 40,
    },

    buttonEndWarmUp: {
      backgroundColor: '#131313',
      borderRadius: a.s(20),
    },

    countdownContainer: {
      width: '100%',
      paddingHorizontal: a.s(2),
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: -2,
      backgroundColor: '#000000',
    },

    mainArea: {
      flex: 1,
      paddingTop: shortLandscape ? 0 : a.layoutPreset === 'phone' ? a.s(4) : a.s(6),
    },

    mainAreaFullscreen: {
      flex: 1,
      paddingTop: 0,
    },

    poolArenaScreen: {
      backgroundColor: '#000000',
      paddingHorizontal: screenHorizontal,
      paddingTop: shortLandscape ? a.s(4) : a.layoutPreset === 'phone' ? a.s(8) : a.s(10),
      paddingBottom: 0,
    },

    poolArenaBoard: {
      gap: boardGap,
    },

    poolArenaPlayerColumn: {
      flex: 1,
      minWidth: 0,
    },

    poolArenaConsoleWrapper: {
      flex:
        a.layoutPreset === 'wideTablet'
          ? 1.06
          : a.layoutPreset === 'phone'
            ? 1.04
            : 0.98,
      minWidth: 0,
      marginHorizontal: 0,
      paddingBottom: 0,
    },
  });
};

export default createStyles;
