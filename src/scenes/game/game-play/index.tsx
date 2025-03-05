import React, {memo, useCallback, useMemo} from 'react';
import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Countdown from 'components/Countdown';
import colors from 'configuration/colors';
import i18n from 'i18n';

import GamePlayViewModel from './GamePlayViewModel';
import GamePlayer from './player';
import GameConsole from './console';
import LivestreamImages from './livestream-images';
import styles, {COUNTDOWN_WIDTH} from './styles';

const GamePlay = () => {
  const viewModel = GamePlayViewModel();

  const renderPlayers = useCallback(
    (topIndex: number, bottomIndex?: number) => {
      return (
        <View flex={'1'} marginTop={'20'}>
          <GamePlayer
            index={topIndex}
            isOnTurn={viewModel.currentPlayerIndex === topIndex}
            isOnPoolBreak={viewModel.poolBreakPlayerIndex === topIndex}
            isStarted={viewModel.isStarted}
            isPaused={viewModel.isPaused}
            soundEnabled={viewModel.soundEnabled}
            proModeEnabled={viewModel.proModeEnabled}
            totalTurns={viewModel.totalTurns}
            gameSettings={viewModel.gameSettings!}
            totalPlayers={viewModel.playerSettings?.playingPlayers?.length}
            player={viewModel.playerSettings!.playingPlayers[topIndex]}
            onSwitchPoolBreakPlayerIndex={
              viewModel.onSwitchPoolBreakPlayerIndex
            }
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
                isOnPoolBreak={viewModel.poolBreakPlayerIndex === bottomIndex}
                isStarted={viewModel.isStarted}
                isPaused={viewModel.isPaused}
                soundEnabled={viewModel.soundEnabled}
                proModeEnabled={viewModel.proModeEnabled}
                totalTurns={viewModel.totalTurns}
                gameSettings={viewModel.gameSettings!}
                totalPlayers={viewModel.playerSettings?.playingPlayers?.length}
                player={viewModel.playerSettings!.playingPlayers[bottomIndex]}
                onSwitchPoolBreakPlayerIndex={
                  viewModel.onSwitchPoolBreakPlayerIndex
                }
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
      viewModel.poolBreakPlayerIndex,
      viewModel.isStarted,
      viewModel.isPaused,
      viewModel.soundEnabled,
      viewModel.proModeEnabled,
      viewModel.totalTurns,
      viewModel.gameSettings,
      viewModel.playerSettings,
      viewModel.onSwitchPoolBreakPlayerIndex,
      viewModel.onChangePlayerPoint,
      viewModel.onEditPlayerName,
      viewModel.onViolate,
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
        isOnPoolBreak={viewModel.poolBreakPlayerIndex === 4}
        isStarted={viewModel.isStarted}
        isPaused={viewModel.isPaused}
        soundEnabled={viewModel.soundEnabled}
        proModeEnabled={viewModel.proModeEnabled}
        totalTurns={viewModel.totalTurns}
        gameSettings={viewModel.gameSettings!}
        totalPlayers={viewModel.playerSettings?.playingPlayers?.length}
        player={viewModel.playerSettings!.playingPlayers[4]}
        onSwitchPoolBreakPlayerIndex={viewModel.onSwitchPoolBreakPlayerIndex}
        onEditPlayerName={viewModel.onEditPlayerName}
        onChangePlayerPoint={viewModel.onChangePlayerPoint}
        onViolate={viewModel.onViolate}
        onEndTurn={viewModel.onEndTurn}
      />
    );
  }, [
    viewModel.currentPlayerIndex,
    viewModel.poolBreakPlayerIndex,
    viewModel.isStarted,
    viewModel.isPaused,
    viewModel.soundEnabled,
    viewModel.proModeEnabled,
    viewModel.totalTurns,
    viewModel.gameSettings,
    viewModel.playerSettings,
    viewModel.onSwitchPoolBreakPlayerIndex,
    viewModel.onChangePlayerPoint,
    viewModel.onEditPlayerName,
    viewModel.onViolate,
    viewModel.onEndTurn,
  ]);

  const renderCountDownTime = useCallback(() => {
    if (!viewModel.gameSettings?.mode?.countdownTime) {
      return <View />;
    }

    return (
      <Button style={styles.countdown} onPress={viewModel.onToggleCountDown}>
        <Countdown
          originalCountdownTime={viewModel.gameSettings.mode?.countdownTime}
          currentCountdownTime={viewModel.countdownTime}
          countdownWidth={COUNTDOWN_WIDTH}
        />
      </Button>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewModel.matchCountdownRef,
    viewModel.gameSettings,
    viewModel.countdownTime,
  ]);

  // const renderCameraMatchInfo = useCallback(() => {
  //   return (
  //     <LivestreamImages
  //       countdownTime={viewModel.countdownTime}
  //       gameSettings={viewModel.gameSettings}
  //       playerSettings={viewModel.playerSettings}
  //       currentPlayerIndex={viewModel.currentPlayerIndex}
  //     />
  //   );
  // }, [
  //   viewModel.countdownTime,
  //   viewModel.gameSettings,
  //   viewModel.playerSettings,
  //   viewModel.currentPlayerIndex,
  // ]);

  const WARM_UP_VIEW = useMemo(() => {
    if (!viewModel.warmUpCountdownTime) {
      return <View />;
    }

    return (
      <View style={styles.warmUpContainer}>
        <Text color={colors.white} fontSize={64}>
          {viewModel.gameBreakEnabled ? i18n.t('gameBreak') : i18n.t('warmUp')}
        </Text>
        <View marginVertical={'15'}>
          <Text color={colors.white} fontSize={256} lineHeight={264}>
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
    viewModel.gameBreakEnabled,
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
          playerSettings={viewModel.playerSettings}
          currentMode={viewModel.gameSettings.mode}
          warmUpCount={viewModel.warmUpCount}
          totalPlayers={viewModel.playerSettings?.playingPlayers?.length}
          totalTime={viewModel.totalTime}
          totalTurns={viewModel.totalTurns}
          goal={viewModel.gameSettings?.players?.goal?.goal}
          countdownTime={viewModel.countdownTime}
          currentPlayerIndex={viewModel.currentPlayerIndex}
          isStarted={viewModel.isStarted}
          isPaused={viewModel.isPaused}
          isMatchPaused={viewModel.isMatchPaused}
          soundEnabled={viewModel.soundEnabled}
          poolBreakEnabled={viewModel.poolBreakEnabled}
          proModeEnabled={viewModel.proModeEnabled}
          webcamFolderName={viewModel.webcamFolderName}
          onGameBreak={viewModel.onGameBreak}
          onPoolBreak={viewModel.onPoolBreak}
          onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
          onWarmUp={viewModel.onWarmUp}
          onSwitchTurn={viewModel.onSwitchTurn}
          onSwapPlayers={viewModel.onSwapPlayers}
          onIncreaseTotalTurns={viewModel.onIncreaseTotalTurns}
          onDecreaseTotalTurns={viewModel.onDecreaseTotalTurns}
          onToggleSound={viewModel.onToggleSound}
          onToggleProMode={viewModel.onToggleProMode}
          onPoolScore={viewModel.onPoolScore}
          renderLastPlayer={renderLastPlayer}
          //renderMatchInfo={renderCameraMatchInfo}
          onSelectWinner={viewModel.onSelectWinner}
          onClearWinner={viewModel.onClearWinner}
          onStart={viewModel.onStart}
          onPause={viewModel.onPause}
          onStop={viewModel.onStop}
          onReset={viewModel.onReset}
          onResetTurn={viewModel.onResetTurn}
          updateWebcamFolderName={viewModel.updateWebcamFolderName}
          cameraRef={viewModel.cameraRef}
          isCameraReady={viewModel.isCameraReady}
          setIsCameraReady={viewModel.setIsCameraReady}
           />
        {renderPlayers(
          1,
          viewModel.playerSettings.playingPlayers[3] ? 3 : undefined,
        )}
      </View>
      {viewModel.gameSettings?.mode?.mode !== 'fast' &&
      viewModel.gameSettings?.mode?.countdownTime ? (
        <View
          ref={viewModel.matchCountdownRef}
          collapsable={false}
          style={styles.countdownContainer}
          direction={'row'}
          alignItems={'center'}
          marginRight={'20'}>
          <View flex={'1'} alignItems={'end'}>
            <View
              style={styles.overlayWrapper}
              marginVertical={'15'}
              paddingHorizontal={'15'}
              paddingVertical={'5'}
              marginRight={'5'}>
              <Text fontSize={48}>{viewModel.countdownTime}</Text>
            </View>
            {viewModel.countdownTime >
            viewModel.gameSettings?.mode?.countdownTime ? (
              <View style={styles.extraWrapper} paddingHorizontal={'10'}>
                <Text fontSize={12}>{'Extension'}</Text>
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
