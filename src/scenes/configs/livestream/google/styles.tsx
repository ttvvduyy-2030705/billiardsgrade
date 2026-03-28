import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.red,
  },
  icon: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
    marginRight: 15,
  },
});

export default styles;
