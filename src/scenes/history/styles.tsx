import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  item: {
    borderRadius: 10,
  },
  player: {
    borderRadius: 10,
  },
  button: {
    backgroundColor: colors.lightPrimary1,
    paddingHorizontal: responsiveDimension(30),
    paddingVertical: responsiveDimension(10),
    borderRadius: 10,
  },
  buttonDelete: {
    backgroundColor: colors.lightPrimary1,
    padding: responsiveDimension(10),
    borderRadius: 10,
  },
  icon: {
    width: responsiveDimension(32),
    height: responsiveDimension(32),
    tintColor: colors.red,
  },
});

export default styles;
