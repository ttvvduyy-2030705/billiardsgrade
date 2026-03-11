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

  const playerPanelStyle = {
  backgroundColor: props.isOnTurn ? '#22090B' : '#140708',
  borderColor: props.isOnTurn ? '#FF4545' : '#6A1A1D',
  borderWidth: props.isOnTurn ? 1.4 : 1,
  shadowColor: '#FF2A2A',
  shadowOpacity: props.isOnTurn ? 0.32 : 0.18,
  shadowRadius: props.isOnTurn ? 18 : 10,
  shadowOffset: {width: 0, height: 0},
  elevation: props.isOnTurn ? 12 : 7,
};

return (
  <View
    flex={'1'}
    style={[styles.container, playerPanelStyle]}
    marginHorizontal={'20'}>
      <PlayerName
        totalPlayers={props.totalPlayers}
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
          <Text fontSize={15} fontWeight={'bold'}>
            {'-'}
          </Text>
        </Button>
        <View marginHorizontal={'10'} />
        <Button style={styles.button} onPress={viewModel.onIncreasePoint}>
          <Text fontSize={15} fontWeight={'bold'}>
            {'+'}
          </Text>
        </Button>
      </View>

      <View
        flex={'1'}
        direction={'row'}
        alignItems={'center'}
        justify={'center'}>
        {viewModel.showProMode ? (
          <ExtraFunctions
            index={props.index}
            highestRate={viewModel.highestRate}
            isOnPoolBreak={props.isOnPoolBreak}
            proModeEnabled={props.proModeEnabled}
            averagePoint={viewModel.averagePoint}
            gameSettings={props.gameSettings}
            onSwitchPoolBreakPlayerIndex={props.onSwitchPoolBreakPlayerIndex}
          />
        ) : (
          <View />
        )}

        <View style={styles.leftContainer}>
          {isPoolGame(props.gameSettings?.category) ? BALLS_VIEW : <View />}
        </View>

        <View flex={'1'} alignItems={'center'} justify={'center'}>
          <Button onPress={viewModel.onIncreasePoint}>
            <Text
  style={[
    viewModel.showProMode
      ? styles.totalPointWrapper
      : styles.totalPointNoMarginBottom,
    {
      color: '#FFF7F7',
      textShadowColor: 'rgba(255, 20, 20, 1)',
      textShadowOffset: {width: 0, height: 0},
      textShadowRadius: 34,
    },
  ]}
  fontSize={512}
  fontWeight={'bold'}
  adjustsFontSizeToFit={true}>
  {props.player.totalPoint}
</Text>
          </Button>
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
