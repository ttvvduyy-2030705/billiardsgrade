import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 16,
  },
  deviceText: {
    marginVertical: 8,
    fontSize: 16,
  },
  button: {
    borderWidth: 0.5,
    borderColor: colors.gray,
    borderRadius: 16,
  },
  info: {
    marginVertical: 16,
  },
});

export default styles;
