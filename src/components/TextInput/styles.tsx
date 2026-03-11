import {StyleSheet} from 'react-native';
import colors from 'configuration/colors';

const styles = StyleSheet.create({
  flex: {
    flexDirection: 'row',
  },
  container: {
    flex: 1,
    height: 35,
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerFullHeight: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 13,
    height: '100%',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    marginLeft: 20,
    paddingVertical: 0,
  },
  textArea: {
    flex: 1,
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    marginHorizontal: 20,
  },
  flexInput: {
    flex: 1,
    height: '100%',
    marginHorizontal: 20,
    borderRadius: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  cancelInputWrapper: {
    flex: 1,
    height: '100%',
    paddingRight: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.border,
    borderTopRightRadius: 5,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 5,
    marginRight: 20,
  },
  cancelInputIcon: {
    width: 15,
    height: 15,
    tintColor: colors.text,
  },
  emptyView: {
    height: 15,
  },
  error: {
    borderWidth: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.error,
    borderColor: colors.error,
  },
  txtError: {
    position: 'absolute',
    left: 20,
    bottom: -20,
  },
  marginBottom: {
    marginBottom: 15,
  },
  backgroundWhite: {
    backgroundColor: colors.card,
  },
});

export default styles;