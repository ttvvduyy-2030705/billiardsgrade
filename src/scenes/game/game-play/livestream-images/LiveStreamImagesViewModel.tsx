import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {captureRef} from 'react-native-view-shot';
import AsyncStorage from '@react-native-community/async-storage';
import RNFS from 'react-native-fs';

import {
  LIVESTREAM_IMAGE_BOTTOM_LEFT,
  LIVESTREAM_IMAGE_BOTTOM_RIGHT,
  LIVESTREAM_IMAGE_TOP_LEFT,
  LIVESTREAM_IMAGE_TOP_RIGHT,
  WEBCAM_BASE_CAMERA_FOLDER,
} from 'constants/webcam';
import {keys} from 'configuration/keys';
import {PlayerSettings} from 'types/player';
import {GameSettings} from 'types/settings';

export interface Props {
  currentPlayerIndex: number;
  countdownTime?: number;
  gameSettings?: GameSettings;
  playerSettings?: PlayerSettings;
}

const LiveStreamImagesViewModel = (props: Props) => {
  const topLeftRef = useRef(null);
  const topRightRef = useRef(null);
  const bottomLeftRef = useRef(null);
  const bottomRightRef = useRef(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [topLeftImages, setTopLeftImages] = useState<string[]>([]);
  const [topRightImages, setTopRightImages] = useState<string[]>([]);
  const [bottomLeftImages, setBottomLeftImages] = useState<string[]>([]);
  const [bottomRightImages, setBottomRightImages] = useState<string[]>([]);

  const captureImage = useCallback(
    (ref: React.MutableRefObject<null>, imagePath: string) => {
      if (
        !ref.current ||
        !props.playerSettings ||
        props.playerSettings.playingPlayers.length > 2
      ) {
        return;
      }

      captureRef(ref, {
        format: 'png',
        quality: 0.01,
        width: 256,
        height: 128,
      })
        .then(
          async uri => {
            const matchImagePath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${imagePath}`;
            const _path = uri.slice(7);

            RNFS.copyFile(_path, matchImagePath);
          },
          error => console.error('Oops, match info failed', error),
        )
        .catch(e => {
          if (__DEV__) {
            console.log('Capture match info error', e);
          }
        });
    },
    [props.playerSettings],
  );

  useEffect(() => {
    AsyncStorage.multiGet([
      keys.SHOW_THUMBNAILS_ON_LIVESTREAM,
      keys.THUMBNAILS_TOP_LEFT,
      keys.THUMBNAILS_TOP_RIGHT,
      keys.THUMBNAILS_BOTTOM_LEFT,
      keys.THUMBNAILS_BOTTOM_RIGHT,
    ]).then(result => {
      if (!result) {
        return null;
      }

      const showOnLiveStream =
        typeof result[0][1] === 'string'
          ? result[0][1] === '1'
            ? true
            : false
          : true;

      if (!showOnLiveStream) {
        return;
      }

      const thumbnailsTopLeft: string[] = result[1][1]
        ? JSON.parse(result[1][1])
        : [];
      const thumbnailsTopRight: string[] = result[2][1]
        ? JSON.parse(result[2][1])
        : [];
      const thumbnailsBottomLeft: string[] = result[3][1]
        ? JSON.parse(result[3][1])
        : [];
      const thumbnailsBottomRight: string[] = result[4][1]
        ? JSON.parse(result[4][1])
        : [];

      setTopLeftImages(thumbnailsTopLeft);
      setTopRightImages(thumbnailsTopRight);
      setBottomLeftImages(thumbnailsBottomLeft);
      setBottomRightImages(thumbnailsBottomRight);

      const timeout = setTimeout(() => {
        setIsLoading(false);
        clearTimeout(timeout);
      }, 2000);
    });
  }, []);

  useEffect(() => {
    if (
      !topLeftRef.current ||
      isLoading ||
      !props.playerSettings ||
      props.playerSettings.playingPlayers.length > 2
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      captureImage(topLeftRef, LIVESTREAM_IMAGE_TOP_LEFT);
      clearTimeout(timeout);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, topLeftImages]);

  useEffect(() => {
    if (
      !topRightRef.current ||
      isLoading ||
      !props.playerSettings ||
      props.playerSettings.playingPlayers.length > 2
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      captureImage(topRightRef, LIVESTREAM_IMAGE_TOP_RIGHT);
      clearTimeout(timeout);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, topRightImages]);

  useEffect(() => {
    if (
      !bottomLeftRef.current ||
      isLoading ||
      !props.playerSettings ||
      props.playerSettings.playingPlayers.length > 2
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      captureImage(bottomLeftRef, LIVESTREAM_IMAGE_BOTTOM_LEFT);
      clearTimeout(timeout);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, bottomLeftImages]);

  useEffect(() => {
    if (
      !bottomRightRef.current ||
      isLoading ||
      !props.playerSettings ||
      props.playerSettings.playingPlayers.length > 2
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      captureImage(bottomRightRef, LIVESTREAM_IMAGE_BOTTOM_RIGHT);
      clearTimeout(timeout);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, bottomRightImages]);

  return useMemo(() => {
    return {
      topLeftRef,
      topRightRef,
      bottomLeftRef,
      bottomRightRef,
      topLeftImages,
      topRightImages,
      bottomLeftImages,
      bottomRightImages,
    };
  }, [
    topLeftRef,
    topRightRef,
    bottomLeftRef,
    bottomRightRef,
    topLeftImages,
    topRightImages,
    bottomLeftImages,
    bottomRightImages,
  ]);
};

export default LiveStreamImagesViewModel;
