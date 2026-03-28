import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension, responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  configIPWrapper: {
    backgroundColor: colors.lightPrimary1,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 8,
  },
  input: {
    fontSize: responsiveFontSize(12),
  },
  buttonSaveConfig: {
    backgroundColor: colors.primary,
    paddingHorizontal: responsiveDimension(20),
    paddingVertical: responsiveDimension(10),
  },
  selectedButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
  button: {
    borderWidth: 0.5,
    borderColor: colors.gray,
    borderRadius: 16,
  },
  liveStreamConfigWrapper: {
    backgroundColor: colors.lightPrimary1,
    borderRadius: responsiveDimension(8),
  },
});

export default styles;
