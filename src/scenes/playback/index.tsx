import React, {memo, useMemo} from 'react';
import Video from 'react-native-video';

import Container from 'components/Container';
import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import Loading from 'components/Loading';

import i18n from 'i18n';
import {goBack} from 'utils/navigation';

import {
  WEBCAM_BUFFER_CONFIG,
  WEBCAM_SELECTED_VIDEO_TRACK,
} from 'constants/webcam';

import PlayBackWebcamViewModel, {Props} from './PlayBackViewModel';
import styles from './styles';
import {ScrollView} from 'react-native';
import Image from 'components/Image';
import images from 'assets';

const PlayBackWebcam = (props: Props) => {
  const viewModel = PlayBackWebcamViewModel(props);

  const WEBCAM_LOADER = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <Loading isLoading size={'large'} showPlainLoading />
      </View>
    );
  }, []);

  const FILE_LIST = useMemo(() => {
    return viewModel.files.map((file, index) => {
      return (
        <Button
          key={index}
          style={[
            styles.button,
            file.id === viewModel.selectedFileId ? styles.buttonSelected : {},
          ]}
          onPress={viewModel.onSelectMinuteForWebcam.bind(
            PlayBackWebcam,
            file,
          )}>
          <Text>{i18n.t('txtMinuteOrder', {minute: file.id + 1})}</Text>
        </Button>
      );
    });
  }, [
    viewModel.selectedFileId,
    viewModel.files,
    viewModel.onSelectMinuteForWebcam,
  ]);

  return (
    <Container>
      <View direction={'row'}>
        <View margin={'20'}>
          <View direction={'row'} marginBottom={'20'}>
            <View flex={'1'} justify={'center'} alignItems={'center'}>
              <Text fontSize={16} fontWeight={'bold'}>
                {i18n.t('reWatch')}
              </Text>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {FILE_LIST}
          </ScrollView>
          <View flex={'1'} />
          <View>
            <Button style={styles.buttonBack} onPress={goBack}>
              <View direction={'row'} alignItems={'center'}>
                <Image source={images.back} style={styles.iconBack} />
                <Text lineHeight={15}>{i18n.t('txtBack')}</Text>
              </View>
            </Button>
          </View>
        </View>
        <View flex={'1'} style={styles.webcamContainer}>
          {viewModel.webcamUrl ? (
            <>
              <Video
                id={'webcam-billiards-playback'}
                ref={viewModel.videoRef}
                style={styles.webcam}
                controls
                source={{uri: viewModel.webcamUrl}}
                selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
                bufferConfig={WEBCAM_BUFFER_CONFIG}
                onError={viewModel.onWebcamError}
                renderLoader={WEBCAM_LOADER}
              />
              <Button
                style={styles.buttonShare}
                onPress={viewModel.onShareVideo}>
                <Image source={images.share} style={styles.iconShare} />
              </Button>
            </>
          ) : (
            <View style={styles.webcam} />
          )}
        </View>
      </View>
    </Container>
  );
};

export default memo(PlayBackWebcam);
