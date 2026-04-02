import React, {memo} from 'react';
import {Image, StyleSheet, View} from 'react-native';

export type ThumbnailOverlayData = {
  enabled: boolean;
  topLeft: string[];
  topRight: string[];
  bottomLeft: string[];
  bottomRight: string[];
};

type Props = {
  data: ThumbnailOverlayData;
  fullscreen?: boolean;
};

const renderGroup = (
  images: string[],
  positionStyle: any,
  fullscreen: boolean,
) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.slot, positionStyle]}>
      {images.map((uri, index) => (
        <Image
          key={`${uri}-${index}`}
          source={{uri}}
          style={[styles.image, fullscreen && styles.imageFullscreen]}
          resizeMode="contain"
        />
      ))}
    </View>
  );
};

const ThumbnailOverlay = ({data, fullscreen = false}: Props) => {
  if (!data?.enabled) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {renderGroup(data.topLeft, styles.topLeft, fullscreen)}
      {renderGroup(data.topRight, styles.topRight, fullscreen)}
      {renderGroup(data.bottomLeft, styles.bottomLeft, fullscreen)}
      {renderGroup(data.bottomRight, styles.bottomRight, fullscreen)}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    elevation: 8,
  },
  slot: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '42%',
  },
  topLeft: {
    top: 12,
    left: 12,
  },
  topRight: {
    top: 12,
    right: 12,
    justifyContent: 'flex-end',
  },
  bottomLeft: {
    bottom: 12,
    left: 12,
  },
  bottomRight: {
    bottom: 12,
    right: 12,
    justifyContent: 'flex-end',
  },
  image: {
    width: 92,
    height: 52,
    marginRight: 8,
  },
  imageFullscreen: {
    width: 150,
    height: 84,
    marginRight: 10,
  },
});

export default memo(ThumbnailOverlay);
