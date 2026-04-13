import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  loading: {
    alignSelf: 'center',
    paddingVertical: 1,
    width: responsiveDimension(140),
    height: responsiveDimension(140),
  },
  loading_small: {
    alignSelf: 'center',
    paddingVertical: 1,
    width: responsiveDimension(50),
    height: responsiveDimension(50),
  },
  loading_large: {
    alignSelf: 'center',
    paddingVertical: 1,
    width: responsiveDimension(200),
    height: responsiveDimension(200),
  },
});

export default styles;
