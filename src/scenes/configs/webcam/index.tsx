import React, {memo, useCallback, useMemo} from 'react';
import {KeyboardTypeOptions, TextInput as RNTextInput} from 'react-native';
import Video from 'react-native-video';
import Button from 'components/Button';
import Loading from 'components/Loading';
import Text from 'components/Text';
import View from 'components/View';
import TextInput from 'components/TextInput';
import i18n from 'i18n';
import {
  WEBCAM_BUFFER_CONFIG,
  WEBCAM_SELECTED_VIDEO_TRACK,
} from 'constants/webcam';

import configStyles from '../styles';
import WebcamConfigViewModel from './WebcamConfigViewModel';
import styles from './styles';

const WebcamConfig = () => {
  const viewModel = WebcamConfigViewModel();

  const renderInput = useCallback(
    (
      title: string,
      value: string,
      placeholder: string,
      keyboardType: KeyboardTypeOptions,
      returnKeyType: 'next' | 'default',
      onChangeText: (value: string) => void,
      {
        inputRef,
        onSubmitEditing,
        secureTextEntry,
      }: {
        inputRef?: React.RefObject<RNTextInput>;
        onSubmitEditing?: () => void;
        secureTextEntry?: boolean;
      },
    ) => {
      return (
        <View flex={'1'}>
          <View marginLeft={'5'} marginBottom={'5'}>
            <Text fontSize={12}>{title}</Text>
          </View>
          <View direction={'row'}>
            <TextInput
              ref={inputRef}
              inputStyle={styles.input}
              value={value}
              placeholder={placeholder}
              onChange={onChangeText}
              onSubmitEditing={onSubmitEditing}
              secureTextEntry={secureTextEntry}
              keyboardType={keyboardType}
              returnKeyType={returnKeyType}
            />
          </View>
        </View>
      );
    },
    [],
  );

  const WEBCAM_LOADER = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={configStyles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <Loading isLoading size={'large'} showPlainLoading />
      </View>
    );
  }, []);

  return (
    <View style={styles.configIPWrapper} padding={'20'}>
      <Text fontWeight={'bold'}>{i18n.t('webcamConfig')}</Text>
      <View direction={'row'} marginBottom={'10'}>
        <View direction={'row'} alignItems={'center'} marginTop={'15'}>
          {renderInput(
            i18n.t('webcamIP'),
            viewModel.webcamIPAddress,
            i18n.t('txtEnterWebcamIPAddress'),
            'numeric',
            'next',
            viewModel.onChangeIPAddress,
            {
              onSubmitEditing: viewModel.onSubmitEditingIPAddress,
            },
          )}
          {renderInput(
            i18n.t('username'),
            viewModel.username,
            i18n.t('txtEnterUsername'),
            'default',
            'next',
            viewModel.onChangeUsername,
            {
              inputRef: viewModel.userNameRef,
              onSubmitEditing: viewModel.onSubmitEditingUsername,
            },
          )}
          {renderInput(
            i18n.t('password'),
            viewModel.password,
            i18n.t('txtEnterPassword'),
            'default',
            'default',
            viewModel.onChangePassword,
            {
              inputRef: viewModel.passwordRef,
              secureTextEntry: true,
            },
          )}
        </View>
      </View>

      <View direction={'row'} marginTop={'20'}>
        <View
          flex={'1'}
          direction={'row'}
          alignItems={'center'}
          justify={'end'}>
          <Button onPress={viewModel.onTest} style={styles.buttonTest}>
            <Text>{i18n.t('test')}</Text>
          </Button>
          <Button
            disable={!viewModel.allowToSave}
            onPress={viewModel.onSaveConfig}
            style={styles.buttonSaveConfig}>
            <Text>{i18n.t('saveConfig')}</Text>
          </Button>
        </View>
      </View>

      <View marginBottom={'20'} />
      {viewModel.webcamUrl ? (
        <Video
          id={'webcam-billiards-test'}
          ref={viewModel.videoRef}
          style={styles.webcam}
          source={viewModel.source}
          selectedVideoTrack={WEBCAM_SELECTED_VIDEO_TRACK}
          bufferConfig={WEBCAM_BUFFER_CONFIG}
          onLoad={viewModel.onLoad}
          onError={viewModel.onWebcamError}
          renderLoader={WEBCAM_LOADER}
        />
      ) : (
        <View />
      )}
    </View>
  );
};

export default memo(WebcamConfig);
