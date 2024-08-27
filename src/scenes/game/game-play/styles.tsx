import {dims} from 'configuration';
import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';

const COUNTDOWN_WIDTH = dims.screenWidth * 0.93;

const styles = StyleSheet.create({
  countdownWrapper: {
    width: COUNTDOWN_WIDTH,
    height: '80%',
    overflow: 'hidden',
  },
  countdown: {
    // width: '100%',
    // height: '100%',
  },
  countdownItem: {
    height: '100%',
    marginHorizontal: 5,
    borderRadius: 10,
  },
  warmUpContainer: {
    position: 'absolute',
    width: dims.screenWidth,
    height: dims.screenHeight,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEndWarmUp: {
    backgroundColor: colors.overlay,
    paddingHorizontal: '10%',
    paddingVertical: 15,
    borderRadius: 20,
    marginTop: 30,
  },
  extraWrapper: {
    position: 'absolute',
    top: 5,
    right: -20,
    backgroundColor: colors.red,
    borderRadius: 10,
    zIndex: 1,
  },
  extraText: {},
});

export {COUNTDOWN_WIDTH};
export default styles;
