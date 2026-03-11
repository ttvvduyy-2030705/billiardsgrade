import {dims} from 'configuration';
import colors from 'configuration/colors';
import globalStyles from 'configuration/styles';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: StyleSheet.flatten([
    globalStyles.flex.flex1,
    globalStyles.padding.padding20,
    globalStyles.justify.justify_between,
  ]),

  button: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 18,
    alignSelf: 'center',
  },

  image: {
    width: 28,
    height: 28,
    marginRight: 10,
  },

  buttonHistory: StyleSheet.flatten([
    globalStyles.padding.paddingHorizontal20,
    globalStyles.padding.paddingVertical15,
    {
      borderRadius: 20,
      backgroundColor: colors.lightPrimary1,
    },
  ]),

  logo: {
    height: dims.screenHeight * 0.1,
    width: dims.screenWidth * 0.2,
  },

  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoLarge: {
    width: 260,
    height: 260,
  },

  icon: {
    width: responsiveDimension(32),
    height: responsiveDimension(32),
  },

  buttonConfigs: {
    backgroundColor: colors.lightPrimary1,
    padding: responsiveDimension(10),
    marginLeft: responsiveDimension(24),
    borderRadius: 20,
  },
});

export default styles;