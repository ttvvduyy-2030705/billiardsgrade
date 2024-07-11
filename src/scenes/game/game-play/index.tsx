import React, {memo, useCallback} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import GamePlayViewModel from './GamePlayViewModel';
import GamePlayer from './player';
import GameConsole from './console';

const GamePlay = () => {
  const viewModel = GamePlayViewModel();

  const renderPlayers = useCallback(
    (topIndex: number, bottomIndex?: number) => {
      return (
        <View flex={'1'} marginTop={'20'}>
          <GamePlayer
            index={topIndex}
            isOnTurn={viewModel.currentPlayerIndex === topIndex}
            totalTurns={viewModel.totalTurns}
            gameSettings={viewModel.gameSettings!}
            player={viewModel.playerSettings!.playingPlayers[topIndex]}
            onEditPlayerName={viewModel.onEditPlayerName}
            onChangePlayerPoint={viewModel.onChangePlayerPoint}
            onEndTurn={viewModel.onEndTurn}
          />
          {bottomIndex ? (
            <GamePlayer
              index={bottomIndex}
              isOnTurn={viewModel.currentPlayerIndex === bottomIndex}
              totalTurns={viewModel.totalTurns}
              gameSettings={viewModel.gameSettings!}
              player={viewModel.playerSettings!.playingPlayers[bottomIndex]}
              onEditPlayerName={viewModel.onEditPlayerName}
              onChangePlayerPoint={viewModel.onChangePlayerPoint}
              onEndTurn={viewModel.onEndTurn}
            />
          ) : (
            <View />
          )}
        </View>
      );
    },
    [
      viewModel.currentPlayerIndex,
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
    viewModel.totalTurns,
    viewModel.gameSettings,
    viewModel.playerSettings,
    viewModel.onChangePlayerPoint,
    viewModel.onEditPlayerName,
    viewModel.onEndTurn,
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
          countdownTime={'00:35:45'}
          totalTurns={viewModel.totalTurns}
          goal={viewModel.gameSettings.players.goal.goal}
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
    </Container>
  );
};

export default memo(GamePlay);
