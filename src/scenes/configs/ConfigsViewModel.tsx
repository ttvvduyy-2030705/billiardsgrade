import AsyncStorage from '@react-native-community/async-storage';
import {keys} from 'configuration/keys';
import {
  WEBCAM_HOST,
  WEBCAM_LOGIN_PROFILE,
  WEBCAM_PATH,
  WEBCAM_PORT,
} from 'constants/webcam';
import {LanguageContext} from 'context/language';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {OnLoadData, OnVideoErrorData, VideoRef} from 'react-native-video';

const ConfigsViewModel = () => {
  const {language, onChangeCurrentLanguage} = useContext(LanguageContext);

  const videoRef = useRef<VideoRef>(null);
  const [webcamIPAddress, setWebcamIPAddress] = useState('');
  const [webcamUrl, setWebcamUrl] = useState<string>('');
  const [allowToSave, setAllowToSave] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(keys.WEBCAM_IP_ADDRESS, (error, result) => {
      if (error || !result) {
        return;
      }

      setWebcamIPAddress(result);
    });
  }, []);

  const onChangeText = useCallback((value: string) => {
    setWebcamIPAddress(value);
  }, []);

  const onTest = useCallback(() => {
    const _url = `${WEBCAM_HOST}${WEBCAM_LOGIN_PROFILE}@${webcamIPAddress}:${WEBCAM_PORT}${WEBCAM_PATH}`;

    setWebcamUrl(_url);
  }, [webcamIPAddress]);

  const onSaveConfig = useCallback(() => {
    if (!allowToSave) {
      return;
    }

    setWebcamUrl('');
    setAllowToSave(false);
    AsyncStorage.setItem(keys.WEBCAM_IP_ADDRESS, webcamIPAddress);
  }, [allowToSave, webcamIPAddress]);

  const onLoad = useCallback((_data: OnLoadData) => {
    videoRef.current?.setVolume(0);
    setAllowToSave(true);
  }, []);

  const onWebcamError = useCallback((e: OnVideoErrorData) => {
    if (__DEV__) {
      console.log('On webcam error', e);
    }

    setWebcamIPAddress('');
    setWebcamUrl('');
    setAllowToSave(false);
  }, []);

  const onChangeLanguage = useCallback(
    (newLanguage: string) => {
      onChangeCurrentLanguage(newLanguage);
    },
    [onChangeCurrentLanguage],
  );

  return useMemo(() => {
    return {
      language,
      videoRef,
      webcamUrl,
      webcamIPAddress,
      allowToSave,
      source: {
        uri: webcamUrl,
        type: 'rtsp',
      },
      onTest,
      onSaveConfig,
      onChangeText,
      onLoad,
      onWebcamError,
      onChangeLanguage,
    };
  }, [
    language,
    videoRef,
    webcamIPAddress,
    webcamUrl,
    allowToSave,
    onTest,
    onSaveConfig,
    onChangeText,
    onLoad,
    onWebcamError,
    onChangeLanguage,
  ]);
};

export default ConfigsViewModel;
