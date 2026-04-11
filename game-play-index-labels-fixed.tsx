import React, {memo, useEffect, useMemo, useState} from 'react';
import {StyleSheet} from 'react-native';

import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import colors from 'configuration/colors';
import i18n from 'i18n';

import GamePlayViewModel from './GamePlayViewModel';
import GamePlayer from './player';
import GameConsole from './console';
import createStyles from './styles';
import TopMatchHeader from './TopMatchHeader';
import PoolShotClock from './PoolShotClock';
import {
  getCameraFullscreen,
  subscribeCameraFullscreen,
} from './cameraFullscreenStore';
import {
  isCaromGame,
  isPool15Game,
  isPool15OnlyGame,
  isPoolGame,
} from 'utils/game';
import useAdaptiveLayout, {AdaptiveLayout} from '../useAdaptiveLayout';

const buildTitle = (category?: string, mode?: string) => {
  return `${i18n.t(category || '').toUpperCase()} - ${i18n
    .t(mode || '')
    .toUpperCase()}`;
};


const formatHeaderTime = (totalTime?: number) => {
  const safeTotalTime = Number(totalTime || 0);
  const hours = Math.floor(safeTotalTime / 3600);
  const minutes = Math.floor((safeTotalTime % 3600) / 60);
  const seconds = Math.floor(safeTotalTime % 60);

  const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const createLocalStyles = (a: AdaptiveLayout) =>
  StyleSheet.create({
    splitColumn: {
      flex: 1,
      gap: a.layoutPreset === 'phone' ? a.s(8) : a.s(12),
    },
    splitColumnCompact: {
      gap: a.s(8),
    },
    splitSlot: {
      flex: 1,
      minHeight: 0,
    },
    topBottomBoard: {
      flex: 1,
      gap: a.layoutPreset === 'phone' ? a.s(8) : a.s(12),
    },
    topBottomBoardCompact: {
      gap: a.s(8),
    },
    topBottomRowTop: {
      flex: 1.12,
      gap: a.layoutPreset === 'phone' ? a.s(8) : a.s(12),
    },
    topBottomRowBottom: {
      flex: 0.88,
      gap: a.layoutPreset === 'phone' ? a.s(8) : a.s(12),
    },
    topBottomRowCompact: {
      gap: a.s(8),
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
    tabletPlayerSlot: {
      flex: 0.92,
      minWidth: 0,
    },
    tabletConsoleSlot: {
      flex: 1.12,
      minWidth: 0,
    },
    compactMainArea: {
      paddingHorizontal: a.s(6),
      paddingVertical: a.s(6),
      gap: a.s(8),
    },
  });

const GamePlay = () => {
  const viewModel = GamePlayViewModel();
  const adaptive = useAdaptiveLayout();
  const styles = useMemo(() => createStyles(adaptive), [adaptive.styleKey]);
  const localStyles = useMemo(
    () => createLocalStyles(adaptive),
    [adaptive.styleKey],
  );
  const [isCameraFullscreen, setIsCameraFullscreen] = useState(
    getCameraFullscreen(),
  );
  const [remoteEnabled, setRemoteEnabled] = useState(false);

  useEffect(() => {
    return subscribeCameraFullscreen(setIsCameraFullscreen);
  }, []);

  const isLargeDisplay = adaptive.layoutPreset === 'tv';
  const isWideTabletTwoPlayer =
    adaptive.isLandscape && adaptive.layoutPreset === 'wideTablet';
  const isCompactLandscape =
    adaptive.isLandscape &&
    (adaptive.height <= 720 || adaptive.aspectRatio >= 1.65 || adaptive.widthClass === 'compact');
  const useCompactTwoPlayerLayout =
    isCompactLandscape || adaptive.shortSide < 430 || adaptive.height <= 700;
  const useTightTwoPlayerLayout =
    useCompactTwoPlayerLayout || isWideTabletTwoPlayer;

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
    !isCameraFullscreen && useTightTwoPlayerLayout
      ? localStyles.tabletPlayerSlot
      : undefined;

  const responsiveConsoleSlotStyle =
    !isCameraFullscreen && useTightTwoPlayerLayout
      ? localStyles.tabletConsoleSlot
      : undefined;

  const compactMainAreaStyle =
    !isCameraFullscreen && useTightTwoPlayerLayout
      ? localStyles.compactMainArea
      : undefined;

  const title = useMemo(() => {
    return buildTitle(
      viewModel.gameSettings?.category,
      viewModel.gameSettings?.mode?.mode,
    );
  }, [viewModel.gameSettings?.category, viewModel.gameSettings?.mode?.mode]);

  const headerTimeText = useMemo(() => {
    return formatHeaderTime(viewModel.totalTime);
  }, [viewModel.totalTime]);

  const usePoolHeaderClock = useMemo(() => {
    return isPoolGame(category) && !isPool15Game(category) && !isPool15OnlyGame(category);
  }, [category]);

  const warmTitleSize = adaptive.fs(isLargeDisplay ? 64 : 52, 0.8, 1.06);
  const warmTimerSize = adaptive.fs(isLargeDisplay ? 256 : 190, 0.74, 1.05);
  const warmTimerLineHeight = Math.round(warmTimerSize * 1.03);
  const warmButtonTextSize = adaptive.fs(isLargeDisplay ? 32 : 24, 0.82, 1.04);

  const pauseOverlayButtonStyle = {
    minWidth: isLargeDisplay ? adaptive.s(360) : adaptive.s(230),
    alignItems: 'center' as const,
    paddingHorizontal: adaptive.s(isLargeDisplay ? 36 : 22),
    paddingVertical: adaptive.s(isLargeDisplay ? 15 : 10),
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
    !viewModel.winner &&
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
            styles.mainAreaFullscreen,
            compactMainAreaStyle,
          ]}>
          <View
            style={[
              styles.poolArenaConsoleWrapper,
              responsiveConsoleSlotStyle,
            ]}>
            {renderConsole()}
          </View>
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
            useCompactResponsiveLayout && localStyles.topBottomBoardCompact,
            compactMainAreaStyle,
          ]}>
          <View
            direction={'row'}
            style={[
              localStyles.topBottomRowTop,
              useCompactResponsiveLayout && localStyles.topBottomRowCompact,
            ]}>
            <View
              style={[localStyles.sideCompactCell, responsivePlayerSlotStyle]}>
              {renderPlayer(0)}
            </View>
            <View
              style={[
                localStyles.centerCompactCell,
                responsiveConsoleSlotStyle,
              ]}>
              {renderConsole()}
            </View>
            <View
              style={[localStyles.sideCompactCell, responsivePlayerSlotStyle]}>
              {renderPlayer(1)}
            </View>
          </View>

          <View
            direction={'row'}
            style={[
              localStyles.topBottomRowBottom,
              useCompactResponsiveLayout && localStyles.topBottomRowCompact,
            ]}>
            <View
              style={[localStyles.sideCompactCell, responsivePlayerSlotStyle]}>
              {renderPlayer(2)}
            </View>
            <View
              style={[localStyles.centerCompactCell, responsivePlayerSlotStyle]}>
              {renderPlayer(4)}
            </View>
            <View
              style={[localStyles.sideCompactCell, responsivePlayerSlotStyle]}>
              {renderPlayer(3)}
            </View>
          </View>
        </View>
      );
    }

    if (useThreePlayerLayout || useFourPlayerLayout) {
      return (
        <View
          flex={'1'}
          direction={'row'}
          style={[styles.poolArenaBoard, styles.mainArea, compactMainAreaStyle]}>
          <View
            style={[
              localStyles.splitColumn,
              useCompactResponsiveLayout && localStyles.splitColumnCompact,
              responsivePlayerSlotStyle,
            ]}>
            <View style={localStyles.splitSlot}>{renderPlayer(0)}</View>
            <View style={localStyles.splitSlot}>{renderPlayer(2)}</View>
          </View>

          <View
            style={[
              styles.poolArenaConsoleWrapper,
              responsiveConsoleSlotStyle,
            ]}>
            {renderConsole()}
          </View>

          {useThreePlayerLayout ? (
            <View
              style={[styles.poolArenaPlayerColumn, responsivePlayerSlotStyle]}>
              {renderPlayer(1)}
            </View>
          ) : (
            <View
              style={[
                localStyles.splitColumn,
                useCompactResponsiveLayout && localStyles.splitColumnCompact,
                responsivePlayerSlotStyle,
              ]}>
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
        style={[styles.poolArenaBoard, styles.mainArea, compactMainAreaStyle]}>
        <View style={[styles.poolArenaPlayerColumn, responsivePlayerSlotStyle]}>
          {renderPlayer(0)}
        </View>
        <View
          style={[styles.poolArenaConsoleWrapper, responsiveConsoleSlotStyle]}>
          {renderConsole()}
        </View>
        <View style={[styles.poolArenaPlayerColumn, responsivePlayerSlotStyle]}>
          {renderPlayer(1)}
        </View>
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

      <View marginVertical={isLargeDisplay ? '15' : '8'}>
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
            paddingHorizontal: adaptive.s(isLargeDisplay ? 36 : 22),
            paddingVertical: adaptive.s(isLargeDisplay ? 15 : 10),
            marginTop: adaptive.s(isLargeDisplay ? 30 : 18),
          },
        ]}
        onPress={viewModel.onEndWarmUp}>
        <Text color={colors.white} fontSize={warmButtonTextSize}>
          Kết thúc khởi động
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
            centerTimeText={headerTimeText}
            compactTitleLeft={true}
          />
        ) : null}

        <View flex={'1'}>
          {renderMainBoard()}
        </View>

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
                  marginTop: adaptive.s(isLargeDisplay ? 30 : 18),
                },
              ]}
              onPress={viewModel.onPause}>
              <Text color={colors.white} fontSize={warmButtonTextSize}>
                Tiếp tục
              </Text>
            </Button>

            <Button
              style={[
                styles.buttonEndWarmUp,
                pauseOverlayButtonStyle,
                {
                  marginTop: adaptive.s(isLargeDisplay ? 18 : 12),
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
