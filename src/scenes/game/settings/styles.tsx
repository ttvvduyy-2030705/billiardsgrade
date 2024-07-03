import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.transparent,
  },
  wrapper: {
    backgroundColor: colors.white,
    margin: 15,
    borderRadius: 30,
  },
  buttonCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 20,
  },
  buttonStart: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
  },
});

export default styles;
