import React, {memo, useEffect, useMemo, useState} from 'react';
import {StyleSheet, useWindowDimensions} from 'react-native';

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
import {isCaromGame, isPool15Game, isPool15OnlyGame, isPoolGame} from 'utils/game';

const buildTitle = (category?: string, mode?: string) => {
  return `${i18n.t(category || '').toUpperCase()} - ${i18n
    .t(mode || '')
    .toUpperCase()}`;
};

const localStyles = StyleSheet.create({
  splitColumn: {
    flex: 1,
    gap: 12,
  },
  splitSlot: {
    flex: 1,
    minHeight: 0,
  },
  topBottomBoard: {
    flex: 1,
    gap: 12,
  },
  topBottomRow: {
    flex: 1,
    gap: 12,
  },
  topBottomRowTop: {
    flex: 1.12,
    gap: 12,
  },
  topBottomRowBottom: {
    flex: 0.88,
    gap: 12,
  },
  lightScreen: {
    backgroundColor: '#000000',
  },
  centerCompactCell: {
    flex: 1.02,
    minHeight: 0,
  },
  sideCompactCell: {
    flex: 1,
    minHeight: 0,
  },
  phonePlayerSlot: {
    flex: 0.86,
    minWidth: 0,
  },
  phoneConsoleSlot: {
    flex: 1.18,
    minWidth: 0,
  },
});

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
  const isPhoneLandscape = !isTablet && width > height;
  const useCompactTwoPlayerLayout = isPhoneLandscape || shortestSide < 480;

  const category = viewModel.gameSettings?.category;
  const players = viewModel.playerSettings?.playingPlayers || [];
  const configuredPlayerCount = Number(
    viewModel.gameSettings?.players?.playerNumber || players.length || 2,
  );
  const totalPlayers = Math.max(players.length, configuredPlayerCount, 2);

  const isPoolArenaLayout = useMemo(() => {
    return (
      isPoolGame(category) &&
      !isPool15Game(category) &&
      !isPool15OnlyGame(category) &&
      totalPlayers === 2
    );
  }, [category, totalPlayers]);

  const useDarkPoolBackground = useMemo(() => {
    return (
      isPoolArenaLayout ||
      isPool15Game(category) ||
      isPool15OnlyGame(category)
    );
  }, [category, isPoolArenaLayout]);

  const isCaromMode = useMemo(() => isCaromGame(category), [category]);
  const useThreePlayerLayout = totalPlayers === 3;
  const useFourPlayerLayout = totalPlayers === 4;
  const useFivePlayerCaromLayout = isCaromMode && totalPlayers >= 5;
  const useMultiPlayerLayout =
    !isCameraFullscreen &&
    (useThreePlayerLayout || useFourPlayerLayout || useFivePlayerCaromLayout);
  const useCompactResponsiveLayout =
    useMultiPlayerLayout || (!isCameraFullscreen && useCompactTwoPlayerLayout);

  const responsivePlayerSlotStyle =
    !isCameraFullscreen && useCompactTwoPlayerLayout
      ? localStyles.phonePlayerSlot
      : undefined;
  const responsiveConsoleSlotStyle =
    !isCameraFullscreen && useCompactTwoPlayerLayout
      ? localStyles.phoneConsoleSlot
      : undefined;

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
  const pauseOverlayButtonStyle = {
    minWidth: isTablet ? 360 : 230,
    alignItems: 'center' as const,
    paddingHorizontal: isTablet ? '10%' : '8%',
    paddingVertical: isTablet ? 15 : 10,
  };

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

  const renderPlayer = (playerIndex: number) => {
    const player = players[playerIndex];
    if (!player) {
      return <View style={localStyles.splitSlot} />;
    }

    return (
      <GamePlayer
        layout={'poolArena'}
        compact={useCompactResponsiveLayout}
        index={playerIndex}
        isOnTurn={viewModel.currentPlayerIndex === playerIndex}
        isOnPoolBreak={viewModel.poolBreakPlayerIndex === playerIndex}
        isStarted={viewModel.isStarted}
        isPaused={viewModel.isPaused}
        soundEnabled={viewModel.soundEnabled}
        proModeEnabled={viewModel.proModeEnabled}
        totalTurns={viewModel.totalTurns}
        gameSettings={viewModel.gameSettings}
        totalPlayers={totalPlayers}
        player={player}
        onSwitchPoolBreakPlayerIndex={viewModel.onSwitchPoolBreakPlayerIndex}
        onEditPlayerName={viewModel.onEditPlayerName}
        onChangePlayerPoint={viewModel.onChangePlayerPoint}
        onViolate={viewModel.onViolate}
        onEndTurn={viewModel.onEndTurn}
        onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
      />
    );
  };

  const renderConsole = () => {
    return (
      <GameConsole
        winner={viewModel.winner}
        gameSettings={viewModel.gameSettings}
        playerSettings={viewModel.playerSettings}
        currentMode={viewModel.gameSettings.mode}
        warmUpCount={viewModel.warmUpCount}
        totalPlayers={totalPlayers}
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
        onPool15OnlyScore={viewModel.onPool15OnlyScore}
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
    );
  };

  const renderMainBoard = () => {
    if (isCameraFullscreen) {
      return (
        <View
          flex={'1'}
          direction={'row'}
          style={[
            styles.poolArenaBoard,
            !isCameraFullscreen ? styles.mainArea : styles.mainAreaFullscreen,
          ]}>
          <View style={[styles.poolArenaConsoleWrapper, responsiveConsoleSlotStyle]}>{renderConsole()}</View>
        </View>
      );
    }

    if (useFivePlayerCaromLayout) {
      return (
        <View
          flex={'1'}
          style={[
            styles.poolArenaBoard,
            styles.mainArea,
            localStyles.topBottomBoard,
          ]}>
          <View direction={'row'} style={localStyles.topBottomRowTop}>
            <View style={[localStyles.sideCompactCell, responsivePlayerSlotStyle]}>{renderPlayer(0)}</View>
            <View style={[localStyles.centerCompactCell, responsiveConsoleSlotStyle]}>{renderConsole()}</View>
            <View style={[localStyles.sideCompactCell, responsivePlayerSlotStyle]}>{renderPlayer(1)}</View>
          </View>

          <View direction={'row'} style={localStyles.topBottomRowBottom}>
            <View style={[localStyles.sideCompactCell, responsivePlayerSlotStyle]}>{renderPlayer(2)}</View>
            <View style={[localStyles.centerCompactCell, responsivePlayerSlotStyle]}>{renderPlayer(4)}</View>
            <View style={[localStyles.sideCompactCell, responsivePlayerSlotStyle]}>{renderPlayer(3)}</View>
          </View>
        </View>
      );
    }

    if (useThreePlayerLayout || useFourPlayerLayout) {
      return (
        <View
          flex={'1'}
          direction={'row'}
          style={[styles.poolArenaBoard, styles.mainArea]}>
          <View style={[localStyles.splitColumn, responsivePlayerSlotStyle]}>
            <View style={localStyles.splitSlot}>{renderPlayer(0)}</View>
            <View style={localStyles.splitSlot}>{renderPlayer(2)}</View>
          </View>

          <View style={[styles.poolArenaConsoleWrapper, responsiveConsoleSlotStyle]}>{renderConsole()}</View>

          {useThreePlayerLayout ? (
            <View style={[styles.poolArenaPlayerColumn, responsivePlayerSlotStyle]}>{renderPlayer(1)}</View>
          ) : (
            <View style={[localStyles.splitColumn, responsivePlayerSlotStyle]}>
              <View style={localStyles.splitSlot}>{renderPlayer(1)}</View>
              <View style={localStyles.splitSlot}>{renderPlayer(3)}</View>
            </View>
          )}
        </View>
      );
    }

    return (
      <View
        flex={'1'}
        direction={'row'}
        style={[styles.poolArenaBoard, styles.mainArea]}>
        <View style={[styles.poolArenaPlayerColumn, responsivePlayerSlotStyle]}>{renderPlayer(0)}</View>
        <View style={[styles.poolArenaConsoleWrapper, responsiveConsoleSlotStyle]}>{renderConsole()}</View>
        <View style={[styles.poolArenaPlayerColumn, responsivePlayerSlotStyle]}>{renderPlayer(1)}</View>
      </View>
    );
  };

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
        style={[
          useDarkPoolBackground ? styles.poolArenaScreen : undefined,
          isCaromMode ? localStyles.lightScreen : undefined,
        ]}
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

        {renderMainBoard()}

        {!isCameraFullscreen &&
  (isPoolGame(category) || isCaromGame(category)) &&
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
                pauseOverlayButtonStyle,
                {
                  marginTop: isTablet ? 30 : 18,
                },
              ]}
              onPress={viewModel.onPause}>
              <Text color={colors.white} fontSize={warmButtonTextSize}>
                {i18n.t('stop')}
              </Text>
            </Button>

            <Button
              style={[
                styles.buttonEndWarmUp,
                pauseOverlayButtonStyle,
                {
                  marginTop: isTablet ? 18 : 12,
                },
              ]}
              onPress={viewModel.onReplay}>
              <Text color={colors.white} fontSize={warmButtonTextSize}>
                {i18n.t('reWatch')}
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
