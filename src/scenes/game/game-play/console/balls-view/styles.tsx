import {dims} from 'configuration';
import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  ballsWrapper: {
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    backgroundColor: colors.lightGray2,
  },
  ballPool15OnlyWrapper: {
    backgroundColor: colors.lightGray2,
  },
  ballsLeft: {
    borderTopRightRadius: 60,
    borderBottomRightRadius: 60,
  },
  ballsRight: {
    borderTopLeftRadius: 60,
    borderBottomLeftRadius: 60,
  },
  doubleArrowWrapper: {},
  doubleArrowLeft: {
    width: dims.screenWidth * 0.02,
    height: dims.screenWidth * 0.02,
    marginLeft: 10,
  },
  doubleArrowRight: {
    width: dims.screenWidth * 0.02,
    height: dims.screenWidth * 0.02,
    marginRight: 10,
    transform: [{rotate: '180deg'}],
  },
  button: {
    flex: 1,
    borderRadius: 0,
    paddingVertical: responsiveDimension(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBreakPool: {
    backgroundColor: colors.green,
  },
  buttonWrapper: {
    overflow: 'hidden',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  buttonRestart: {
    backgroundColor: colors.brown,
  },
  buttonGiveMoreTime: {
    backgroundColor: colors.yellow,
  },
  buttonResetTurn: {
    backgroundColor: colors.green,
  },
  logo: {
    height: dims.screenHeight * 0.1,
    width: dims.screenWidth * 0.2,
  },
});

export default styles;
