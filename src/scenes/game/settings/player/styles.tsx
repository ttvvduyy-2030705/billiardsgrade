import {Dimensions, StyleSheet} from 'react-native';

import colors from 'configuration/colors';

const {width, height} = Dimensions.get('window');
const longSide = Math.max(width, height);
const shortSide = Math.min(width, height);
const isLargeDisplay = longSide >= 1700 && shortSide >= 900;
const pick = (small: number, large: number) => (isLargeDisplay ? large : small);

const styles = StyleSheet.create({
  container: {
    paddingBottom: pick(1, 2),
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: pick(14, 16),
    fontWeight: '800',
    marginBottom: pick(8, 10),
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1,
  },
  topControls: {
    paddingTop: 0,
    marginBottom: pick(4, 6),
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: pick(6, 8),
  },
  controlRowCompact: {
    marginBottom: pick(5, 6),
  },
  controlLabel: {
    width: pick(58, 68),
    color: '#FFFFFF',
    fontSize: pick(11.5, 20),
    fontWeight: '700',
    marginRight: pick(8, 10),
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1,
  },
  controlOptionsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  selectorButton: {
    minWidth: pick(32, 38),
    minHeight: pick(28, 34),
    paddingHorizontal: pick(9, 12),
    paddingVertical: pick(4, 5),
    marginRight: pick(5, 6),
    marginBottom: pick(5, 6),
    borderRadius: pick(13, 15),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#4A4A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorButtonActive: {
    backgroundColor: '#E11D25',
    borderColor: '#E11D25',
  },
  selectorButtonPressed: {
    opacity: 0.88,
  },
  selectorButtonText: {
    color: colors.white,
    fontSize: pick(11.5, 25),
    fontWeight: '600',
  },
  selectorButtonTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  playerList: {
    paddingTop: 0,
  },
  playerCard: {
    borderRadius: 14,
    paddingHorizontal: pick(6, 8),
    paddingVertical: pick(6, 8),
    marginBottom: pick(6, 15),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  playerCardPool: {
    backgroundColor: '#4A4A4A',
    borderColor: 'rgba(255,48,48,0.38)',
  },
  playerCardRight: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: pick(6, 8),
  },
  playerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: pick(30, 34),
  },
  avatar: {
    width: pick(40, 52),
    minHeight: pick(58, 72),
    borderRadius: pick(10, 12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4ECD1',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  avatarPool: {
    backgroundColor: '#D8D8D8',
  },
  avatarDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  avatarText: {
  color: '#1A1A1A',
  fontSize: pick(40, 40),
  lineHeight: pick(40, 40),
  fontWeight: '700',
  textAlign: 'center',
  textAlignVertical: 'center',
  includeFontPadding: false,
},
  avatarTextLight: {
    color: colors.white,
  },
  nameInput: {
    flex: 1,
    height: pick(30, 34),
    borderRadius: pick(9, 10),
    backgroundColor: '#F5F0DA',
    paddingHorizontal: pick(9, 10),
    paddingVertical: 0,
    color: '#1A1A1A',
    fontSize: pick(12.5, 25),
    lineHeight: pick(14, 25),
    fontWeight: '500',
    textAlignVertical: 'center',
  },
  nameInputPool: {
    backgroundColor: '#D9D9D9',
    color: '#1B1B1B',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: pick(9, 10),
    backgroundColor: '#F5F0DA',
    overflow: 'hidden',
    marginTop: pick(6, 8),
  },
  scoreRowPool: {
    backgroundColor: '#6A6A6A',
  },
  scoreItem: {
    flex: 1,
    minHeight: pick(22, 26),
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.12)',
  },
  scoreItemPool: {
    borderRightColor: 'rgba(255,255,255,0.18)',
  },
  scoreItemCenter: {
    backgroundColor: '#EEE6C5',
  },
  scoreItemCenterPool: {
    backgroundColor: '#E11D25',
  },
  scoreText: {
    color: '#202020',
    fontSize: pick(10.5, 25),
    fontWeight: '500',
  },
  scoreTextPool: {
    color: colors.white,
  },
  scoreTextCenter: {
    fontWeight: '700',
  },

  countryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  countryModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '72%',
    backgroundColor: '#1F1F1F',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.28)',
    padding: 14,
  },
  countryModalTitle: {
    color: '#FFFFFF',
    fontSize: pick(16, 18),
    fontWeight: '700',
    marginBottom: 10,
  },
  countrySearchInput: {
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2B2B2B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  countryList: {
    flexGrow: 0,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  countryItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  countryFlag: {
    width: 28,
    fontSize: 20,
    marginRight: 10,
    textAlign: 'center',
  },
  countryName: {
    color: '#FFFFFF',
    fontSize: 15,
    flex: 1,
  },
  countryEmptyText: {
    color: '#B8B8B8',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },

});

export default styles;
