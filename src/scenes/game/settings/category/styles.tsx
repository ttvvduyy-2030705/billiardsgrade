import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  button: {
    borderWidth: 0.5,
    borderColor: colors.gray,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  active: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
});

export default styles;
