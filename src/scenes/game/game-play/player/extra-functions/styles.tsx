import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  functionWrapper: {
    top: responsiveDimension(24),
    left: 0,
    position: 'absolute',
    width: '100%',
    height: '25%',
  },
  buttonPoolBreak: {
    backgroundColor: colors.green,
    paddingVertical: responsiveDimension(8),
    paddingHorizontal: responsiveDimension(24),
    marginRight: responsiveDimension(15),
  },
  additionalWrapper: {
    marginTop: responsiveDimension(-16),
    height: '100%',
  },
});

export default styles;
