import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';

const styles = StyleSheet.create({
  warmUpContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },

  buttonEndWarmUp: {
    backgroundColor: '#131313',
    borderRadius: 20,
  },

  countdownContainer: {
    width: '100%',
    paddingHorizontal: 2,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: '#000000',
  },

  mainArea: {
    flex: 1,
    paddingTop: 10,
  },

  mainAreaFullscreen: {
    flex: 1,
    paddingTop: 0,
  },

  poolArenaScreen: {
    backgroundColor: '#000000',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 0,
  },

  poolArenaBoard: {
    gap: 14,
  },

  poolArenaPlayerColumn: {
    flex: 1,
  },

  poolArenaConsoleWrapper: {
    flex: 0.98,
    marginHorizontal: 0,
    paddingBottom: 0,
  },
});

export default styles;
