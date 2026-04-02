import {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {keys} from 'configuration/keys';
import {
  Bitrate,
  Fps,
  LiveStreamCamera,
  OutputType,
  Resolution,
  WebcamType,
} from 'types/webcam';

export interface Props {
  configOnly?: boolean;
  onChangeLiveStreamData?: (data: LiveStreamCamera) => void;
}

const LiveStreamViewModel = (props: Props) => {
  const [liveStreamData, setLiveStreamData] = useState<LiveStreamCamera>({
    rtmpUrl: '',
    streamKey: '',
    outputType: OutputType.local,
    resolution: Resolution.FullHD,
    fps: Fps.F30,
    bitrate: Bitrate.B9000,
  });
  const [allowToSave, setAllowToSave] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(
      [
        keys.CAMERA_RTMP_URL,
        keys.CAMERA_STREAM_KEY,
        keys.OUTPUT_TYPE,
        keys.CAMERA_RESOLUTION,
        keys.CAMERA_FPS,
        keys.CAMERA_BITRATE,
        keys.CAMERA_USERNAME,
      ],
      (error, result) => {
        if (!error && result) {
          const _rtmpUrl = result[0][1];
          const _streamKey = result[1][1];
          const _outputType = result[2][1];
          const _resolution = result[3][1];
          const _fps = result[4][1];
          const _bitrate = result[5][1];
          const _username = result[6][1];

          if (!_rtmpUrl || !_streamKey || !_outputType) {
            return;
          }

          // setLiveStreamData({
          //   rtmpUrl: _rtmpUrl,
          //   streamKey: _streamKey,
          //   outputType: _outputType as OutputType,
          //   resolution: (_resolution || Resolution.FullHD) as Resolution,
          //   fps: (_fps || Fps.F30) as Fps,
          //   bitrate: (_bitrate || Bitrate.B9000) as Bitrate,
          //   username: _username || undefined,
          // });
        }
      },
    );
  }, []);

  useEffect(() => {
    setAllowToSave(
      liveStreamData.outputType === OutputType.livestream
        ? liveStreamData.rtmpUrl && liveStreamData.streamKey
          ? true
          : false
        : true,
    );

    if (props.onChangeLiveStreamData) {
      props.onChangeLiveStreamData(liveStreamData);
    }
  }, [liveStreamData, props]);

  const onChangeValue = useCallback(
    (key: string) => (value: string) => {
      setLiveStreamData(prev => ({...prev, [key]: value}));
    },
    [],
  );

  const onUpdateYouTubeLiveStreamData = useCallback(
    (username: string, url: string, streamKey: string) => {
      setLiveStreamData(prev => ({
        ...prev,
        rtmpUrl: url,
        streamKey,
        username,
      }));
    },
    [],
  );

  const onSaveConfig = useCallback(() => {
    AsyncStorage.setItem(keys.WEBCAM_TYPE, WebcamType.camera);
    AsyncStorage.setItem(keys.CAMERA_RTMP_URL, liveStreamData.rtmpUrl);
    AsyncStorage.setItem(keys.CAMERA_STREAM_KEY, liveStreamData.streamKey);
    // AsyncStorage.setItem(
    //   keys.OUTPUT_TYPE,
    //   liveStreamData.outputType.toString(),
    // );
    // AsyncStorage.setItem(
    //   keys.CAMERA_RESOLUTION,
    //   liveStreamData.resolution.toString(),
    // );
    // AsyncStorage.setItem(keys.CAMERA_FPS, liveStreamData.fps.toString());
    // AsyncStorage.setItem(
    //   keys.CAMERA_BITRATE,
    //   liveStreamData.bitrate.toString(),
    // );
    // AsyncStorage.setItem(keys.CAMERA_USERNAME, liveStreamData.username || '');

    setAllowToSave(false);

    const timeout = setTimeout(() => {
      setAllowToSave(true);
      clearTimeout(timeout);
    }, 1000);
  }, [liveStreamData]);

  return useMemo(() => {
    return {
      liveStreamData,
      allowToSave,
      onChangeRTMPUrl: onChangeValue('rtmpUrl'),
      onChangeStreamKey: onChangeValue('streamKey'),
      onChangeChannelId: onChangeValue('channelId'),
      onSelectOutputTypeLocal: onChangeValue('outputType'),
      onSelectOutputTypeLiveStream: onChangeValue('outputType'),
      onSelectResolution: onChangeValue('resolution'),
      onSelectFpsLiveStream: onChangeValue('fps'),
      onSelectBitrateLiveStream: onChangeValue('bitrate'),
      onUpdateYouTubeLiveStreamData,
      onSaveConfig,
    };
  }, [
    liveStreamData,
    allowToSave,
    onChangeValue,
    onUpdateYouTubeLiveStreamData,
    onSaveConfig,
  ]);
};

export default LiveStreamViewModel;
