import {Dimensions, StyleSheet} from 'react-native';

import colors from 'configuration/colors';

const {width, height} = Dimensions.get('window');
const longSide = Math.max(width, height);
const shortSide = Math.min(width, height);
const isLargeDisplay = longSide >= 1700 && shortSide >= 900;
const pick = (small: number, large: number) => (isLargeDisplay ? large : small);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: pick(14, 16),
    paddingTop: pick(10, 12),
    paddingBottom: pick(10, 12),
  },
  headerGlow: {
    position: 'relative',
    minHeight: pick(56, 60),
    borderRadius: 22,
    borderWidth: 1.1,
    borderColor: 'rgba(255, 52, 52, 0.24)',
    backgroundColor: '#050505',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: pick(14, 16),
    shadowColor: '#FF1414',
    shadowOpacity: 0.36,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
  },
  headerBackButton: {
    position: 'absolute',
    left: pick(14, 16),
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 2,
  },
  headerBackFrame: {
    height: pick(42, 46),
    minWidth: pick(108, 114),
    paddingHorizontal: pick(14, 16),
    borderRadius: 14,
    borderWidth: 1.1,
    borderColor: 'rgba(255, 52, 52, 0.24)',
    backgroundColor: '#070707',
    justifyContent: 'center',
    shadowColor: '#FF1414',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
    transform: [{skewX: '-16deg'}],
  },
  headerBackInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{skewX: '16deg'}],
  },
  headerBackArrow: {
    color: '#FFFFFF',
    fontSize: pick(20, 22),
    fontWeight: '900',
    marginRight: 10,
  },
  headerBackLogoImage: {
    width: pick(72, 76),
    height: pick(24, 26),
  },
  headerTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: pick(132, 148),
    pointerEvents: 'none',
  },
  logoButton: {
    position: 'absolute',
    left: pick(14, 16),
    top: 0,
    bottom: 0,
    width: pick(100, 112),
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 4,
    zIndex: 2,
  },
  logoImage: {
    width: pick(82, 86),
    height: pick(28, 30),
  },
  headerTitle: {
    flexShrink: 1,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: pick(22, 24),
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1.2,
  },
  headerSpacer: {
    width: 0,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    marginTop: pick(12, 14),
    minHeight: 0,
  },
  panelShell: {
    flex: 1,
    minHeight: 0,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 42, 0.18)',
    backgroundColor: '#050505',
    paddingTop: pick(10, 12),
    paddingHorizontal: pick(10, 12),
    paddingBottom: pick(8, 10),
    shadowColor: '#FF1414',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 4},
    elevation: 7,
  },
  leftPanel: {
    marginRight: pick(8, 9),
  },
  rightPanel: {
    marginLeft: pick(8, 9),
  },
  panelHeader: {
    borderBottomWidth: 1.1,
    borderBottomColor: '#FF1F26',
    paddingBottom: pick(7, 8),
    marginBottom: pick(6, 8),
  },
  panelHeaderText: {
    alignSelf: 'flex-start',
    color: '#FFFFFF',
    fontSize: pick(13.5, 25),
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1.1,
  },
  panelScroll: {
    flex: 1,
    minHeight: 0,
  },
  panelScrollContent: {
    paddingBottom: pick(2, 4),
  },
  rightPanelContent: {
    flex: 1,
    minHeight: 0,
  },
  playerScrollContent: {
    paddingBottom: pick(2, 4),
  },
  footerInside: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: pick(8, 10),
    marginTop: pick(4, 6),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerButton: {
    minWidth: pick(82, 92),
    height: pick(38, 42),
    borderRadius: pick(13, 14),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: pick(14, 16),
  },
  cancelButton: {
    backgroundColor: '#050505',
    borderWidth: 1.6,
    borderColor: colors.white,
    marginRight: pick(10, 12),
  },
  startButton: {
    backgroundColor: '#D61F26',
    borderWidth: 1.6,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cancelText: {
    color: colors.white,
    fontSize: pick(13, 25),
    fontWeight: '700',
  },
  startText: {
    color: colors.white,
    fontSize: pick(13, 25),
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{scale: 0.985}],
  },
});

export default styles;
