import {StyleSheet} from 'react-native';
import {dims} from 'configuration';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  extraTimeTurnsContainer: {
    position: 'absolute',
    right: 0,
    height: '100%',
  },
  extraTimeTurnsWrapper: {
    flexWrap: 'wrap',
    height: '100%',
    alignContent: 'flex-end',
  },
  extraTimeTurn: {
    width: responsiveDimension(80),
    height: '15%',
  },
  extraTimeIcon: {
    width: '100%',
    height: '100%',
    elevation: 5,
  },
  extraTimeTurnsEmpty: {
    width: dims.screenWidth * 0.01,
    height: dims.screenWidth * 0.01,
  },
});

export default styles;
