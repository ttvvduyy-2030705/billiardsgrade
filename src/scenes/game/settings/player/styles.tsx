import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  button: {
    borderWidth: 0.5,
    borderColor: colors.gray,
    borderRadius: 50,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
    marginRight: 10,
  },
  active: {
    backgroundColor: colors.primary,
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
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightPrimary1,
  },
  input: {
    borderWidth: 0.5,
    borderColor: colors.gray,
    borderRadius: 20,
    height: 55,
    paddingBottom: 1,
  },
  stepWrapper: {
    borderWidth: 0.5,
    borderRadius: 20,
    borderColor: colors.gray,
  },
  stepItem: {
    width: '11%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
});

export default styles;
