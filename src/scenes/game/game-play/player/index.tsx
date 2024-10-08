import React, {memo, useMemo} from 'react';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Ball from 'components/Ball';
import {isPoolGame} from 'utils/game';

import PlayerName from './player-name';
import PointSteps from './point-steps';
import ExtraTimeTurns from './extra-time-turns';
import ProMode from './pro-mode';
import PoolMode from './pool-mode';
import ExtraFunctions from './extra-functions';
import PlayerViewModel, {Props} from './PlayerViewModel';
import styles from './styles';

const GamePlayer = (props: Props) => {
  const viewModel = PlayerViewModel(props);

  const BALLS_VIEW = useMemo(() => {
    return (
      <View
        style={styles.ballsWrapper}
        direction={'row'}
        marginLeft={'15'}
        marginTop={'10'}
        justify={'around'}>
        {props.player.scoredBalls?.map((ball, index) => {
          return (
            <Ball key={`selected-ball-${index}`} data={ball} size={'small'} />
          );
        })}
      </View>
    );
  }, [props]);

  return (
    <View
      flex={'1'}
      style={[styles.container, {backgroundColor: props.player.color}]}
      marginHorizontal={'20'}>
      <PlayerName
        player={props.player}
        nameEditable={viewModel.nameEditable}
        onChangeName={viewModel.onChangeName}
        onToggleEditName={viewModel.onToggleEditName}
      />

      <View
        direction={'row'}
        alignItems={'center'}
        marginHorizontal={'20'}
        marginTop={'10'}>
        <Button style={styles.button} onPress={viewModel.onDecreasePoint}>
          <Text fontSize={24} fontWeight={'bold'}>
            {'-'}
          </Text>
        </Button>
        <View marginHorizontal={'10'} />
        <Button style={styles.button} onPress={viewModel.onIncreasePoint}>
          <Text fontSize={24} fontWeight={'bold'}>
            {'+'}
          </Text>
        </Button>
      </View>

      <View
        flex={'1'}
        direction={'row'}
        alignItems={'center'}
        justify={'center'}>
        <ExtraFunctions
          index={props.index}
          highestRate={viewModel.highestRate}
          isOnPoolBreak={props.isOnPoolBreak}
          proModeEnabled={props.proModeEnabled}
          averagePoint={viewModel.averagePoint}
          gameSettings={props.gameSettings}
          onSwitchPoolBreakPlayerIndex={props.onSwitchPoolBreakPlayerIndex}
        />

        <View style={styles.leftContainer}>
          {isPoolGame(props.gameSettings?.category) ? BALLS_VIEW : <View />}
        </View>

        <View
          style={
            props.proModeEnabled && !isPoolGame(props.gameSettings?.category)
              ? styles.totalPointWrapper
              : styles.totalPointNoMarginBottom
          }
          flex={'1'}
          alignItems={'center'}
          justify={'center'}>
          <Text fontSize={512} adjustsFontSizeToFit={true}>
            {props.player.totalPoint}
          </Text>
        </View>

        <ExtraTimeTurns
          gameSettings={props.gameSettings}
          player={props.player}
        />
      </View>

      <PointSteps
        gameSettings={props.gameSettings}
        onPressPointStep={viewModel.onPressPointStep}
      />

      <PoolMode
        gameSettings={props.gameSettings}
        isOnTurn={props.isOnTurn}
        player={props.player}
        onEndTurn={viewModel.onEndTurn}
        onViolate={viewModel.onViolate}
        onResetViolate={viewModel.onResetViolate}
      />

      <ProMode
        gameSettings={props.gameSettings}
        isOnTurn={props.isOnTurn}
        totalPointInTurn={viewModel.totalPointInTurn}
        onEndTurn={viewModel.onEndTurn}
      />
    </View>
  );
};

export default memo(GamePlayer);
