import React, {memo} from 'react';
import View from 'components/View';
import {GameSettingsMode} from 'types/settings';
import Text from 'components/Text';
import i18n from 'i18n';
import colors from 'configuration/colors';
import Button from 'components/Button';
import styles from './styles';

interface Props {
  goal: number;
  totalTurns: number;
  totalPlayers: number;
  currentMode: GameSettingsMode;
  onPressGiveMoreTime: () => void;
}

const GameInfo = (props: Props) => {
  if (props.totalPlayers === 5 && props.currentMode?.mode === 'fast') {
    return <View />;
  }

  if (props.currentMode?.mode === 'fast') {
    return <View flex={'1'} />;
  }

  return (
    <View marginTop={'15'}>
      <View direction={'row'} alignItems={'center'}>
        <View
          style={styles.functionItem}
          flex={'1'}
          direction={'row'}
          alignItems={'center'}
          justify={'center'}>
          <Text fontSize={16}>{i18n.t('totalTurns')}</Text>
          <View marginLeft={'5'}>
            <Text
              fontSize={128}
              adjustsFontSizeToFit={true}
              color={colors.grayBlue}
              fontWeight={'bold'}>
              {props.totalTurns}
            </Text>
          </View>
        </View>
        <View
          style={styles.functionItem}
          flex={'1'}
          direction={'row'}
          alignItems={'center'}>
          <Text fontSize={16}>{i18n.t('goal')}</Text>
          <View marginLeft={'5'}>
            <Text
              fontSize={128}
              adjustsFontSizeToFit={true}
              color={colors.grayBlue}
              fontWeight={'bold'}>
              {props.goal}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.buttonWrapper} direction={'row'} alignItems={'end'}>
        <Button
          onPress={props.onPressGiveMoreTime}
          style={[styles.button, styles.buttonGiveMoreTime]}>
          <Text color={colors.white} fontSize={16}>
            {i18n.t('giveMoreTime')}
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default memo(GameInfo);
