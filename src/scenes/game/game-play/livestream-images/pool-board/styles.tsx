import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  matchInfo: {
    position: 'absolute',
    bottom: responsiveDimension(-512),
    width: '200%',
    borderWidth: 1,
    borderColor: colors.white,
    overflow: 'hidden',
    backgroundColor: colors.transparent,
  },
  whiteBlock: {
    height: '100%',
    width: 26,
    backgroundColor: colors.white,
    marginRight: -10,
  },
  blackBlock: {
    height: '100%',
    width: 16,
    backgroundColor: colors.transparent,
  },
  imageTurnLeft: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
    tintColor: colors.white,
  },
  imageTurnRight: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
    transform: [{rotate: '180deg'}],
    tintColor: colors.white,
  },
  empty: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
  },
  matchBackground: {
    backgroundColor: colors.darkRed,
  },
  matchRace: {
    height: '100%',
  },
  matchPointText: {
    marginTop: responsiveDimension(-10),
    marginBottom: responsiveDimension(-8),
  },
});

export default styles;