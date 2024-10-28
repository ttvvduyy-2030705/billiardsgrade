import React, {memo, useCallback} from 'react';
import {KeyboardTypeOptions, TextInput as RNTextInput} from 'react-native';
import Slider from '@react-native-community/slider';
import Button from 'components/Button';
import Text from 'components/Text';
import View from 'components/View';
import TextInput from 'components/TextInput';
import Video from 'components/Video';
import i18n from 'i18n';

import colors from 'configuration/colors';
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
          <View marginLeft={'10'} marginBottom={'5'}>
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

  return (
    <View style={styles.configIPWrapper} paddingVertical={'20'}>
      <View marginHorizontal={'20'}>
        <Text fontWeight={'bold'}>{i18n.t('webcamConfig')}</Text>
      </View>
      <View marginTop={'15'} marginHorizontal={'15'}>
        <View marginHorizontal={'10'}>
          <Text fontSize={12}>
            {i18n.t('txtWebcamSyncTime')} ({i18n.t('txtSecond')})
          </Text>
        </View>
        <View
          direction={'row'}
          alignItems={'center'}
          marginHorizontal={'10'}
          marginTop={'20'}
          paddingTop={'10'}
          marginBottom={'10'}>
          <View>
            <Text fontSize={12} color={colors.gray2}>
              {3}
            </Text>
          </View>
          <View flex={'1'} direction={'row'}>
            <Slider
              style={styles.slider}
              value={viewModel.webcam.syncTime}
              minimumValue={3}
              maximumValue={60}
              step={1}
              thumbTintColor={colors.lightBlack}
              minimumTrackTintColor={colors.statusBar}
              maximumTrackTintColor={colors.deepGray}
              onValueChange={viewModel.onChangeSyncTime}
            />
            <View style={[styles.sliderValue, viewModel.sliderValueStyle]}>
              <Text fontSize={12} color={colors.white}>
                {viewModel.webcam.syncTime < 10
                  ? `0${viewModel.webcam.syncTime}`
                  : viewModel.webcam.syncTime}
              </Text>
            </View>
          </View>
          <View>
            <Text fontSize={12} color={colors.gray2}>
              {60}
            </Text>
          </View>
        </View>
      </View>
      <View direction={'row'} marginBottom={'10'} marginHorizontal={'10'}>
        <View direction={'row'} alignItems={'center'} marginTop={'15'}>
          {renderInput(
            i18n.t('webcamIP'),
            viewModel.webcam.webcamIP,
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
            viewModel.webcam.username,
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
            viewModel.webcam.password,
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

      <View direction={'row'} marginTop={'20'} marginHorizontal={'20'}>
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

      <View marginTop={'20'} />
      {viewModel.webcamUrl ? (
        <View style={styles.webcamContainer}>
          <View
            flex={'1'}
            style={styles.webcam}
            direction={'row'}
            marginTop={'10'}>
            <View flex={'1'}>
              <Video
                key={'webcam-billiards-test'}
                ref={viewModel.videoRef}
                source={viewModel.source}
                initialScale={viewModel.webcam.scale}
                initialTranslateX={viewModel.webcam.translateX}
                initialTranslateY={viewModel.webcam.translateY}
                onLoad={viewModel.onLoad}
                onError={viewModel.onWebcamError}
                onPosition={viewModel.onSaveWebcamPosition}
              />
            </View>
          </View>
        </View>
      ) : (
        <View />
      )}
    </View>
  );
};

export default memo(WebcamConfig);
