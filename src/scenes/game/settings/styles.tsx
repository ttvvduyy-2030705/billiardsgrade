import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050507',
    padding: 18,
  },

  outerFrame: {
    flex: 1,
    backgroundColor: '#070709',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4A1418',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 0},
    elevation: 8,
  },

  header: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#3B1013',
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  headerLeft: {
    width: 210,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerRight: {
    width: 210,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  logo: {
    width: 150,
    height: 56,
  },

  title: {
    color: '#F5F5F5',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },

  titleUnderline: {
    width: 72,
    height: 3,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: '#FF3434',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
    elevation: 5,
  },

  historyButton: {
    minWidth: 154,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#343944',
    backgroundColor: '#14161D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },

  historyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },

  leftPanel: {
    flex: 0.94,
    marginRight: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#381114',
    backgroundColor: '#09090B',
    padding: 18,
  },

  rightPanel: {
    flex: 1.06,
    marginLeft: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#381114',
    backgroundColor: '#09090B',
    padding: 18,
  },

  leftScrollContent: {
    paddingBottom: 8,
  },

  rightPanelTop: {
    flex: 1,
  },

  rightScrollContent: {
    flexGrow: 1,
    paddingBottom: 4,
  },

  panelTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 18,
  },

  groupHeading: {
    color: '#CFCFCF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },

  toggleRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -10,
    marginBottom: 6,
  },

  toggleButton: {
    minWidth: 112,
    height: 58,
    marginRight: 10,
    marginBottom: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#313641',
    backgroundColor: '#161821',
    alignItems: 'center',
    justifyContent: 'center',
  },

  toggleButtonCompact: {
    minWidth: 86,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  toggleButtonActive: {
    backgroundColor: '#B11116',
    borderColor: '#FF4C4C',
    shadowColor: '#FF2828',
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    elevation: 7,
  },

  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  toggleButtonTextCompact: {
    fontSize: 13,
  },

  toggleButtonTextActive: {
    color: '#FFFFFF',
  },

  libreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  libreSideButton: {
    flex: 1,
    height: 54,
    marginRight: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#24262D',
    backgroundColor: '#101117',
  },

  libreCenterButton: {
    width: 146,
    height: 54,
    marginRight: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#313641',
    backgroundColor: '#161821',
  },

  libreSideText: {
    color: '#EDEDED',
    fontSize: 16,
    fontWeight: '600',
  },

  libreCenterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  advancedBlock: {
    marginTop: 8,
  },

  advancedTitle: {
    color: '#BDBDBD',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  rightPanelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  controlPill: {
    minWidth: 170,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#313641',
    backgroundColor: '#14161D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },

  controlPillText: {
    color: '#FFFFFF',
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
    color: '#F0F0F0',
    fontSize: 18,
    fontWeight: '700',
  },

  playerNumberButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  playerNumberButton: {
    width: 54,
    height: 54,
    marginLeft: 10,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#313641',
    backgroundColor: '#161821',
  },

  playerNumberButtonActive: {
    backgroundColor: '#B11116',
    borderColor: '#FF4C4C',
    shadowColor: '#FF2828',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
    elevation: 7,
  },

  playerNumberButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  playerNumberButtonTextActive: {
    color: '#FFFFFF',
  },

  playerCardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
  },

  playerCardsRowSingle: {
    minHeight: 240,
  },

  playerCardsRowCompact: {
    minHeight: 176,
  },

  playerCardCol: {
    flex: 1,
  },

  playerCardColGap: {
    marginRight: 16,
  },

  playerCard: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0F1015',
    borderWidth: 1,
    borderColor: '#7B1A1D',
  },

  playerCardCompact: {
    minHeight: 176,
  },

  playerCardAccent: {
    borderColor: '#C8282E',
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 3},
    elevation: 6,
  },

  playerCardHeader: {
    height: 60,
    backgroundColor: '#13151C',
    borderBottomWidth: 1,
    borderBottomColor: '#A92026',
    alignItems: 'center',
    justifyContent: 'center',
  },

  playerCardHeaderAccent: {
    backgroundColor: '#9C1117',
    borderBottomColor: '#FF5353',
  },

  playerCardHeaderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  playerCardBody: {
    flex: 1,
    padding: 16,
    backgroundColor: '#101115',
    justifyContent: 'space-between',
  },

  playerCardBodyCompact: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  playerInput: {
    height: 68,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3B1A1D',
    backgroundColor: '#0C0D11',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 14,
  },

  playerInputAccent: {
    borderColor: '#C8282E',
    backgroundColor: '#160C0E',
  },

  playerInputCompact: {
    height: 56,
    marginBottom: 12,
    fontSize: 21,
  },

  pointRow: {
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3B1A1D',
    backgroundColor: '#0C0D11',
  },

  pointRowCompact: {
    borderRadius: 16,
  },

  pointButton: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14161D',
    borderRightWidth: 1,
    borderRightColor: '#262933',
  },

  pointButtonCompact: {
    height: 46,
  },

  pointButtonCurrent: {
    backgroundColor: '#A81217',
    borderRightColor: '#FF5656',
  },

  pointButtonLast: {
    borderRightWidth: 0,
  },

  pointButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  pointButtonTextCompact: {
    fontSize: 15,
  },

  pointButtonTextCurrent: {
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
    minWidth: 172,
    height: 60,
    marginRight: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B404A',
    backgroundColor: '#14161D',
  },

  buttonCancelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  buttonStart: {
    minWidth: 230,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF5A5A',
    backgroundColor: '#B11116',
    shadowColor: '#FF2828',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 9,
  },

  buttonStartInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  startIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },

  buttonStartText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
});

export default styles;
