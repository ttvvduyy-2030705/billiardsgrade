import React, {memo, useCallback} from 'react';
import Button from 'components/Button';
import Text from 'components/Text';
import View from 'components/View';
import i18n from 'i18n';
import {Bitrate, Fps, OutputType, Resolution} from 'types/webcam';
import Google from './google';
import LiveStreamViewModel, {Props} from './LiveStreamViewModel';
import styles from './styles';

const LiveStream = (props: Props) => {
  const viewModel = LiveStreamViewModel(props);

  const renderChoice = useCallback((label: string, selected: boolean, onPress: () => void) => (
    <Button style={[styles.choiceButton, selected && styles.choiceButtonActive]} onPress={onPress}>
      <View style={styles.choiceButtonInner}><Text color={'#FFFFFF'} style={styles.choiceText}>{label}</Text></View>
    </Button>
  ), []);

  const renderRow = useCallback((label: string, content: React.ReactNode) => (
    <View style={styles.row}><Text color={'#A8A8A8'} style={styles.rowLabel}>{label}</Text><View style={styles.rowContent}>{content}</View></View>
  ), []);

  return (
    <View style={styles.root} padding={'20'}>
      {!props.configOnly ? <Text color={'#FFFFFF'} style={styles.sectionTitle}>{i18n.t('cameraConfig')}</Text> : <View />}
      {!props.configOnly ? renderRow(i18n.t('txtChooseOutputType'), <>
        {renderChoice(i18n.t('local'), viewModel.liveStreamData.outputType===OutputType.local, () => viewModel.onSelectOutputTypeLocal('local'))}
        {renderChoice(i18n.t('livestream'), viewModel.liveStreamData.outputType===OutputType.livestream, () => viewModel.onSelectOutputTypeLocal('livestream'))}
      </>) : <View />}
      {(props.configOnly || viewModel.liveStreamData.outputType===OutputType.livestream) ? (
        <View style={styles.liveStreamConfigWrapper}>
          <View style={styles.row}><Text color={'#A8A8A8'} style={styles.rowLabel}>{i18n.t('platform')}</Text><View style={[styles.rowContent,{justifyContent:'flex-start'}]}><Google liveStreamData={viewModel.liveStreamData} onUpdateYouTubeLiveStreamData={viewModel.onUpdateYouTubeLiveStreamData} /></View></View>
          {renderRow(i18n.t('resolution'), <>
            {renderChoice('720p', viewModel.liveStreamData.resolution===Resolution.HD, () => viewModel.onSelectResolution(Resolution.HD.toString()))}
            {renderChoice('1080p', viewModel.liveStreamData.resolution===Resolution.FullHD, () => viewModel.onSelectResolution(Resolution.FullHD.toString()))}
            {renderChoice('1440p', viewModel.liveStreamData.resolution===Resolution.QHD, () => viewModel.onSelectResolution(Resolution.QHD.toString()))}
          </>)}
          {renderRow(i18n.t('frame'), <>
            {renderChoice('30', viewModel.liveStreamData.fps===Fps.F30, () => viewModel.onSelectFpsLiveStream(Fps.F30.toString()))}
            {renderChoice('60', viewModel.liveStreamData.fps===Fps.F60, () => viewModel.onSelectFpsLiveStream(Fps.F60.toString()))}
          </>)}
          {renderRow(i18n.t('bitrate'), <>
            {renderChoice('5000 kbps', viewModel.liveStreamData.bitrate===Bitrate.B5000, () => viewModel.onSelectBitrateLiveStream(Bitrate.B5000))}
            {renderChoice('9000 kbps', viewModel.liveStreamData.bitrate===Bitrate.B9000, () => viewModel.onSelectBitrateLiveStream(Bitrate.B9000))}
          </>)}
        </View>
      ) : <View />}
      {!props.configOnly ? <View direction={'row'} justify={'end'} marginTop={'20'}>
        <Button disable={!viewModel.allowToSave} onPress={viewModel.onSaveConfig} style={styles.buttonSaveConfig}>
          <View paddingHorizontal={'5'}><Text color={'#FFFFFF'} style={styles.saveText}>{i18n.t('saveConfig')}</Text></View>
        </Button>
      </View> : <View />}
    </View>
  );
};
export default memo(LiveStream);
