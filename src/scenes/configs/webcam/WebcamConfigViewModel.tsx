import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {TextInput} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {OnLoadData, OnVideoErrorData, VideoRef} from 'react-native-video';
import {keys} from 'configuration/keys';
import {WEBCAM_HOST, WEBCAM_PATH, WEBCAM_PORT} from 'constants/webcam';
import {LanguageContext} from 'context/language';
import {Webcam} from 'types/webcam';

const WebcamConfigViewModel = () => {
  const {language} = useContext(LanguageContext);

  const videoRef = useRef<VideoRef>(null);
  const userNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [webcam, setWebcam] = useState<Webcam>({
    webcamIP: '',
    username: 'admin',
    password: '',
  });

  const [webcamUrl, setWebcamUrl] = useState<string>('');
  const [allowToSave, setAllowToSave] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(
      [
        keys.WEBCAM_IP_ADDRESS,
        keys.WEBCAM_USERNAME,
        keys.WEBCAM_PASSWORD,
        keys.WEBCAM_SCALE,
        keys.WEBCAM_TRANSLATE_X,
        keys.WEBCAM_TRANSLATE_Y,
      ],
      (error, result) => {
        if (error || !result) {
          return;
        }

        const _ip = result[0][1];
        const _username = result[1][1];
        const _password = result[2][1];
        const _scale = result[3][1];
        const _translateX = result[4][1];
        const _translateY = result[5][1];

        if (!_ip || !_username || !_password) {
          return;
        }

        setWebcam({
          webcamIP: _ip,
          username: _username,
          password: _password,
          scale: _scale ? Number(_scale) : 1,
          translateX: _translateX ? Number(_translateX) : 0,
          translateY: _translateY ? Number(_translateY) : 0,
        });
      },
    );
  }, []);

  const onChangeWebcamConfig = useCallback(
    (key: string) => (value: string) => {
      setWebcam(prev => ({...prev, [key]: value}));
    },
    [],
  );

  const onSubmitEditing = useCallback(
    (nextRef: React.RefObject<TextInput>) => () => {
      console.log('nextRef.current', nextRef.current);
      nextRef.current?.focus();
    },
    [],
  );

  const onTest = useCallback(() => {
    const _url = `${WEBCAM_HOST}${webcam?.username}:${webcam?.password}@${webcam?.webcamIP}:${WEBCAM_PORT}${WEBCAM_PATH}`;

    setWebcamUrl(_url);
  }, [webcam]);

  const onSaveConfig = useCallback(() => {
    if (!allowToSave) {
      return;
    }

    setWebcamUrl('');
    setAllowToSave(false);
    AsyncStorage.setItem(keys.WEBCAM_IP_ADDRESS, webcam.webcamIP);
    AsyncStorage.setItem(keys.WEBCAM_USERNAME, webcam.username);
    AsyncStorage.setItem(keys.WEBCAM_PASSWORD, webcam.password);
  }, [allowToSave, webcam]);

  const onSaveWebcamPosition = useCallback(
    (scale: number, translateX: number, translateY: number) => {
      AsyncStorage.setItem(keys.WEBCAM_SCALE, scale.toString());
      AsyncStorage.setItem(
        keys.WEBCAM_TRANSLATE_X,
        Math.round(translateX).toString(),
      );
      AsyncStorage.setItem(
        keys.WEBCAM_TRANSLATE_Y,
        Math.round(translateY).toString(),
      );
    },
    [],
  );

  const onLoad = useCallback((_data: OnLoadData) => {
    videoRef.current?.setVolume(0);
    setAllowToSave(true);
  }, []);

  const onWebcamError = useCallback((e: OnVideoErrorData) => {
    if (__DEV__) {
      console.log('On webcam error', e);
    }

    setWebcamUrl('');
    setWebcam({webcamIP: '', username: '', password: ''});
    setAllowToSave(false);
  }, []);

  return useMemo(() => {
    return {
      videoRef,
      userNameRef,
      passwordRef,
      language,
      webcam,
      webcamUrl,
      allowToSave,
      source: {
        uri: webcamUrl,
        type: 'rtsp',
      },
      onChangeIPAddress: onChangeWebcamConfig('webcamIP'),
      onChangeUsername: onChangeWebcamConfig('username'),
      onChangePassword: onChangeWebcamConfig('password'),
      onSubmitEditingIPAddress: onSubmitEditing(userNameRef),
      onSubmitEditingUsername: onSubmitEditing(passwordRef),
      onTest,
      onSaveConfig,
      onLoad,
      onWebcamError,
      onSaveWebcamPosition,
    };
  }, [
    language,
    webcam,
    webcamUrl,
    allowToSave,
    onChangeWebcamConfig,
    onSubmitEditing,
    onTest,
    onSaveConfig,
    onLoad,
    onWebcamError,
    onSaveWebcamPosition,
  ]);
};

export default WebcamConfigViewModel;
