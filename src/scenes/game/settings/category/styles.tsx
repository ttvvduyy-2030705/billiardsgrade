import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 22,
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    color: '#F2F2F2',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -10,
    marginBottom: -10,
  },

  optionsRowCompact: {
    marginBottom: -10,
  },

  button: {
    borderWidth: 1,
    borderColor: '#3D404A',
    borderRadius: 18,
    paddingHorizontal: responsiveDimension(20),
    paddingVertical: responsiveDimension(10),
    marginRight: responsiveDimension(10),
    marginBottom: responsiveDimension(10),
    backgroundColor: '#171920',
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },

  active: {
    backgroundColor: '#B31217',
    borderWidth: 1,
    borderColor: '#FF5252',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.28,
    shadowRadius: 9,
    shadowOffset: {width: 0, height: 0},
    elevation: 7,
  },

  buttonText: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: '700',
  },

  activeText: {
    color: '#FFFFFF',
  },
});

export default styles;