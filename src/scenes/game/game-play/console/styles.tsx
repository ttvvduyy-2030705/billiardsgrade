import {dims} from 'configuration';
import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090505',
    borderRadius: 30,
    borderWidth: 1.2,
    borderColor: '#4A1516',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 9,
  },
  icon: {
    width: responsiveDimension(32),
    height: responsiveDimension(32),
  },
  buttonSound: {
    padding: responsiveDimension(15),
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: responsiveDimension(6),
    borderColor: '#3B2020',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171010',
  },
  marginTop: {
    marginTop: responsiveDimension(20),
  },
  marginVertical: {
    marginVertical: responsiveDimension(20),
  },
  logo: {
    height: dims.screenHeight * 0.07,
    width: dims.screenWidth * 0.1,
  },
  buttonWrapper: {
    overflow: 'hidden',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  buttonGiveMoreTime: {
    backgroundColor: '#171010',
    borderWidth: 1,
    borderColor: '#6C2022',
    shadowColor: '#FF3030',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 7,
  },
  buttonTurns: {
    borderColor: '#452020',
    borderWidth: 1,
    backgroundColor: '#130C0C',
  },
});

export default styles;