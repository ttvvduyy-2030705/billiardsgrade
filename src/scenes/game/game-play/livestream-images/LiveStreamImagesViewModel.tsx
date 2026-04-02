import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {captureRef} from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    async (ref: React.MutableRefObject<any>, imagePath: string) => {
      if (
        !ref.current ||
        !props.playerSettings ||
        props.playerSettings.playingPlayers.length > 2
      ) {
        return;
      }

      try {
        const folderPath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}`;
        const outputPath = `${folderPath}/${imagePath}`;

        const folderExists = await RNFS.exists(folderPath);
        if (!folderExists) {
          await RNFS.mkdir(folderPath);
        }

        const capturedUri = await captureRef(ref, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        const sourcePath = capturedUri.startsWith('file://')
          ? capturedUri.replace('file://', '')
          : capturedUri;

        const destinationPath = outputPath.startsWith('file://')
          ? outputPath.replace('file://', '')
          : outputPath;

        const outputExists = await RNFS.exists(destinationPath);
        if (outputExists) {
          await RNFS.unlink(destinationPath);
        }

        await RNFS.copyFile(sourcePath, destinationPath);
      } catch (error) {
        console.log('[LiveStreamImages] captureImage error:', error);
      }
    },
    [props.playerSettings],
  );

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.multiGet([
      keys.SHOW_THUMBNAILS_ON_LIVESTREAM,
      keys.THUMBNAILS_TOP_LEFT,
      keys.THUMBNAILS_TOP_RIGHT,
      keys.THUMBNAILS_BOTTOM_LEFT,
      keys.THUMBNAILS_BOTTOM_RIGHT,
    ])
      .then(result => {
        if (!isMounted) {
          return;
        }

        if (!result) {
          setIsLoading(false);
          return;
        }

        const showOnLiveStream =
          typeof result[0][1] === 'string' ? result[0][1] === '1' : true;

        if (!showOnLiveStream) {
          setTopLeftImages([]);
          setTopRightImages([]);
          setBottomLeftImages([]);
          setBottomRightImages([]);
          setIsLoading(false);
          return;
        }

        const thumbnailsTopLeft: string[] = result[1][1]
          ? JSON.parse(result[1][1] as string)
          : [];
        const thumbnailsTopRight: string[] = result[2][1]
          ? JSON.parse(result[2][1] as string)
          : [];
        const thumbnailsBottomLeft: string[] = result[3][1]
          ? JSON.parse(result[3][1] as string)
          : [];
        const thumbnailsBottomRight: string[] = result[4][1]
          ? JSON.parse(result[4][1] as string)
          : [];

        setTopLeftImages(thumbnailsTopLeft);
        setTopRightImages(thumbnailsTopRight);
        setBottomLeftImages(thumbnailsBottomLeft);
        setBottomRightImages(thumbnailsBottomRight);

        const timeout = setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        }, 300);

        return () => clearTimeout(timeout);
      })
      .catch(error => {
        console.log('[LiveStreamImages] load thumbnails error:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
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
    }, 500);

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
    }, 500);

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
    }, 500);

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
    }, 500);

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
