import {dims} from 'configuration';

import Numeral from 'numeral';

let timeout: any = null;
const {screenWidth} = dims;

const debounce = (callback = () => {}, duration = 1000) => {
  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(() => {
    callback();
    clearTimeout(timeout);
  }, duration);
};

const responsiveFontSize = (fontSize: number) => {
  if (screenWidth > 500) {
    return fontSize + 4;
  }

  if (screenWidth > 375) {
    return fontSize + 2;
  }

  if (screenWidth > 360) {
    return fontSize + 1;
  }

  if (screenWidth > 340) {
    return fontSize;
  }

  return fontSize - 2;
};

const numberFormat = (number: string | number | undefined) => {
  if (number === null || number === undefined) {
    return '';
  }

  return Numeral(number).format();
};

const getCurrency = (locale: string) => {
  switch (locale) {
    case 'vi':
      return 'VND';
    case 'en':
      return '$';
    case 'ja':
      return '¥';
    default:
      return '';
  }
};

export {debounce, responsiveFontSize, numberFormat, getCurrency};
