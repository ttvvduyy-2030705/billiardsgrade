import React, {memo, useCallback} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import GamePlayViewModel from './GamePlayViewModel';
import GamePlayer from './player';
import GameConsole from './console';
import styles from './styles';
import Text from 'components/Text';

const GamePlay = () => {
  const viewModel = GamePlayViewModel();

  const renderPlayers = useCallback(
    (topIndex: number, bottomIndex?: number) => {
      return (
        <View flex={'1'} marginTop={'20'}>
          <GamePlayer
            index={topIndex}
            isOnTurn={viewModel.currentPlayerIndex === topIndex}
            isPaused={viewModel.isPaused}
            totalTurns={viewModel.totalTurns}
            gameSettings={viewModel.gameSettings!}
            player={viewModel.playerSettings!.playingPlayers[topIndex]}
            onEditPlayerName={viewModel.onEditPlayerName}
            onChangePlayerPoint={viewModel.onChangePlayerPoint}
            onEndTurn={viewModel.onEndTurn}
          />
          {bottomIndex ? (
            <View flex={'1'}>
              <View marginTop={'20'} />
              <GamePlayer
                index={bottomIndex}
                isOnTurn={viewModel.currentPlayerIndex === bottomIndex}
                isPaused={viewModel.isPaused}
                totalTurns={viewModel.totalTurns}
                gameSettings={viewModel.gameSettings!}
                player={viewModel.playerSettings!.playingPlayers[bottomIndex]}
                onEditPlayerName={viewModel.onEditPlayerName}
                onChangePlayerPoint={viewModel.onChangePlayerPoint}
                onEndTurn={viewModel.onEndTurn}
              />
            </View>
          ) : (
            <View />
          )}
        </View>
      );
    },
    [
      viewModel.currentPlayerIndex,
      viewModel.isPaused,
      viewModel.totalTurns,
      viewModel.gameSettings,
      viewModel.onChangePlayerPoint,
      viewModel.onEditPlayerName,
      viewModel.playerSettings,
      viewModel.onEndTurn,
    ],
  );

  const renderLastPlayer = useCallback(() => {
    if (!viewModel.playerSettings?.playingPlayers[4]) {
      return <View flex={'1'} />;
    }

    return (
      <GamePlayer
        index={4}
        isOnTurn={viewModel.currentPlayerIndex === 4}
        isPaused={viewModel.isPaused}
        totalTurns={viewModel.totalTurns}
        gameSettings={viewModel.gameSettings!}
        player={viewModel.playerSettings!.playingPlayers[4]}
        onEditPlayerName={viewModel.onEditPlayerName}
        onChangePlayerPoint={viewModel.onChangePlayerPoint}
        onEndTurn={viewModel.onEndTurn}
      />
    );
  }, [
    viewModel.currentPlayerIndex,
    viewModel.isPaused,
    viewModel.totalTurns,
    viewModel.gameSettings,
    viewModel.playerSettings,
    viewModel.onChangePlayerPoint,
    viewModel.onEditPlayerName,
    viewModel.onEndTurn,
  ]);

  const renderCountDownTime = useCallback(() => {
    if (!viewModel.gameSettings?.mode.countdownTime) {
      return <View />;
    }

    return (
      <View flex={'1'} direction={'row'} style={styles.countdown}>
        {Array.from(
          {length: viewModel.gameSettings.mode.countdownTime},
          (_, index) => {
            if (viewModel.countdownTime <= index) {
              return (
                <View
                  key={`countdown-item-hide-${index}`}
                  style={[
                    styles.countdownItem,
                    {width: viewModel.getCountdownWidthItem()},
                  ]}
                />
              );
            }

            return (
              <View
                key={`countdown-item-${index}`}
                style={[
                  styles.countdownItem,
                  {
                    width: viewModel.getCountdownWidthItem(),
                    backgroundColor: viewModel.getCountdownColor(index),
                  },
                ]}
              />
            );
          },
        ).reverse()}
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewModel.gameSettings,
    viewModel.countdownTime,
    viewModel.getCountdownColor,
    viewModel.getCountdownWidthItem,
  ]);

  if (
    !viewModel.gameSettings ||
    viewModel.updateGameSettings.isLoading ||
    !viewModel.playerSettings
  ) {
    return (
      <Container isLoading={true}>
        <View />
      </Container>
    );
  }

  return (
    <Container>
      <View flex={'1'} direction={'row'}>
        {renderPlayers(
          0,
          viewModel.playerSettings.playingPlayers[2] ? 2 : undefined,
        )}
        <GameConsole
          gameSettings={viewModel.gameSettings}
          currentMode={viewModel.gameSettings.mode}
          totalPlayers={viewModel.playerSettings.playingPlayers.length}
          totalTime={viewModel.totalTime}
          totalTurns={viewModel.totalTurns}
          goal={viewModel.gameSettings.players.goal.goal}
          isPaused={viewModel.isPaused}
          onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
          onSwitchTurn={viewModel.onSwitchTurn}
          onSwapPlayers={viewModel.onSwapPlayers}
          renderLastPlayer={renderLastPlayer}
          onPause={viewModel.onPause}
          onStop={viewModel.onStop}
        />
        {renderPlayers(
          1,
          viewModel.playerSettings.playingPlayers[3] ? 3 : undefined,
        )}
      </View>
      {viewModel.gameSettings.mode.mode !== 'fast' &&
      viewModel.gameSettings.mode.countdownTime ? (
        <View direction={'row'} alignItems={'center'} marginRight={'20'}>
          <View flex={'1'} paddingHorizontal={'20'}>
            <Text fontSize={48}>{viewModel.countdownTime}</Text>
          </View>
          <View style={styles.countdownWrapper}>{renderCountDownTime()}</View>
        </View>
      ) : (
        <View />
      )}
    </Container>
  );
};

export default memo(GamePlay);
