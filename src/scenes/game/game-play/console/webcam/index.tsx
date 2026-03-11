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
    () => (props.innerControls ? styles.innerControlWrapper : styles.controlWrapper),
    [props.innerControls],
  );

  return (
    <View style={CONTAINER_STYLE}>
      <View style={styles.webcamWrapper}>
        <View style={styles.placeholderWrap}>
          <Image
            source={images.logo}
            style={styles.logo}
            resizeMode={'contain'}
          />
        </View>
      </View>

      {!props.innerControls || viewModel.innerControlsShow ? (
        <View style={CONTROL_STYLE}>
          <View row alignItems={'center'}>
            <Button
              style={styles.actionButton}
              onPress={viewModel.onRefresh}>
              <Image
                source={images.webcam.refresh}
                style={styles.icon}
                resizeMode={'contain'}
              />
              <Text style={styles.actionText}>{i18n.t('refresh')}</Text>
            </Button>

            {canRewatch ? (
              <>
                <Divider />
                <Button
                  style={styles.actionButton}
                  onPress={viewModel.onReWatch}>
                  <Image
                    source={images.webcam.watch}
                    style={styles.icon}
                    resizeMode={'contain'}
                  />
                  <Text style={styles.actionText}>{i18n.t('reWatch')}</Text>
                </Button>
              </>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default memo(WebCam);