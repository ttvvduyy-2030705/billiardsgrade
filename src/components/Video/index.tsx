import React, {memo, useMemo, forwardRef, useState} from 'react';
import {Video, VideoRef} from 'react-native-video';
import {GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import RNAnimated from 'react-native-reanimated';
import Loading from 'components/Loading';
import View from 'components/View';
import VideoViewModel, {Props} from './VideoViewModel';
import { Camera, useCameraDevices, useCameraFormat } from 'react-native-vision-camera';
import styles from './styles';
import colors from 'configuration/colors';
import { WEBCAM_SELECTED_VIDEO_TRACK } from 'constants/webcam';
import { WebcamType } from 'types/webcam';
import { PinchGestureHandler } from 'react-native-gesture-handler';
import { Dimensions, ToastAndroid } from 'react-native';


const { width, height } = Dimensions.get('window');

const AplusVideo = (props: Props, ref: React.LegacyRef<VideoRef>) => {
  const showToast = () => {
    ToastAndroid.show('Camera không trợ zoom!', ToastAndroid.SHORT);
  };
  const viewModel = VideoViewModel(props);
  const devices = useCameraDevices();

  const [zoom, setZoom] = useState(0); // Initial zoom level
  const maxZoom = devices[0]?.maxZoom ?? 1;

  const format = useCameraFormat(devices[0], [
    { videoResolution: { width: 1280, height: 720 } }
  ])

  const handlePinchGesture = (event: any) => {
    if (devices[0]) {
      const newZoom = Math.min(Math.max(zoom + (event.nativeEvent.scale - 1) * 0.05, 0), maxZoom); // Adjust zoom
      setZoom(newZoom);
    }
  };

  const handleTapToFocus = async (event: any) => {
    if (props.cameraRef?.current) {
      const { locationX, locationY } = event.nativeEvent;
      const x = locationX / width;
      const y = locationY / height;

      try {
        await props.cameraRef?.current.focus({ x, y }); // Set focus at tapped point
        console.log(`Focused at: (${x}, ${y})`);
      } catch (error) {
        console.log('Error focusing:', error);

        showToast();
      }
    }
  };

  const WEBCAM_LOADER = useMemo(() => {
    if (props.loadingDisabled) {
      return undefined;
    }

    return (
      <View
        flex={'1'}
        style={styles.loading}
        alignItems={'center'}
        justify={'center'}>
        <Loading isLoading size={'large'} showPlainLoading />
      </View>
    );
  }, [props]);

  return (
    <GestureDetector gesture={viewModel.gestureComposed}>
      <RNAnimated.View style={[styles.container, viewModel.animatedStyles]} onTouchStart={handleTapToFocus}>
        {/* <RNVideo
          id={'webcam-billiards'}
         
          style={styles.webcam}
          source={props.source}
          selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
          shutterColor={colors.transparent}
          onReadyForDisplay={viewModel.onReadyForDisplay}
          onFullscreenPlayerDidPresent={viewModel.onFullscreenPlayerDidPresent}
          onBuffer={viewModel.onBuffer}
          onSeek={viewModel.onSeek}
          onLoad={viewModel.onLoad}
          onVideoTracks={viewModel.onVideoTracks}
          onEnd={viewModel.onEnd}
          onError={viewModel.onError}
          paused={false}
          renderLoader={WEBCAM_LOADER}
        /> */}

          {/* <Camera
            ref={props.cameraRef}
            style={styles.webcam}
            device={devices[0]}
            isActive={true}
            video={true}
            format={format}
            //frameProcessor={}
            //preview={true}
            //enableZoomGesture={true}
            // frameProcessor={handleFrame}
            />   */}
 {/* <PinchGestureHandler onGestureEvent={handlePinchGesture}>
              <Camera
              ref={props.cameraRef}
              style={styles.webcam}
              device={devices[0]}
              isActive={true}
              video={true}
              format={format}
              zoom={zoom}

              //frameProcessor={}
              //preview={true}
              //enableZoomGesture={true}
              // frameProcessor={handleFrame}
              />  
            </PinchGestureHandler> */}
            
        { viewModel.webcamType.toString() == WebcamType.camera ? (
            <PinchGestureHandler onGestureEvent={handlePinchGesture}>
              <Camera
              ref={props.cameraRef}
              style={styles.webcam}
              device={devices[0]}
              isActive={true}
              video={true}
              format={format}
              zoom={0.02}
              //frameProcessor={}
              //preview={true}
              enableZoomGesture={true}
              // frameProcessor={handleFrame}
              />  
            </PinchGestureHandler>

        ) : (
             <Video
             id={'webcam-billiards'}
             ref={ref}
             style={styles.webcam}
             source={props.source}
             selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
             shutterColor={colors.transparent}
             onReadyForDisplay={viewModel.onReadyForDisplay}
             onFullscreenPlayerDidPresent={viewModel.onFullscreenPlayerDidPresent}
             onBuffer={viewModel.onBuffer}
             onSeek={viewModel.onSeek}
             onLoad={viewModel.onLoad}
             onVideoTracks={viewModel.onVideoTracks}
             onEnd={viewModel.onEnd}
             onError={viewModel.onError}
             paused={false}
             renderLoader={WEBCAM_LOADER}
            />
        )}


{/* <Video
          source={{ uri: "file://data/user/0/com.aplus.score/cache/mrousavy7367584100780418910.mov" }}
          style={styles.video}
          controls // Enable playback controls
          resizeMode="stretch" // Ensure video fits within the view
        /> */}

        {/* {!props.isPreview ? (
          <Camera
          ref={props.cameraRef}
          style={styles.webcam}
          device={devices[0]}
          isActive={true}
          video={true}
          
          preview={true}
          enableZoomGesture={true}
          frameProcessor={handleFrame}

          />  
        ) : (

          <Video
          source={{ uri: "file:///data/user/0/com.aplus.score/cache/mrousavy7367584100780418910.mov" }}
          style={styles.video}
          controls // Enable playback controls
          resizeMode="stretch" // Ensure video fits within the view
        /> */}

        {/* )} */}
 {/* {videoUri ? (
        <Video
          source={{ uri: videoUri }}
          style={styles.video}
          controls // Enable playback controls
          resizeMode="stretch" // Ensure video fits within the view
        />
      ) : (
        <Text style={styles.errorText}>Video not found in cache!</Text>
      )} */}
     
     </RNAnimated.View>
    </GestureDetector>
  );
};

export default memo(forwardRef(AplusVideo));
