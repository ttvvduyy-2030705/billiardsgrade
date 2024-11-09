import {StyleSheet} from 'react-native';
import {dims} from 'configuration';
import colors from 'configuration/colors';

const COUNTDOWN_WIDTH = dims.screenWidth * 0.91;

const styles = StyleSheet.create({
  countdownWrapper: {
    width: COUNTDOWN_WIDTH,
    height: '80%',
    overflow: 'hidden',
  },
  countdown: {
    flex: 1,
    flexDirection: 'row',
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
  overlayWrapper: {
    borderRadius: 64,
  },
});

export {COUNTDOWN_WIDTH};
export default styles;
