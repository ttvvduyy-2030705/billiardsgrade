import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#040404',
    padding: 14,
  },

  frame: {
    flex: 1,
    backgroundColor: '#060606',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#341214',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 8,
  },

  header: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#341214',
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  headerLeft: {
    width: 190,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerRight: {
    width: 190,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  logo: {
    width: 158,
    height: 60,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(255,40,40,0.16)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },

  titleUnderline: {
    marginTop: 8,
    width: 74,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FF3A3A',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
    elevation: 5,
  },

  historyButton: {
    minWidth: 150,
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#171920',
    borderWidth: 1,
    borderColor: '#404450',
  },

  historyText: {
    color: '#F5F5F5',
    fontSize: 17,
    fontWeight: '700',
  },

  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },

  leftPanel: {
    flex: 1,
    marginRight: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#341214',
    backgroundColor: '#090707',
    padding: 18,
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    elevation: 4,
  },

  rightPanel: {
    flex: 1.12,
    marginLeft: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#341214',
    backgroundColor: '#090707',
    padding: 18,
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    elevation: 4,
  },

  leftScrollContent: {
    paddingBottom: 8,
  },

  rightPanelTop: {
    flex: 1,
  },

  rightScrollContent: {
    paddingBottom: 8,
  },

  panelTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 18,
  },

  sectionBlock: {
    marginBottom: 18,
  },

  sectionTitle: {
    color: '#F2F2F2',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },

  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -10,
    marginBottom: -10,
  },

  optionWrapCompact: {
    marginBottom: -10,
  },

  optionButton: {
    minWidth: 106,
    height: 48,
    paddingHorizontal: 18,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3D404A',
    backgroundColor: '#171920',
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionButtonCompact: {
    minWidth: 90,
    height: 44,
    paddingHorizontal: 14,
  },

  optionButtonActive: {
    backgroundColor: '#B31217',
    borderColor: '#FF5252',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.28,
    shadowRadius: 9,
    shadowOffset: {width: 0, height: 0},
    elevation: 7,
  },

  optionText: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: '700',
  },

  optionTextActive: {
    color: '#FFFFFF',
  },

  rightPanelHeaderRow: {
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

  playerNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  playerNumberLabel: {
    color: '#F2F2F2',
    fontSize: 18,
    fontWeight: '700',
  },

  playerNumberButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  playerNumberButton: {
    width: 52,
    height: 52,
    marginLeft: 10,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D404A',
    backgroundColor: '#171920',
  },

  playerNumberButtonActive: {
    backgroundColor: '#B31217',
    borderColor: '#FF5252',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    elevation: 7,
  },

  playerNumberButtonText: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '800',
  },

  playerNumberButtonTextActive: {
    color: '#FFFFFF',
  },

  playerCardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 18,
  },

  playerCardCol: {
    flex: 1,
    marginRight: 9,
  },

  playerCard: {
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

  playerCardHeader: {
    height: 60,
    backgroundColor: '#8E1015',
    borderBottomWidth: 1,
    borderBottomColor: '#FF4040',
    alignItems: 'center',
    justifyContent: 'center',
  },

  playerCardHeaderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  playerCardBody: {
    padding: 16,
    backgroundColor: '#12090A',
  },

  playerInput: {
    height: 55,
    marginBottom: 14,
  },

  playerInputStyle: {
    fontSize: 24,
    marginHorizontal: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4A1E20',
    backgroundColor: '#140B0C',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  pointRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#4A1E20',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#12090A',
  },

  pointButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#291516',
    backgroundColor: '#171920',
  },

  pointButtonActive: {
    backgroundColor: '#B31217',
    borderRightColor: '#FF5252',
  },

  pointButtonLast: {
    borderRightWidth: 0,
  },

  pointButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  pointButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 16,
  },

  buttonCancel: {
    minWidth: 176,
    height: 68,
    borderRadius: 20,
    marginRight: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171920',
    borderWidth: 1,
    borderColor: '#424652',
  },

  buttonStart: {
    minWidth: 252,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B31217',
    borderWidth: 1.2,
    borderColor: '#FF5A5A',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 9,
  },

  buttonCancelText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  buttonStartText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

export default styles;