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
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#4A1A1A',
  shadowColor: '#FF2A2A',
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: {width: 0, height: 0},
  elevation: 6,
},
logo: {
  width: '128%',
  height: '96%',
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
    backgroundColor: colors.white,
  },
});

export default styles;