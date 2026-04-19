import React, {memo, useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Image, StyleSheet, View} from 'react-native';
import {shouldShowMatchOverlay} from 'utils/matchOverlay';

export interface Props {
  currentPlayerIndex: number;
  countdownTime?: number;
  gameSettings?: any;
  playerSettings?: any;
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

  if (!shouldShowMatchOverlay(props.gameSettings, props.playerSettings)) {
    return null;
  }

  const renderImageList = (imageList: string[]) => {
    if (!imageList || imageList.length === 0) {
      return null;
    }

    return imageList.map((image, index) => (
      <Image
        key={`${index}`}
        source={{uri: image}}
        style={styles.image}
        resizeMode="contain"
      />
    ));
  };

  return (
    <>
      <View pointerEvents="none" style={[styles.slot, styles.topLeft]}>
        {renderImageList(topLeftImages)}
      </View>

      <View pointerEvents="none" style={[styles.slot, styles.topRight]}>
        {renderImageList(topRightImages)}
      </View>

      <View pointerEvents="none" style={[styles.slot, styles.bottomLeft]}>
        {renderImageList(bottomLeftImages)}
      </View>

      <View pointerEvents="none" style={[styles.slot, styles.bottomRight]}>
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
  topRight: {
    top: 8,
    right: 8,
  },
  bottomLeft: {
    bottom: 8,
    left: 8,
  },
  bottomRight: {
    bottom: 8,
    right: 8,
  },
  image: {
    width: 120,
    height: 70,
  },
});

export default memo(LiveStreamImages);
