import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 30,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.gray,
    borderRadius: 80,
    paddingBottom: responsiveDimension(10),
    backgroundColor: colors.white,
  },
  leftContainer: {
    height: '100%',
    position: 'absolute',
    left: 0,
  },
  ballsWrapper: {
    flexWrap: 'wrap',
    maxWidth: '20%',
  },
  buttonEndTurn: {
    backgroundColor: colors.notification,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    paddingHorizontal: responsiveDimension(30),
  },
  buttonEndTurnEmpty: {
    paddingHorizontal: responsiveDimension(30),
  },
  totalPointWrapper: {
    marginBottom: responsiveDimension(-96),
  },
  totalPointNoMarginBottom: {
    marginBottom: 0,
  },
});

export default styles;
