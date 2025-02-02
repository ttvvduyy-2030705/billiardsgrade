import React, {memo, useMemo, forwardRef, useState, useEffect, RefObject, useRef} from 'react';
import {Video, VideoRef} from 'react-native-video';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import RNAnimated from 'react-native-reanimated';
import Loading from 'components/Loading';
import View from 'components/View';
import VideoViewModel, {Props} from './VideoViewModel';
import styles from './styles';
import colors from 'configuration/colors';
import { WEBCAM_SELECTED_VIDEO_TRACK } from 'constants/webcam';
import { Fps, WebcamType } from 'types/webcam';
import { PinchGestureHandler } from 'react-native-gesture-handler';
import { Dimensions, ImageBackground, Text, ToastAndroid } from 'react-native';
import images from 'assets';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';

const AplusVideo = (props: Props, ref: React.LegacyRef<VideoRef>) => {
  const showToast = () => {
    ToastAndroid.show('Camera không trợ zoom!', ToastAndroid.SHORT);
  };
  const viewModel = VideoViewModel(props);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const device = useCameraDevice('front');

  const [zoom, setZoom] = useState(0); // Initial zoom level
  const maxZoom = device?.maxZoom ?? 1;

  const handlePinchGesture = (event: any) => {
    if (device) {
      const newZoom = Math.min(Math.max(zoom + (event.nativeEvent.scale - 1) * 0.05, 0), maxZoom); // Adjust zoom
      setZoom(newZoom);
    }
  };
  
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } }
  ])



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
            onInitialized={() => setIsCameraReady(true)} // ✅ Set the camera as ready
            /> ): (
              <ImageBackground
                source={images.logoPhuQuoc} // Replace with your image URL or local asset
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
