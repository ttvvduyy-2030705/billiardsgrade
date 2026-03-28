import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {OnVideoErrorData, VideoRef} from 'react-native-video';
import RNFS from 'react-native-fs';
import i18n from 'i18n';
import {listReplayFiles, resolveReplayFolder} from 'services/replay/localReplay';

export interface PlayBackWebcamViewModelProps {
  webcamFolderName: string;
  merged: boolean;
  videoUri?: string;
}

const PlayBackWebcamViewModel = (props: PlayBackWebcamViewModelProps) => {
  const videoRef = useRef<VideoRef>(null);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videoDurations, setVideoDurations] = useState<any>({});
  const [videoFiles, setVideoFiles] = useState<RNFS.ReadDirItem[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedFolder, setResolvedFolder] = useState<string | undefined>();

  const handleVideoLoad = (videoUri: string, duration: number) => {
    setVideoDurations((prev: any) => ({...prev, [videoUri]: duration}));
  };

  const handleNext = () => {
    if (currentIndex < videoFiles.length - 1) {
      videoRef.current?.seek(0);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleLoad = () => {
    videoRef.current?.seek(startTime);
    videoRef.current?.resume();
  };

  const handleProgress = (data: any) => {
    if (endTime > 0 && data.currentTime >= endTime && isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const loadFiles = useCallback(async () => {
    setIsLoading(true);

    const folder = await resolveReplayFolder(props.webcamFolderName);
    setResolvedFolder(folder);

    if (!folder) {
      setVideoFiles([]);
      setTotalFiles(0);
      setIsLoading(false);
      console.log('[Replay] Folder does not exist:', props.webcamFolderName);
      return;
    }

    let files: RNFS.ReadDirItem[] = [];

    for (let attempt = 0; attempt < 8; attempt += 1) {
      files = await listReplayFiles(props.webcamFolderName);

      if (files.length > 0) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 400));
    }

    setVideoFiles(files);
    setTotalFiles(files.length);
    setCurrentIndex(0);
    setIsPlaying(files.length > 0);
    setIsLoading(false);

    if (files.length > 0) {
      videoRef.current?.seek(0);
    } else {
      console.log('[Replay] No files found after retry:', props.webcamFolderName);
    }
  }, [props.webcamFolderName]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onSelectMinuteForWebcam = useCallback(
    async (index: number, duration: number) => {
      setIsLoading(true);
      setSelectedDurationIndex(index);

      if (totalFiles > 0) {
        const files = await listReplayFiles(props.webcamFolderName);
        setVideoFiles(files);
        setIsLoading(false);
        setIsPlaying(files.length > 0);
      } else {
        Alert.alert(i18n.t('txtError'), i18n.t('msgWebcamVideoNotExist'));
        setIsLoading(false);
        return;
      }

      setStartTime(duration * 60);

      if (videoRef.current) {
        videoRef.current.seek(duration);
        setIsPlaying(true);
      }
    },
    [props.webcamFolderName, totalFiles],
  );

  const onWebcamError = useCallback((e: OnVideoErrorData) => {
    if (__DEV__) {
      console.log('On webcam error', e);
    }
  }, []);

  return useMemo(() => {
    return {
      videoRef,
      isLoading,
      selectedDurationIndex,
      onSelectMinuteForWebcam,
      onWebcamError,
      handleVideoLoad,
      handleProgress,
      isPlaying,
      handleLoad,
      handleNext,
      handlePrevious,
      videoFiles,
      currentIndex,
      setCurrentIndex,
      videoDurations,
      totalFiles,
      loadFiles,
      resolvedFolder,
    };
  }, [
    isLoading,
    selectedDurationIndex,
    onSelectMinuteForWebcam,
    onWebcamError,
    isPlaying,
    videoFiles,
    currentIndex,
    videoDurations,
    totalFiles,
    loadFiles,
    resolvedFolder,
  ]);
};

export default PlayBackWebcamViewModel;
