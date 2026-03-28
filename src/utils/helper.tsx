import {dims} from 'configuration';

import Numeral from 'numeral';
import {Alert} from 'react-native';

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
  return screenWidth * 0.0007 * fontSize;
};

const responsiveDimension = (size: number) => {
  return screenWidth * 0.0005 * size;
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

export {
  debounce,
  responsiveFontSize,
  responsiveDimension,
  numberFormat,
  getCurrency,
};
