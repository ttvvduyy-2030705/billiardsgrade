import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {OnVideoErrorData, VideoRef} from 'react-native-video';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {WebcamFile} from 'types/webcam';
import {WEBCAM_BASE_FILE_NAME, WEBCAM_FILE_EXTENSION} from 'constants/webcam';

export interface Props {
  webcamFolderName: string;
}

const PlayBackWebcamViewModel = (props: Props) => {
  const videoRef = useRef<VideoRef>(null);
  const [files, setFiles] = useState<WebcamFile[]>([]);
  const [webcamUrl, setWebcamUrl] = useState<string>();
  const [selectedFileId, setSelectedFileId] = useState<number>();

  useEffect(() => {
    RNFS.readDir(
      `${RNFS.DownloadDirectoryPath}/${props.webcamFolderName}`,
    ).then(result => {
      const numOfFiles: number = result.length;
      const _files: WebcamFile[] = Array.from({length: numOfFiles}, (_, i) => {
        const name = `${WEBCAM_BASE_FILE_NAME}${
          i < 10 ? `0${i}` : i
        }${WEBCAM_FILE_EXTENSION}`;

        return {
          id: i,
          name,
          path: `${RNFS.DownloadDirectoryPath}/${props.webcamFolderName}/${name}`,
        };
      });

      setFiles(_files);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectMinuteForWebcam = useCallback((file: WebcamFile) => {
    setSelectedFileId(file.id);
    setWebcamUrl(file.path);
  }, []);

  const onWebcamError = useCallback((e: OnVideoErrorData) => {
    if (__DEV__) {
      console.log('On webcam error', e);
    }
  }, []);

  const onShareVideo = useCallback(() => {
    Share.open({url: webcamUrl}).catch(err => {
      err && console.log(err);
    });
  }, [webcamUrl]);

  return useMemo(() => {
    return {
      videoRef,
      selectedFileId,
      webcamUrl,
      files,
      onSelectMinuteForWebcam,
      onWebcamError,
      onShareVideo,
    };
  }, [
    videoRef,
    selectedFileId,
    webcamUrl,
    files,
    onSelectMinuteForWebcam,
    onWebcamError,
    onShareVideo,
  ]);
};

export default PlayBackWebcamViewModel;
