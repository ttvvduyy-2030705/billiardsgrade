import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
  },

  webcamButton: {
    flex: 1,
  },

  webcamWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveDimension(8),
    paddingVertical: responsiveDimension(4),
  },

  logo: {
    width: '94%',
    height: '78%',
  },

  icon: {
    width: responsiveDimension(22),
    height: responsiveDimension(22),
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

  controlWrapper: {
    backgroundColor: colors.white,
    paddingVertical: responsiveDimension(6),
  },

  innerControlWrapper: {
    marginTop: responsiveDimension(-48),
    backgroundColor: colors.white,
    paddingVertical: responsiveDimension(6),
  },

  actionButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionText: {
    color: '#444444',
    fontSize: responsiveDimension(16),
  },

  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default styles;