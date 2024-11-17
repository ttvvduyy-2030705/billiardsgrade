import React, {memo} from 'react';
import {Image} from 'react-native';
import images from 'assets';
import i18n from 'i18n';

import colors from 'configuration/colors';
import styles from './styles';
import Button from 'components/Button';
import Text from 'components/Text';
import GoogleViewModel from './GoogleViewModel';
import View from 'components/View';

const Google = () => {
  const viewModel = GoogleViewModel();

  return (
    <View direction={'row'}>
      <View flex={'1'} direction={'row'} justify={'end'}>
        <Button
          gradientStyle={styles.googleButton}
          onPress={viewModel.onLoginGoogle}
          gradientColors={[colors.lightRed, colors.red]}>
          <Image source={images.google} style={styles.icon} />
          <Text color={colors.white}>{i18n.t('loginWithGoogle')}</Text>
        </Button>
      </View>
    </View>
  );
};

export default memo(Google);
