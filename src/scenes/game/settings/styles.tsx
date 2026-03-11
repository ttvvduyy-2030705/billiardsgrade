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
    paddingBottom: 18,
    shadowColor: '#FF2A2A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 8,
  },

  container: {
    backgroundColor: 'transparent',
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

  wrapperLeft: {
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

  wrapperRight: {
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

  scrollContent: {
    paddingBottom: 8,
  },

  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 16,
    paddingRight: 6,
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