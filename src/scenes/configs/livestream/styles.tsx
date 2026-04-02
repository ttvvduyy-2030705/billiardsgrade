import {StyleSheet} from 'react-native';
import {responsiveDimension, responsiveFontSize} from 'utils/helper';

const styles = StyleSheet.create({
  root: {backgroundColor: '#050505', borderRadius: 20},
  sectionTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 12},
  row: {flexDirection: 'row', alignItems: 'center', marginBottom: 14},
  rowLabel: {color: '#A8A8A8', fontSize: responsiveFontSize(12), marginRight: 12, minWidth: responsiveDimension(90)},
  rowContent: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap'},
  choiceButton: {borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 16, backgroundColor: '#101010', marginLeft: 8, marginBottom: 8},
  choiceButtonActive: {backgroundColor: '#C91D24', borderColor: 'rgba(255,255,255,0.12)'},
  choiceButtonInner: {paddingHorizontal: responsiveDimension(15), paddingVertical: responsiveDimension(10)},
  choiceText: {color: '#FFFFFF', fontSize: responsiveFontSize(12), fontWeight: '700'},
  liveStreamConfigWrapper: {backgroundColor: '#0E0E0E', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, marginTop: 8},
  buttonSaveConfig: {backgroundColor: '#C91D24', paddingHorizontal: responsiveDimension(22), paddingVertical: responsiveDimension(12), borderRadius: 16},
  saveText: {color: '#FFFFFF', fontWeight: '800'},
});
export default styles;
