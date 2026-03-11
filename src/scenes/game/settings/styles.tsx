import {StyleSheet} from 'react-native';

const BORDER = 'rgba(255, 70, 70, 0.28)';
const BORDER_STRONG = 'rgba(255, 70, 70, 0.72)';
const PANEL_BG = '#09090d';
const PANEL_BG_2 = '#101018';
const PANEL_BG_3 = '#161620';
const RED = '#d61f26';
const RED_SOFT = '#a51319';
const TEXT = '#f5f5f7';
const MUTED = '#b8b8c2';

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#020204',
  },
  scrollContent: {
    flexGrow: 1,
  },
  screen: {
  flex: 1,
  backgroundColor: '#020204',
  paddingHorizontal: 18,
  paddingVertical: 14,
},
shell: {
  flex: 1,
  borderWidth: 1,
  borderColor: 'rgba(255, 45, 45, 0.22)',
  borderRadius: 20,
  backgroundColor: '#05060a',
  overflow: 'hidden',
},

  header: {
  minHeight: 78,
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 10,
  flexDirection: 'row',
  alignItems: 'center',
},
brandWrap: {
  width: 150,
  justifyContent: 'center',
},
  brandMain: {
    color: '#f4f4f7',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandSub: {
    color: RED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1.4,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
  color: '#f5f5f7',
  fontSize: 20,
  fontWeight: '800',
  letterSpacing: 1,
},
  headerUnderline: {
  marginTop: 6,
  width: 64,
  height: 3,
  borderRadius: 99,
  backgroundColor: '#d61f26',
},
headerActionButton: {
  minWidth: 122,
  height: 48,
  borderRadius: 16,
  backgroundColor: '#101118',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 14,
},
  headerActionIcon: {
    color: TEXT,
    fontSize: 22,
    marginRight: 10,
    fontWeight: '700',
  },
  headerActionText: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
  },
  topDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 32, 32, 0.45)',
  },

  mainContent: {
  flex: 1,
  flexDirection: 'row',
  padding: 14,
  gap: 14,
},
leftPanel: {
  flex: 0.92,
  minHeight: 500,
  borderRadius: 20,
  backgroundColor: '#09090d',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  padding: 16,
},
rightPanel: {
  flex: 1.08,
  minHeight: 500,
  borderRadius: 20,
  backgroundColor: '#09090d',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  padding: 16,
  paddingBottom: 12,
},
panelTitle: {
  color: '#f5f5f7',
  fontSize: 20,
  fontWeight: '800',
  letterSpacing: 1,
  marginBottom: 14,
},

  segmentRow: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 12,
},
segmentButton: {
  minWidth: 122,
  height: 50,
  paddingHorizontal: 20,
  borderRadius: 14,
  backgroundColor: '#1a1b23',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  alignItems: 'center',
  justifyContent: 'center',
},
  segmentButtonMuted: {
    backgroundColor: '#181922',
  },
  segmentButtonActive: {
    backgroundColor: RED_SOFT,
    borderColor: BORDER_STRONG,
    shadowColor: '#ff2a2a',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 0},
    elevation: 3,
  },
  segmentButtonText: {
  color: '#f5f5f7',
  fontSize: 16,
  fontWeight: '700',
},
  segmentButtonTextActive: {
    color: '#fff',
  },

  optionSection: {
  marginBottom: 8,
},
sectionLabel: {
  color: '#b8b8c2',
  fontSize: 13,
  fontWeight: '700',
  marginBottom: 5,
  letterSpacing: 0.3,
},
choiceGroup: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
choiceGroupCompact: {
  gap: 6,
},
choiceButton: {
  minHeight: 40,
  paddingHorizontal: 12,
  borderRadius: 11,
  backgroundColor: '#101018',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  alignItems: 'center',
  justifyContent: 'center',
},
choiceButtonCompact: {
  minHeight: 34,
  paddingHorizontal: 9,
  borderRadius: 9,
},
  choiceButtonSelected: {
    backgroundColor: RED_SOFT,
    borderColor: BORDER_STRONG,
  },
  choiceButtonText: {
  color: '#e7e7ee',
  fontSize: 13,
  fontWeight: '700',
},
choiceButtonTextCompact: {
  fontSize: 11,
},
  choiceButtonTextSelected: {
    color: '#fff',
  },

  rightPanelHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},
controlButton: {
  minWidth: 150,
  height: 52,
  borderRadius: 16,
  backgroundColor: '#12131b',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 16,
},
  controlIcon: {
    color: TEXT,
    fontSize: 21,
    marginRight: 10,
    fontWeight: '700',
  },
  controlButtonText: {
  color: '#f5f5f7',
  fontSize: 15,
  fontWeight: '800',
  letterSpacing: 0.5,
},
playerNumberRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},
  playerCountLabel: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 16,
  },
  playerCountButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playerCountButton: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: '#181922',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  alignItems: 'center',
  justifyContent: 'center',
},
  playerCountButtonSelected: {
    backgroundColor: RED_SOFT,
    borderColor: BORDER_STRONG,
  },
  playerCountButtonText: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '800',
  },
  playerCountButtonTextSelected: {
    color: '#fff',
  },

  playersArea: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  playerGridItem: {
  width: '50%',
  paddingHorizontal: 6,
  paddingBottom: 12,
},
  playerGridItemSingle: {
    width: '50%',
  },

  playerCard: {
  borderRadius: 18,
  overflow: 'hidden',
  backgroundColor: '#0c0d12',
  borderWidth: 1.5,
  minHeight: 168,
},
  playerCardPrimary: {
    borderColor: BORDER_STRONG,
  },
  playerCardSecondary: {
    borderColor: BORDER,
  },
  playerCardHeader: {
  minHeight: 52,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 12,
  borderBottomWidth: 1,
},
  playerCardHeaderPrimary: {
    backgroundColor: RED_SOFT,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  playerCardHeaderSecondary: {
    backgroundColor: '#141520',
    borderBottomColor: 'rgba(255, 50, 50, 0.55)',
  },
  playerCardTitle: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '800',
  letterSpacing: 0.6,
},
  playerCardBody: {
  paddingHorizontal: 12,
  paddingTop: 10,
  paddingBottom: 12,
  backgroundColor: '#09090d',
},

  playerNameCaption: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  playerNameInput: {
  height: 34,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'transparent',
  color: '#fff',
  fontSize: 16,
  textAlign: 'center',
  marginBottom: 10,
  paddingHorizontal: 8,
  backgroundColor: 'transparent',
},
pointRow: {
  flexDirection: 'row',
  alignItems: 'stretch',
  borderRadius: 12,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  backgroundColor: '#12131b',
},
pointButton: {
  flex: 1,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  borderRightWidth: 1,
  borderRightColor: 'rgba(255,255,255,0.06)',
},
  pointButtonCenter: {
    backgroundColor: RED_SOFT,
  },
  pointButtonText: {
  color: '#f3f3f8',
  fontSize: 14,
  fontWeight: '800',
},
pointButtonTextCenter: {
  color: '#fff',
  fontSize: 16,
},
  footerActions: {
    minHeight: 92,
    marginTop: 'auto',
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 16,
  },
  cancelButton: {
    minWidth: 170,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#171821',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
  },
  startButton: {
    minWidth: 240,
    height: 64,
    borderRadius: 18,
    backgroundColor: RED,
    borderWidth: 1,
    borderColor: BORDER_STRONG,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 26,
  },
  startIcon: {
    color: '#fff',
    fontSize: 21,
    marginRight: 10,
    fontWeight: '800',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});

export default styles;