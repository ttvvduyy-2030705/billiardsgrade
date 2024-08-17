import {dims} from 'configuration';
import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 30,
  },
  icon: {
    width: responsiveDimension(32),
    height: responsiveDimension(32),
  },
  buttonSound: {
    padding: responsiveDimension(15),
  },
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
  stopButton: {
    backgroundColor: colors.lightRed,
    borderWidth: 0,
    borderRadius: 20,
  },
  marginTop: {
    marginTop: responsiveDimension(20),
  },
  marginVertical: {
    marginVertical: responsiveDimension(20),
  },
  buttonGiveMoreTime: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grayBlue,
    borderRadius: 20,
  },
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
  buttonRestart: {
    paddingHorizontal: '10%',
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: colors.green,
  },
});

export default styles;
