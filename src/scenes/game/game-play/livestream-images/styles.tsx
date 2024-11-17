import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  image: {
    width: responsiveDimension(256),
    height: responsiveDimension(144),
    marginRight: responsiveDimension(10),
  },
  absolute: {
    position: 'absolute',
    bottom: responsiveDimension(-512),
  },
  emptyView: {
    width: responsiveDimension(256),
    height: responsiveDimension(144),
  },
});

export default styles;
