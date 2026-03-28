import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.lightPrimary1,
    borderRadius: 10,
  },
  input: {
    fontSize: responsiveFontSize(12),
  },
});

export default styles;
