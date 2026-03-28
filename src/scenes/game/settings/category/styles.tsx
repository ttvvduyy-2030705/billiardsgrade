import {StyleSheet} from 'react-native';

import colors from 'configuration/colors';

const styles = StyleSheet.create({
  container: {
    paddingBottom: 2,
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
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1,
  },
  sectionDivider: {
    height: 1.1,
    backgroundColor: '#FF1F26',
    marginBottom: 8,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactOptionRow: {
    marginBottom: 5,
  },
  inlineLabel: {
    width: 56,
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    marginRight: 8,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 1,
  },
  inlineOptions: {
    flex: 1,
    minWidth: 0,
  },
  poolBlock: {
    marginBottom: 6,
  },
  modeOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  optionButton: {
    minHeight: 28,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 5,
    borderRadius: 13,
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
    fontSize: 11.5,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
});

export default styles;
