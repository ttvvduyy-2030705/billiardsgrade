
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
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 0,
    backgroundColor: '#000000',
  },

  mainArea: {
    flex: 1,
    paddingTop: 12,
  },

  mainAreaFullscreen: {
    flex: 1,
    paddingTop: 0,
  },

  poolArenaScreen: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
  },

  poolArenaBoard: {
    gap: 14,
  },

  poolArenaPlayerColumn: {
    flex: 1,
  },

  poolArenaConsoleWrapper: {
    flex: 0.96,
    marginHorizontal: 0,
  },
});

export default styles;
