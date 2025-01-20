import React, {memo, useMemo} from 'react';

import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import Image from 'components/Image';
import Divider from 'components/Divider';
import Loading from 'components/Loading';
import Video from 'components/Video';

import images from 'assets';
import i18n from 'i18n';

import colors from 'configuration/colors';
import {OutputType} from 'types/webcam';

import WebCamViewModel, {Props} from './WebCamViewModel';
import styles from './styles';
import { usePreviewContext } from 'context/PreviewVideo';

const WebCam = (props: Props) => {
  const viewModel = WebCamViewModel(props);
  const {isRewatch} = usePreviewContext();

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

  const LIVESTREAM_MESSAGE = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <Text color={colors.white}>{i18n.t('msgLiveStreamPublished')}</Text>
      </View>
    );
  }, []);

  const CONTAINER_STYLE = useMemo(
    () => [styles.container, {aspectRatio: props.innerControls ? 2 : 1.565}],
    [props.innerControls],
  );

  const CONTROL_STYLE = useMemo(
    () =>
      props.innerControls ? styles.innerControlWrapper : styles.controlWrapper,
    [props.innerControls],
  );

  return (
    <View style={CONTAINER_STYLE} marginTop={'10'}>
      <View flex={'1'} direction={'row'}>
        <Button
          style={styles.webcamButton}
          onPress={viewModel.onToggleInnerControls}>
          <View flex={'1'} style={styles.webcamWrapper} direction={'row'}>
            <View flex={'1'}>
              {viewModel.connectCountdownTime > 0 ? (
                WEBCAM_LOADING_INTRO
              ) : viewModel.refreshing ? (
                WEBCAM_LOADER
              ) : viewModel.source.uri ? (
                <Video
                      key={'webcam-billiards'}
                      //ref={props.cameraRef}
                      gestureDisabled
                      source={viewModel.source}
                      initialScale={viewModel.webcam?.scale}
                      initialTranslateX={viewModel.webcam?.translateX}
                      initialTranslateY={viewModel.webcam?.translateY}
                      onFullscreenPlayerDidPresent={viewModel.onFullscreenPlayerDidPresent}
                      onBuffer={viewModel.onBuffer}
                      onSeek={viewModel.onSeek}
                      onLoad={viewModel.onLoad}
                      onVideoTracks={viewModel.onVideoTracks}
                      onEnd={viewModel.onEnd}
                      onError={viewModel.onWebcamError}
                      loadingDisabled
                      cameraRef={props.cameraRef}
                      isPaused={props.isPaused}
                      isStarted={props.isStarted}
                      isPreview={props.isPreview}
                      videoUri={props.videoUri}
                      webcamType={viewModel.webcamType!}
                />
              ) : viewModel.liveStream?.outputType === OutputType.livestream ? (
                LIVESTREAM_MESSAGE
              ) : (
                <View />
              )}

              {props.renderMatchInfo()}
            </View>
          </View>
        </Button>
      </View>

      {!props.innerControls || viewModel.innerControlsShow ? (
        <View style={CONTROL_STYLE} direction={'row'} alignItems={'center'}>
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
          <View flex={'1'} direction={'row'} justify={'center'}>
            <Button onPress={viewModel.onReWatch} disable={!isRewatch} >
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
      ) : (
        <View />
      )}
    </View>
  );
};

export default memo(WebCam);
