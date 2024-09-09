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
    borderRadius: 40,
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
  input: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    backgroundColor: colors.transparent,
    borderBottomColor: colors.black,
    borderBottomWidth: 0.5,
  },
  extraTimeTurnsWrapper: {
    marginTop: responsiveDimension(10),
  },
  extraTimeTurns: {
    width: dims.screenWidth * 0.01,
    height: dims.screenWidth * 0.01,
    borderRadius: 16,
    backgroundColor: colors.primary,
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
  buttonViolate: {
    width: responsiveDimension(48),
    height: responsiveDimension(48),
    borderRadius: 100,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ballsWrapper: {
    flexWrap: 'wrap',
    maxWidth: '17%',
  },
});

export default styles;
