import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {OnVideoErrorData, VideoRef} from 'react-native-video';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {mergeVideos} from 'services/ffmpeg/webcam';

import i18n from 'i18n';

export interface Props {
  webcamFolderName: string;
  cache?: boolean;
}

const PlayBackWebcamViewModel = (props: Props) => {
  const videoRef = useRef<VideoRef>(null);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [webcamUrl, setWebcamUrl] = useState<string>();
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    RNFS.readDir(
      `${RNFS.DownloadDirectoryPath}/${props.webcamFolderName}`,
    ).then(result => {
      const numOfFiles: number = result.length;
      setTotalFiles(numOfFiles);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectMinuteForWebcam = useCallback(
    async (index: number, duration: number) => {
      setIsLoading(true);
      setSelectedDurationIndex(index);

      const fullVideoPath = await mergeVideos(
        props.webcamFolderName,
        duration === -1 ? totalFiles : duration * 20,
        {
          cache: props.cache,
        },
      );

      if (!fullVideoPath) {
        Alert.alert(i18n.t('txtError'), i18n.t('msgWebcamVideoNotExist'));
        return;
      }

      setWebcamUrl(fullVideoPath);
      setIsLoading(false);
    },
    [props, totalFiles],
  );

  const onWebcamError = useCallback((e: OnVideoErrorData) => {
    if (__DEV__) {
      console.log('On webcam error', e);
    }
  }, []);

  const onShareVideo = useCallback(() => {
    Share.open({url: `file://${webcamUrl}`}).catch(err => {
      err && console.log(err);
    });
  }, [webcamUrl]);

  return useMemo(() => {
    return {
      videoRef,
      isLoading,
      selectedDurationIndex,
      webcamUrl,
      onSelectMinuteForWebcam,
      onWebcamError,
      onShareVideo,
    };
  }, [
    videoRef,
    isLoading,
    selectedDurationIndex,
    webcamUrl,
    onSelectMinuteForWebcam,
    onWebcamError,
    onShareVideo,
  ]);
};

export default PlayBackWebcamViewModel;
