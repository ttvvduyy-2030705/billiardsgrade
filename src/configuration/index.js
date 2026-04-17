import {Dimensions, Platform, StatusBar} from 'react-native';

const getWindow = () => {
  const {width, height} = Dimensions.get('window');
  return {
    width: width > 0 ? width : 1,
    height: height > 0 ? height : 1,
  };
};

const getIsPad = () => Platform.OS === 'ios' && Platform.isPad ? true : false;

const dims = {
  get screenWidth() {
    return getWindow().width;
  },
  get screenHeight() {
    return getWindow().height;
  },
};

const getIsIPhoneX = () => {
  const {width, height} = getWindow();
  return Platform.OS === 'ios' && !Platform.isPad && (height > 800 || width > 800);
};

const getStatusBarHeight = () => {
  const isIPhoneX = getIsIPhoneX();
  return (
    Platform.select({
      ios: isIPhoneX ? 44 : 20,
      android: StatusBar.currentHeight || 0,
    }) || 0
  );
};

const getHeaderHeight = () => {
  const currentHeight = StatusBar.currentHeight || 0;
  const isPad = getIsPad();
  const isIPhoneX = getIsIPhoneX();

  return (
    Platform.select({
      ios: getStatusBarHeight() + (isPad ? 54 : isIPhoneX ? 47 : 44),
      android: currentHeight <= 24 ? currentHeight + 34 : currentHeight + 24,
    }) || 0
  );
};

const getBottomSpace = () => {
  return getIsIPhoneX() ? 34 : 0;
};

export {
  dims,
  getStatusBarHeight,
  getHeaderHeight,
  getBottomSpace,
};
