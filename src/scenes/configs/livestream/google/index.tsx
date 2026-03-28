import React, {memo} from 'react';
import {Image} from 'react-native';
import images from 'assets';
import i18n from 'i18n';

import View from 'components/View';
import Button from 'components/Button';
import Text from 'components/Text';
import colors from 'configuration/colors';
import GoogleViewModel, {Props} from './GoogleViewModel';
import styles from './styles';

const Google = (props: Props) => {
  const viewModel = GoogleViewModel(props);

  return (
    <View direction={'row'}>
      <View flex={'1'} direction={'row'} justify={'end'}>
        <Button
          gradientStyle={styles.googleButton}
          onPress={viewModel.onLoginGoogle}
          gradientColors={[colors.lightRed, colors.red]}>
          <Image source={images.google} style={styles.icon} />
          <Text color={colors.white}>
            {props.liveStreamData.username
              ? props.liveStreamData.username
              : i18n.t('loginWithGoogle')}
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default memo(Google);
