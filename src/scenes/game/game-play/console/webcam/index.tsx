import React, {memo, useMemo} from 'react';

import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import Image from 'components/Image';
import Divider from 'components/Divider';

import images from 'assets';
import i18n from 'i18n';

import WebCamViewModel, {Props} from './WebCamViewModel';
import styles from './styles';

const WebCam = (props: Props) => {
  const viewModel = WebCamViewModel(props);

  const canRewatch = useMemo(() => {
    return props.isStarted && props.isPaused;
  }, [props.isStarted, props.isPaused]);

  const CONTAINER_STYLE = useMemo(
    () => [styles.container, {aspectRatio: props.innerControls ? 2 : 1.565}],
    [props.innerControls],
  );

  const CONTROL_STYLE = useMemo(
    () =>
      props.innerControls ? styles.innerControlWrapper : styles.controlWrapper,
    [props.innerControls],
  );

  return (
    <View style={CONTAINER_STYLE} marginTop={'10'}>
      <View flex={'1'} direction={'row'}>
        <Button
          style={styles.webcamButton}
          onPress={viewModel.onToggleInnerControls}>
          <View flex={'1'} style={styles.webcamWrapper}>
            <View style={styles.placeholderWrap}>
              <Image
                source={images.logo}
                style={styles.logo}
                resizeMode={'contain'}
              />
            </View>
          </View>
        </Button>
      </View>

      {!props.innerControls || viewModel.innerControlsShow ? (
        <View style={CONTROL_STYLE} direction={'row'} alignItems={'center'}>
          <View flex={'1'} direction={'row'} justify={'center'}>
            <Button onPress={viewModel.onRefresh} style={styles.actionButton}>
              <View
                direction={'row'}
                alignItems={'center'}
                justify={'center'}
                paddingVertical={'10'}>
                <View marginRight={'8'}>
                  <Text style={styles.actionText}>{i18n.t('refresh')}</Text>
                </View>
                <Image source={images.webcam.refresh} style={styles.icon} />
              </View>
            </Button>
          </View>

          <Divider vertical size={'small'} />

          <View flex={'1'} direction={'row'} justify={'center'}>
            <Button
              onPress={viewModel.onReWatch}
              disable={!canRewatch}
              style={styles.actionButton}>
              <View
                direction={'row'}
                alignItems={'center'}
                justify={'center'}
                paddingVertical={'10'}>
                <View marginRight={'8'}>
                  <Text style={styles.actionText}>{i18n.t('reWatch')}</Text>
                </View>
                <Image source={images.webcam.watch} style={styles.icon} />
              </View>
            </Button>
          </View>
        </View>
      ) : (
        <View />
      )}
    </View>
  );
};

export default memo(WebCam);