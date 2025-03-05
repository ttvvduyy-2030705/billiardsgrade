import React, {memo, useMemo, forwardRef, useState, useEffect, RefObject, useRef} from 'react';
import {Orientation, Video, VideoRef} from 'react-native-video';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import RNAnimated, { runOnJS, runOnUI } from 'react-native-reanimated';
import Loading from 'components/Loading';
import View from 'components/View';
import VideoViewModel, {Props} from './VideoViewModel';
import styles from './styles';
import colors from 'configuration/colors';
import { WEBCAM_SELECTED_VIDEO_TRACK } from 'constants/webcam';
import { Fps, WebcamType } from 'types/webcam';
import { PinchGestureHandler } from 'react-native-gesture-handler';
import {  ImageBackground, ToastAndroid } from 'react-native';
import images from 'assets';
import { Camera, Frame, useCameraDevice, useCameraFormat, useFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera';
import { Worklets }from 'react-native-worklets-core';

const AplusVideo = (props: Props, ref: React.LegacyRef<VideoRef>) => {
  const showToast = () => {
    ToastAndroid.show('Camera không trợ zoom!', ToastAndroid.SHORT);
  };
  const viewModel = VideoViewModel(props);

  const device = useCameraDevice('front');

 // console.log("device" + JSON.stringify(device));

  const [zoom, setZoom] = useState(0); // Initial zoom level
  const maxZoom = device?.maxZoom ?? 1;

  const handlePinchGesture = (event: any) => {
    if (device) {
      const newZoom = Math.min(Math.max(zoom + (event.nativeEvent.scale - 1) * 0.05, 0), maxZoom); // Adjust zoom
      setZoom(newZoom);
    }
  };

  const processFrame = (frame: any) => {
    // Here, you can apply AI processing, filters, etc.g

    console.log('Frame received:', frame);
  };

  const processFrameJS = Worklets.createRunOnJS(processFrame);

  const frameProcessor = useFrameProcessor((frame: Frame) => {
    'worklet';
    //console.log(`Processing frame: ${frame.width}x${frame.height}`);
    //runOnJS(processFrameJS)
  }, []);

  const format = useCameraFormat(device, [
    { videoResolution: { width: 2550, height: 1440 } }
  ])

  return (
    <GestureDetector  gesture={viewModel.gestureComposed}>
      <RNAnimated.View style={[styles.container, viewModel.animatedStyles]}>
        <PinchGestureHandler onGestureEvent={handlePinchGesture}>
            { device ? ( <Camera
            ref={props.cameraRef}
            style={styles.webcam}
            device={device!}
            isActive={true}
            video={true}
            format={format}
            zoom={zoom}
            videoStabilizationMode="standard"
            enableZoomGesture={true}
            //enableFpsGraph={true}
            //frameProcessor={frameProcessor}
            //outputOrientation='preview'
            fps={30}
            enableDepthData
            pixelFormat="yuv"
            onInitialized={() => props.setIsCameraReady(true)} // ✅ Set the camera as ready
            onStopped={() => props.setIsCameraReady(false)}
            onStarted={() => props.setIsCameraReady(true)}
            /> ): (
              <ImageBackground
                source={images.logoclb} // Replace with your image URL or local asset
                style={styles.background}
                resizeMode="stretch">
                </ImageBackground>
            ) }
          </PinchGestureHandler>
     </RNAnimated.View>
    </GestureDetector>
  );
};

export default memo(forwardRef(AplusVideo));
