import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  buttonBack: {
    paddingHorizontal: responsiveDimension(45),
    paddingVertical: responsiveDimension(15),
    marginTop: responsiveDimension(15),
    borderRadius: 10,
    backgroundColor: colors.lightPrimary2,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: responsiveDimension(45),
    paddingVertical: responsiveDimension(15),
    marginBottom: responsiveDimension(15),
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: colors.statusBar,
  },
  webcamContainer: {
    backgroundColor: colors.black,
    height: '100%',
    width: '100%',
  },
  webcam: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.black,
    marginLeft: 0.5,
  },
  videoResize: {
    width: 300,
    height: 200,
    backgroundColor: 'black',
  },
  fullWidth: {
    width: '100%',
  },
  iconBack: {
    width: responsiveDimension(16),
    height: responsiveDimension(16),
    marginRight: responsiveDimension(5),
  },
  buttonShare: {
    position: 'absolute',
    top: responsiveDimension(16),
    right: responsiveDimension(16),
    padding: responsiveDimension(16),
    backgroundColor: colors.lightPrimary1,
    borderRadius: 10,
  },
  iconShare: {
    width: responsiveDimension(32),
    height: responsiveDimension(32),
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  video: {
    width: '90%',
    height: 300,
  },
  label: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  slider: {
    width: 150,
    marginTop: 10,
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    marginTop: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    width: '100%',
    marginTop: 5,
    justifyContent: 'space-between',
    backgroundColor: colors.card,
  },
  selectITem: {
    width: '100%',
    backgroundColor: colors.lightPrimary2,
  },
  unselectItem: {
    borderColor: colors.gray,
  },
  thumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  details: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  duration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  videoContainer: {
    flex: 1,
  },
});

export default styles;