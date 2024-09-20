import React, {memo, useMemo} from 'react';
import Video from 'react-native-video';

import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import Image from 'components/Image';
import Divider from 'components/Divider';
import Loading from 'components/Loading';

import images from 'assets';
import i18n from 'i18n';

import colors from 'configuration/colors';
import {
  WEBCAM_BUFFER_CONFIG,
  WEBCAM_SELECTED_VIDEO_TRACK,
} from 'constants/webcam';

import WebCamViewModel, {Props} from './WebCamViewModel';
import styles from './styles';

const WebCam = (props: Props) => {
  const viewModel = WebCamViewModel(props);

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

  const WEBCAM_LOADING_INTRO = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <Text color={colors.white}>
          {i18n.t('msgWebcamIntro', {second: viewModel.connectCountdownTime})}
        </Text>
      </View>
    );
  }, [viewModel.connectCountdownTime]);

  return (
    <View style={styles.container}>
      <View
        flex={'1'}
        style={styles.webcamWrapper}
        direction={'row'}
        marginTop={'10'}>
        <View flex={'1'}>
          {viewModel.connectCountdownTime > 0 ? (
            WEBCAM_LOADING_INTRO
          ) : viewModel.refreshing ? (
            WEBCAM_LOADER
          ) : (
            <Video
              id={'webcam-billiards'}
              ref={viewModel.videoRef}
              style={styles.webcam}
              source={viewModel.source}
              selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
              bufferConfig={WEBCAM_BUFFER_CONFIG}
              onFullscreenPlayerDidPresent={
                viewModel.onFullscreenPlayerDidPresent
              }
              onBuffer={viewModel.onBuffer}
              onSeek={viewModel.onSeek}
              onLoad={viewModel.onLoad}
              onVideoTracks={viewModel.onVideoTracks}
              onEnd={viewModel.onEnd}
              onError={viewModel.onWebcamError}
              renderLoader={WEBCAM_LOADER}
            />
          )}
        </View>
      </View>
      <View direction={'row'} alignItems={'center'}>
        <View flex={'1'} direction={'row'} justify={'center'}>
          <Button onPress={viewModel.onRefresh}>
            <View
              direction={'row'}
              alignItems={'center'}
              paddingVertical={'10'}>
              <View marginRight={'10'}>
                <Text>{i18n.t('refresh')}</Text>
              </View>
              <Image source={images.webcam.refresh} style={styles.icon} />
            </View>
          </Button>
        </View>
        <Divider vertical size={'small'} />
        {/* <View flex={'1'} direction={'row'} justify={'center'}>
          <Button onPress={viewModel.onDelay}>
            <View
              direction={'row'}
              alignItems={'center'}
              paddingVertical={'10'}>
              <View marginRight={'10'}>
                <Text>{i18n.t('delay')}</Text>
              </View>
              <Image source={images.webcam.delay} style={styles.icon} />
            </View>
          </Button>
        </View> */}
        {/* <Divider vertical size={'small'} /> */}
        <View flex={'1'} direction={'row'} justify={'center'}>
          <Button onPress={viewModel.onReWatch}>
            <View
              direction={'row'}
              alignItems={'center'}
              paddingVertical={'10'}>
              <View marginRight={'10'}>
                <Text>{i18n.t('reWatch')}</Text>
              </View>
              <Image source={images.webcam.watch} style={styles.icon} />
            </View>
          </Button>
        </View>
      </View>
    </View>
  );
};

export default memo(WebCam);
