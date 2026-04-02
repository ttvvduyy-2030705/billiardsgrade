import {Dimensions, StyleSheet} from 'react-native';

import colors from 'configuration/colors';

const {width, height} = Dimensions.get('window');
const longSide = Math.max(width, height);
const shortSide = Math.min(width, height);
const isLargeDisplay = longSide >= 1700 && shortSide >= 900;
const pick = (small: number, large: number) => (isLargeDisplay ? large : small);

const styles = StyleSheet.create({
  container: {
    paddingBottom: pick(2, 4),
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: pick(14, 16),
    fontWeight: '800',
    marginBottom: pick(8, 20),
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1,
  },
  section: {
    marginBottom: pick(8, 20),
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: pick(12.5, 25),
    fontWeight: '800',
    marginBottom: pick(5, 6),
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1,
  },
  sectionDivider: {
    height: 1.1,
    backgroundColor: '#FF1F26',
    marginBottom: pick(8, 20),
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: pick(6, 20),
  },
  compactOptionRow: {
    marginBottom: pick(5, 20),
  },
  inlineLabel: {
    width: pick(56, 68),
    color: '#FFFFFF',
    fontSize: pick(11.5, 22),
    fontWeight: '700',
    marginRight: pick(8, 10),
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1,
  },
  inlineOptions: {
    flex: 1,
    minWidth: 0,
  },
  poolBlock: {
    marginBottom: pick(6, 8),
  },
  modeOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: pick(6, 8),
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  optionButton: {
    minHeight: pick(28, 34),
    paddingHorizontal: pick(11, 25),
    paddingVertical: pick(4, 5),
    marginRight: pick(6, 8),
    marginBottom: pick(5, 15),
    borderRadius: pick(13, 15),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#E11D25',
    borderColor: '#E11D25',
  },
  optionButtonPressed: {
    opacity: 0.88,
  },
  optionText: {
    color: colors.white,
    fontSize: pick(11.5, 25),
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
});

export default styles;
