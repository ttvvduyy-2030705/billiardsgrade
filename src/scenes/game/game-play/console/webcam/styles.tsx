import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.black,
  },

  webcamButton: {
    flex: 1,
    backgroundColor: colors.black,
  },

  webcamWrapper: {
    flex: 1,
    backgroundColor: colors.black,
  },

  icon: {
    width: responsiveDimension(24),
    height: responsiveDimension(24),
  },

  fullWidth: {
    width: '100%',
  },

  buttonIP: {
    flexDirection: 'row',
    padding: responsiveDimension(10),
    backgroundColor: colors.whiteDarkerOverlay,
    borderRadius: 20,
  },

  controlWrapper: {},

  innerControlWrapper: {
    marginTop: responsiveDimension(-48),
    backgroundColor: colors.white,
  },

  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
});

export default styles;