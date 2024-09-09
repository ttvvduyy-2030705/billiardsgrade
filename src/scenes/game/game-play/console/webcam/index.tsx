import React, {memo} from 'react';
import View from 'components/View';
import styles from './styles';
import Button from 'components/Button';
import Text from 'components/Text';
import Image from 'components/Image';
import images from 'assets';
import i18n from 'i18n';
import WebCamViewModel from './WebCamViewModel';
import Divider from 'components/Divider';

const WebCam = () => {
  const viewModel = WebCamViewModel();

  return (
    <View style={styles.container}>
      <View flex={'1'} style={styles.video} direction={'row'} marginTop={'10'}>
        <View flex={'1'}>
          <Text>{'a'}</Text>
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
