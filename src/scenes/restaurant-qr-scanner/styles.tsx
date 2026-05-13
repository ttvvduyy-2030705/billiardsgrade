import {StyleSheet} from 'react-native';

type Metrics = {
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const createStyles = (design: any, metrics: Metrics) => {
  const width = metrics.width || 1280;
  const height = metrics.height || 720;
  const railWidth = clamp(width * 0.21, 210, 310);
  const sidePadding = clamp(width * 0.025, 18, 34);
  const verticalPadding = clamp(height * 0.045, 18, 34);
  const cameraHeight = clamp(height * 0.64, 260, 520);
  const isShortLandscape = height < 520;
  const rightRailMaxHeight = Math.max(260, height - verticalPadding * 2);
  const compactGap = isShortLandscape ? 8 : 14;

  return StyleSheet.create({
    screen: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#050506',
      paddingHorizontal: sidePadding,
      paddingVertical: verticalPadding,
      overflow: 'hidden',
    },
    glowTop: {
      position: 'absolute',
      top: -height * 0.32,
      right: -width * 0.08,
      width: width * 0.42,
      height: width * 0.42,
      borderRadius: width * 0.21,
      backgroundColor: 'rgba(184, 14, 19, 0.22)',
    },
    glowBottom: {
      position: 'absolute',
      bottom: -height * 0.5,
      left: width * 0.12,
      width: width * 0.5,
      height: width * 0.5,
      borderRadius: width * 0.25,
      backgroundColor: 'rgba(130, 0, 10, 0.14)',
    },
    homeButton: {
      position: 'absolute',
      top: clamp(height * 0.018, 10, 18),
      left: clamp(width * 0.018, 10, 20),
      zIndex: 30,
      elevation: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      backgroundColor: 'rgba(10, 10, 14, 0.86)',
      paddingHorizontal: isShortLandscape ? 12 : 14,
      paddingVertical: isShortLandscape ? 7 : 9,
    },
    homeButtonText: {
      color: '#ffffff',
      fontSize: isShortLandscape ? 12 : 13,
      fontWeight: '900',
    },
    leftRail: {
      width: railWidth,
      minWidth: 190,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      backgroundColor: 'rgba(15, 15, 20, 0.86)',
      padding: clamp(width * 0.018, 18, 28),
      paddingTop: clamp(width * 0.018, 18, 28) + 34,
      justifyContent: 'center',
      zIndex: 3,
    },
    logo: {
      width: clamp(railWidth * 0.38, 76, 112),
      height: clamp(railWidth * 0.18, 36, 54),
      marginBottom: 24,
    },
    brandEyebrow: {
      color: '#ff5c5c',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 2,
      marginBottom: isShortLandscape ? 7 : 10,
    },
    brandTitle: {
      color: '#ffffff',
      fontSize: clamp(width * 0.02, 24, 34),
      lineHeight: clamp(width * 0.025, 30, 42),
      fontWeight: '900',
      marginBottom: compactGap,
    },
    brandHint: {
      color: 'rgba(255,255,255,0.68)',
      fontSize: isShortLandscape ? 13 : 15,
      lineHeight: 22,
      fontWeight: '700',
    },
    centerPane: {
      flex: 1,
      paddingHorizontal: clamp(width * 0.024, 20, 36),
      justifyContent: 'center',
      zIndex: 4,
    },
    cameraCard: {
      borderRadius: 32,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(11, 11, 15, 0.92)',
      padding: clamp(width * 0.016, 16, 26),
      shadowColor: '#000',
      shadowOpacity: 0.34,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: 16},
      elevation: 8,
    },
    cameraHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: compactGap,
    },
    cameraTitle: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: '900',
    },
    cameraBadge: {
      color: '#ff8a8a',
      fontSize: isShortLandscape ? 11 : 12,
      fontWeight: '900',
      letterSpacing: 1.5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(255, 60, 64, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 80, 84, 0.32)',
    },
    cameraFrame: {
      height: cameraHeight,
      borderRadius: 26,
      backgroundColor: '#09090c',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraPreview: {
      ...StyleSheet.absoluteFillObject,
    },
    cameraFallbackContent: {
      paddingHorizontal: 28,
      alignItems: 'center',
    },
    cameraFallbackTitle: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 8,
    },
    cameraFallbackHint: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: isShortLandscape ? 13 : 15,
      lineHeight: 22,
      fontWeight: '700',
      textAlign: 'center',
      maxWidth: 420,
    },
    cameraFallbackError: {
      color: 'rgba(255,255,255,0.52)',
      fontSize: isShortLandscape ? 10 : 11,
      lineHeight: isShortLandscape ? 14 : 16,
      fontWeight: '700',
      textAlign: 'center',
      maxWidth: 460,
      marginTop: 12,
    },
    cameraPermissionButton: {
      marginTop: 18,
      borderRadius: 999,
      backgroundColor: '#b81218',
      paddingHorizontal: 24,
      paddingVertical: 13,
    },
    cameraPermissionText: {
      color: '#ffffff',
      fontSize: isShortLandscape ? 13 : 15,
      fontWeight: '900',
    },
    scanCornerTopLeft: {
      position: 'absolute',
      top: 22,
      left: 22,
      width: 58,
      height: 58,
      borderTopWidth: 5,
      borderLeftWidth: 5,
      borderColor: '#ff3636',
      borderTopLeftRadius: 18,
    },
    scanCornerTopRight: {
      position: 'absolute',
      top: 22,
      right: 22,
      width: 58,
      height: 58,
      borderTopWidth: 5,
      borderRightWidth: 5,
      borderColor: '#ff3636',
      borderTopRightRadius: 18,
    },
    scanCornerBottomLeft: {
      position: 'absolute',
      bottom: 22,
      left: 22,
      width: 58,
      height: 58,
      borderBottomWidth: 5,
      borderLeftWidth: 5,
      borderColor: '#ff3636',
      borderBottomLeftRadius: 18,
    },
    scanCornerBottomRight: {
      position: 'absolute',
      bottom: 22,
      right: 22,
      width: 58,
      height: 58,
      borderBottomWidth: 5,
      borderRightWidth: 5,
      borderColor: '#ff3636',
      borderBottomRightRadius: 18,
    },
    statusText: {
      color: 'rgba(255,255,255,0.74)',
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 14,
    },
    rightRail: {
      width: railWidth,
      minWidth: 220,
      maxHeight: rightRailMaxHeight,
      alignSelf: 'center',
      zIndex: 5,
    },
    rightRailScroller: {
      maxHeight: rightRailMaxHeight,
      borderRadius: 24,
    },
    rightRailContent: {
      paddingVertical: isShortLandscape ? 4 : 8,
      justifyContent: 'center',
      flexGrow: 1,
    },
    manualQrCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(15, 15, 20, 0.9)',
      padding: isShortLandscape ? 14 : 18,
      marginBottom: compactGap,
    },
    manualQrTitle: {
      color: '#ffffff',
      fontSize: isShortLandscape ? 16 : 18,
      fontWeight: '900',
      marginBottom: 8,
    },
    manualQrHint: {
      color: 'rgba(255,255,255,0.66)',
      fontSize: isShortLandscape ? 12 : 13,
      lineHeight: isShortLandscape ? 18 : 20,
      fontWeight: '700',
      marginBottom: 12,
    },
    manualQrInput: {
      minHeight: isShortLandscape ? 42 : 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      backgroundColor: 'rgba(255,255,255,0.06)',
      color: '#ffffff',
      fontSize: isShortLandscape ? 13 : 15,
      fontWeight: '800',
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginBottom: 10,
    },
    manualQrError: {
      color: '#ff9ea1',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '800',
      marginBottom: 10,
    },
    manualQrButton: {
      borderRadius: 999,
      backgroundColor: '#ffffff',
      paddingHorizontal: 18,
      paddingVertical: isShortLandscape ? 11 : 13,
      alignItems: 'center',
    },
    manualQrButtonText: {
      color: '#7f090d',
      fontSize: isShortLandscape ? 13 : 15,
      fontWeight: '900',
    },
    adminButton: {
      borderRadius: 999,
      backgroundColor: '#a70e14',
      borderWidth: 1,
      borderColor: 'rgba(255, 90, 96, 0.55)',
      paddingHorizontal: 18,
      paddingVertical: isShortLandscape ? 12 : 17,
      alignItems: 'center',
      marginBottom: compactGap,
    },
    adminButtonText: {
      color: '#ffffff',
      fontSize: isShortLandscape ? 15 : 17,
      fontWeight: '900',
    },
  });
};

export default createStyles;
