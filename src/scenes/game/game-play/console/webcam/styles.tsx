import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1.77777,
    alignSelf: 'center',
  },
  webcamWrapper: {
    // height: dims.screenHeight * 0.3,
    backgroundColor: colors.black,
  },
  webcam: {
    width: '100%',
    height: '100%',
  },
  icon: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
  },
  buttonIP: {
    flexDirection: 'row',
    padding: responsiveDimension(10),
    backgroundColor: colors.whiteDarkerOverlay,
    borderRadius: 20,
  },
  iconIP: {
    width: responsiveDimension(32),
    height: responsiveDimension(32),
    marginLeft: responsiveDimension(5),
  },
  textInput: {
    borderRadius: 20,
    backgroundColor: colors.whiteDarkerOverlay,
  },
  textInputContainer: {
    width: '70%',
  },
  fullWidth: {
    width: '100%',
  },
});

export default styles;
