import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1.542,
    alignSelf: 'center',
  },
  webcamWrapper: {
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  icon: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
  },
  fullWidth: {
    width: '100%',
  },
  buttonIP: {
    flexDirection: 'row',
    padding: responsiveDimension(10),
    backgroundColor: colors.whiteDarkerOverlay,
    borderRadius: 20,
  },
});

export default styles;
