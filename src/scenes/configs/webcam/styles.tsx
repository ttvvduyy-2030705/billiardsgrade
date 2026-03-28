import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension, responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  configIPWrapper: {
    backgroundColor: colors.lightPrimary2,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 8,
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
    marginHorizontal: responsiveDimension(0),
    marginLeft: 0,
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
  slider: {
    flex: 1,
  },
  sliderValue: {
    position: 'absolute',
    top: -18,
    borderRadius: 20,
    paddingHorizontal: 6,
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
});

export default styles;
