import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 10,
    paddingVertical: responsiveDimension(10),
    borderColor: colors.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    backgroundColor: colors.lightYellow,
    borderWidth: 0,
    borderRadius: 20,
  },
  breakGameButton: {
    backgroundColor: colors.lightPrimary2,
    borderWidth: 0,
    borderRadius: 20,
  },
  stopButton: {
    backgroundColor: colors.lightRed,
    borderWidth: 0,
    borderRadius: 20,
  },
});

export default styles;
