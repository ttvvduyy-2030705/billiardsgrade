import React, {memo, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  NativeEventEmitter,
  NativeModules,
  Pressable,
  ScrollView,
} from 'react-native';
import Container from 'components/Container';
import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import Loading from 'components/Loading';
import Image from 'components/Image';
import images from 'assets';
import i18n from 'i18n';
import {goBack} from 'utils/navigation';
import {showEditor, listFiles, deleteFile} from 'react-native-video-trim';
import RNFS from 'react-native-fs';

const {HttpServer} = NativeModules;

import {WEBCAM_SELECTED_VIDEO_TRACK} from 'constants/webcam';

import PlayBackWebcamViewModel, {
  PlayBackWebcamViewModelProps,
} from './PlayBackViewModel';
import styles from './styles';
import Slider from '@react-native-community/slider';
import VideoListItem from './videoListItem';
import QRCode from 'react-native-qrcode-svg';
import {NetworkInfo} from 'react-native-network-info';
import {
  Gesture,
  GestureDetector,
  PinchGestureHandler,
} from 'react-native-gesture-handler';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {Video} from 'react-native-video';
import {ReactNativeZoomableView} from '@openspacelabs/react-native-zoomable-view';

const PlayBackWebcam = (props: PlayBackWebcamViewModelProps) => {
  const viewModel = PlayBackWebcamViewModel(props);

  const folder = `${RNFS.DownloadDirectoryPath}/${props.webcamFolderName}`;

  const [playbackRate, setPlaybackRate] = useState(1.0); // Default speed is 1.0 (normal)

  const [ip, setIp] = useState('');
  const [fileUrl, setFileUrl] = useState<string>();

  useEffect(() => {
    NetworkInfo.getIPAddress().then(ipAddress => {
      if (ipAddress) {
        setIp(ipAddress);
      }
    });
  }, []);

  useEffect(() => {
    if (viewModel.videoFiles.length > 0) {
      startServer(viewModel.videoFiles[0].path);
    }
  }, [viewModel.videoFiles]);

  const startServer = async (filePath: string) => {
    try {
      stopServer();

      const url = await HttpServer.startServer(filePath);

      console.log(url);

      setFileUrl(`http://${ip}:8000` + filePath);
    } catch (error: any) {
      //Alert.alert("Error", error);
    }
  };

  const stopServer = async () => {
    try {
      await HttpServer.stopServer();
      setFileUrl('');
    } catch (error: any) {
      //Alert.alert("Error", error);
    }
  };

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

  const onPress = async (index: number, path: string) => {
    viewModel.setCurrentIndex(index);
    await startServer(path);
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop();
  };

  const scale = useSharedValue(1); // Default scale
  const doubleTapZoom = 2; // Zoom level for double-tap
  const maxZoom = 128; // Max pinch zoom level
  const minZoom = 1; // Minimum zoom level

  // Pinch Gesture for Smooth Zooming
  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      scale.value = Math.max(minZoom, Math.min(event.scale, maxZoom)); // Clamp zoom level

      console.log('pinch', scale.value);
    })
    .onEnd(() => {
      if (scale.value < minZoom) {
        scale.value = withSpring(minZoom); // Reset to default zoom if too small
      }
    });
  // Double Tap Gesture for Quick Zoom In/Out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value =
        scale.value === 1 ? withSpring(doubleTapZoom) : withSpring(1);
    });

  // Apply Animated Zoom Effect
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.VideoTrim);
    const subscription = eventEmitter.addListener('VideoTrim', async event => {
      switch (event.name) {
        case 'onLoad': {
          // on media loaded successfully
          console.log('onLoadListener', event);
          break;
        }
        case 'onShow': {
          console.log('onShowListener', event);
          break;
        }
        case 'onHide': {
          console.log('onHide', event);
          break;
        }
        case 'onStartTrimming': {
          console.log('onStartTrimming', event);
          break;
        }
        case 'onFinishTrimming': {
          console.log('onFinishTrimming', event);

          var files = await listFiles();
          for (let index = 0; index < files.length; index++) {
            try {
              const fileName = getFileName(files[index]);

              await RNFS.moveFile(files[index], folder + '/' + fileName);
              console.log('Video saved to:', files[index]);

              await deleteFile(files[index]);
            } catch (error) {
              console.error('Error saving video:', error);
            }
          }

          viewModel.loadFiles();

          break;
        }
        case 'onCancelTrimming': {
          console.log('onCancelTrimming', event);
          break;
        }
        case 'onCancel': {
          console.log('onCancel', event);
          break;
        }
        case 'onError': {
          console.log('onError', event);
          break;
        }
        case 'onLog': {
          console.log('onLog', event);
          break;
        }
        case 'onStatistics': {
          console.log('onStatistics', event);
          break;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // get screen width and height
  let {width, height} = Dimensions.get('window');

  //video width assume your video dimension is 16:9
  const getVideoWidth = () => {
    return Math.floor(width);
  };

  //video height, assume your video dimension is 16:9
  const getVideoHeight = () => {
    return Math.floor((9 * Math.floor(width)) / 16);
  };

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
          <View flex={'1'} style={{alignItems: 'center'}}>
            {viewModel.videoFiles.length > 0 ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{height: 300}}>
                {viewModel.videoFiles.map((item, index) => (
                  <VideoListItem
                    key={index}
                    time={item.mtime?.toLocaleTimeString()}
                    path={item.path}
                    onPress={() => onPress(index, item.path)}
                    index={index}
                    currentIndex={viewModel.currentIndex}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text lineHeight={15}>No video!</Text>
            )}

            {fileUrl ? <QRCode value={fileUrl} size={100} /> : ''}

            <Text style={styles.label}>
              {i18n.t('txtTocDoXem')}: {playbackRate.toFixed(2)}x
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={0.25}
              maximumValue={2.0}
              step={0.25}
              value={playbackRate}
              onValueChange={(value: React.SetStateAction<number>) =>
                setPlaybackRate(value)
              }
            />
          </View>

          <Button style={styles.buttonBack} onPress={goBack}>
            <View direction={'row'} alignItems={'center'}>
              <Image source={images.back} style={styles.iconBack} />
              <Text lineHeight={15}>{i18n.t('txtBack')}</Text>
            </View>
          </Button>
        </View>

        <View flex={'1'} style={styles.webcamContainer}>
          {viewModel.isLoading ? (
            <View style={styles.webcam}>{WEBCAM_LOADER}</View>
          ) : viewModel.videoFiles.length > 0 ? (
            <>
              <GestureDetector gesture={pinchGesture}>
                <Animated.View style={[styles.webcam, animatedStyle]}>
                  <ReactNativeZoomableView
                    maxZoom={40}
                    minZoom={1}
                    zoomStep={0.5}
                    initialZoom={1}
                    bindToBorders={true}
                    doubleTapZoomToCenter={true}
                    disablePanOnInitialZoom={true}
                    panBoundaryPadding={0}
                    movementSensibility={3}
                    contentHeight={getVideoHeight()}
                    contentWidth={getVideoWidth()}>
                    <Video
                      resizeMode="contain" // Ensure it scales correctly
                      id={'webcam-billiards-playback'}
                      ref={viewModel.videoRef}
                      style={[styles.webcam]}
                      controls={true}
                      source={{
                        uri:
                          viewModel.videoFiles.length > 0
                            ? viewModel.videoFiles[viewModel.currentIndex].path
                            : '',
                      }}
                      selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
                      onError={viewModel.onWebcamError}
                      renderLoader={WEBCAM_LOADER}
                      rate={playbackRate}
                      onLoad={viewModel.handleLoad}
                      onProgress={viewModel.handleProgress}
                      onEnd={viewModel.handleNext}
                      controlsStyles={{
                        hideNext: true,
                        hidePrevious: true,
                        hideForward: true,
                        hideRewind: true,
                        hideDuration: false,
                        hideSettingButton: false,
                        hidePosition: false,
                      }}
                    />
                  </ReactNativeZoomableView>
                </Animated.View>
              </GestureDetector>
            </>
          ) : (
            <View style={styles.webcam} />
          )}
        </View>

        {viewModel.videoFiles.length > 0 ? (
          <Button
            style={styles.buttonShare}
            onPress={() => {
              showEditor(viewModel.videoFiles[viewModel.currentIndex].path, {
                //maxDuration: viewModel.videoDurations,
                type: 'video',
                outputExt: 'mov',
                trimmingText: i18n.t('trimmingText'),
                cancelTrimmingDialogMessage: i18n.t(
                  'cancelTrimmingDialogMessage',
                ),
                cancelTrimmingButtonText: i18n.t('cancelTrimmingButtonText'),
                saveDialogConfirmText: i18n.t('saveDialogConfirmText'),
                saveDialogTitle: i18n.t('saveDialogTitle'),
                saveButtonText: i18n.t('saveButtonText'),
                saveDialogMessage: i18n.t('saveDialogMessage'),
                cancelDialogConfirmText: i18n.t('cancelDialogConfirmText'),
                openDocumentsOnFinish: false,
                cancelButtonText: i18n.t('cancelButtonText'),
                cancelTrimmingDialogCancelText: i18n.t(
                  'cancelTrimmingDialogCancelText',
                ),
                cancelDialogCancelText: i18n.t('cancelDialogCancelText'),
                cancelDialogMessage: i18n.t('cancelDialogMessage'),
              });
            }}>
            <Image source={images.videoEditor} style={styles.iconShare} />
          </Button>
        ) : (
          <View></View>
        )}
      </View>
    </Container>
  );
};

export default memo(PlayBackWebcam);
