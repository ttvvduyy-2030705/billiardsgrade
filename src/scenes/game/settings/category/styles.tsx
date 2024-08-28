import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  button: {
    borderWidth: 0.7,
    borderColor: colors.gray,
    borderRadius: 20,
    paddingHorizontal: responsiveDimension(20),
    paddingVertical: responsiveDimension(10),
    marginRight: responsiveDimension(10),
  },
  active: {
    backgroundColor: colors.primary,
    borderWidth: 0,
    borderRadius: 40,
  },
});

export default styles;
