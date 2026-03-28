import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  languageWrapper: {
    backgroundColor: colors.lightPrimary1,
    borderRadius: 10,
  },
  selectedButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: responsiveDimension(20),
    paddingVertical: responsiveDimension(10),
  },
  button: {
    paddingHorizontal: responsiveDimension(20),
    paddingVertical: responsiveDimension(10),
    borderWidth: 0.5,
    borderColor: colors.gray,
  },
  iconFlag: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
    marginRight: responsiveDimension(8),
  },
});

export default styles;
