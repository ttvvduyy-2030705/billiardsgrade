import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import {keys} from 'configuration/keys';
import {WEBCAM_HOST, WEBCAM_PATH, WEBCAM_PORT} from 'constants/webcam';
import {
  OnBufferData,
  OnLoadData,
  OnSeekData,
  OnVideoErrorData,
  OnVideoTracksData,
  VideoRef,
} from 'react-native-video';
import {streamWebcamToFile} from 'services/ffmpeg/webcam';
import {liveStreamFromCamera} from 'services/ffmpeg/livestream';
import {requestReadWriteStorage} from 'utils/permission';
import {navigate} from 'utils/navigation';
import {screens} from 'scenes/screens';
import {LiveStreamCamera, Webcam, WebcamType} from 'types/webcam';

export interface Props {
  webcamFolderName?: string;
  renderMatchInfo: () => ReactNode;
  updateWebcamFolderName: (name: string) => void;
}

let interval: NodeJS.Timeout;

const WebCamViewModel = (props: Props) => {
  const videoRef = useRef<VideoRef>(null);

  const [webcamType, setWebcamType] = useState<WebcamType>();
  const [webcam, setWebcam] = useState<Webcam>();
  const [liveStream, setLiveStream] = useState<LiveStreamCamera>();
  const [connectCountdownTime, setConnectCountdownTime] = useState<number>(10);
  const [autoConnect, setAutoConnect] = useState<boolean>(false);
  const [isWebcamStarted, setIsWebcamStarted] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [url, setUrl] = useState<string | undefined>();

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
      }

      setWebcamType(result as WebcamType);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connectCountdownTime > 0) {
      return;
    }

    setAutoConnect(true);

    clearInterval(interval);
  }, [connectCountdownTime]);

  useEffect(() => {
    if (!autoConnect || isWebcamStarted) {
      return;
    }

    requestReadWriteStorage().then(isGranted => {
      if (!isGranted) {
        return;
      }

      setIsWebcamStarted(true);

      if (webcamType === WebcamType.camera) {
        liveStreamFromCamera(liveStream);
        return;
      }

      const now = Date.now().toString();
      const _url = `${WEBCAM_HOST}${webcam?.username}:${webcam?.password}@${webcam?.webcamIP}:${WEBCAM_PORT}${WEBCAM_PATH}`;

      streamWebcamToFile(_url, now, webcam?.syncTime || 60);
      setUrl(_url);
      props.updateWebcamFolderName(now);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcamType, webcam, liveStream, autoConnect, isWebcamStarted]);

  const getCameraData = useCallback(() => {
    AsyncStorage.multiGet(
      [keys.CAMERA_RTMP_URL, keys.CAMERA_STREAM_KEY],
      (error, result) => {
        if (!error && result) {
          const _rtmpUrl = result[0][1];
          const _streamKey = result[1][1];

          if (!_rtmpUrl || !_streamKey) {
            return;
          }

          setLiveStream({
            rtmpUrl: _rtmpUrl,
            streamKey: _streamKey,
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

          if (!_ip || !_username || !_password) {
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
    navigate(screens.playback, {webcamFolderName: props.webcamFolderName});
  }, [props]);

  const onFullscreenPlayerDidPresent = useCallback(() => {}, []);

  const onBuffer = useCallback((_data: OnBufferData) => {}, []);

  const onSeek = useCallback((_data: OnSeekData) => {}, []);

  const onLoad = useCallback((_data: OnLoadData) => {
    videoRef.current?.setVolume(0);
  }, []);

  const onVideoTracks = useCallback((_data: OnVideoTracksData) => {}, []);

  const onEnd = useCallback(() => {}, []);

  const onWebcamError = useCallback((e: OnVideoErrorData) => {
    console.log('On webcam error', e);
  }, []);

  return useMemo(() => {
    return {
      videoRef,
      refreshing,
      autoConnect,
      webcamType,
      webcam,
      liveStream,
      connectCountdownTime,
      source:
        webcamType === WebcamType.webcam
          ? {uri: url, type: 'rtsp'}
          : {uri: url},
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
    };
  }, [
    videoRef,
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
  ]);
};

export default WebCamViewModel;
