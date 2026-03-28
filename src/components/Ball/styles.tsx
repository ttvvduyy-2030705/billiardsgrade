import {dims} from 'configuration';
import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    width: dims.screenWidth * 0.051,
    height: dims.screenWidth * 0.051,
    borderRadius: dims.screenWidth * 0.0255,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    elevation: 5,
  },
  smallContainer: {
    width: dims.screenWidth * 0.0255,
    height: dims.screenWidth * 0.0255,
    borderRadius: dims.screenWidth * 0.01775,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    elevation: 5,
  },
  ball: {
    backgroundColor: colors.white,
    width: dims.screenWidth * 0.03,
    height: dims.screenWidth * 0.03,
    borderRadius: dims.screenWidth * 0.015,
  },
  smallBall: {
    backgroundColor: colors.white,
    width: dims.screenWidth * 0.015,
    height: dims.screenWidth * 0.015,
    borderRadius: dims.screenWidth * 0.0075,
  },
  cutWrapper: {
    backgroundColor: colors.white,
    height: dims.screenWidth * 0.005,
    width: '100%',
  },
  smallCutWrapper: {
    backgroundColor: colors.white,
    height: dims.screenWidth * 0.0025,
    width: '100%',
  },
});

export default styles;
