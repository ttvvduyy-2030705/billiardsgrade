import {StyleSheet} from 'react-native';

import colors from 'configuration/colors';

const styles = StyleSheet.create({
  container: {
    paddingBottom: 1,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1,
  },
  topControls: {
    paddingTop: 0,
    marginBottom: 4,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  controlRowCompact: {
    marginBottom: 5,
  },
  controlLabel: {
    width: 58,
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    marginRight: 8,
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
    minWidth: 32,
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginRight: 5,
    marginBottom: 5,
    borderRadius: 13,
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
    fontSize: 11.5,
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
    paddingHorizontal: 7,
    paddingVertical: 6,
    marginBottom: 6,
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
    minHeight: 30,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4ECD1',
    marginRight: 6,
  },
  avatarPool: {
    backgroundColor: '#D8D8D8',
  },
  avatarDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  avatarText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarTextLight: {
    color: colors.white,
  },
  nameInput: {
    flex: 1,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#F5F0DA',
    paddingHorizontal: 9,
    paddingVertical: 0,
    color: '#1A1A1A',
    fontSize: 12.5,
    lineHeight: 14,
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
    borderRadius: 9,
    backgroundColor: '#F5F0DA',
    overflow: 'hidden',
    marginTop: 6,
  },
  scoreRowPool: {
    backgroundColor: '#6A6A6A',
  },
  scoreItem: {
    flex: 1,
    minHeight: 22,
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
    fontSize: 10.5,
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
