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

const WebcamConfigViewModel = () => {
  const {language} = useContext(LanguageContext);

  const videoRef = useRef<VideoRef>(null);
  const userNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [webcamIPAddress, setWebcamIPAddress] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');

  const [webcamUrl, setWebcamUrl] = useState<string>('');
  const [allowToSave, setAllowToSave] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(
      [keys.WEBCAM_IP_ADDRESS, keys.WEBCAM_USERNAME, keys.WEBCAM_PASSWORD],
      (error, result) => {
        if (error || !result) {
          return;
        }

        const _ip = result[0][1];
        const _username = result[1][1];
        const _password = result[2][1];

        if (!_ip || !_username || !_password) {
          return;
        }

        if (_ip) {
          setWebcamIPAddress(_ip);
        }

        if (_username) {
          setUsername(_username);
        }

        if (_password) {
          setPassword(_password);
        }
      },
    );
  }, []);

  const onChangeText = useCallback(
    (setValue: React.Dispatch<React.SetStateAction<string>>) =>
      (value: string) => {
        setValue(value);
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
    const _url = `${WEBCAM_HOST}${username}:${password}@${webcamIPAddress}:${WEBCAM_PORT}${WEBCAM_PATH}`;

    setWebcamUrl(_url);
  }, [webcamIPAddress, username, password]);

  const onSaveConfig = useCallback(() => {
    if (!allowToSave) {
      return;
    }

    setWebcamUrl('');
    setAllowToSave(false);
    AsyncStorage.setItem(keys.WEBCAM_IP_ADDRESS, webcamIPAddress);
    AsyncStorage.setItem(keys.WEBCAM_USERNAME, username);
    AsyncStorage.setItem(keys.WEBCAM_PASSWORD, password);
  }, [allowToSave, webcamIPAddress, username, password]);

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

  return useMemo(() => {
    return {
      videoRef,
      userNameRef,
      passwordRef,
      language,
      webcamIPAddress,
      username,
      password,
      webcamUrl,
      allowToSave,
      source: {
        uri: webcamUrl,
        type: 'rtsp',
      },
      onChangeIPAddress: onChangeText(setWebcamIPAddress),
      onChangeUsername: onChangeText(setUsername),
      onChangePassword: onChangeText(setPassword),
      onSubmitEditingIPAddress: onSubmitEditing(userNameRef),
      onSubmitEditingUsername: onSubmitEditing(passwordRef),
      onTest,
      onSaveConfig,
      onChangeText,
      onLoad,
      onWebcamError,
    };
  }, [
    language,
    webcamIPAddress,
    username,
    password,
    webcamUrl,
    allowToSave,
    onTest,
    onSaveConfig,
    onChangeText,
    onLoad,
    onSubmitEditing,
    onWebcamError,
  ]);
};

export default WebcamConfigViewModel;
