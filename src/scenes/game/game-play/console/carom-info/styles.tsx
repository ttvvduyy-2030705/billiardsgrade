import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const RADIUS = responsiveDimension(18);

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderRightWidth: responsiveDimension(20),
    borderColor: '#FF0000',
    backgroundColor: '#FF0000',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },

  totalTurnWrapper: {
    backgroundColor: '#FF0000',
    marginRight: responsiveDimension(4),
  },

  turnImage: {
    width: responsiveDimension(40),
    height: responsiveDimension(40),
    tintColor: colors.red,
    marginLeft: responsiveDimension(10),
    marginRight: responsiveDimension(-5),
  },

  empty: {
    width: responsiveDimension(40),
    height: responsiveDimension(40),
    marginLeft: responsiveDimension(10),
  },

  countdownContainer: {
    backgroundColor: '#FF0000',
  },

  linearWrapper: {
    flex: 1,
    height: 40,
    overflow: 'hidden',
    marginHorizontal: responsiveDimension(15),
  },

  linear: {
    position: 'absolute',
    backgroundColor: colors.white,
    height: 40,
    width: '100%',
  },

  countdownWrapper: {
    height: '100%',
  },

  currentTotalPoint: {
    marginBottom: responsiveDimension(3),
  },

  totalPointWrapper: {
    backgroundColor: colors.black,
  },

  totalPointText0: {
    marginBottom: responsiveDimension(-11),
  },

  totalPointText1: {
    marginTop: responsiveDimension(4),
    marginBottom: responsiveDimension(-11),
  },

  currentPointText: {
    marginBottom: responsiveDimension(-11),
  },

  buttonTurns: {
    borderColor: colors.black,
    borderWidth: 0.5,
    backgroundColor: colors.yellow,
  },
});

export default styles;