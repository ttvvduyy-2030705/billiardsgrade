import React, {useEffect} from 'react';
import {Platform, requireNativeComponent, StyleSheet} from 'react-native';

import View from 'components/View';
import {
  getYouTubeNativeZoomInfo,
  isYouTubeNativePreviewViewAvailable,
  prepareYouTubeNativePreview,
  setYouTubeNativeZoom,
  switchYouTubeNativeCamera,
} from 'services/youtubeNativeLive';

const getNativePreviewComponent = () => {
  if (Platform.OS !== 'android') {
    return null;
  }

  if (!isYouTubeNativePreviewViewAvailable()) {
    console.log('[YouTube Live] fallback reason=native preview view manager missing');
    return null;
  }

  try {
    return requireNativeComponent<any>('YouTubeLivePreviewView');
  } catch (error) {
    console.log('[YouTube Live] fallback reason=requireNativeComponent failed', error);
    return null;
  }
};

const NativePreview = getNativePreviewComponent();

type Props = {
  controllerRef?: React.MutableRefObject<any>;
  setIsCameraReady: (isReady: boolean) => void;
  sourceType?: 'phone' | 'webcam';
  cameraFacing?: 'front' | 'back';
};

const YouTubeAndroidLivePreview = ({
  controllerRef,
  setIsCameraReady,
  sourceType = 'phone',
  cameraFacing = 'back',
}: Props) => {
  useEffect(() => {
    console.log('[YouTube Live] native preview mount requested', {
      sourceType,
      cameraFacing,
    });
    let mounted = true;
    const timer = setTimeout(() => {
      prepareYouTubeNativePreview(cameraFacing, sourceType)
        .then(async () => {
          console.log('[YouTube Live] native preview prepared', {
            sourceType,
            cameraFacing,
          });
          if (mounted) {
            setIsCameraReady(true);
          }
          if (controllerRef?.current?.refreshZoomInfo) {
            await controllerRef.current.refreshZoomInfo();
          }
        })
        .catch(error => {
          console.log('[YouTube Live] fallback reason=native preview prepare failed', error);
          console.log('[YouTubeNativePreview] prepare failed:', error);
          if (mounted) {
            setIsCameraReady(false);
          }
        });
    }, 250);

    if (controllerRef) {
      const controller = {
        zoomInfo: {
          supported: false,
          minZoom: 1,
          maxZoom: 1,
          zoom: 1,
          source: 'back',
        },
        refreshZoomInfo: async () => {
          controller.zoomInfo = await getYouTubeNativeZoomInfo();
          return controller.zoomInfo;
        },
        setZoom: async (value: number) => {
          const applied = await setYouTubeNativeZoom(value);
          controller.zoomInfo = {
            ...(await getYouTubeNativeZoomInfo()),
            zoom: typeof applied === 'number' ? applied : value,
          };
          return typeof applied === 'number' ? applied : value;
        },
        getZoomInfo: () => {
          return controller.zoomInfo;
        },
        switchCamera: async () => {
          await switchYouTubeNativeCamera();
          controller.zoomInfo = await getYouTubeNativeZoomInfo();
          return true;
        },
      };
      controllerRef.current = controller;
    }

    return () => {
      console.log('[YouTube Live] native preview unmount');
      mounted = false;
      clearTimeout(timer);
      if (controllerRef) {
        controllerRef.current = null;
      }
      setIsCameraReady(false);
    };
  }, [cameraFacing, controllerRef, setIsCameraReady, sourceType]);

  if (!NativePreview) {
    console.log('[YouTube Live] fallback reason=native preview view is not mounted');
    return <View style={styles.fallback} />;
  }

  return <NativePreview style={styles.fill} />;
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default YouTubeAndroidLivePreview;
