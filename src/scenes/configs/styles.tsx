import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  fullHeight: {
    height: '100%',
  },
  fullWidth: {
    width: '100%',
  },
  flex: {
    flex: 1,
  },
  webcamContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.lightPrimary2,
  },
  selectedButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  button: {},
});

export default styles;
