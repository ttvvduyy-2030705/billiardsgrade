import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    // backgroundColor: colors.black,
    
  },
  webcam: {
    width: '100%',
    height: '100%',
    flex:1,
    transform : [
      { rotate: '180deg' }
    ]
  },
  loading: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: 300,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
  },
  controls: { position: 'absolute', bottom: 50, alignSelf: 'center' },
  background: {
    flex: 1, // Fill the screen
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
  },
  preview: { flex: 1 },
});

export default styles;
