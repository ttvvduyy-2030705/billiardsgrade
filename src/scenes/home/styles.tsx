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
    backgroundColor: '#B31217',
    borderRadius: 22,
    paddingHorizontal: 32,
    paddingVertical: 18,
    alignSelf: 'center',
    borderWidth: 1.2,
    borderColor: '#FF5A5A',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 10,
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
      backgroundColor: '#160707',
      borderWidth: 1,
      borderColor: '#7A1E22',
      shadowColor: '#FF2A2A',
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      elevation: 7,
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
    backgroundColor: '#160707',
    padding: responsiveDimension(10),
    marginLeft: responsiveDimension(24),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7A1E22',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 6,
  },
});

export default styles;