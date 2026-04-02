import colors from 'configuration/colors';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    borderRadius: 3,
  },
  fullWidth: {
    width: '100%',
    borderRadius: 3,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  disable: {
    backgroundColor: colors.lightGray2,
  },
});

export default styles;
