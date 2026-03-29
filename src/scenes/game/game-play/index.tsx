import React, {memo, useEffect, useMemo, useState} from 'react';
import {useWindowDimensions} from 'react-native';

import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import colors from 'configuration/colors';
import i18n from 'i18n';

import GamePlayViewModel from './GamePlayViewModel';
import GamePlayer from './player';
import GameConsole from './console';
import styles from './styles';
import TopMatchHeader from './TopMatchHeader';
import PoolShotClock from './PoolShotClock';
import {
  getCameraFullscreen,
  subscribeCameraFullscreen,
} from './cameraFullscreenStore';
import {isPool15Game, isPool15OnlyGame, isPoolGame} from 'utils/game';

const buildTitle = (category?: string, mode?: string) => {
  return `${i18n.t(category || '').toUpperCase()} - ${i18n
    .t(mode || '')
    .toUpperCase()}`;
};

const GamePlay = () => {
  const viewModel = GamePlayViewModel();
  const {width, height} = useWindowDimensions();
  const [isCameraFullscreen, setIsCameraFullscreen] = useState(
    getCameraFullscreen(),
  );
  const [remoteEnabled, setRemoteEnabled] = useState(false);

  useEffect(() => {
    return subscribeCameraFullscreen(setIsCameraFullscreen);
  }, []);

  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 600;

  const isPoolArenaLayout = useMemo(() => {
    const category = viewModel.gameSettings?.category;

    return (
      isPoolGame(category) &&
      !isPool15Game(category) &&
      !isPool15OnlyGame(category) &&
      (viewModel.playerSettings?.playingPlayers?.length ?? 0) === 2
    );
  }, [viewModel.gameSettings?.category, viewModel.playerSettings]);

  const title = useMemo(() => {
    return buildTitle(
      viewModel.gameSettings?.category,
      viewModel.gameSettings?.mode?.mode,
    );
  }, [viewModel.gameSettings?.category, viewModel.gameSettings?.mode?.mode]);

  const warmTitleSize = isTablet ? 64 : 42;
  const warmTimerSize = isTablet ? 256 : 144;
  const warmTimerLineHeight = Math.round(warmTimerSize * 1.03);
  const warmButtonTextSize = isTablet ? 32 : 22;

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

  const showPauseOverlay =
    viewModel.isPaused &&
    !viewModel.warmUpCountdownTime &&
    !isCameraFullscreen &&
    !viewModel.youtubeLiveOverlay?.visible;

  const WARM_UP_VIEW = !viewModel.warmUpCountdownTime || isCameraFullscreen ? (
    <View />
  ) : (
    <View style={styles.warmUpContainer}>
      <Text color={colors.white} fontSize={warmTitleSize}>
        {viewModel.gameBreakEnabled ? i18n.t('gameBreak') : i18n.t('warmUp')}
      </Text>

      <View marginVertical={isTablet ? '15' : '8'}>
        <Text
          color={colors.white}
          fontSize={warmTimerSize}
          lineHeight={warmTimerLineHeight}>
          {viewModel.getWarmUpTimeString()}
        </Text>
      </View>

      <Button
        style={[
          styles.buttonEndWarmUp,
          {
            paddingHorizontal: isTablet ? '10%' : '8%',
            paddingVertical: isTablet ? 15 : 10,
            marginTop: isTablet ? 30 : 18,
          },
        ]}
        onPress={viewModel.onEndWarmUp}>
        <Text color={colors.white} fontSize={warmButtonTextSize}>
          {i18n.t('stop')}
        </Text>
      </Button>
    </View>
  );

  return (
    <Container>
      <View
        style={isPoolArenaLayout ? styles.poolArenaScreen : undefined}
        flex={'1'}>
        {!isCameraFullscreen ? (
          <TopMatchHeader
            title={title}
            soundEnabled={viewModel.soundEnabled}
            onToggleSound={viewModel.onToggleSound}
            remoteEnabled={remoteEnabled}
            onToggleRemote={setRemoteEnabled}
            proModeEnabled={viewModel.proModeEnabled}
            onToggleProMode={viewModel.onToggleProMode}
            gameSettings={viewModel.gameSettings}
          />
        ) : null}

        <View
          flex={'1'}
          direction={'row'}
          style={[
            styles.poolArenaBoard,
            !isCameraFullscreen ? styles.mainArea : styles.mainAreaFullscreen,
          ]}>
          {isCameraFullscreen ? (
            <View />
          ) : (
            <View style={styles.poolArenaPlayerColumn}>
              <GamePlayer
                layout={'poolArena'}
                index={0}
                isOnTurn={viewModel.currentPlayerIndex === 0}
                isOnPoolBreak={viewModel.poolBreakPlayerIndex === 0}
                isStarted={viewModel.isStarted}
                isPaused={viewModel.isPaused}
                soundEnabled={viewModel.soundEnabled}
                proModeEnabled={viewModel.proModeEnabled}
                totalTurns={viewModel.totalTurns}
                gameSettings={viewModel.gameSettings}
                totalPlayers={viewModel.playerSettings.playingPlayers.length}
                player={viewModel.playerSettings.playingPlayers[0]}
                onSwitchPoolBreakPlayerIndex={
                  viewModel.onSwitchPoolBreakPlayerIndex
                }
                onEditPlayerName={viewModel.onEditPlayerName}
                onChangePlayerPoint={viewModel.onChangePlayerPoint}
                onViolate={viewModel.onViolate}
                onEndTurn={viewModel.onEndTurn}
                onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
              />
            </View>
          )}

          <View style={styles.poolArenaConsoleWrapper}>
            <GameConsole
              winner={viewModel.winner}
              gameSettings={viewModel.gameSettings}
              playerSettings={viewModel.playerSettings}
              currentMode={viewModel.gameSettings.mode}
              warmUpCount={viewModel.warmUpCount}
              totalPlayers={viewModel.playerSettings.playingPlayers.length}
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
              renderLastPlayer={() => <View />}
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
              youtubeLivePreviewActive={viewModel.youtubeLivePreviewActive}
            />
          </View>

          {isCameraFullscreen ? (
            <View />
          ) : (
            <View style={styles.poolArenaPlayerColumn}>
              <GamePlayer
                layout={'poolArena'}
                index={1}
                isOnTurn={viewModel.currentPlayerIndex === 1}
                isOnPoolBreak={viewModel.poolBreakPlayerIndex === 1}
                isStarted={viewModel.isStarted}
                isPaused={viewModel.isPaused}
                soundEnabled={viewModel.soundEnabled}
                proModeEnabled={viewModel.proModeEnabled}
                totalTurns={viewModel.totalTurns}
                gameSettings={viewModel.gameSettings}
                totalPlayers={viewModel.playerSettings.playingPlayers.length}
                player={viewModel.playerSettings.playingPlayers[1]}
                onSwitchPoolBreakPlayerIndex={
                  viewModel.onSwitchPoolBreakPlayerIndex
                }
                onEditPlayerName={viewModel.onEditPlayerName}
                onChangePlayerPoint={viewModel.onChangePlayerPoint}
                onViolate={viewModel.onViolate}
                onEndTurn={viewModel.onEndTurn}
                onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
              />
            </View>
          )}
        </View>

        {!isCameraFullscreen &&
        viewModel.gameSettings?.mode?.mode !== 'fast' &&
        viewModel.gameSettings?.mode?.countdownTime ? (
          <View
            ref={viewModel.matchCountdownRef}
            collapsable={false}
            style={styles.countdownContainer}>
            <PoolShotClock
              originalCountdownTime={
                viewModel.gameSettings?.mode?.countdownTime || 40
              }
              currentCountdownTime={viewModel.countdownTime || 0}
              onPress={viewModel.onToggleCountDown}
            />
          </View>
        ) : null}

        {showPauseOverlay ? (
          <View style={styles.warmUpContainer}>
            <Text color={colors.white} fontSize={warmTitleSize}>
              {i18n.t('pause')}
            </Text>

            <Button
              style={[
                styles.buttonEndWarmUp,
                {
                  paddingHorizontal: isTablet ? '10%' : '8%',
                  paddingVertical: isTablet ? 15 : 10,
                  marginTop: isTablet ? 30 : 18,
                },
              ]}
              onPress={viewModel.onPause}>
              <Text color={colors.white} fontSize={warmButtonTextSize}>
                {i18n.t('stop')}
              </Text>
            </Button>
          </View>
        ) : null}

        {WARM_UP_VIEW}
      </View>
    </Container>
  );
};

export default memo(GamePlay);
