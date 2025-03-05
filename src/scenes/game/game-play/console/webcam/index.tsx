import React, {forwardRef, memo, RefObject, useMemo} from 'react';

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
import {ImageBackground } from 'react-native';

const WebCam = (props: Props) => {
  const viewModel = WebCamViewModel(props);

   const canRewatch = useMemo( () => {
      return  props.isStarted && props.isPaused
   }, [props.isStarted, props.isPaused])

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
           {!viewModel.refreshing ? ( <View flex={'1'}>
            <Video
                key={'webcam-billiards'}
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
                videoUri={props.videoUri}
                webcamType={viewModel.webcamType!}
                setIsCameraReady={props.setIsCameraReady}
              />
              {/* {props.renderMatchInfo()} */}
            </View>) : (
              <ImageBackground
                source={images.logoclb} // Replace with your image URL or local asset
                style={styles.background}
                  resizeMode="stretch">
                 <View
                  flex={'1'}
                  style={styles.fullWidth}
                  alignItems={'center'}
                  justify={'center'}>
                  <Loading isLoading size={'large'} showPlainLoading />
                </View>
            </ImageBackground>
          )}
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
            <Button onPress={viewModel.onReWatch} disable={!canRewatch} style={{width:"100%", alignItems:"center"}}>
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
