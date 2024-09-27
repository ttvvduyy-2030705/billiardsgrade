import {dims} from 'configuration';
import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension, responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 30,
  },
  editIcon: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
  },
  buttonEdit: {
    padding: 10,
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
  stepsWrapper: {
    flexWrap: 'wrap',
  },
  buttonStep: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.deepGray,
    borderRadius: 20,
    paddingHorizontal: responsiveDimension(35),
    paddingVertical: responsiveDimension(15),
    marginRight: responsiveDimension(15),
    marginBottom: responsiveDimension(15),
  },
  inputWrapper: {
    height: responsiveDimension(72),
  },
  input: {
    height: responsiveDimension(72),
    fontSize: responsiveFontSize(40),
    fontWeight: 'bold',
    backgroundColor: colors.transparent,
    borderBottomWidth: 0.5,
    color: colors.lightBlack,
    marginHorizontal: 0,
  },
  leftContainer: {
    height: '100%',
    position: 'absolute',
    left: 0,
  },
  extraTimeTurnsContainer: {
    position: 'absolute',
    right: 0,
  },
  extraTimeTurnsWrapper: {
    marginTop: responsiveDimension(10),
  },
  extraTimeIcon: {
    width: dims.screenWidth * 0.024,
    height: dims.screenWidth * 0.024,
    elevation: 5,
  },
  extraTimeTurnsEmpty: {
    width: dims.screenWidth * 0.01,
    height: dims.screenWidth * 0.01,
  },
  totalPointInTurn: {
    backgroundColor: colors.grayBlue,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: responsiveDimension(30),
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
  textViolate: {
    marginBottom: -16,
  },
  buttonViolate: {
    width: responsiveDimension(96),
    height: responsiveDimension(96),
    borderRadius: 100,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ballsWrapper: {
    flexWrap: 'wrap',
    maxWidth: '20%',
  },
  functionWrapper: {
    top: responsiveDimension(24),
    left: 0,
    position: 'absolute',
    width: '100%',
  },
  buttonPoolBreak: {
    backgroundColor: colors.green,
    paddingVertical: responsiveDimension(8),
    paddingHorizontal: responsiveDimension(24),
    marginRight: responsiveDimension(15),
  },
});

export default styles;
