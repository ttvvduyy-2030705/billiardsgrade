import {StyleSheet} from 'react-native';

import colors from 'configuration/colors';
import {LayoutPreset} from 'scenes/game/useAdaptiveLayout';

const panelGapByPreset: Record<LayoutPreset, number> = {
  phone: 10,
  tablet: 12,
  wideTablet: 14,
  tv: 16,
};

const panelRadiusByPreset: Record<LayoutPreset, number> = {
  phone: 18,
  tablet: 20,
  wideTablet: 22,
  tv: 24,
};

export const createStyles = (adaptive: {
  s: (value: number) => number;
  fs: (value: number) => number;
  isLandscape: boolean;
  layoutPreset: LayoutPreset;
  aspectRatio: number;
  width?: number;
  height?: number;
  isShortLandscape?: boolean;
}) => {
  const {s, fs, isLandscape, layoutPreset, aspectRatio, width = 0, height = 0, isShortLandscape = false} = adaptive;
  const isPhone = layoutPreset === 'phone';
  const isWide = layoutPreset === 'wideTablet' || layoutPreset === 'tv';
  const compactLandscape = isLandscape && (isShortLandscape || height <= 760 || width <= 1180);
  const panelGap = s(compactLandscape ? Math.max(8, panelGapByPreset[layoutPreset] - 2) : panelGapByPreset[layoutPreset]);
  const panelRadius = s(compactLandscape ? Math.max(16, panelRadiusByPreset[layoutPreset] - 2) : panelRadiusByPreset[layoutPreset]);
  const titlePad = compactLandscape ? s(118) : isWide ? s(170) : s(148);
  const contentDirection = isLandscape ? 'row' : 'column';
  const panelSplit =
    isLandscape && aspectRatio >= 1.75
      ? {left: 0.94, right: 1.06}
      : isLandscape && aspectRatio >= 1.45
      ? {left: 0.97, right: 1.03}
      : {left: 1, right: 1};

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#000000',
      paddingHorizontal: s(isPhone ? 8 : compactLandscape ? 10 : 14),
      paddingTop: s(isPhone ? 6 : compactLandscape ? 8 : 10),
      paddingBottom: s(isPhone ? 6 : compactLandscape ? 8 : 10),
    },
    headerGlow: {
      position: 'relative',
      minHeight: s(isPhone ? 46 : compactLandscape ? 52 : 58),
      borderRadius: s(22),
      borderWidth: 1.1,
      borderColor: 'rgba(255, 52, 52, 0.24)',
      backgroundColor: '#050505',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s(14),
      shadowColor: '#FF1414',
      shadowOpacity: 0.3,
      shadowRadius: s(14),
      shadowOffset: {width: 0, height: 4},
      elevation: 8,
    },
    headerBackButton: {
      position: 'absolute',
      left: s(12),
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 2,
    },
    headerBackFrame: {
      height: s(isPhone ? 38 : 42),
      minWidth: s(isPhone ? 96 : 110),
      paddingHorizontal: s(14),
      borderRadius: s(14),
      borderWidth: 1.1,
      borderColor: 'rgba(255, 52, 52, 0.24)',
      backgroundColor: '#070707',
      justifyContent: 'center',
      shadowColor: '#FF1414',
      shadowOpacity: 0.16,
      shadowRadius: s(9),
      shadowOffset: {width: 0, height: 3},
      elevation: 6,
      transform: [{skewX: '-16deg'}],
    },
    headerBackInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{skewX: '16deg'}],
    },
    headerBackLogoImage: {
      width: s(isPhone ? 66 : 74),
      height: s(isPhone ? 22 : 26),
    },
    headerTitleWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: titlePad,
      pointerEvents: 'none',
    },
    headerTitle: {
      flexShrink: 1,
      color: '#FFFFFF',
      textAlign: 'center',
      fontSize: fs(isPhone ? 18 : 24),
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    contentRow: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      flexDirection: contentDirection,
      marginTop: s(isPhone ? 8 : compactLandscape ? 10 : 12),
      minHeight: 0,
    },
    panelShell: {
      width: '100%',
      alignSelf: 'stretch',
      minHeight: 0,
      borderRadius: panelRadius,
      borderWidth: 1,
      borderColor: 'rgba(255, 42, 42, 0.18)',
      backgroundColor: '#050505',
      paddingTop: s(isPhone ? 6 : compactLandscape ? 8 : 10),
      paddingHorizontal: s(isPhone ? 6 : compactLandscape ? 8 : 10),
      paddingBottom: s(isPhone ? 5 : compactLandscape ? 6 : 8),
      shadowColor: '#FF1414',
      shadowOpacity: 0.18,
      shadowRadius: s(12),
      shadowOffset: {width: 0, height: 4},
      elevation: 7,
    },
    leftPanel: {
      flex: panelSplit.left,
      marginRight: isLandscape ? panelGap / 2 : 0,
      marginBottom: isLandscape ? 0 : panelGap,
    },
    rightPanel: {
      flex: panelSplit.right,
      marginLeft: isLandscape ? panelGap / 2 : 0,
    },
    panelHeader: {
      borderBottomWidth: 1.1,
      borderBottomColor: '#FF1F26',
      paddingBottom: s(isPhone ? 6 : 7),
      marginBottom: s(isPhone ? 6 : 8),
    },
    panelHeaderText: {
      alignSelf: 'flex-start',
      color: '#FFFFFF',
      fontSize: fs(isPhone ? 14 : 18),
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    panelScroll: {
      flex: 1,
      minHeight: 0,
    },
    panelScrollContent: {
      width: '100%',
      alignSelf: 'stretch',
      paddingBottom: s(4),
      flexGrow: 1,
    },
    rightPanelContent: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      minHeight: 0,
    },
    playerScrollContent: {
      width: '100%',
      alignSelf: 'stretch',
      paddingBottom: s(6),
      flexGrow: 1,
    },
    footerInside: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingTop: s(compactLandscape ? 8 : 10),
      marginTop: s(compactLandscape ? 4 : 6),
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.06)',
    },
    footerButton: {
      minWidth: s(isPhone ? 82 : 96),
      height: s(isPhone ? 38 : 42),
      borderRadius: s(13),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: s(16),
    },
    cancelButton: {
      backgroundColor: '#050505',
      borderWidth: 1.6,
      borderColor: colors.white,
      marginRight: s(10),
    },
    startButton: {
      backgroundColor: '#D61F26',
      borderWidth: 1.6,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    cancelText: {
      color: colors.white,
      fontSize: fs(isPhone ? 12.5 : 14),
      fontWeight: '700',
    },
    startText: {
      color: colors.white,
      fontSize: fs(isPhone ? 12.5 : 14),
      fontWeight: '800',
    },
    buttonPressed: {
      opacity: 0.86,
      transform: [{scale: 0.985}],
    },
    countryPickerLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 999,
      elevation: 999,
    },
    countryPickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: s(20),
    },
    countryPickerCard: {
      width: '100%',
      maxWidth: s(420),
      maxHeight: '72%',
      backgroundColor: '#1F1F1F',
      borderRadius: s(14),
      borderWidth: 1,
      borderColor: 'rgba(255,0,0,0.28)',
      padding: s(14),
    },
    countryPickerTitle: {
      color: '#FFFFFF',
      fontSize: fs(16),
      fontWeight: '700',
      marginBottom: s(10),
    },
    countrySearchInput: {
      height: s(42),
      borderRadius: s(10),
      backgroundColor: '#2B2B2B',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      color: '#FFFFFF',
      paddingHorizontal: s(12),
      marginBottom: s(10),
    },
    countryList: {
      flexGrow: 0,
    },
    countryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: s(10),
      paddingHorizontal: s(8),
      borderRadius: s(10),
    },
    countryItemPressed: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    countryFlagFrame: {
      width: 42,
      height: 28,
      marginRight: 12,
      borderRadius: 4,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.55)',
      overflow: 'hidden',
    },
    countryFlagImage: {
      width: '100%',
      height: '100%',
      backgroundColor: '#FFFFFF',
    },
    countryFlag: {
      width: s(28),
      fontSize: fs(20),
      marginRight: s(10),
      textAlign: 'center',
    },
    countryName: {
      color: '#FFFFFF',
      fontSize: fs(15),
      flex: 1,
    },
    countryEmptyText: {
      color: '#B8B8B8',
      fontSize: fs(14),
      textAlign: 'center',
      paddingVertical: s(20),
    },
  });
};

export default createStyles;
