import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderRadius: 0,
    paddingVertical: responsiveDimension(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrapper: {
    overflow: 'hidden',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  buttonGiveMoreTime: {
    backgroundColor: colors.yellow,
  },
  functionItem: {
    marginBottom: responsiveDimension(-16),
  },
});

export default styles;
