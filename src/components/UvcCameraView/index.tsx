import React, {useMemo, useState} from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  requireNativeComponent,
} from 'react-native';

const DEFAULT_CAMERA_ASPECT_RATIO = 16 / 9;

type Props = {
  style?: any;
  children?: React.ReactNode;
  sourceAspectRatio?: number;
};

type PreviewLayout = {
  width: number;
  height: number;
};

const NativeUvcCameraView = requireNativeComponent<any>('UvcCameraView');

const buildCoverStyle = (layout: PreviewLayout, sourceAspectRatio: number) => {
  if (layout.width <= 0 || layout.height <= 0) {
    return styles.nativeFill;
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

const UvcCameraView = ({
  style,
  children,
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

  return (
    <View
      style={[styles.wrapper, style]}
      onLayout={onLayout}
      collapsable={false}>
      <NativeUvcCameraView style={coverStyle} />
      <View
        pointerEvents="none"
        renderToHardwareTextureAndroid
        style={styles.overlay}>
        {children}
      </View>
    </View>
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
  nativeFill: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default UvcCameraView;
