import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  inputWrapper: {},
  input: {
    fontWeight: 'bold',
    backgroundColor: colors.transparent,
    borderBottomWidth: 1,
    borderBottomColor: '#7A1E22',
    color: '#FFFFFF',
    marginHorizontal: 0,
  },
  editIcon: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
    tintColor: '#FFFFFF',
  },
  buttonEdit: {
    padding: 10,
  },
});

export default styles;