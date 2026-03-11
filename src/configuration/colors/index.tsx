import {Colors} from 'types/color';

let colors: Colors = {
  primary: '#B31217',
  lightPrimary1: '#160606',
  lightPrimary2: '#260B0C',
  statusBar: '#020202',
  primaryOverlay: 'rgba(179, 18, 23, 0.35)',

  error: '#FF4D4F',
  border: '#3A1213',
  text: '#FFFFFF',
  background: '#030303',
  card: '#090505',
  notification: '#E53935',

  white: '#FFFFFF',
  whiteOverlay: 'rgba(255,255,255,0.08)',
  whiteDarkOverlay: 'rgba(255,255,255,0.18)',
  whiteDarkerOverlay: 'rgba(255,255,255,0.28)',

  black: '#000000',
  lightBlack: '#120B0B',
  lightOverlay: 'rgba(0,0,0,0.25)',
  overlay: 'rgba(0,0,0,0.62)',
  darkOverlay: 'rgba(0,0,0,0.86)',

  gray: '#473434',
  gray2: '#8A8585',
  lightGray: '#161010',
  lightGray2: '#201515',
  lightGray3: '#080606',
  deepGray: '#B5B5B5',

  blue: '#0264E1',
  lightBlue: '#2CB0EF',
  lightBlue1: '#18ADFE',
  lightBlue2: '#e3f5ff',
  grayBlue: '#5F7F95',

  yellow: '#F2B705',
  lightYellow2: '#FFD24A',
  lightYellow: '#5A4308',
  yellow2: '#C89600',

  green: '#20D95C',
  greenOverlay: 'rgba(32, 217, 92, 0.45)',
  pink: '#FF4180',
  lightPink: '#fa7fa8',
  orange: '#d1801d',
  purple: '#8532a8',
  darkPurple: '#00054B',
  brown: '#591e00',

  red: '#E53935',
  lightRed: '#FF6B6B',
  lightRed2: '#FF9A9A',
  darkRed: '#7F0F12',
  transparent: 'transparent',
};

const COLORS = [
  {
    colors: {
      primary: '#B31217',
      lightPrimary1: '#160606',
      lightPrimary2: '#260B0C',
      statusBar: '#020202',
      primaryOverlay: 'rgba(179, 18, 23, 0.35)',
      error: '#FF4D4F',
      border: '#3A1213',
      text: '#FFFFFF',
      background: '#030303',
      card: '#090505',
      notification: '#E53935',
    },
    dark: false,
  },
  {
    colors: {
      primary: '#B31217',
      lightPrimary1: '#160606',
      lightPrimary2: '#260B0C',
      statusBar: '#020202',
      primaryOverlay: 'rgba(179, 18, 23, 0.35)',
      error: '#FF4D4F',
      border: '#3A1213',
      text: '#FFFFFF',
      background: '#030303',
      card: '#090505',
      notification: '#E53935',
    },
    dark: true,
  },
];

export {COLORS};
export default colors;