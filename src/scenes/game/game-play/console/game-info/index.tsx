import React, {memo} from 'react';
import View from 'components/View';
import {GameSettingsMode} from 'types/settings';
import Text from 'components/Text';
import i18n from 'i18n';
import {dims} from 'configuration';
import colors from 'configuration/colors';
import Button from 'components/Button';
import styles from './styles';

interface Props {
  goal: number;
  totalTurns: number;
  totalPlayers: number;
  currentMode: GameSettingsMode;
  onPressGiveMoreTime: () => void;
  onResetTurn: () => void;
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
        <View flex={'1'} alignItems={'center'} justify={'center'}>
          <Text>{i18n.t('totalTurns')}</Text>
          <Text
            fontSize={dims.screenHeight * 0.1}
            lineHeight={dims.screenHeight * 0.115}
            adjustsFontSizeToFit
            color={colors.grayBlue}
            fontWeight={'bold'}>
            {props.totalTurns}
          </Text>
        </View>
        <View flex={'1'} alignItems={'center'} justify={'center'}>
          <Text>{i18n.t('goal')}</Text>
          <Text
            fontSize={dims.screenHeight * 0.1}
            lineHeight={dims.screenHeight * 0.115}
            adjustsFontSizeToFit
            color={colors.grayBlue}
            fontWeight={'bold'}>
            {props.goal}
          </Text>
        </View>
      </View>
      <View style={styles.buttonWrapper} direction={'row'} alignItems={'end'}>
        <Button
          onPress={props.onResetTurn}
          style={[styles.button, styles.buttonResetTurn]}>
          <Text color={colors.white} fontSize={16}>
            {i18n.t('resetTurn')}
          </Text>
        </Button>
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
