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
    paddingHorizontal: pick(7, 8),
    paddingVertical: pick(6, 8),
    marginBottom: pick(6, 15),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  playerCardPool: {
    backgroundColor: '#4A4A4A',
    borderColor: 'rgba(255,48,48,0.38)',
  },
  playerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: pick(30, 34),
  },
  avatar: {
    width: pick(24, 28),
    height: pick(24, 28),
    borderRadius: pick(12, 14),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4ECD1',
    marginRight: pick(6, 8),
  },
  avatarPool: {
    backgroundColor: '#D8D8D8',
  },
  avatarDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  avatarText: {
    color: '#1A1A1A',
    fontSize: pick(12, 20),
    fontWeight: '700',
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
});

export default styles;
