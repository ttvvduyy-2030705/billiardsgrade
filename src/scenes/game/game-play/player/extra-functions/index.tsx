import React, {memo, useMemo} from 'react';
import Text from 'components/Text';
import View from 'components/View';
import {dims} from 'configuration';
import Button from 'components/Button';
import colors from 'configuration/colors';
import i18n from 'i18n';

import {GameSettings} from 'types/settings';

import {isPoolGame} from 'utils/game';

import styles from './styles';

interface Props {
  index: number;
  highestRate: number;
  isOnPoolBreak: boolean;
  proModeEnabled: boolean;
  averagePoint: string;
  gameSettings?: GameSettings;
  onSwitchPoolBreakPlayerIndex: (
    index: number,
    callback?: (playerIndex: number) => void,
  ) => void;
}

const ExtraFunctions = (props: Props) => {
  const ADDITIONAL_POINTS = useMemo(() => {
    return (
      <View
        flex={'1'}
        style={styles.additionalWrapper}
        direction={'row'}
        justify={'center'}>
        <View
          flex={'1'}
          direction={'row'}
          justify={'center'}
          alignItems={'center'}>
          <Text fontWeight={'bold'} fontSize={dims.screenWidth * 0.01}>
            {'HR'}
          </Text>
          <View marginLeft={'5'}>
            <Text fontSize={48} fontWeight={'bold'} adjustsFontSizeToFit={true}>
              {props.highestRate}
            </Text>
          </View>
        </View>
        <View
          flex={'1'}
          direction={'row'}
          justify={'center'}
          alignItems={'center'}>
          <Text fontWeight={'bold'} fontSize={dims.screenWidth * 0.01}>
            {'AVG'}
          </Text>
          <View marginLeft={'5'}>
            <Text fontSize={48} fontWeight={'bold'} adjustsFontSizeToFit={true}>
              {props.averagePoint}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [props.averagePoint, props.highestRate]);

  return (
    <View style={styles.functionWrapper} direction={'row'} justify={'between'}>
      {props.proModeEnabled && !isPoolGame(props.gameSettings?.category) ? (
        ADDITIONAL_POINTS
      ) : (
        <View />
      )}
      {isPoolGame(props.gameSettings?.category) && props.isOnPoolBreak ? (
        <Button
          style={styles.buttonPoolBreak}
          onPress={props.onSwitchPoolBreakPlayerIndex.bind(
            ExtraFunctions,
            props.index,
            undefined,
          )}>
          <Text
            color={colors.white}
            fontWeight={'bold'}
            fontSize={dims.screenWidth * 0.0125}>
            {i18n.t('break')}
          </Text>
        </Button>
      ) : (
        <View />
      )}
    </View>
  );
};

export default memo(ExtraFunctions);
