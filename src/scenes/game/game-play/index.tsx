import React, {memo, useCallback, useMemo} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import GamePlayViewModel from './GamePlayViewModel';
import GamePlayer from './player';
import GameConsole from './console';
import styles from './styles';
import Text from 'components/Text';
import i18n from 'i18n';
import Button from 'components/Button';
import colors from 'configuration/colors';

const GamePlay = () => {
  const viewModel = GamePlayViewModel();

  const renderPlayers = useCallback(
    (topIndex: number, bottomIndex?: number) => {
      return (
        <View flex={'1'} marginTop={'20'}>
          <GamePlayer
            index={topIndex}
            isOnTurn={viewModel.currentPlayerIndex === topIndex}
            isStarted={viewModel.isStarted}
            isPaused={viewModel.isPaused}
            soundEnabled={viewModel.soundEnabled}
            totalTurns={viewModel.totalTurns}
            gameSettings={viewModel.gameSettings!}
            player={viewModel.playerSettings!.playingPlayers[topIndex]}
            onEditPlayerName={viewModel.onEditPlayerName}
            onChangePlayerPoint={viewModel.onChangePlayerPoint}
            onViolate={viewModel.onViolate}
            onEndTurn={viewModel.onEndTurn}
          />
          {bottomIndex ? (
            <View flex={'1'}>
              <View marginTop={'20'} />
              <GamePlayer
                index={bottomIndex}
                isOnTurn={viewModel.currentPlayerIndex === bottomIndex}
                isStarted={viewModel.isStarted}
                isPaused={viewModel.isPaused}
                soundEnabled={viewModel.soundEnabled}
                totalTurns={viewModel.totalTurns}
                gameSettings={viewModel.gameSettings!}
                player={viewModel.playerSettings!.playingPlayers[bottomIndex]}
                onEditPlayerName={viewModel.onEditPlayerName}
                onChangePlayerPoint={viewModel.onChangePlayerPoint}
                onViolate={viewModel.onViolate}
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
      viewModel.isStarted,
      viewModel.isPaused,
      viewModel.soundEnabled,
      viewModel.totalTurns,
      viewModel.gameSettings,
      viewModel.onChangePlayerPoint,
      viewModel.onEditPlayerName,
      viewModel.onViolate,
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
        isStarted={viewModel.isStarted}
        isPaused={viewModel.isPaused}
        soundEnabled={viewModel.soundEnabled}
        totalTurns={viewModel.totalTurns}
        gameSettings={viewModel.gameSettings!}
        player={viewModel.playerSettings!.playingPlayers[4]}
        onEditPlayerName={viewModel.onEditPlayerName}
        onChangePlayerPoint={viewModel.onChangePlayerPoint}
        onViolate={viewModel.onViolate}
        onEndTurn={viewModel.onEndTurn}
      />
    );
  }, [
    viewModel.currentPlayerIndex,
    viewModel.isStarted,
    viewModel.isPaused,
    viewModel.soundEnabled,
    viewModel.totalTurns,
    viewModel.gameSettings,
    viewModel.playerSettings,
    viewModel.onChangePlayerPoint,
    viewModel.onEditPlayerName,
    viewModel.onViolate,
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

  const WARM_UP_VIEW = useMemo(() => {
    if (!viewModel.warmUpCountdownTime) {
      return <View />;
    }

    return (
      <View style={styles.warmUpContainer}>
        <Text color={colors.white} fontSize={64}>
          {i18n.t('warmUp')}
        </Text>
        <View marginVertical={'15'}>
          <Text color={colors.white} fontSize={128}>
            {viewModel.getWarmUpTimeString()}
          </Text>
        </View>
        <Button style={styles.buttonEndWarmUp} onPress={viewModel.onEndWarmUp}>
          <Text color={colors.white} fontSize={32}>
            {i18n.t('stop')}
          </Text>
        </Button>
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewModel.warmUpCountdownTime,
    viewModel.getWarmUpTimeString,
    viewModel.onEndWarmUp,
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
          winner={viewModel.winner}
          gameSettings={viewModel.gameSettings}
          currentMode={viewModel.gameSettings.mode}
          warmUpCount={viewModel.warmUpCount}
          totalPlayers={viewModel.playerSettings.playingPlayers.length}
          totalTime={viewModel.totalTime}
          totalTurns={viewModel.totalTurns}
          goal={viewModel.gameSettings.players.goal.goal}
          isStarted={viewModel.isStarted}
          isPaused={viewModel.isPaused}
          soundEnabled={viewModel.soundEnabled}
          onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
          onWarmUp={viewModel.onWarmUp}
          onSwitchTurn={viewModel.onSwitchTurn}
          onSwapPlayers={viewModel.onSwapPlayers}
          onToggleSound={viewModel.onToggleSound}
          onPoolScore={viewModel.onPoolScore}
          renderLastPlayer={renderLastPlayer}
          onSelectWinner={viewModel.onSelectWinner}
          onClearWinner={viewModel.onClearWinner}
          onStart={viewModel.onStart}
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
          <View flex={'1'} marginLeft={'20'}>
            <Text fontSize={48}>{viewModel.countdownTime}</Text>
            {viewModel.countdownTime >
            viewModel.gameSettings.mode.countdownTime ? (
              <View style={styles.extraWrapper} paddingHorizontal={'10'}>
                <Text fontSize={12}>{'Extra'}</Text>
              </View>
            ) : (
              <View />
            )}
          </View>
          <View style={styles.countdownWrapper}>{renderCountDownTime()}</View>
        </View>
      ) : (
        <View />
      )}

      {WARM_UP_VIEW}
    </Container>
  );
};

export default memo(GamePlay);
