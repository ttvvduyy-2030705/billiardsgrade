import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  fullHeight: {
    height: '100%',
  },
  fullWidth: {
    width: '100%',
  },
  configIPWrapper: {
    backgroundColor: colors.lightPrimary1,
    borderRadius: 10,
  },
  languageWrapper: {
    backgroundColor: colors.lightPrimary1,
    borderRadius: 10,
  },
  buttonTest: {
    backgroundColor: colors.yellow,
    paddingHorizontal: responsiveDimension(20),
    paddingVertical: responsiveDimension(10),
    marginRight: responsiveDimension(15),
  },
  buttonSaveConfig: {
    backgroundColor: colors.primary,
    paddingHorizontal: responsiveDimension(20),
    paddingVertical: responsiveDimension(10),
  },
  webcam: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.black,
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
