import {StyleSheet} from 'react-native';

import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  extraTimeTurnsContainer: {
    position: 'absolute',
    right: responsiveDimension(10),
    top: '36%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraTimeTurn: {
    width: responsiveDimension(34),
    height: responsiveDimension(34),
    marginBottom: responsiveDimension(10),
    borderRadius: 17,
    backgroundColor: 'rgba(24, 25, 31, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraTimeIcon: {
    width: '70%',
    height: '70%',
  },
  extraTimeTurnsEmpty: {
    width: 0,
    height: 0,
  },
});

export default styles;
