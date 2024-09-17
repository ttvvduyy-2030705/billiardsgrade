import React, {memo, useMemo} from 'react';
import {ActivityIndicator} from 'react-native';
import Video from 'react-native-video';

import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import Image from 'components/Image';
import Divider from 'components/Divider';
import TextInput from 'components/TextInput';

import colors from 'configuration/colors';
import images from 'assets';
import i18n from 'i18n';

import WebCamViewModel from './WebCamViewModel';
import styles from './styles';

const WebCam = () => {
  const viewModel = WebCamViewModel();

  const WEBCAM_LOADER = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <ActivityIndicator size={'large'} color={colors.white} />
      </View>
    );
  }, []);

  const WEBCAM_INPUT = useMemo(() => {
    return (
      <View
        flex={'1'}
        direction={'row'}
        alignItems={'center'}
        justify={'center'}>
        <TextInput
          containerStyle={styles.textInputContainer}
          inputStyle={styles.textInput}
          value={viewModel.webcamIP}
          placeholder={i18n.t('txtEnterWebcamIPAddress')}
          onChange={viewModel.onChangeWebcamIP}
        />
        <Button
          style={styles.buttonIP}
          onPress={viewModel.onToggleWebcamEnabled}>
          <Text>{i18n.t('txtFind')}</Text>
          <Image style={styles.iconIP} source={images.webcam.IP} />
        </Button>
      </View>
    );
  }, [
    viewModel.webcamIP,
    viewModel.onChangeWebcamIP,
    viewModel.onToggleWebcamEnabled,
  ]);

  const CONNECT_WEBCAM = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.fullWidth}
        direction={'row'}
        alignItems={'center'}
        justify={'center'}>
        <Button style={styles.buttonIP} onPress={viewModel.onReconnectWebcam}>
          <Text>{i18n.t('txtReconnect')}</Text>
          <Image style={styles.iconIP} source={images.webcam.IP} />
        </Button>
      </View>
    );
  }, [viewModel.onReconnectWebcam]);

  return (
    <View style={styles.container}>
      <View
        flex={'1'}
        style={styles.webcamWrapper}
        direction={'row'}
        marginTop={'10'}>
        <View flex={'1'}>
          {viewModel.refreshing ? (
            WEBCAM_LOADER
          ) : !viewModel.webcamEnabled ? (
            WEBCAM_INPUT
          ) : !viewModel.autoConnect ? (
            CONNECT_WEBCAM
          ) : (
            <Video
              id={'webcam-billiards'}
              ref={viewModel.videoRef}
              style={styles.webcam}
              source={viewModel.source}
              selectedVideoTrack={viewModel.selectedVideoTrack}
              bufferConfig={viewModel.bufferConfig}
              onFullscreenPlayerDidPresent={
                viewModel.onFullscreenPlayerDidPresent
              }
              onBuffer={viewModel.onBuffer}
              onSeek={viewModel.onSeek}
              onLoad={viewModel.onLoad}
              onVideoTracks={viewModel.onVideoTracks}
              onEnd={viewModel.onEnd}
              onError={viewModel.onWebcamError}
              renderLoader={WEBCAM_LOADER}
            />
          )}
        </View>
      </View>
      <View direction={'row'} alignItems={'center'}>
        <View flex={'1'} direction={'row'} justify={'center'}>
          <Button onPress={viewModel.onRefresh}>
            <View
              direction={'row'}
              alignItems={'center'}
              paddingVertical={'10'}>
              <View marginRight={'10'}>
                <Text>{i18n.t('refresh')}</Text>
              </View>
              <Image source={images.webcam.refresh} style={styles.icon} />
            </View>
          </Button>
        </View>
        <Divider vertical size={'small'} />
        <View flex={'1'} direction={'row'} justify={'center'}>
          <Button onPress={viewModel.onDelay}>
            <View
              direction={'row'}
              alignItems={'center'}
              paddingVertical={'10'}>
              <View marginRight={'10'}>
                <Text>{i18n.t('delay')}</Text>
              </View>
              <Image source={images.webcam.delay} style={styles.icon} />
            </View>
          </Button>
        </View>
        <Divider vertical size={'small'} />
        <View flex={'1'} direction={'row'} justify={'center'}>
          <Button onPress={viewModel.onReWatch}>
            <View
              direction={'row'}
              alignItems={'center'}
              paddingVertical={'10'}>
              <View marginRight={'10'}>
                <Text>{i18n.t('reWatch')}</Text>
              </View>
              <Image source={images.webcam.watch} style={styles.icon} />
            </View>
          </Button>
        </View>
      </View>
    </View>
  );
};

export default memo(WebCam);
