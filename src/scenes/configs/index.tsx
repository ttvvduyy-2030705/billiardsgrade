import React, {memo} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import i18n from 'i18n';
import LanguageConfig from './language';
import WebcamConfig from './webcam';
import ConfigsViewModel from './ConfigsViewModel';
import {WebcamType} from 'types/webcam';
import Livestream from './livestream';
import styles from './styles';
import Thumbnails from './thumbnails';
import TableNumber from './table-number';
import BluetoothConfig from './buetooth'

const Configs = () => {
  const viewModel = ConfigsViewModel();

  return (
    <Container>
      <View flex={'1'} padding={'20'}>
        <View flex={'1'} direction={'row'}>
          <View flex={'1'} marginBottom={'20'} marginRight={'20'}>
            <LanguageConfig />
            {/* <BluetoothConfig /> */}
            <View marginVertical={'10'} />
            <TableNumber />
          </View>
          <View flex={'1'} direction={'row'} style={styles.fullHeight}>
            <View flex={'1'} style={styles.webcamContainer}>
              <View direction={'row'} alignItems={'center'}>
                <Button
                  style={[
                    styles.flex,
                    viewModel.currentWebcamType === WebcamType.webcam
                      ? styles.selectedButton
                      : styles.button,
                  ]}
                  onPress={viewModel.onSelectWebcam}>
                  <View paddingVertical={'10'} alignItems={'center'}>
                    <Text>{i18n.t('webcam')}</Text>
                  </View>
                </Button>
                <Button
                  style={[
                    styles.flex,
                    viewModel.currentWebcamType === WebcamType.camera
                      ? styles.selectedButton
                      : styles.button,
                  ]}
                  onPress={viewModel.onSelectCamera}>
                  <View paddingVertical={'10'} alignItems={'center'}>
                    <Text>{i18n.t('camera')}</Text>
                  </View>
                </Button>
              </View>
              {viewModel.currentWebcamType === WebcamType.webcam ? (
                <WebcamConfig />
              ) : (
                <Livestream />
              )}
            </View>
          </View>

          <View flex={'1'} marginLeft={'20'}>
            <Thumbnails />
          </View>
        </View>
      </View>
    </Container>
  );
};

export default memo(Configs);
