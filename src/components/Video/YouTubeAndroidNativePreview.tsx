import React, {useEffect, useMemo, useState} from 'react';
import {
  LayoutChangeEvent,
  Platform,
  requireNativeComponent,
  StyleProp,
  StyleSheet,
  View as RNView,
  ViewStyle,
} from 'react-native';
import {addYouTubeCameraStreamListener} from 'services/youtubeCameraStream';

const DEFAULT_CAMERA_ASPECT_RATIO = 16 / 9;

type Props = {
  active: boolean;
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onError?: (message: string) => void;
  sourceAspectRatio?: number;
};

type PreviewLayout = {
  width: number;
  height: number;
};

const NativeYouTubeCameraView =
  Platform.OS === 'android'
    ? requireNativeComponent<{active: boolean; style?: StyleProp<ViewStyle>}>('YouTubeCameraView')
    : null;

const buildCoverStyle = (layout: PreviewLayout, sourceAspectRatio: number) => {
  if (layout.width <= 0 || layout.height <= 0) {
    return styles.coverFill;
  }

  const safeAspectRatio =
    Number.isFinite(sourceAspectRatio) && sourceAspectRatio > 0
      ? sourceAspectRatio
      : DEFAULT_CAMERA_ASPECT_RATIO;
  const containerAspectRatio = layout.width / layout.height;

  if (containerAspectRatio > safeAspectRatio) {
    const coverHeight = layout.width / safeAspectRatio;
    return {
      position: 'absolute' as const,
      left: 0,
      top: (layout.height - coverHeight) / 2,
      width: layout.width,
      height: coverHeight,
    };
  }

  const coverWidth = layout.height * safeAspectRatio;
  return {
    position: 'absolute' as const,
    left: (layout.width - coverWidth) / 2,
    top: 0,
    width: coverWidth,
    height: layout.height,
  };
};

const YouTubeAndroidNativePreview = ({
  active,
  style,
  onReady,
  onError,
  sourceAspectRatio = DEFAULT_CAMERA_ASPECT_RATIO,
}: Props) => {
  const [layout, setLayout] = useState<PreviewLayout>({width: 0, height: 0});

  const coverStyle = useMemo(
    () => buildCoverStyle(layout, sourceAspectRatio),
    [layout.height, layout.width, sourceAspectRatio],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setLayout(previous => {
      if (previous.width === width && previous.height === height) {
        return previous;
      }

      return {width, height};
    });
  };

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

  return (
    <RNView
      style={[styles.wrapper, style]}
      onLayout={onLayout}
      collapsable={false}>
      <NativeYouTubeCameraView active={active} style={coverStyle} />
    </RNView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  coverFill: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default YouTubeAndroidNativePreview;
