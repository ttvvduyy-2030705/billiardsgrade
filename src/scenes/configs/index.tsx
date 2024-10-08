import React, {memo, useMemo} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import i18n from 'i18n';
import TextInput from 'components/TextInput';
import Button from 'components/Button';
import Image from 'components/Image';
import Video from 'react-native-video';
import images from 'assets';
import {
  WEBCAM_BUFFER_CONFIG,
  WEBCAM_SELECTED_VIDEO_TRACK,
} from 'constants/webcam';
import Loading from 'components/Loading';
import styles from './styles';
import ConfigsViewModel from './ConfigsViewModel';

const Configs = () => {
  const viewModel = ConfigsViewModel();

  const WEBCAM_LOADER = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <Loading isLoading size={'large'} showPlainLoading />
      </View>
    );
  }, []);

  const WEBCAM = useMemo(() => {
    return (
      <View flex={'1'} direction={'row'} style={styles.fullHeight}>
        <View style={styles.configIPWrapper} padding={'20'}>
          <Text fontWeight={'bold'}>{i18n.t('webcamConfig')}</Text>
          <View marginLeft={'20'} marginTop={'15'} marginBottom={'10'}>
            <Text>{i18n.t('txtEnterWebcamIPAddress')}</Text>
          </View>
          <View direction={'row'}>
            <TextInput
              value={viewModel.webcamIPAddress}
              placeholder={i18n.t('webcamIP')}
              onChange={viewModel.onChangeText}
            />
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
      </View>
    );
  }, [
    WEBCAM_LOADER,
    viewModel.videoRef,
    viewModel.allowToSave,
    viewModel.source,
    viewModel.webcamIPAddress,
    viewModel.webcamUrl,
    viewModel.onChangeText,
    viewModel.onLoad,
    viewModel.onSaveConfig,
    viewModel.onTest,
    viewModel.onWebcamError,
  ]);

  const LANGUAGE = useMemo(() => {
    return (
      <View flex={'1'} style={styles.fullHeight}>
        <View
          direction={'row'}
          style={styles.languageWrapper}
          marginLeft={'20'}
          padding={'20'}>
          <View flex={'1'}>
            <Text fontWeight={'bold'}>{i18n.t('txtLanguage')}</Text>
            <View direction={'row'} marginTop={'10'}>
              <View marginLeft={'20'} />
              <Button
                style={
                  viewModel.language === 'vi'
                    ? styles.selectedButton
                    : styles.button
                }
                onPress={viewModel.onChangeLanguage.bind(Configs, 'vi')}>
                <View direction={'row'} alignItems={'center'}>
                  <Image style={styles.iconFlag} source={images.vietnam} />
                  <Text>{i18n.t('txtvi')}</Text>
                </View>
              </Button>
              <View marginLeft={'20'} />
              <Button
                style={
                  viewModel.language === 'en'
                    ? styles.selectedButton
                    : styles.button
                }
                onPress={viewModel.onChangeLanguage.bind(Configs, 'en')}>
                <View direction={'row'} alignItems={'center'}>
                  <Image style={styles.iconFlag} source={images.english} />
                  <Text>{i18n.t('txten')}</Text>
                </View>
              </Button>
            </View>
          </View>
        </View>
      </View>
    );
  }, [viewModel.language, viewModel.onChangeLanguage]);

  return (
    <Container>
      <View flex={'1'} padding={'20'}>
        <View flex={'1'} direction={'row'}>
          {WEBCAM}
          {LANGUAGE}
        </View>
      </View>
    </Container>
  );
};

export default memo(Configs);
