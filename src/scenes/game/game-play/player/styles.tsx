import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 30,
  },
  editIcon: {
    width: 32,
    height: 32,
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
    borderRadius: 20,
    paddingBottom: 10,
  },
  stepsWrapper: {
    flexWrap: 'wrap',
  },
  buttonStep: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.gray,
    borderRadius: 20,
    marginTop: 15,
    paddingHorizontal: 45,
    paddingVertical: 15,
    marginRight: 15,
  },
  input: {
    fontSize: 32,
  },
  extraTimeTurnsWrapper: {
    marginTop: 10,
  },
  extraTimeTurns: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  totalPointInTurn: {
    backgroundColor: colors.grayBlue,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 30,
  },
});

export default styles;
