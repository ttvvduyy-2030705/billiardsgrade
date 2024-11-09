import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    flexWrap: 'wrap',
  },
  item: {
    borderRadius: 8,
  },
  image: {
    width: responsiveDimension(64),
    height: responsiveDimension(64),
  },
  closeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: colors.overlay,
    padding: responsiveDimension(8),
    borderRadius: 16,
  },
  closeImage: {
    tintColor: colors.white,
    width: responsiveDimension(10),
    height: responsiveDimension(10),
  },
  addButton: {
    backgroundColor: colors.lightGray,
    padding: responsiveDimension(16),
    borderRadius: 8,
    marginLeft: responsiveDimension(10),
  },
  addImage: {
    tintColor: colors.gray,
    width: responsiveDimension(48),
    height: responsiveDimension(48),
  },
});

export default styles;
