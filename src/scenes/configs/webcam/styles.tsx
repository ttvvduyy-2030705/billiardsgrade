import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension, responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  configIPWrapper: {
    backgroundColor: colors.lightPrimary1,
    borderRadius: 10,
  },
  webcamContainer: {
    width: '100%',
    aspectRatio: 1.742,
  },
  webcam: {
    overflow: 'hidden',
    backgroundColor: colors.black,
  },
  input: {
    fontSize: responsiveFontSize(12),
    marginHorizontal: responsiveDimension(8),
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
});

export default styles;
