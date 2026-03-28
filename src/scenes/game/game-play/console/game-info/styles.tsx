import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderRadius: 0,
    paddingVertical: responsiveDimension(10),
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
  textPointMarginBottom: {
    marginTop: responsiveDimension(-24),
  },
  textPointNoMarginBottom: {
    marginTop: responsiveDimension(-16),
  },
  pointWrapper: {
    height: '100%',
  },
  valueWrapper: {
    width: '30%',
  },
  valueText: {
    position: 'absolute',
  },
  buttonTurns: {
    backgroundColor: colors.gray2,
  },
  buttonSwapPlayers: {
    backgroundColor: colors.yellow,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
});

export default styles;
