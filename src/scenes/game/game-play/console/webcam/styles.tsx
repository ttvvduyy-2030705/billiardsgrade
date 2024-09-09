import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1.77777,
    alignSelf: 'center',
  },
  video: {
    // height: dims.screenHeight * 0.3,
    backgroundColor: colors.black,
  },
  icon: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
  },
});

export default styles;
