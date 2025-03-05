import colors from 'configuration/colors';
import {StyleSheet} from 'react-native';
import {responsiveDimension} from 'utils/helper';

const styles = StyleSheet.create({
  buttonBack: {
    paddingHorizontal: responsiveDimension(45),
    paddingVertical: responsiveDimension(15),
    marginTop: responsiveDimension(15),
    borderRadius: 10,
    backgroundColor: colors.yellow,
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
  },
  webcam: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.black,
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  video: { width: '90%', height: 300 },
  label: { marginTop: 10, fontSize: 16 },
  slider: { width: 150, marginTop: 10, alignItems:'center' },
  controls: { flexDirection: 'row', marginTop: 10 },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    //padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginLeft: 50
  },
  selectITem: {
   borderColor: colors.deepGray
  },
  unselectItem: {
    borderColor: colors.white
   },
  thumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  details: {
    alignItems: 'center'
  },
  duration: {
    fontSize: 16,
    fontWeight: 'bold',
    color:  colors.black
  },
});

export default styles;
