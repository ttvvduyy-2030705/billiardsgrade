import {StyleSheet} from 'react-native';
import {responsiveDimension, responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  controlPill: {
    minWidth: 160,
    height: 54,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171920',
    borderWidth: 1,
    borderColor: '#3E404A',
  },

  controlPillText: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '700',
  },

  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  numberLabel: {
    color: '#F2F2F2',
    fontSize: 18,
    fontWeight: '700',
  },

  numberButton: {
    borderWidth: 1,
    borderColor: '#3D404A',
    borderRadius: 50,
    width: responsiveDimension(52),
    height: responsiveDimension(52),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    backgroundColor: '#171920',
  },

  numberButtonActive: {
    backgroundColor: '#B31217',
    borderWidth: 1,
    borderColor: '#FF5252',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    elevation: 7,
  },

  numberButtonText: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '800',
  },

  numberButtonTextActive: {
    color: '#FFFFFF',
  },

  playersWrap: {
    marginTop: 4,
  },

  playerRow: {
    marginBottom: responsiveDimension(18),
  },

  playerItem: {
    borderRadius: 22,
    backgroundColor: '#110809',
    borderWidth: 1,
    borderColor: '#6A1A1D',
    shadowColor: '#FF2A2A',
    shadowRadius: 10,
    shadowOpacity: 0.18,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
    overflow: 'hidden',
  },

  playerHeader: {
    height: responsiveDimension(62),
    backgroundColor: '#8E1015',
    borderBottomWidth: 1,
    borderBottomColor: '#FF4040',
    alignItems: 'center',
    justifyContent: 'center',
  },

  playerHeaderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  playerBody: {
    padding: responsiveDimension(16),
    backgroundColor: '#12090A',
  },

  input: {
    height: responsiveDimension(55),
    paddingBottom: 1,
    marginBottom: responsiveDimension(14),
  },

  inputStyle: {
    fontSize: responsiveFontSize(24),
    marginHorizontal: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4A1E20',
    backgroundColor: '#140B0C',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  stepWrapper: {
    borderWidth: 1,
    borderRadius: 18,
    borderColor: '#4A1E20',
    backgroundColor: '#12090A',
    flexDirection: 'row',
    overflow: 'hidden',
  },

  stepItem: {
    flex: 1,
    height: responsiveDimension(48),
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#291516',
    backgroundColor: '#171920',
  },

  activePlayerPoint: {
    backgroundColor: '#B31217',
    borderRightColor: '#FF5252',
  },

  stepText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  stepTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  button: {
    borderWidth: 1,
    borderColor: '#3D404A',
    borderRadius: 50,
    width: responsiveDimension(52),
    height: responsiveDimension(52),
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
    marginRight: 10,
    backgroundColor: '#171920',
  },

  active: {
    backgroundColor: '#B31217',
    borderWidth: 1,
    borderColor: '#FF5252',
  },

  avatar: {
    width: responsiveDimension(56),
    height: responsiveDimension(56),
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1010',
    borderWidth: 1,
    borderColor: '#4B1D1F',
  },
});

export default styles;