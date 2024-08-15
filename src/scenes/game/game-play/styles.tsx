import {dims} from 'configuration';
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
});

export {COUNTDOWN_WIDTH};
export default styles;
