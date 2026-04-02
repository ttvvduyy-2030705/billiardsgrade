import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  totalPointInTurn: {
    backgroundColor: colors.grayBlue,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: responsiveDimension(30),
  },
});

export default styles;
