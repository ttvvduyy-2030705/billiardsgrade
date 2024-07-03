import {Dimensions, Platform, StatusBar} from 'react-native';

const {width, height} = Dimensions.get('window');
const isPad = Platform.OS === 'ios' && Platform.isPad ? true : false;

const dims = {
  screenWidth: width,
  screenHeight: height,
};

const isIPhoneX =
  Platform.OS === 'ios' && !Platform.isPad && (height > 800 || width > 800);

const getStatusBarHeight = () => {
  return (
    Platform.select({
      ios: isIPhoneX ? 44 : 20,
      android: StatusBar.currentHeight || 0,
    }) || 0
  );
};

const getHeaderHeight = () => {
  const currentHeight = StatusBar.currentHeight || 0;

  return (
    Platform.select({
      ios: getStatusBarHeight() + (isPad ? 54 : isIPhoneX ? 47 : 44),
      android: currentHeight <= 24 ? currentHeight + 34 : currentHeight + 24,
    }) || 0
  );
};

const getBottomSpace = () => {
  return isIPhoneX ? 34 : 0;
};

export {
  dims,
  isIPhoneX,
  isPad,
  getStatusBarHeight,
  getHeaderHeight,
  getBottomSpace,
};
