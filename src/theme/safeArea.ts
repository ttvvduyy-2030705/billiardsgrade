import {Platform, StatusBar, useWindowDimensions} from 'react-native';

export type EdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const ZERO_INSETS: EdgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const getIosInsets = (width: number, height: number): EdgeInsets => {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const isLandscape = width > height;
  const isModernIphone = longSide >= 812 && shortSide < 768;

  if (!isModernIphone) {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  if (isLandscape) {
    return {
      top: 0,
      right: 20,
      bottom: 21,
      left: 20,
    };
  }

  return {
    top: 0,
    right: 0,
    bottom: 34,
    left: 0,
  };
};

export const getEstimatedSafeAreaInsets = (
  width: number,
  height: number,
): EdgeInsets => {
  if (Platform.OS === 'ios') {
    return getIosInsets(width, height);
  }

  const topInset = 0;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const isLandscape = width > height;
  const isPhone = shortSide < 600;
  const edgeInset = isPhone && longSide >= 760 && isLandscape ? 8 : 0;

  return {
    top: topInset,
    right: edgeInset,
    bottom: 0,
    left: edgeInset,
  };
};

export const useSafeScreenInsets = (): EdgeInsets => {
  const {width, height} = useWindowDimensions();
  return getEstimatedSafeAreaInsets(width, height);
};

export default useSafeScreenInsets;
