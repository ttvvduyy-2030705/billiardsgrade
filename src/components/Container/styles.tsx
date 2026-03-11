import {Platform, StyleSheet} from 'react-native';
import {dims, getHeaderHeight, getStatusBarHeight} from 'configuration';
import colors from 'configuration/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 0 : getStatusBarHeight(),
  },
  loadingWrapper: {
    position: 'absolute',
    top: 0,
    width: dims.screenWidth,
    height: dims.screenHeight - getHeaderHeight() + 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
});

export default styles;