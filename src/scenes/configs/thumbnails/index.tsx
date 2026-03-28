import React, {memo} from 'react';
import View from 'components/View';
import Text from 'components/Text';
import i18n from 'i18n';
import styles from './styles';
import PickerList from './picker-list';
import {keys} from 'configuration/keys';
import Switch from 'components/Switch';
import ThumbnailsViewModel from './ThumbnailsViewModel';

const Thumbnails = () => {
  const viewModel = ThumbnailsViewModel();

  return (
    <View direction={'row'}>
      <View flex={'1'} style={styles.container}>
        <View margin={'20'}>
          <Text fontWeight={'bold'}>{i18n.t('sponsorLogos')}</Text>
        </View>

        <View direction={'row'}>
          <View flex={'1'} marginHorizontal={'20'}>
            <View marginBottom={'10'}>
              <Text>{i18n.t('txtTopLeft')}</Text>
            </View>
            <PickerList saveKey={keys.THUMBNAILS_TOP_LEFT} />
          </View>
          <View flex={'1'}>
            <View marginBottom={'10'}>
              <Text>{i18n.t('txtTopRight')}</Text>
            </View>
            <PickerList saveKey={keys.THUMBNAILS_TOP_RIGHT} />
          </View>
        </View>

        <View direction={'row'} marginVertical={'20'}>
          <View flex={'1'} marginHorizontal={'20'}>
            <View marginBottom={'10'}>
              <Text>{i18n.t('txtBottomLeft')}</Text>
            </View>
            <PickerList saveKey={keys.THUMBNAILS_BOTTOM_LEFT} />
          </View>
          <View flex={'1'}>
            <View marginBottom={'10'}>
              <Text>{i18n.t('txtBottomRight')}</Text>
            </View>
            <PickerList saveKey={keys.THUMBNAILS_BOTTOM_RIGHT} />
          </View>
        </View>

        <View
          direction={'row'}
          alignItems={'center'}
          marginLeft={'20'}
          marginBottom={'20'}>
          <View>
            <Text>{i18n.t('showOnLiveStream')}</Text>
          </View>
          {typeof viewModel.showOnLiveStream === 'boolean' ? (
            <Switch
              defaultValue={viewModel.showOnLiveStream}
              onChange={viewModel.onToggleShowOnLiveStream}
            />
          ) : (
            <View />
          )}
        </View>
      </View>
    </View>
  );
};

export default memo(Thumbnails);
