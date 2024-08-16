import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension, responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  button: {
    borderWidth: 0.5,
    borderColor: colors.gray,
    borderRadius: 50,
    width: responsiveDimension(48),
    height: responsiveDimension(48),
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
    marginRight: 10,
  },
  active: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  activePlayerPoint: {
    backgroundColor: colors.lightGray2,
    borderWidth: 0,
  },
  playerItem: {
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowColor: colors.black,
    shadowRadius: 4,
    shadowOpacity: 0.3,
    elevation: 4,
    borderRadius: 20,
    backgroundColor: colors.white,
    marginTop: responsiveDimension(20),
  },
  avatar: {
    width: responsiveDimension(56),
    height: responsiveDimension(56),
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightGray2,
  },
  input: {
    height: responsiveDimension(55),
    paddingBottom: 1,
  },
  inputStyle: {
    fontSize: responsiveFontSize(24),
    marginHorizontal: 0,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.gray,
  },
  stepWrapper: {
    borderWidth: 0.5,
    borderRadius: 20,
    borderColor: colors.gray,
    backgroundColor: colors.white,
  },
  stepItem: {
    width: '11%',
    height: responsiveDimension(48),
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
});

export default styles;
