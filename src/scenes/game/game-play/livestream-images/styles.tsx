import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  matchLogoWrapper: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: -1,
  },
  matchLogo: {
    width: responsiveDimension(64),
    height: responsiveDimension(32),
  },
  matchInfo: {
    position: 'absolute',
    bottom: responsiveDimension(-512),
    width: '100%',
  },
  matchBackground: {
    backgroundColor: colors.white,
    height: 50,
    borderRadius: 8,
  },
  matchRace: {
    backgroundColor: colors.error,
    borderRadius: 8,
  },
  matchPointText: {
    marginTop: -7,
  },
  image: {
    width: responsiveDimension(256),
    height: responsiveDimension(128),
    marginRight: responsiveDimension(10),
  },
  absolute: {
    position: 'absolute',
    bottom: responsiveDimension(-512),
  },
  emptyView: {
    width: responsiveDimension(256),
    height: responsiveDimension(128),
  },
});

export default styles;
