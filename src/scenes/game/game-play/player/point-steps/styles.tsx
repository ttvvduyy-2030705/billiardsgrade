import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  stepsWrapper: {
    flexWrap: 'wrap',
  },
  buttonStep: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.deepGray,
    borderRadius: 20,
    paddingHorizontal: responsiveDimension(35),
    paddingVertical: responsiveDimension(15),
    marginRight: responsiveDimension(15),
    marginBottom: responsiveDimension(15),
  },
});

export default styles;
