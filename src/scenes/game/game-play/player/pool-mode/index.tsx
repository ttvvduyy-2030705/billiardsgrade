import React, {memo} from 'react';
import Button from 'components/Button';
import Text from 'components/Text';
import View from 'components/View';
import {dims} from 'configuration';
import colors from 'configuration/colors';
import i18n from 'i18n';

import {isPoolGame} from 'utils/game';
import {GameSettings} from 'types/settings';

import {Player} from 'types/player';

import playerStyles from '../styles';
import styles from './styles';

interface Props {
  gameSettings?: GameSettings;
  isOnTurn: boolean;
  player: Player;
  onEndTurn: (isPrevious?: boolean) => void;
  onViolate: () => void;
  onResetViolate: () => void;
}

const PoolMode = (props: Props) => {
  if (!isPoolGame(props.gameSettings?.category)) {
    return <View />;
  }

  return (
    <View direction={'row'}>
      <View flex={'1'} direction={'row'} justify={'between'} alignItems={'end'}>
        {props.isOnTurn ? (
          <Button
            style={playerStyles.buttonEndTurn}
            onPress={props.onEndTurn.bind(PoolMode, undefined)}>
            <Text fontSize={dims.screenWidth * 0.02}>{i18n.t('turn')}</Text>
          </Button>
        ) : (
          <View style={playerStyles.buttonEndTurnEmpty} />
        )}
        <View
          direction={'row'}
          alignItems={'center'}
          marginRight={'15'}
          marginBottom={'10'}>
          <Button
            style={styles.buttonViolate}
            onPress={props.onViolate}
            onLongPress={props.onResetViolate}>
            <Text
              style={styles.textX}
              color={colors.white}
              fontWeight={'bold'}
              fontSize={48}>
              {'X'}
            </Text>
          </Button>
          <View marginLeft={'10'}>
            <Text fontSize={64} lineHeight={64} style={styles.textViolate}>
              {props.player.violate || 0}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default memo(PoolMode);
