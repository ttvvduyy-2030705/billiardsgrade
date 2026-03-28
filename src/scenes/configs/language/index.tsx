import React, {memo} from 'react';
import Button from 'components/Button';
import Image from 'components/Image';
import Text from 'components/Text';
import View from 'components/View';
import images from 'assets';
import i18n from 'i18n';

import LanguageConfigViewModel from './LanguageViewModel';
import styles from './styles';

const LanguageConfig = () => {
  const viewModel = LanguageConfigViewModel();

  return (
    <View direction={'row'} style={styles.languageWrapper} padding={'20'}>
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
            onPress={viewModel.onChangeLanguage.bind(LanguageConfig, 'vi')}>
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
            onPress={viewModel.onChangeLanguage.bind(LanguageConfig, 'en')}>
            <View direction={'row'} alignItems={'center'}>
              <Image style={styles.iconFlag} source={images.english} />
              <Text>{i18n.t('txten')}</Text>
            </View>
          </Button>
        </View>
      </View>
    </View>
  );
};

export default memo(LanguageConfig);
