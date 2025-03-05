import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, NativeModules} from 'react-native';
import {OnVideoErrorData, VideoRef} from 'react-native-video';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {getFiles} from 'services/ffmpeg/local';
import i18n from 'i18n';
import { NetworkInfo } from 'react-native-network-info';

const { HttpServer } = NativeModules;

export interface PlayBackWebcamViewModelProps {
  webcamFolderName: string;
  merged: boolean;
  videoUri?: string;
}

const PlayBackWebcamViewModel = (props: PlayBackWebcamViewModelProps) => {
  const videoRef = useRef<VideoRef>(null);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [webcamUrl, setWebcamUrl] = useState<string>();
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videoDurations, setVideoDurations] = useState<any>({}); // Store duration per file
  const [videoFiles, setVideoFiles] = useState<RNFS.ReadDirItem[]>([]);
  const [startTime, setStartTime] = useState(0); // Start time in seconds
  const [endTime, setEndTime] = useState(0); // End time in seconds

  const handleVideoLoad = (videoUri: any, duration: any) => {
    setVideoDurations((prev: any) => ({ ...prev, [videoUri]: duration }));
  };
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  // const [ip, setIp] = useState("");


  // useEffect(() => {
  //   NetworkInfo.getIPAddress().then(ipAddress => {
  //     console.log("IP Address:", ipAddress);

  //     if(ipAddress){
  //       setIp(ipAddress);
  //     }
  //   });
  // }, []);
  
  const [fileUrl, setFileUrl] = useState<string>();

  const handleNext = () => {
    if (currentIndex < videoFiles.length - 1) {
      if (videoRef.current) {
        videoRef.current.seek(0)
      }
      setCurrentIndex(currentIndex + 1);
    }
  };

  // const startServer = async (filePath: string) => {
  //   try {

  //         const url = await HttpServer.startServer(filePath);
  //         setFileUrl(`http://${ip}:8000`);
    
  //   } catch (error: any) {
  //     Alert.alert("Error", error);
  //   }
  // };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleLoad = () => {
    videoRef.current?.seek(startTime);
    videoRef.current?.resume();

  };


  // Stop the video at the specified end time
  const handleProgress = (data: any) => {
    if (data.currentTime >= endTime && isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const folder = `${RNFS.DownloadDirectoryPath}/${props.webcamFolderName}`;
    RNFS.exists(folder).then(
     async isExist => {
        if (!isExist) {

          console.log("File is not Exit " + folder);

          return;
        }

        //const files = await getFiles(props.webcamFolderName);

        // if(files){
        //   setVideoFiles(files)
        // }

        const files = await getFiles(props.webcamFolderName);

        if(files && files.length > 0){
          setVideoFiles(files)
          setIsLoading(false)
          setIsPlaying(true)

          if (videoRef.current) {
            videoRef.current.seek(0)
          }
        }
      },
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectMinuteForWebcam = useCallback(
    async (index: number, duration: number) => {
      setIsLoading(true);
      setSelectedDurationIndex(index);
      if(totalFiles > 0){
        const files = await getFiles(props.webcamFolderName);

        console.log(JSON.stringify(files))

        if(files){
          setVideoFiles(files);
          setIsLoading(false);
          setIsPlaying(true);
        }
      }else{
          Alert.alert(i18n.t('txtError'), i18n.t('msgWebcamVideoNotExist'));
          return;
      }

      setStartTime(duration*60);

      if (videoRef.current) {
        videoRef.current.seek(duration);
        setIsPlaying(true);
      }
    },
    [props, totalFiles, videoFiles],
  );

  const onWebcamError = useCallback((e: OnVideoErrorData) => {
    if (__DEV__) {
      console.log('On webcam error', e);
    }
  }, []);

  const onShareVideo = useCallback(() => {
    // Share.open({url: `file://${webcamUrl}`}).catch(err => {
    //   err && console.log(err);
    // });
    // console.log(" " + props.videoUri);

    // Share.open({url: props.videoUri}).catch(err => {
    //   err && console.log(err);
    // });
  }, [videoFiles]);


  return useMemo(() => {
    return {
      videoRef,
      isLoading,
      selectedDurationIndex,
      onSelectMinuteForWebcam,
      onWebcamError,
      onShareVideo,
      handleVideoLoad,
      handleProgress,
      isPlaying,
      handleLoad,
      handleNext,
      handlePrevious,
      videoFiles,
      currentIndex,
      setCurrentIndex,
    };
  }, [
    videoRef,
    isLoading,
    selectedDurationIndex,
    onSelectMinuteForWebcam,
    onWebcamError,
    onShareVideo,
    handleVideoLoad,
    handleProgress,
    isPlaying,
    handleLoad,
    handleNext,
    handlePrevious,
    videoFiles,
    currentIndex,
    setCurrentIndex,
  ]);
};

export default PlayBackWebcamViewModel;
