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
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4A1A1A',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    elevation: 6,
  },

  placeholderWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveDimension(8),
    paddingVertical: responsiveDimension(4),
    backgroundColor: '#050505',
  },

  logo: {
    width: '72%',
    height: '72%',
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
    backgroundColor: '#0B0B0B',
    borderRadius: 20,
  },

  controlWrapper: {
    backgroundColor: '#050505',
    paddingVertical: responsiveDimension(6),
  },

  innerControlWrapper: {
    marginTop: responsiveDimension(-48),
    backgroundColor: '#050505',
    paddingVertical: responsiveDimension(6),
  },

  actionButton: {
    flex: 1,
    minHeight: responsiveDimension(42),
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionText: {
    color: colors.white,
    fontSize: responsiveDimension(16),
  },

  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },
});

export default styles;