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
  returnToMatch?: boolean;
  matchSessionId?: string;
}

const PlayBackWebcamViewModel = (props: PlayBackWebcamViewModelProps) => {
  const videoRef = useRef<VideoRef>(null);
  const [totalFiles, setTotalFiles] = useState(0);
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>();
  const [isLoading, setIsLoading] = useState(false);
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const [videoFiles, setVideoFiles] = useState<RNFS.ReadDirItem[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedFolder, setResolvedFolder] = useState<string>();

  const handleVideoLoad = useCallback((videoUri: string, duration: number) => {
    setVideoDurations(prev => ({...prev, [videoUri]: duration}));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < videoFiles.length - 1) {
      videoRef.current?.seek(0);
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, videoFiles.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      videoRef.current?.seek(0);
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleLoad = useCallback(() => {
    videoRef.current?.seek(startTime);
    videoRef.current?.resume?.();
  }, [startTime]);

  const handleProgress = useCallback(
    (data: any) => {
      if (endTime > 0 && data.currentTime >= endTime && isPlaying) {
        videoRef.current?.pause?.();
        setIsPlaying(false);
      }
    },
    [endTime, isPlaying],
  );

  const loadFiles = useCallback(async () => {
    setIsLoading(true);

    const folder = await resolveReplayFolder(props.webcamFolderName);
    setResolvedFolder(folder);

    if (!folder) {
      setVideoFiles([]);
      setTotalFiles(0);
      setCurrentIndex(0);
      setIsPlaying(false);
      setIsLoading(false);
      console.log('[Replay] Folder does not exist:', props.webcamFolderName);
      return;
    }

    let files: RNFS.ReadDirItem[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      files = await listReplayFiles(props.webcamFolderName);
      if (files.length > 0) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setVideoFiles(files);
    setTotalFiles(files.length);

    const initialIndex = files.length > 0 ? Math.max(0, files.length - 1) : 0;
    setCurrentIndex(initialIndex);
    setIsPlaying(files.length > 0);
    setIsLoading(false);

    if (files.length === 0) {
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

  const onWebcamError = useCallback(
    (_e: OnVideoErrorData) => {
      const previousIndex = currentIndex - 1;
      const nextIndex = currentIndex + 1;

      if (previousIndex >= 0) {
        console.log('[Replay] fallback to previous clip:', previousIndex);
        setCurrentIndex(previousIndex);
        return;
      }

      if (nextIndex < videoFiles.length) {
        console.log('[Replay] fallback to next clip:', nextIndex);
        setCurrentIndex(nextIndex);
        return;
      }

      setIsPlaying(false);
      Alert.alert(i18n.t('txtError'), i18n.t('msgWebcamVideoNotExist'));
    },
    [currentIndex, videoFiles.length],
  );

  return useMemo(
    () => ({
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
    }),
    [
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
      videoDurations,
      totalFiles,
      loadFiles,
      resolvedFolder,
    ],
  );
};

export default PlayBackWebcamViewModel;
