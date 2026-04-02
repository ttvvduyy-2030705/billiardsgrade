import {StyleSheet} from 'react-native';

const createStyles = (width: number, height: number) => {
  const topPadding = Math.max(26, height * 0.06);
  const horizontalPadding = Math.max(24, width * 0.07);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#000000',
    },

    topRow: {
      position: 'absolute',
      top: topPadding,
      left: horizontalPadding,
      right: horizontalPadding,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      zIndex: 20,
    },

    title: {
      color: '#FFFFFF',
      fontSize: Math.min(width * 0.03, 30),
      fontWeight: '400',
    },

    rightTopWrap: {
      alignItems: 'flex-end',
    },

    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    greetingText: {
      color: '#FFFFFF',
      fontSize: Math.min(width * 0.03, 30),
      fontWeight: '400',
    },

    settingsIcon: {
      width: Math.min(width * 0.028, 27),
      height: Math.min(width * 0.028, 27),
      tintColor: '#FFFFFF',
    },

    historyPill: {
      marginTop: Math.max(12, height * 0.017),
      paddingVertical: Math.max(8, height * 0.011),
      paddingHorizontal: Math.max(15, width * 0.013),
      borderRadius: 999,
      backgroundColor: 'rgba(28, 28, 28, 0.95)',
      flexDirection: 'row',
      alignItems: 'center',
    },

    historyIcon: {
      width: Math.min(width * 0.021, 19),
      height: Math.min(width * 0.021, 19),
      tintColor: '#B1B1B1',
      marginRight: 8,
    },

    historyText: {
      color: '#C6C6C6',
      fontSize: Math.min(width * 0.021, 18),
      fontWeight: '500',
    },

    startButtonCenterLayer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },

    startButtonTouchArea: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    startButtonWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    startButtonGlowOuter: {
      position: 'absolute',
      top: 7,
      left: 10,
      right: 10,
      bottom: 0,
      borderRadius: 28,
      backgroundColor: 'rgba(255, 34, 10, 0.18)',
      shadowColor: '#ff2b14',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 1,
      shadowRadius: 22,
      elevation: 18,
    },

    startButtonGlowInner: {
      position: 'absolute',
      top: 2,
      left: 4,
      right: 4,
      bottom: 2,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: 'rgba(255, 101, 54, 0.62)',
      shadowColor: '#ff5227',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.95,
      shadowRadius: 10,
      elevation: 13,
    },

    startButtonCore: {
      width: '100%',
      height: '100%',
      borderRadius: 28,
      padding: 4,
      borderWidth: 2,
      borderColor: '#ff4229',
    },

    startButtonInnerBorder: {
      flex: 1,
      borderRadius: 23,
      borderWidth: 1.6,
      borderColor: 'rgba(255, 197, 128, 0.56)',
      backgroundColor: 'rgba(122, 7, 7, 0.30)',
      overflow: 'hidden',
    },

    startButtonContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 22,
    },

    startGameIcon: {
      width: Math.min(width * 0.026, 26),
      height: Math.min(width * 0.026, 26),
      tintColor: '#f1d48d',
      marginRight: 12,
    },

    startButtonText: {
      color: '#f1d48d',
      fontSize: Math.min(width * 0.029, 28),
      fontWeight: '700',
      letterSpacing: 0.2,
      textAlign: 'center',
    },

    logoBottomLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: Math.max(18, height * 0.045),
      alignItems: 'center',
      zIndex: 5,
    },

    logoBlock: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    tagline: {
      marginTop: Math.max(10, height * 0.012),
      color: '#FFFFFF',
      fontSize: Math.min(width * 0.022, 20),
      fontWeight: '400',
      letterSpacing: 0.15,
      textAlign: 'center',
    },
  });
};

export default createStyles;
