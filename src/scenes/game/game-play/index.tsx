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
import {
  isCaromGame,
  isPool15Game,
  isPool15OnlyGame,
  isPoolGame,
} from 'utils/game';
import {getGameplayScreenProfile, clamp} from './screenProfile';

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
  splitColumnCompact: {
    gap: 8,
  },
  splitSlot: {
    flex: 1,
    minHeight: 0,
  },
  topBottomBoard: {
    flex: 1,
    gap: 12,
  },
  topBottomBoardCompact: {
    gap: 8,
  },
  topBottomRowTop: {
    flex: 1.12,
    gap: 12,
  },
  topBottomRowBottom: {
    flex: 0.88,
    gap: 12,
  },
  topBottomRowCompact: {
    gap: 8,
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
  shortLandscapePlayerSlot: {
    flex: 0.86,
    minWidth: 0,
  },
  shortLandscapeConsoleSlot: {
    flex: 1.18,
    minWidth: 0,
  },
  compactMainArea: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 6,
  },
  ultraCompactMainArea: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    gap: 4,
  },
});

const GamePlay = () => {
  const viewModel = GamePlayViewModel();
  const {width, height, fontScale} = useWindowDimensions();
  const [isCameraFullscreen, setIsCameraFullscreen] = useState(
    getCameraFullscreen(),
  );
  const [remoteEnabled, setRemoteEnabled] = useState(false);

  useEffect(() => {
    return subscribeCameraFullscreen(setIsCameraFullscreen);
  }, []);

  const profile = getGameplayScreenProfile(width, height, fontScale);
  const {
    shortestSide,
    longestSide,
    isLandscape,
    isLargeDisplay,
    isMediumDisplay,
    isHandheldLandscape,
    isUltraCompactLandscape,
  } = profile;
  const isMediumLandscape = isLandscape && isMediumDisplay;
  const isCompactLandscape = isHandheldLandscape;
  const isShortLandscapeDisplay = isLandscape && profile.scale <= 0.82;
  const isVeryShortLandscapeDisplay = isLandscape && profile.scale <= 0.72;
  const isHandheldLandscapeDisplay = isHandheldLandscape;
  const useCompactTwoPlayerLayout = isCompactLandscape || shortestSide < 430;
  const useTightTwoPlayerLayout = isMediumLandscape || useCompactTwoPlayerLayout;

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

  const responsivePlayerSlotStyle = !isCameraFullscreen
    ? isHandheldLandscapeDisplay
      ? localStyles.shortLandscapePlayerSlot
      : useTightTwoPlayerLayout
      ? localStyles.tabletPlayerSlot
      : undefined
    : undefined;

  const responsiveConsoleSlotStyle = !isCameraFullscreen
    ? isHandheldLandscapeDisplay
      ? localStyles.shortLandscapeConsoleSlot
      : useTightTwoPlayerLayout
      ? localStyles.tabletConsoleSlot
      : undefined
    : undefined;

  const compactMainAreaStyle = !isCameraFullscreen
    ? isHandheldLandscapeDisplay || isVeryShortLandscapeDisplay
      ? localStyles.ultraCompactMainArea
      : useTightTwoPlayerLayout
      ? localStyles.compactMainArea
      : undefined
    : undefined;

  const uiScale = useMemo(() => {
    if (isLargeDisplay) {
      return 1;
    }
    return isHandheldLandscapeDisplay
      ? clamp(profile.scale * 0.92, 0.62, 0.82)
      : clamp(profile.scale, 0.78, 1);
  }, [isHandheldLandscapeDisplay, isLargeDisplay, profile.scale]);

  const title = useMemo(() => {
    return buildTitle(
      viewModel.gameSettings?.category,
      viewModel.gameSettings?.mode?.mode,
    );
  }, [viewModel.gameSettings?.category, viewModel.gameSettings?.mode?.mode]);

  const warmTitleSize = Math.round((isLargeDisplay ? 64 : 52) * uiScale);
  const warmTimerSize = Math.round((isLargeDisplay ? 256 : 190) * uiScale);
  const warmTimerLineHeight = Math.round(warmTimerSize * 1.03);
  const warmButtonTextSize = Math.round((isLargeDisplay ? 32 : 24) * uiScale);

  const pauseOverlayButtonStyle = {
    minWidth: isLargeDisplay ? 360 : 230,
    alignItems: 'center' as const,
    paddingHorizontal: isLargeDisplay ? '10%' : '8%',
    paddingVertical: isLargeDisplay ? 15 : 10,
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
            paddingHorizontal: isLargeDisplay ? '10%' : '8%',
            paddingVertical: isLargeDisplay ? 15 : 10,
            marginTop: isLargeDisplay ? 30 : 18,
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
          isHandheldLandscapeDisplay
            ? {paddingHorizontal: 8, paddingTop: 6, paddingBottom: 0}
            : undefined,
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
            style={[styles.countdownContainer, isHandheldLandscapeDisplay ? {marginTop: -4, paddingHorizontal: 1} : undefined]}>
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
                  marginTop: isLargeDisplay ? 30 : 18,
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
                  marginTop: isLargeDisplay ? 18 : 12,
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
