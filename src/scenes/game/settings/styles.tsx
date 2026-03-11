import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#070707',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
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
    borderColor: '#3b1618',
    backgroundColor: '#0b0b0c',
    overflow: 'hidden',
  },
  rightPanel: {
    flex: 1.12,
    marginLeft: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#3b1618',
    backgroundColor: '#0b0b0c',
    overflow: 'hidden',
  },
  panelScrollContent: {
    paddingBottom: 8,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 14,
  },
  buttonCancel: {
    minWidth: 168,
    height: 64,
    borderRadius: 18,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b1d24',
    borderWidth: 1,
    borderColor: '#414652',
  },
  buttonStart: {
    minWidth: 236,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b31217',
    borderWidth: 1,
    borderColor: '#ff5a5a',
  },
  buttonCancelText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  buttonStartText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

export default styles;
