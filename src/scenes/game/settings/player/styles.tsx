import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  goalGroup: {
    alignItems: 'flex-end',
  },
  goalLabel: {
    color: '#f0f0f0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  goalButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#525661',
    backgroundColor: '#24272d',
  },
  goalButtonActive: {
    backgroundColor: '#ff2334',
    borderColor: '#ff6b76',
  },
  goalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  goalButtonTextActive: {
    color: '#ffffff',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  numberLabel: {
    color: '#f0f0f0',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 14,
  },
  numberButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4f535d',
    backgroundColor: '#1f2228',
  },
  numberButtonActive: {
    backgroundColor: '#b31217',
    borderColor: '#ff5d5d',
  },
  numberButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  numberButtonTextActive: {
    color: '#ffffff',
  },
  playersWrap: {
    flex: 1,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
  },
  playerCol: {
    flex: 1,
  },
  playerColSpacing: {
    marginLeft: 16,
  },
  playerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#9f1f25',
    backgroundColor: '#0f1117',
    overflow: 'hidden',
  },
  playerCardPrimary: {
    borderColor: '#ff3d45',
    shadowColor: '#ff2a2a',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
    elevation: 4,
  },
  playerCardHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1a1d24',
    borderBottomWidth: 1,
    borderBottomColor: '#8e1a1f',
    alignItems: 'center',
  },
  playerCardHeaderPrimary: {
    backgroundColor: '#b31217',
    borderBottomColor: '#ff5d5d',
  },
  playerCardHeaderText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  playerCardBody: {
    padding: 14,
    backgroundColor: '#0f1117',
  },
  playerInput: {
    marginBottom: 12,
  },
  playerInputStyle: {
    height: 56,
    marginHorizontal: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#5a1f22',
    backgroundColor: '#151821',
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5a1f22',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#151821',
  },
  stepButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#2b2f38',
  },
  stepButtonFirst: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  stepButtonLast: {
    borderRightWidth: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  stepButtonActive: {
    backgroundColor: '#b31217',
    borderRightColor: '#ff5d5d',
  },
  stepButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  stepButtonTextActive: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default styles;
