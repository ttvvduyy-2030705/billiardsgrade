import React, {memo} from 'react';
import Button from 'components/Button';
import Text from 'components/Text';
import View from 'components/View';
import {dims} from 'configuration';
import i18n from 'i18n';

import {GameSettings} from 'types/settings';

import {isPoolGame} from 'utils/game';

import playerStyles from '../styles';
import styles from './styles';

interface Props {
  gameSettings?: GameSettings;
  isOnTurn: boolean;
  totalPointInTurn: number;
  onEndTurn: (isPrevious?: boolean) => void;
}

const ProMode = (props: Props) => {
  if (
    props.gameSettings?.mode?.mode === 'fast' ||
    isPoolGame(props.gameSettings?.category)
  ) {
    return <View />;
  }

  return (
    <View direction={'row'}>
      <View flex={'1'} direction={'row'} justify={'between'} alignItems={'end'}>
        {props.isOnTurn ? (
          <Button
            style={playerStyles.buttonEndTurn}
            onPress={props.onEndTurn.bind(ProMode, undefined)}>
            <Text fontSize={dims.screenWidth * 0.02}>{i18n.t('turn')}</Text>
          </Button>
        ) : (
          <View style={playerStyles.buttonEndTurnEmpty} />
        )}
        <View style={styles.totalPointInTurn} paddingVertical={'10'}>
          <Text fontSize={dims.screenWidth * 0.02} fontWeight={'bold'}>
            {props.totalPointInTurn}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default memo(ProMode);
