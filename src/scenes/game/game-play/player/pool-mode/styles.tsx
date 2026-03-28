import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  textViolate: {
    marginBottom: -16,
  },
  textX: {
    marginTop: responsiveDimension(-6),
  },
  buttonViolate: {
    width: responsiveDimension(96),
    height: responsiveDimension(96),
    borderRadius: 100,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default styles;
