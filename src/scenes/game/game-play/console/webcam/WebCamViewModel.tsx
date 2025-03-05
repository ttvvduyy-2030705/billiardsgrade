import {
  ReactNode,
  Ref,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {RootState} from 'data/redux/reducers';
import {useSelector} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {keys} from 'configuration/keys';
import {
  WEBCAM_BASE_FILE_NAME,
  WEBCAM_FILE_EXTENSION,
  WEBCAM_HOST,
  WEBCAM_PATH,
  WEBCAM_PORT,
} from 'constants/webcam';
import {
  OnBufferData,
  OnLoadData,
  OnSeekData,
  OnVideoErrorData,
  OnVideoTracksData,
  VideoRef,
} from 'react-native-video';
import {streamWebcamToFile} from 'services/ffmpeg/local';
import {liveStreamFromCamera} from 'services/ffmpeg/livestream';
import {requestReadWriteStorage} from 'utils/permission';
import {navigate} from 'utils/navigation';
import {screens} from 'scenes/screens';
import {
  Bitrate,
  Fps,
  LiveStreamCamera,
  OutputType,
  Resolution,
  Webcam,
  WebcamType,
} from 'types/webcam';
import {CAMERA_PLAYBACK_DURATION} from './constants';
import { PlayBackWebcamViewModelProps } from 'scenes/playback/PlayBackViewModel';
import { Camera } from 'react-native-vision-camera';

export interface Props {
  innerControls?: boolean;
  webcamFolderName?: string;
  //renderMatchInfo: () => ReactNode;
  updateWebcamFolderName: (name: string) => void;
  cameraRef? : RefObject<Camera>;
  isStarted: boolean;
  isPaused: boolean;
  //isPreview: boolean;
  //pauseVideoRecording?: () => void;
  videoUri? : string;
  //resumeVideoRecording?: () => void,
  //stopVideoRecording?: () => void,
  setVideoUri?: (name: string) => void;
  isCameraReady: boolean;
  setIsCameraReady: ((isReady: boolean) => void);
}

let interval: NodeJS.Timeout, cameraInterval: NodeJS.Timeout;

const WebCamViewModel = (props: Props) => {
  const videoRef = useRef<VideoRef>(null);
  const {gameSettings} = useSelector((state: RootState) => state.game);
  const [webcamType, setWebcamType] = useState<WebcamType>();
  const [webcam, setWebcam] = useState<Webcam>();
  const [liveStream, setLiveStream] = useState<LiveStreamCamera>();
  const [connectCountdownTime, setConnectCountdownTime] = useState<number>(10);
  const [autoConnect, setAutoConnect] = useState<boolean>(false);
  const [isWebcamStarted, setIsWebcamStarted] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [innerControlsShow, setInnerControlsShow] = useState<boolean>(false);
  const [url, setUrl] = useState<string | undefined>();
  const [currentSeekPosition, setCurrentSeekPosition] = useState<number>(0);

  useEffect(() => {
    AsyncStorage.getItem(keys.WEBCAM_TYPE, (error, result) => {
      if (error) {

        return;
      }

      if (result) {
        if (result === WebcamType.webcam) {
          getWebcamData();
        } else {
          getCameraData();
        }
        setWebcamType(result as WebcamType);


      }else{
        setWebcamType(WebcamType.webcam);
      }
    });

    return () => {
      clearInterval(cameraInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(() => {
    const _countdownTime = (webcam?.syncTime || CAMERA_PLAYBACK_DURATION) * 2;
    const canConnect =
      _countdownTime > 10 ? true : _countdownTime - connectCountdownTime >= 0;

    if (!canConnect) {
      return;
    }

    setAutoConnect(true);

    if (connectCountdownTime === 0) {
      clearInterval(interval);
    }
  }, [webcam, connectCountdownTime]);

  useEffect(() => {
    if (!autoConnect || isWebcamStarted) {
      return;
    }

    requestReadWriteStorage().then(async isGranted => {
      if (!isGranted) {
        return;
      }

      setIsWebcamStarted(true);

      const _outputType =
        webcamType === WebcamType.camera
          ? liveStream?.outputType
          : webcam?.outputType;
      const _url =
        webcamType === WebcamType.webcam
          ? `${WEBCAM_HOST}${webcam?.username}:${webcam?.password}@${webcam?.webcamIP}:${WEBCAM_PORT}${WEBCAM_PATH}`
          : undefined;

      if (_outputType === OutputType.livestream) {
        liveStreamFromCamera(
          liveStream,
          _url,
          webcamType,
          !!gameSettings?.mode.countdownTime,
          gameSettings?.category,
        );
        return;
      }

      const now = Date.now().toString();
      streamWebcamToFile(
        now,
        webcam?.syncTime || CAMERA_PLAYBACK_DURATION,
        webcamType,
        _url,
      );

      if (
        webcamType === WebcamType.camera &&
        _outputType === OutputType.local
      ) {
        await new Promise(resolve => {
          const timeout = setTimeout(async () => {
            resolve(true);

            clearTimeout(timeout);
          }, CAMERA_PLAYBACK_DURATION * 1000);
        });

        let i = -1;
        cameraInterval = setInterval(async () => {
          i++;

          const _newCameraUrl = `${
            RNFS.DownloadDirectoryPath
          }/${now}/${WEBCAM_BASE_FILE_NAME}${
            i < 10 ? `0${i}` : i
          }${WEBCAM_FILE_EXTENSION}`;

          setUrl(_newCameraUrl);
        }, CAMERA_PLAYBACK_DURATION * 1000 + 100);
      } else {
        setUrl(_url);
      }

      //props.updateWebcamFolderName(now);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    webcamType,
    webcam,
    liveStream,
    autoConnect,
    isWebcamStarted,
    gameSettings,
  ]);

  // const recordLocalCamera = useCallback(() => {
  //   cameraRef.current?.({
  //     onRecordingFinished: video => {
  //       console.log('Record finished', video);
  //       RNFS.copyFile(video.path);
  //     },
  //     onRecordingError: error => console.error(error),
  //   });

  //   intervalCamera = setInterval(() => {
  //     cameraRef.current?.pauseRecording();
  //   }, 5000);
  // }, [cameraRef]);

  const getCameraData = useCallback(() => {
    AsyncStorage.multiGet(
      [
        keys.CAMERA_RTMP_URL,
        keys.CAMERA_STREAM_KEY,
        keys.OUTPUT_TYPE,
        keys.CAMERA_RESOLUTION,
        keys.CAMERA_FPS,
        keys.CAMERA_BITRATE,
      ],
      (error, result) => {
        if (!error && result) {
          const _rtmpUrl = result[0][1];
          const _streamKey = result[1][1];
          const _outputType = result[2][1];
          const _resolution = result[3][1];
          const _fps = result[4][1];
          const _bitrate = result[5][1];

          if (
            (_outputType &&
              _outputType === OutputType.livestream &&
              (!_rtmpUrl || !_streamKey)) ||
            !_outputType
          ) {
            return;
          }

          setLiveStream({
            rtmpUrl: _rtmpUrl || '',
            streamKey: _streamKey || '',
            outputType: _outputType as OutputType,
            resolution: (_resolution || Resolution.FullHD) as Resolution,
            fps: (_fps || Fps.F30) as Fps,
            bitrate: (_bitrate || Bitrate.B9000) as Bitrate,
          });

          interval = setInterval(() => {
            setConnectCountdownTime(prev => (prev - 1 > 0 ? prev - 1 : 0));
          }, 1000);
        }
      },
    );
  }, []);

  const getWebcamData = useCallback(() => {
    AsyncStorage.multiGet(
      [
        keys.WEBCAM_IP_ADDRESS,
        keys.WEBCAM_USERNAME,
        keys.WEBCAM_PASSWORD,
        keys.WEBCAM_SCALE,
        keys.WEBCAM_SYNC_TIME,
        keys.WEBCAM_TRANSLATE_X,
        keys.WEBCAM_TRANSLATE_Y,
        keys.OUTPUT_TYPE,
        keys.CAMERA_RTMP_URL,
        keys.CAMERA_STREAM_KEY,
        keys.CAMERA_RESOLUTION,
        keys.CAMERA_FPS,
        keys.CAMERA_BITRATE,
      ],
      (error, result) => {
        if (!error && result) {
          const _ip = result[0][1];
          const _username = result[1][1];
          const _password = result[2][1];
          const _scale = result[3][1];
          const _syncTime = result[4][1];
          const _translateX = result[5][1];
          const _translateY = result[6][1];
          const _outputType = result[7][1];
          const _rtmpUrl = result[8][1];
          const _streamKey = result[9][1];
          const _resolution = result[10][1];
          const _fps = result[11][1];
          const _bitrate = result[12][1];

          if (!_ip || !_username || !_password || !_outputType) {
            return;
          }

          setWebcam({
            webcamIP: _ip,
            username: _username,
            password: _password,
            scale: _scale ? Number(_scale) : 1,
            syncTime: _syncTime ? Number(_syncTime) : 60,
            translateX: _translateX ? Number(_translateX) : 0,
            translateY: _translateY ? Number(_translateY) : 0,
            outputType: _outputType as OutputType,
          });

          setLiveStream({
            rtmpUrl: _rtmpUrl || '',
            streamKey: _streamKey || '',
            outputType: _outputType as OutputType,
            resolution: (_resolution || Resolution.FullHD) as Resolution,
            fps: (_fps || Fps.F30) as Fps,
            bitrate: (_bitrate || Bitrate.B9000) as Bitrate,
          });

          interval = setInterval(() => {
            setConnectCountdownTime(prev => (prev - 1 > 0 ? prev - 1 : 0));
          }, 1000);
        }
      },
    );
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    const timeout = setTimeout(() => {
      setRefreshing(false);
      clearTimeout(timeout);
    }, 1000);
  }, []);

  const onDelay = useCallback(() => {}, []);

  const onReWatch = useCallback(async () => {
   

    navigate(screens.playback, {webcamFolderName: props.webcamFolderName, merged: false} as PlayBackWebcamViewModelProps);
  }, [props]);

  const onFullscreenPlayerDidPresent = useCallback(() => {}, []);

  const onBuffer = useCallback((_data: OnBufferData) => {}, []);

  const onSeek = useCallback((_data: OnSeekData) => {}, []);

  const onLoad = useCallback(
    (_data: OnLoadData) => {
      //videoRef.current?.setVolume(0);

      // if (webcamType === WebcamType.camera) {
      //   videoRef.current?.seek(currentSeekPosition);
      //   videoRef.current?.resume();

      //   setCurrentSeekPosition(currentSeekPosition + CAMERA_PLAYBACK_DURATION);
      // }
    },
    [webcamType, currentSeekPosition],
  );

  const onVideoTracks = useCallback((_data: OnVideoTracksData) => {}, []);

  const onEnd = useCallback(() => {}, []);

  const onWebcamError = useCallback(
    (e: OnVideoErrorData) => {
      console.log('On webcam error', e);
      if (webcamType === WebcamType.camera) {
        setCurrentSeekPosition(currentSeekPosition + CAMERA_PLAYBACK_DURATION);
      }
    },
    [webcamType, currentSeekPosition],
  );

  const onToggleInnerControls = useCallback(() => {
    if (!props.innerControls) {
      return;
    }

    setInnerControlsShow(prev => !prev);
  }, [props.innerControls]);

  return useMemo(() => {
    return {
      videoRef,
      innerControlsShow,
      refreshing,
      autoConnect,
      webcamType,
      webcam,
      liveStream,
      connectCountdownTime,
      source:
        webcamType === WebcamType.webcam
          ? {uri: url, type: 'rtsp'}
          : {uri: url, type: 'mov'},
      onRefresh,
      onDelay,
      onReWatch,
      onFullscreenPlayerDidPresent,
      onBuffer,
      onSeek,
      onLoad,
      onVideoTracks,
      onEnd,
      onWebcamError,
      onToggleInnerControls,

    };
  }, [
    videoRef,
    innerControlsShow,
    refreshing,
    autoConnect,
    webcamType,
    webcam,
    liveStream,
    url,
    connectCountdownTime,
    onRefresh,
    onDelay,
    onReWatch,
    onFullscreenPlayerDidPresent,
    onBuffer,
    onSeek,
    onLoad,
    onVideoTracks,
    onEnd,
    onWebcamError,
    onToggleInnerControls,
  ]);
};


export default WebCamViewModel;
