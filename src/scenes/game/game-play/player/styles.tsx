import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    backgroundColor: '#140708',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4A1E20',
    borderRadius: 80,
    paddingBottom: responsiveDimension(10),
    backgroundColor: '#1C0C0D',
  },
  leftContainer: {
    height: '100%',
    position: 'absolute',
    left: 0,
  },
  ballsWrapper: {
    flexWrap: 'wrap',
    maxWidth: '20%',
  },
  buttonEndTurn: {
    backgroundColor: '#B31217',
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    paddingHorizontal: responsiveDimension(30),
    borderWidth: 1.2,
    borderColor: '#FF5858',
    shadowColor: '#FF3030',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 8,
  },
  buttonEndTurnEmpty: {
    paddingHorizontal: responsiveDimension(30),
  },
  totalPointWrapper: {
    marginBottom: responsiveDimension(-56),
    marginHorizontal: responsiveDimension(64),
  },
  totalPointNoMarginBottom: {
    marginBottom: 0,
    marginHorizontal: responsiveDimension(64),
  },
});

export default styles;