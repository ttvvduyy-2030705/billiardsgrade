import React, {memo, useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Image, StyleSheet, View} from 'react-native';

export interface Props {
  currentPlayerIndex: number;
  countdownTime?: number;
  gameSettings?: any;
  playerSettings?: any;
  variant?: 'embedded' | 'fullscreen';
  compact?: boolean;
}

const STORAGE_KEYS = {
  THUMBNAILS_TOP_LEFT: 'ThumbnailsTopLeft',
  THUMBNAILS_TOP_RIGHT: 'ThumbnailsTopRight',
  THUMBNAILS_BOTTOM_LEFT: 'ThumbnailsBottomLeft',
  THUMBNAILS_BOTTOM_RIGHT: 'ThumbnailsBottomRight',
};

const safeParse = (value?: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }

    if (typeof parsed === 'string' && parsed.length > 0) {
      return [parsed];
    }

    return [];
  } catch (error) {
    console.log('[LiveStreamImages] parse error:', error);
    return [];
  }
};

const LiveStreamImages = (props: Props) => {
  const [topLeftImages, setTopLeftImages] = useState<string[]>([]);
  const [topRightImages, setTopRightImages] = useState<string[]>([]);
  const [bottomLeftImages, setBottomLeftImages] = useState<string[]>([]);
  const [bottomRightImages, setBottomRightImages] = useState<string[]>([]);

  const loadImages = useCallback(async () => {
    try {
      const result = await AsyncStorage.multiGet([
        STORAGE_KEYS.THUMBNAILS_TOP_LEFT,
        STORAGE_KEYS.THUMBNAILS_TOP_RIGHT,
        STORAGE_KEYS.THUMBNAILS_BOTTOM_LEFT,
        STORAGE_KEYS.THUMBNAILS_BOTTOM_RIGHT,
      ]);

      setTopLeftImages(safeParse(result[0]?.[1]).slice(0, 1));
      setTopRightImages(safeParse(result[1]?.[1]).slice(0, 1));
      setBottomLeftImages(safeParse(result[2]?.[1]).slice(0, 1));
      setBottomRightImages(safeParse(result[3]?.[1]).slice(0, 1));
    } catch (error) {
      console.log('[LiveStreamImages] load storage error:', error);
    }
  }, []);

  useEffect(() => {
    loadImages();
    const interval = setInterval(loadImages, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [loadImages]);

  if (!props.playerSettings || props.playerSettings.playingPlayers?.length > 2) {
    return null;
  }

  const isFullscreen = props.variant === 'fullscreen';
  const useCompactLayout = !!props.compact && !isFullscreen;

  const renderImageList = (imageList: string[]) => {
    if (!imageList || imageList.length === 0) {
      return null;
    }

    return imageList.map((image, index) => (
      <Image
        key={`${index}`}
        source={{uri: image}}
        style={[
          styles.image,
          useCompactLayout && styles.imageCompact,
          isFullscreen && styles.imageFullscreen,
        ]}
        resizeMode="contain"
      />
    ));
  };

  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.slot, styles.topLeft, useCompactLayout && styles.topLeftCompact]}>
        {renderImageList(topLeftImages)}
      </View>

      <View
        pointerEvents="none"
        style={[styles.slot, styles.topRight, useCompactLayout && styles.topRightCompact]}>
        {renderImageList(topRightImages)}
      </View>

      <View
        pointerEvents="none"
        style={[
          styles.slot,
          styles.bottomLeft,
          useCompactLayout && styles.bottomLeftCompact,
        ]}>
        {renderImageList(bottomLeftImages)}
      </View>

      <View
        pointerEvents="none"
        style={[
          styles.slot,
          styles.bottomRight,
          useCompactLayout && styles.bottomRightCompact,
        ]}>
        {renderImageList(bottomRightImages)}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  topLeft: {
    top: 8,
    left: 8,
  },
  topLeftCompact: {
    top: 4,
    left: 4,
  },
  topRight: {
    top: 8,
    right: 8,
  },
  topRightCompact: {
    top: 4,
    right: 4,
  },
  bottomLeft: {
    bottom: 8,
    left: 8,
  },
  bottomLeftCompact: {
    bottom: 4,
    left: 4,
  },
  bottomRight: {
    bottom: 8,
    right: 8,
  },
  bottomRightCompact: {
    bottom: 4,
    right: 4,
  },
  image: {
    width: 120,
    height: 70,
  },
  imageCompact: {
    width: 78,
    height: 44,
  },
  imageFullscreen: {
    width: 150,
    height: 88,
  },
});

export default memo(LiveStreamImages);
