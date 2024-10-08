import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension, responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  inputWrapper: {
    height: responsiveDimension(72),
  },
  input: {
    height: responsiveDimension(72),
    fontSize: responsiveFontSize(40),
    fontWeight: 'bold',
    backgroundColor: colors.transparent,
    borderBottomWidth: 0.5,
    color: colors.lightBlack,
    marginHorizontal: 0,
  },
  editIcon: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
  },
  buttonEdit: {
    padding: 10,
  },
});

export default styles;
