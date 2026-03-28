import React, {useEffect} from 'react';
import {Platform, requireNativeComponent, StyleSheet} from 'react-native';

import View from 'components/View';
import {
  getYouTubeNativeZoomInfo,
  prepareYouTubeNativePreview,
  setYouTubeNativeZoom,
  switchYouTubeNativeCamera,
} from 'services/youtubeNativeLive';

const NativePreview =
  Platform.OS === 'android'
    ? requireNativeComponent<any>('YouTubeLivePreviewView')
    : null;

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
    let mounted = true;
    const timer = setTimeout(() => {
      prepareYouTubeNativePreview(cameraFacing, sourceType)
        .then(async () => {
          if (mounted) {
            setIsCameraReady(true);
          }
          if (controllerRef?.current?.refreshZoomInfo) {
            await controllerRef.current.refreshZoomInfo();
          }
        })
        .catch(error => {
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
      mounted = false;
      clearTimeout(timer);
      if (controllerRef) {
        controllerRef.current = null;
      }
      setIsCameraReady(false);
    };
  }, [cameraFacing, controllerRef, setIsCameraReady, sourceType]);

  if (!NativePreview) {
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
