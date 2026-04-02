import React, {useEffect} from 'react';
import {Platform, requireNativeComponent, StyleProp, ViewStyle} from 'react-native';
import {addYouTubeCameraStreamListener} from 'services/youtubeCameraStream';

type Props = {
  active: boolean;
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onError?: (message: string) => void;
};

const NativeYouTubeCameraView =
  Platform.OS === 'android'
    ? requireNativeComponent<{active: boolean; style?: StyleProp<ViewStyle>}>('YouTubeCameraView')
    : null;

const YouTubeAndroidNativePreview = ({active, style, onReady, onError}: Props) => {
  useEffect(() => {
    const readySub = addYouTubeCameraStreamListener('preview_ready', () => {
      onReady?.();
    });

    const errorSub = addYouTubeCameraStreamListener('preview_error', payload => {
      onError?.(String(payload?.message ?? 'Native preview lỗi.'));
    });

    const streamErrorSub = addYouTubeCameraStreamListener('stream_error', payload => {
      onError?.(String(payload?.message ?? 'Native stream lỗi.'));
    });

    return () => {
      readySub.remove();
      errorSub.remove();
      streamErrorSub.remove();
    };
  }, [onError, onReady]);

  if (Platform.OS !== 'android' || !NativeYouTubeCameraView) {
    return null;
  }

  return <NativeYouTubeCameraView active={active} style={style} />;
};

export default YouTubeAndroidNativePreview;
