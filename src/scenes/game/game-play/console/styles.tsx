import {dims} from 'configuration';
import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 30,
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
    borderWidth: 0.5,
    borderRadius: 10,
    paddingVertical: responsiveDimension(10),
    borderColor: colors.gray,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default styles;
