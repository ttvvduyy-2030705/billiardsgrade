import React, {memo, useEffect, useMemo, useRef} from 'react';
import {
  StyleSheet,
  Text as RNText,
} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import {BALLS_15} from 'constants/balls';
import {BallType, PoolBallType} from 'types/ball';
import ConsoleViewModel, {ConsoleViewModelProps} from './ConsoleViewModel';
import Webcam, {WebCamHandle} from './webcam';
import {setPoolCameraScoreboardState} from './webcam/poolScoreboardStore';
import {setCaromCameraScoreboardState} from './webcam/caromScoreboardStore';
import CaromInfo from './carom-info';
import {
  isCaromGame,
  isPool15FreeGame,
  isPool15Game,
  isPool15OnlyGame,
  isPoolGame,
} from 'utils/game';
import i18n from 'i18n';
import useDesignSystem from 'theme/useDesignSystem';
import {createGameplayLayoutRules, createGameplayStyles} from '../layoutRules';

type ActionButtonTone = 'dark' | 'amber' | 'red' | 'green' | 'muted';
type PoolBallButtonSize = 'large' | 'small';

const LEFT_POOL_15_SEQUENCE: BallType[] = [
  BallType.B1,
  BallType.B2,
  BallType.B3,
  BallType.B4,
  BallType.B5,
  BallType.B6,
  BallType.B7,
  BallType.B8,
];

const RIGHT_POOL_15_SEQUENCE: BallType[] = [
  BallType.B10,
  BallType.B11,
  BallType.B12,
  BallType.B13,
  BallType.B14,
  BallType.B15,
  BallType.B8,
  BallType.B8,
];

const BALL_BY_NUMBER = BALLS_15.reduce<Record<string, PoolBallType>>(
  (result, ball) => {
    result[String(ball.number)] = ball;
    return result;
  },
  {},
);

const getPoolBall = (number: BallType) => {
  return BALL_BY_NUMBER[String(number)] || BALLS_15[0];
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const DEBUG_CAROM_LAYOUT = true;
const debugCaromLayout = (...args: any[]) => {
  if (DEBUG_CAROM_LAYOUT) {
    console.log(...args);
  }
};

const isEnglish = () => {
  const locale = String(
    (i18n as any)?.locale || (i18n as any)?.language || '',
  ).toLowerCase();
  return locale.startsWith('en');
};

const tr = (vi: string, en: string) => (isEnglish() ? en : vi);

let styles: any = {};

const buttonToneStyle = (tone: ActionButtonTone) => {
  switch (tone) {
    case 'amber':
      return {
        backgroundColor: '#E2A20A',
        borderColor: '#F1BE4C',
      };
    case 'red':
      return {
        backgroundColor: '#FF1E1E',
        borderColor: '#FF5B5B',
      };
    case 'green':
      return {
        backgroundColor: '#17D42F',
        borderColor: '#40F15A',
      };
    case 'muted':
      return {
        backgroundColor: '#784B53',
        borderColor: '#A76C79',
      };
    default:
      return {
        backgroundColor: '#17181C',
        borderColor: '#2B2D33',
      };
  }
};

const SmallActionButton = ({
  label,
  onPress,
  tone = 'dark',
  disabled,
  compact,
  extraCompact,
  poolCompact,
  tight,
}: {
  label: string;
  onPress?: () => void;
  tone?: ActionButtonTone;
  disabled?: boolean;
  compact?: boolean;
  extraCompact?: boolean;
  poolCompact?: boolean;
  tight?: boolean;
}) => {
  return (
    <Button
      onPress={disabled ? undefined : onPress}
      style={[
        styles.smallActionButton,
        poolCompact ? styles.poolSmallActionButton : undefined,
        compact ? styles.compactSmallActionButton : undefined,
        extraCompact ? styles.extraCompactSmallActionButton : undefined,
        tight ? styles.tightSmallActionButton : undefined,
        buttonToneStyle(tone),
        disabled ? styles.disabledButton : undefined,
      ]}>
      <RNText
  allowFontScaling={false}
  maxFontSizeMultiplier={1}
  style={[
    styles.smallActionText,
    poolCompact ? styles.poolSmallActionText : undefined,
    compact ? styles.compactSmallActionText : undefined,
    extraCompact ? styles.extraCompactSmallActionText : undefined,
    tight ? styles.tightSmallActionText : undefined,
  ]}
  numberOfLines={1}
  adjustsFontSizeToFit={!!tight || !!compact || !!extraCompact}
  minimumFontScale={0.78}
  ellipsizeMode="tail">
  {label}
</RNText>
    </Button>
  );
};

const WideActionButton = ({
  label,
  onPress,
  tone = 'amber',
  compact,
  extraCompact,
  poolCompact,
  tight,
}: {
  label: string;
  onPress?: () => void;
  tone?: ActionButtonTone;
  compact?: boolean;
  extraCompact?: boolean;
  poolCompact?: boolean;
  tight?: boolean;
}) => {
  return (
    <Button
      onPress={onPress}
      style={[
        styles.wideButton,
        poolCompact ? styles.poolWideButton : undefined,
        compact ? styles.compactWideButton : undefined,
        extraCompact ? styles.extraCompactWideButton : undefined,
        tight ? styles.tightWideButton : undefined,
        buttonToneStyle(tone),
      ]}>
      <RNText
  allowFontScaling={false}
  maxFontSizeMultiplier={1}
  style={[
    styles.wideButtonText,
    poolCompact ? styles.poolWideButtonText : undefined,
    compact ? styles.compactWideButtonText : undefined,
    extraCompact ? styles.extraCompactWideButtonText : undefined,
    tight ? styles.tightWideButtonText : undefined,
  ]}
  numberOfLines={1}
  adjustsFontSizeToFit={!!tight || !!compact || !!extraCompact}
  minimumFontScale={0.78}
  ellipsizeMode="tail">
  {label}
</RNText>
    </Button>
  );
};

const DualButton = ({
  leftLabel,
  rightLabel,
  onLeftPress,
  onRightPress,
  leftTone = 'green',
  rightTone = 'red',
  compact,
  extraCompact,
  poolCompact,
  tight,
}: {
  leftLabel: string;
  rightLabel: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  leftTone?: ActionButtonTone;
  rightTone?: ActionButtonTone;
  compact?: boolean;
  extraCompact?: boolean;
  poolCompact?: boolean;
  tight?: boolean;
}) => {
  return (
    <View
      direction={'row'}
      style={[
        styles.dualButtonRow,
        compact ? styles.compactDualButtonRow : undefined,
      ]}>
      <Button
        onPress={onLeftPress}
        style={[
          styles.dualButton,
          poolCompact ? styles.poolDualButton : undefined,
          compact ? styles.compactDualButton : undefined,
          extraCompact ? styles.extraCompactDualButton : undefined,
          tight ? styles.tightDualButton : undefined,
          buttonToneStyle(leftTone),
        ]}>
        <RNText
  allowFontScaling={false}
  maxFontSizeMultiplier={1}
  style={[
    styles.dualButtonText,
    poolCompact ? styles.poolDualButtonText : undefined,
    compact ? styles.compactDualButtonText : undefined,
    extraCompact ? styles.extraCompactDualButtonText : undefined,
    tight ? styles.tightDualButtonText : undefined,
  ]}
  numberOfLines={1}
  adjustsFontSizeToFit={!!tight || !!compact || !!extraCompact}
  minimumFontScale={0.78}
  ellipsizeMode="tail">
  {leftLabel}
</RNText>
      </Button>

      <Button
        onPress={onRightPress}
        style={[
          styles.dualButton,
          poolCompact ? styles.poolDualButton : undefined,
          compact ? styles.compactDualButton : undefined,
          extraCompact ? styles.extraCompactDualButton : undefined,
          tight ? styles.tightDualButton : undefined,
          buttonToneStyle(rightTone),
        ]}>
        <RNText
  allowFontScaling={false}
  maxFontSizeMultiplier={1}
  style={[
    styles.dualButtonText,
    poolCompact ? styles.poolDualButtonText : undefined,
    compact ? styles.compactDualButtonText : undefined,
    extraCompact ? styles.extraCompactDualButtonText : undefined,
    tight ? styles.tightDualButtonText : undefined,
  ]}
  numberOfLines={1}
  adjustsFontSizeToFit={!!tight || !!compact || !!extraCompact}
  minimumFontScale={0.78}
  ellipsizeMode="tail">
  {rightLabel}
</RNText>
      </Button>
    </View>
  );
};

const TripleButton = ({
  leftLabel,
  centerLabel,
  rightLabel,
  onLeftPress,
  onCenterPress,
  onRightPress,
  leftTone = 'green',
  centerTone = 'amber',
  rightTone = 'muted',
  compact,
  extraCompact,
  poolCompact,
  tight,
}: {
  leftLabel: string;
  centerLabel: string;
  rightLabel: string;
  onLeftPress?: () => void;
  onCenterPress?: () => void;
  onRightPress?: () => void;
  leftTone?: ActionButtonTone;
  centerTone?: ActionButtonTone;
  rightTone?: ActionButtonTone;
  compact?: boolean;
  extraCompact?: boolean;
  poolCompact?: boolean;
  tight?: boolean;
}) => {
  return (
    <View
      direction={'row'}
      style={[
        styles.tripleButtonRow,
        compact ? styles.compactTripleButtonRow : undefined,
      ]}>
      <Button
        onPress={onLeftPress}
        style={[
          styles.tripleButton,
          poolCompact ? styles.poolTripleButton : undefined,
          compact ? styles.compactTripleButton : undefined,
          extraCompact ? styles.extraCompactTripleButton : undefined,
          tight ? styles.tightTripleButton : undefined,
          buttonToneStyle(leftTone),
        ]}>
        <RNText
  allowFontScaling={false}
  maxFontSizeMultiplier={1}
  style={[
    styles.tripleButtonText,
    poolCompact ? styles.poolTripleButtonText : undefined,
    compact ? styles.compactTripleButtonText : undefined,
    extraCompact ? styles.extraCompactTripleButtonText : undefined,
    tight ? styles.tightTripleButtonText : undefined,
  ]}
  numberOfLines={1}
  adjustsFontSizeToFit={!!tight || !!compact || !!extraCompact}
  minimumFontScale={0.78}
  ellipsizeMode="tail">
  {leftLabel}
</RNText>
      </Button>

      <Button
        onPress={onCenterPress}
        style={[
          styles.tripleButton,
          poolCompact ? styles.poolTripleButton : undefined,
          compact ? styles.compactTripleButton : undefined,
          extraCompact ? styles.extraCompactTripleButton : undefined,
          tight ? styles.tightTripleButton : undefined,
          buttonToneStyle(centerTone),
        ]}>
        <RNText
  allowFontScaling={false}
  maxFontSizeMultiplier={1}
  style={[
    styles.tripleButtonText,
    poolCompact ? styles.poolTripleButtonText : undefined,
    compact ? styles.compactTripleButtonText : undefined,
    extraCompact ? styles.extraCompactTripleButtonText : undefined,
    tight ? styles.tightTripleButtonText : undefined,
  ]}
  numberOfLines={1}
  adjustsFontSizeToFit={!!tight || !!compact || !!extraCompact}
  minimumFontScale={0.78}
  ellipsizeMode="tail">
  {centerLabel}
</RNText>
      </Button>

      <Button
        onPress={onRightPress}
        style={[
          styles.tripleButton,
          poolCompact ? styles.poolTripleButton : undefined,
          compact ? styles.compactTripleButton : undefined,
          extraCompact ? styles.extraCompactTripleButton : undefined,
          tight ? styles.tightTripleButton : undefined,
          buttonToneStyle(rightTone),
        ]}>
        <RNText
  allowFontScaling={false}
  maxFontSizeMultiplier={1}
  style={[
    styles.tripleButtonText,
    poolCompact ? styles.poolTripleButtonText : undefined,
    compact ? styles.compactTripleButtonText : undefined,
    extraCompact ? styles.extraCompactTripleButtonText : undefined,
    tight ? styles.tightTripleButtonText : undefined,
  ]}
  numberOfLines={1}
  adjustsFontSizeToFit={!!tight || !!compact || !!extraCompact}
  minimumFontScale={0.78}
  ellipsizeMode="tail">
  {rightLabel}
</RNText>
      </Button>
    </View>
  );
};

const PoolBallButton = ({
  ball,
  onPress,
  disabled,
  size = 'large',
}: {
  ball: PoolBallType;
  onPress?: () => void;
  disabled?: boolean;
  size?: PoolBallButtonSize;
}) => {
  const isSmall = size === 'small';
  const isBlackBall = ball.number === BallType.B8;
  const textColor = isBlackBall ? '#FFFFFF' : '#111111';

  return (
    <Button
      onPress={disabled ? undefined : onPress}
      style={[
        styles.poolBallButton,
        isSmall ? styles.poolBallButtonSmall : styles.poolBallButtonLarge,
        {
          backgroundColor: ball.cut ? '#FFFFFF' : ball.color,
          borderColor: ball.color,
        },
        disabled ? styles.disabledButton : undefined,
      ]}>
      {ball.cut ? (
        <View
          style={[
            styles.poolBallStripe,
            isSmall ? styles.poolBallStripeSmall : undefined,
            {backgroundColor: ball.color},
          ]}
        />
      ) : null}
      <RNText
        style={[
          styles.poolBallText,
          isSmall ? styles.poolBallTextSmall : styles.poolBallTextLarge,
          {color: ball.cut ? '#111111' : textColor},
        ]}>
        {ball.number}
      </RNText>
    </Button>
  );
};

const GameConsole = (props: ConsoleViewModelProps) => {
  const viewModel = ConsoleViewModel(props);

  useEffect(() => {
    setPoolCameraScoreboardState({
      currentPlayerIndex: props.currentPlayerIndex,
      countdownTime: props.countdownTime,
      gameSettings: props.gameSettings,
      playerSettings: props.playerSettings,
    });

    setCaromCameraScoreboardState({
      isStarted: props.isStarted,
      isPaused: props.isPaused,
      isMatchPaused: props.isMatchPaused,
      currentPlayerIndex: props.currentPlayerIndex,
      countdownTime: props.countdownTime,
      totalTurns: props.totalTurns,
      gameSettings: props.gameSettings,
      playerSettings: props.playerSettings,
    });
  }, [
    props.isStarted,
    props.isPaused,
    props.isMatchPaused,
    props.currentPlayerIndex,
    props.countdownTime,
    props.totalTurns,
    props.gameSettings,
    props.playerSettings,
  ]);

  const webcamRef = useRef<WebCamHandle>(null);
  const {adaptive, design} = useDesignSystem();
  const layoutRules = useMemo(() => createGameplayLayoutRules(adaptive, design), [adaptive.styleKey]);
  styles = useMemo(() => createStyles(adaptive, design, layoutRules), [adaptive.styleKey]);
  const {width, height, shortSide: shortestSide, longSide: longestSide} = adaptive;
  const isLandscape = adaptive.isLandscape;
  const isLargeDisplay = adaptive.layoutPreset === 'tv';
  const isHandheldLandscape =
    isLandscape && adaptive.systemMetrics.smallestScreenWidthDp < 600;
  const isMediumLandscape =
    isLandscape &&
    !isLargeDisplay &&
    (adaptive.layoutPreset === 'tablet' || adaptive.layoutPreset === 'wideTablet');
  const isCompactLandscape =
    isLandscape &&
    (adaptive.widthClass === 'compact' || adaptive.isShortLandscape || height <= 760);
  const isShortLandscape = adaptive.isShortLandscape;
  const isVeryShortLandscape = adaptive.isVeryShortLandscape;
  const useResponsiveCompact =
    adaptive.isConstrainedLandscape ||
    isCompactLandscape || shortestSide <= 520 || (isHandheldLandscape && height <= 900) || height <= 760;
  const useTightLandscapeLayout = isMediumLandscape || useResponsiveCompact;
  const useExtraCompact =
    adaptive.isVeryShortLandscape ||
    shortestSide <= 460 || height <= 680 || (isHandheldLandscape && height <= 620) || adaptive.aspectRatio >= 1.9;

  const uiScale = useMemo(() => {
    if (isLargeDisplay) {
      return 1;
    }

    const compactPenalty = isVeryShortLandscape ? 0.12 : isShortLandscape ? 0.08 : 0;
    return clamp(adaptive.textScale - compactPenalty, isHandheldLandscape ? 0.56 : 0.68, 1);
  }, [adaptive.textScale, isLargeDisplay, isShortLandscape, isVeryShortLandscape]);

  const category = props.gameSettings?.category;
  const isPool = isPoolGame(category);
  const isCarom = isCaromGame(category);
  const isPool15Free = isPool15FreeGame(category);
  const isPool8Temp = isPool15OnlyGame(category);
  const isPool15 = isPool15Free;
  const isPool15Only = false;
  const usePoolBroadcastLayout = isPool && !isPool15;
  const isFastMode = props.gameSettings?.mode?.mode === 'fast';
  const totalTimeText = viewModel.displayTotalTime();
  const players = props.playerSettings?.playingPlayers || [];
  const totalPlayers = Number(props.totalPlayers || 2);
  const pool8FreeSetWinnerPlayer = props.pool8FreeSetWinnerIndex != null ? players[props.pool8FreeSetWinnerIndex] : undefined;
  const pool8SetWinnerPlayer = props.pool8SetWinnerIndex != null ? players[props.pool8SetWinnerIndex] : undefined;
  const leftHole10Score = Number(props.pool8FreeHole10Scores?.[0] || 0);
  const rightHole10Score = Number(props.pool8FreeHole10Scores?.[1] || 0);
  const hideCaromCamera = isCarom && totalPlayers >= 5;
  const hideCaromScoreChrome = isCarom && totalPlayers >= 3;
  const useCaromConsoleCompact =
    isCarom &&
    !hideCaromCamera &&
    adaptive.isLandscape &&
    !isLargeDisplay;
  const useCaromCompactButtons = isCarom
    ? useResponsiveCompact || useCaromConsoleCompact
    : useResponsiveCompact;
  const useCaromExtraCompactButtons = isCarom
    ? hideCaromCamera || useExtraCompact || (useCaromConsoleCompact && height <= 900)
    : hideCaromCamera || useExtraCompact;
  const useCaromTightLayout =
    isCarom && !hideCaromCamera && (useCaromConsoleCompact || useResponsiveCompact || height <= 900);
  const caromExpectedButtonCount = !isCarom
    ? 0
    : (props.isStarted ? 3 : 1) + 3 + 2;

  useEffect(() => {
    if (!isCarom) {
      return;
    }

    debugCaromLayout('[GameConsole] carom layout branch', {
      isCarom,
      hideCaromCamera,
    hideCaromScoreChrome,
      useCaromConsoleCompact,
      useCaromCompactButtons,
      useCaromExtraCompactButtons,
      useCaromTightLayout,
      expectedButtonCount: caromExpectedButtonCount,
      cameraMinHeight: null,
      hideCaromScoreChrome,
      countdownEnabled: !!props.gameSettings?.mode?.countdownTime,
      isStarted: props.isStarted,
      width,
      height,
    });
  }, [
    height,
    hideCaromCamera,
    hideCaromScoreChrome,
    isCarom,
    props.gameSettings?.mode?.countdownTime,
    useCaromCompactButtons,
    useCaromConsoleCompact,
    useCaromExtraCompactButtons,
    useCaromTightLayout,
    caromExpectedButtonCount,
    width,
  ]);

  const leftScore = Number(players[0]?.totalPoint || 0);
  const rightScore = Number(players[1]?.totalPoint || 0);

  const leftBall = useMemo(() => {
    return getPoolBall(
      LEFT_POOL_15_SEQUENCE[
        Math.min(leftScore, LEFT_POOL_15_SEQUENCE.length - 1)
      ],
    );
  }, [leftScore]);

  const rightBall = useMemo(() => {
    return getPoolBall(
      RIGHT_POOL_15_SEQUENCE[
        Math.min(rightScore, RIGHT_POOL_15_SEQUENCE.length - 1)
      ],
    );
  }, [rightScore]);

  const remainingFreeBalls = useMemo(() => {
    if (!isPool15Free) {
      return [] as PoolBallType[];
    }

    const selectedBallNumbers = new Set(
      players.flatMap(player =>
        (player.scoredBalls || []).map(ball => String(ball.number)),
      ),
    );

    return BALLS_15.filter(
      ball => !selectedBallNumbers.has(String(ball.number)),
    );
  }, [isPool15Free, players]);

  const startLabel = useMemo(() => {
    if (!props.isStarted) {
      if (!isFastMode && (props.warmUpCount ?? 0) > 0) {
        return `▷ ${tr(
          `Khởi động (${props.warmUpCount})`,
          `Warm-up (${props.warmUpCount})`,
        )}`;
      }
      return `▷ ${tr('Bắt đầu', 'Start')}`;
    }

    return props.isPaused
      ? `▷ ${tr(
          isCarom || isFastMode ? 'Bắt đầu' : 'Tiếp tục',
          isCarom || isFastMode ? 'Start' : 'Resume',
        )}`
      : `⏸ ${tr('Tạm dừng', 'Pause')}`;
  }, [props.isStarted, props.isPaused, props.warmUpCount, isCarom, isFastMode]);

  const handleBottomLeft = () => {
    if (!props.isStarted) {
      if (!isFastMode && (props.warmUpCount ?? 0) > 0) {
        viewModel.onWarmUp();
        return;
      }
      viewModel.onStart();
      return;
    }

    viewModel.onPause();
  };

  const mainActionRow = useMemo(() => {
    if (isFastMode || isPool15) {
      return null;
    }

    if (isCarom) {
      if (!props.isStarted) {
        return (
          <WideActionButton
            label={`↗ ${tr('Đổi người', 'Switch player')}`}
            tone={'amber'}
            onPress={viewModel.onSwitchTurn}
            compact={useCaromCompactButtons}
            extraCompact={useCaromExtraCompactButtons}
            tight={useCaromTightLayout}
          />
        );
      }

      return (
        <TripleButton
          leftLabel={`＋ ${tr('Tăng lượt', 'Increase turns')}`}
          centerLabel={`✚ ${tr('Thêm giờ', 'Extension')}`}
          rightLabel={`－ ${tr('Giảm lượt', 'Decrease turns')}`}
          onLeftPress={props.onIncreaseTotalTurns}
          onCenterPress={viewModel.onPressGiveMoreTime}
          onRightPress={props.onDecreaseTotalTurns}
          leftTone={'green'}
          centerTone={'amber'}
          rightTone={'muted'}
          compact={useCaromCompactButtons}
          extraCompact={useCaromExtraCompactButtons}
          tight={useCaromTightLayout}
        />
      );
    }

    if (isPool && props.isStarted && props.poolBreakEnabled) {
      return (
        <WideActionButton
          label={`↗ ${tr('Phá bi', 'Break shot')}`}
          tone={'green'}
          onPress={props.onPoolBreak}
          compact={useResponsiveCompact}
          poolCompact={usePoolBroadcastLayout}
          extraCompact={useExtraCompact}
        />
      );
    }

    if (isPool && props.isStarted && !props.poolBreakEnabled) {
      return (
        <TripleButton
          leftLabel={`◴ ${tr('Bấm giờ', 'Timer')}`}
          centerLabel={`✚ ${tr('Thêm giờ', 'Extension')}`}
          rightLabel={`▣ ${tr('Ván mới', 'New game')}`}
          onLeftPress={props.onResetTurn}
          onCenterPress={viewModel.onPressGiveMoreTime}
          onRightPress={props.onReset}
          leftTone={'green'}
          centerTone={'amber'}
          rightTone={'muted'}
          compact={useResponsiveCompact}
          poolCompact={usePoolBroadcastLayout}
          extraCompact={useExtraCompact}
        />
      );
    }

    return (
      <WideActionButton
        label={`↗ ${tr('Đổi người', 'Switch turn')}`}
        tone={'amber'}
        onPress={viewModel.onSwitchTurn}
        compact={useResponsiveCompact}
        poolCompact={usePoolBroadcastLayout}
        extraCompact={useExtraCompact}
      />
    );
  }, [
    hideCaromCamera,
    isCarom,
    isFastMode,
    isPool,
    isPool15,
    props.isStarted,
    props.poolBreakEnabled,
    props.onPoolBreak,
    props.onResetTurn,
    viewModel.onPressGiveMoreTime,
    props.onReset,
    viewModel.onSwitchTurn,
    props.onIncreaseTotalTurns,
    props.onDecreaseTotalTurns,
    useExtraCompact,
    usePoolBroadcastLayout,
    useResponsiveCompact,
    useCaromCompactButtons,
    useCaromExtraCompactButtons,
    useCaromTightLayout,
  ]);

  const cameraUtilityRows = (
    <TripleButton
      leftLabel={`↺ ${tr('Làm mới', 'Refresh')}`}
      centerLabel={`◔ ${tr('Giải lao', 'Break')}`}
      rightLabel={`⌁ ${tr('Đổi cam', 'Switch cam')}`}
      onLeftPress={() => webcamRef.current?.refresh()}
      onCenterPress={props.onGameBreak}
      onRightPress={() => webcamRef.current?.switchCamera()}
      leftTone={'dark'}
      centerTone={'dark'}
      rightTone={'dark'}
      compact={isCarom ? useCaromCompactButtons : useResponsiveCompact}
      poolCompact={usePoolBroadcastLayout}
      extraCompact={isCarom ? useCaromExtraCompactButtons : hideCaromCamera || useExtraCompact}
      tight={isCarom ? useCaromTightLayout : false}
    />
  );

  const bottomControls = useMemo(() => {
    if (isPool15) {
      return null;
    }

    if (isCarom) {
      return (
        <DualButton
          leftLabel={startLabel}
          rightLabel={`✈ ${tr('Kết thúc', 'End')}`}
          onLeftPress={handleBottomLeft}
          onRightPress={viewModel.onStop}
          leftTone={'amber'}
          rightTone={'red'}
          compact={useCaromCompactButtons}
          extraCompact={useCaromExtraCompactButtons}
          tight={useCaromTightLayout}
        />
      );
    }

    return (
      <DualButton
        leftLabel={startLabel}
        rightLabel={`✈ ${tr('Kết thúc', 'End')}`}
        onLeftPress={handleBottomLeft}
        onRightPress={viewModel.onStop}
        leftTone={'amber'}
        rightTone={'red'}
        compact={useResponsiveCompact}
        poolCompact={usePoolBroadcastLayout}
        extraCompact={useExtraCompact}
      />
    );
  }, [
    handleBottomLeft,
    hideCaromCamera,
    isCarom,
    isPool15,
    props.onGameBreak,
    startLabel,
    useExtraCompact,
    usePoolBroadcastLayout,
    useResponsiveCompact,
    viewModel.onStop,
    useCaromCompactButtons,
    useCaromExtraCompactButtons,
    useCaromTightLayout,
  ]);

  useEffect(() => {
    if (!isCarom) {
      return;
    }

    debugCaromLayout('[GameConsole] carom rendered button rows', {
      utilityButtons: 3,
      mainButtons: props.isStarted ? 3 : 1,
      bottomButtons: 2,
      totalButtons: caromExpectedButtonCount,
      useCaromConsoleCompact,
      useCaromCompactButtons,
      useCaromExtraCompactButtons,
      useCaromTightLayout,
    });
  }, [
    caromExpectedButtonCount,
    isCarom,
    props.isStarted,
    useCaromCompactButtons,
    useCaromConsoleCompact,
    useCaromExtraCompactButtons,
    useCaromTightLayout,
  ]);

  const pool15Footer = useMemo(() => {
    if (isPool8Temp) {
      if (pool8SetWinnerPlayer && !props.winner) {
        return (
          <View style={styles.pool15FooterWrap}>
            <View style={styles.pool8FreeWinnerInline}>
              <RNText style={styles.pool8FreeWinnerInlineText}>
                {`${pool8SetWinnerPlayer.name} ${tr('thắng set này', 'wins this set')}`}
              </RNText>
              <Button style={styles.pool8FreeWinnerInlineButton} onPress={props.onReset}>
                <RNText style={styles.pool8FreeWinnerInlineButtonText}>
                  {tr('Ván mới', 'New game')}
                </RNText>
              </Button>
            </View>
          </View>
        );
      }

      return null;
    }

    if (!isPool15) {
      return null;
    }

    if (props.winner) {
      return (
        <View style={styles.pool15FooterWrap}>
          <View style={styles.pool15WinnerCard}>
            <RNText
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={styles.pool15WinnerText}>
              {tr('Chúc mừng ', 'Congratulations ')}
              {props.winner.name}
              {tr(' đã chiến thắng', ' won')}
            </RNText>
          </View>
          <Button
            style={styles.pool15RestartButton}
            onPress={viewModel.onRestart}>
            <RNText
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={styles.pool15RestartText}>
              {tr('Ván mới', 'New game')}
            </RNText>
          </Button>
        </View>
      );
    }

    if (isPool15Only) {
      return (
        <View style={styles.pool15FooterWrap}>
          <View direction={'row'} style={styles.pool15OnlyRow}>
            <View style={styles.pool15SideWrap}>
              <RNText style={styles.pool15SideScore}>{leftScore}</RNText>
              <PoolBallButton
                ball={leftBall}
                onPress={() => props.onPool15OnlyScore?.(0)}
              />
            </View>

            <View style={styles.pool15CenterWrap}>
              <PoolBallButton ball={getPoolBall(BallType.B8)} disabled />
            </View>

            <View style={styles.pool15SideWrap}>
              <PoolBallButton
                ball={rightBall}
                onPress={() => props.onPool15OnlyScore?.(1)}
              />
              <RNText style={styles.pool15SideScore}>{rightScore}</RNText>
            </View>
          </View>
        </View>
      );
    }

    const freeRows = [
      [BallType.B1, BallType.B2, BallType.B3, BallType.B4, BallType.B5],
      [BallType.B6, BallType.B7, BallType.B8, BallType.B9, BallType.B10],
      [BallType.B11, BallType.B12, BallType.B13, BallType.B14, BallType.B15],
    ];

    return (
      <View style={styles.pool15FooterWrap}>
        <View direction={'row'} style={styles.pool8FreeFooterRow}>
          <Button style={styles.pool8FreeSideCounter} onPress={() => props.onIncrementPool8FreeHole10?.(0)}>
            <RNText style={styles.pool8FreeSideCounterTitle}>Lỗ 10</RNText>
            <RNText style={styles.pool8FreeSideCounterValue}>{leftHole10Score}</RNText>
          </Button>

          <View style={styles.pool8FreeCenterWrap}>
            {pool8FreeSetWinnerPlayer && !props.winner ? (
              <View style={styles.pool8FreeWinnerInline}>
                <RNText style={styles.pool8FreeWinnerInlineText}>
                  {`${pool8FreeSetWinnerPlayer.name} ${tr('thắng set này', 'wins this set')}`}
                </RNText>
                <Button style={styles.pool8FreeWinnerInlineButton} onPress={props.onReset}>
                  <RNText style={styles.pool8FreeWinnerInlineButtonText}>
                    {tr('Ván mới', 'New game')}
                  </RNText>
                </Button>
              </View>
            ) : (
              <View style={styles.pool8FreeRowsWrap}>
                {freeRows.map((row, rowIndex) => (
                  <View key={`free-row-${rowIndex}`} style={styles.pool8FreeRow}>
                    {row.map(number => {
                      const ball = remainingFreeBalls.find(item => item.number === number);
                      return (
                        <View key={`free-ball-${number}`} style={styles.pool15FreeBallWrap}>
                          {ball ? (
                            <PoolBallButton
                              ball={ball}
                              size={useExtraCompact ? 'small' : 'large'}
                              onPress={() => props.onPoolScore(ball)}
                            />
                          ) : (
                            <View style={styles.pool8FreeBallPlaceholder} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </View>

          <Button style={styles.pool8FreeSideCounter} onPress={() => props.onIncrementPool8FreeHole10?.(1)}>
            <RNText style={styles.pool8FreeSideCounterTitle}>Lỗ 10</RNText>
            <RNText style={styles.pool8FreeSideCounterValue}>{rightHole10Score}</RNText>
          </Button>
        </View>
      </View>
    );
  }, [
    isPool15,
    isPool15Only,
    leftBall,
    leftScore,
    props,
    remainingFreeBalls,
    rightBall,
    rightScore,
    useExtraCompact,
    viewModel.onRestart,
    leftHole10Score,
    rightHole10Score,
    pool8FreeSetWinnerPlayer,
    pool8SetWinnerPlayer,
    isPool8Temp,
  ]);

  const timeTextStyle = {
    fontSize: Math.round((isCarom ? 56 : 64) * uiScale),
    lineHeight: Math.round((isCarom ? 60 : 68) * uiScale),
  };

  const metaValueStyle = {
    fontSize: Math.round(30 * uiScale),
    lineHeight: Math.round(34 * uiScale),
  };

  const cameraMinHeight = useMemo(() => {
    if (isPool15) {
      if (useExtraCompact) {
        return 150;
      }

      if (useResponsiveCompact) {
        return 154;
      }

      return isLargeDisplay ? 260 : 176;
    }

    if (isCarom) {
      if (hideCaromScoreChrome) {
        if (useCaromTightLayout) {
          return isHandheldLandscape ? 118 : 136;
        }

        if (useExtraCompact) {
          return isHandheldLandscape ? 124 : 144;
        }

        if (useCaromConsoleCompact) {
          return isHandheldLandscape ? 132 : 154;
        }

        if (useResponsiveCompact) {
          return isHandheldLandscape ? 136 : 164;
        }

        if (useTightLandscapeLayout) {
          return isHandheldLandscape ? 148 : 176;
        }

        return isLargeDisplay ? 230 : isHandheldLandscape ? 156 : adaptive.isConstrainedLandscape ? 170 : 194;
      }

      if (useCaromTightLayout) {
        return isHandheldLandscape ? 64 : 72;
      }

      if (useExtraCompact) {
        return isHandheldLandscape ? 70 : 82;
      }

      if (useCaromConsoleCompact) {
        return isHandheldLandscape ? 78 : 90;
      }

      if (useResponsiveCompact) {
        return isHandheldLandscape ? 86 : 100;
      }

      if (useTightLandscapeLayout) {
        return isHandheldLandscape ? 110 : 132;
      }

      return isLargeDisplay ? 210 : isHandheldLandscape ? 112 : adaptive.isConstrainedLandscape ? 128 : 164;
    }

    if (useExtraCompact) {
      return isHandheldLandscape ? 104 : 128;
    }

    if (useResponsiveCompact) {
      return isHandheldLandscape ? 118 : 140;
    }

    if (useTightLandscapeLayout) {
      return isHandheldLandscape ? 128 : 154;
    }

    return isLargeDisplay ? 220 : isHandheldLandscape ? 142 : 176;
  }, [
    isCarom,
    isLargeDisplay,
    isPool15,
    useExtraCompact,
    useResponsiveCompact,
    useTightLandscapeLayout,
    useCaromConsoleCompact,
    useCaromTightLayout,
    hideCaromScoreChrome,
  ]);

  useEffect(() => {
    if (!isCarom) {
      return;
    }

    debugCaromLayout('[GameConsole] computed carom sizes', {
      cameraMinHeight,
      useCaromConsoleCompact,
      useCaromCompactButtons,
      useCaromExtraCompactButtons,
      useCaromTightLayout,
      expectedButtonCount: caromExpectedButtonCount,
      isStarted: props.isStarted,
      countdownEnabled: !!props.gameSettings?.mode?.countdownTime,
    });
  }, [
    cameraMinHeight,
    isCarom,
    props.gameSettings?.mode?.countdownTime,
    props.isStarted,
    useCaromCompactButtons,
    useCaromConsoleCompact,
    useCaromExtraCompactButtons,
    useCaromTightLayout,
    caromExpectedButtonCount,
  ]);

  if (isCarom) {
    return (
      <View
        style={[
          styles.wrapper,
          useTightLandscapeLayout && !useResponsiveCompact
            ? styles.mediumWrapper
            : undefined,
          styles.caromWrapper,
          useResponsiveCompact ? styles.phoneWrapper : undefined,
          hideCaromCamera ? styles.caromWrapperNoCamera : undefined,
        ]}>
        {props.gameSettings?.mode?.countdownTime && !hideCaromScoreChrome ? (
          <View
            style={[
              styles.caromInfoWrap,
              styles.caromInfoWrapCompact,
              hideCaromCamera ? styles.caromInfoWrapNoCamera : undefined,
            ]}>
            <CaromInfo
              isStarted={props.isStarted}
              isPaused={props.isPaused}
              isMatchPaused={props.isMatchPaused}
              goal={props.goal}
              totalTurns={props.totalTurns}
              countdownTime={props.countdownTime}
              currentPlayerIndex={props.currentPlayerIndex}
              gameSettings={props.gameSettings}
              playerSettings={props.playerSettings}
              compact={useCaromTightLayout || useCaromConsoleCompact}
            />
          </View>
        ) : null}

        {!hideCaromCamera ? (
          <View
            style={[
              styles.cameraCard,
              useTightLandscapeLayout && !useResponsiveCompact
                ? styles.mediumCameraCard
                : undefined,
              useResponsiveCompact ? styles.phoneCameraCard : undefined,
              styles.caromCameraCard,
              useResponsiveCompact ? styles.caromPhoneCameraCard : undefined,
              useCaromTightLayout ? styles.caromCameraCardTight : undefined,
              useCaromConsoleCompact ? styles.caromCameraCardCompact : undefined,
              hideCaromScoreChrome ? styles.caromCameraCardExpanded : undefined,
              {minHeight: cameraMinHeight},
            ]}
            onLayout={event => {
              debugCaromLayout('[GameConsole] carom cameraCard layout', event.nativeEvent.layout);
            }}>
            <Webcam
              ref={webcamRef}
              hideBottomControls
              setIsCameraReady={props.setIsCameraReady}
              isCameraReady={props.isCameraReady}
              webcamFolderName={props.webcamFolderName}
              updateWebcamFolderName={props.updateWebcamFolderName}
              cameraRef={props.cameraRef}
              isPaused={props.isPaused}
              isStarted={props.isStarted}
              youtubeLivePreviewActive={props.youtubeLivePreviewActive}
            />
          </View>
        ) : null}

        <View
          style={[
            styles.goalCardFullWidth,
            useTightLandscapeLayout && !useResponsiveCompact
              ? styles.mediumGoalCard
              : undefined,
            styles.caromGoalCardFullWidth,
            useResponsiveCompact ? styles.phoneGoalCard : undefined,
            hideCaromCamera ? styles.caromGoalCardNoCamera : undefined,
            !hideCaromCamera ? styles.caromGoalCardInline : undefined,
            useCaromTightLayout ? styles.caromGoalCardTight : undefined,
            useCaromConsoleCompact ? styles.caromGoalCardCompact : undefined,
            isLargeDisplay && !useResponsiveCompact
              ? styles.caromGoalCardLargeDisplay
              : undefined,
          ]}
          onLayout={event => {
            debugCaromLayout('[GameConsole] carom goalCard layout', event.nativeEvent.layout);
          }}>
          {!hideCaromCamera ? (
            <View
              direction={'row'}
              alignItems={'center'}
              justify={'center'}
              style={styles.caromGoalInlineRow}>
              <RNText
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[
                  styles.metaLabel,
                  styles.caromGoalInlineLabel,
                  {
                    color: '#FFFFFF',
                    fontSize: 18,
                    lineHeight: 22,
                    fontWeight: '800',
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                  },
                ]}>
                {tr('Mục tiêu', 'Goal')}:
              </RNText>
              <RNText
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[
                  styles.metaValue,
                  styles.metaValueNoLabel,
                  styles.caromGoalInlineValue,
                  metaValueStyle,
                  {
                    color: '#FF2525',
                    fontWeight: '900',
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                  },
                ]}>
                {props.goal}
              </RNText>
            </View>
          ) : (
            <View style={styles.goalRow}>
              <RNText
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  lineHeight: 20,
                  fontWeight: '700',
                  includeFontPadding: false,
                  textAlign: 'center',
                  textAlignVertical: 'center',
                }}>
                {tr('Mục tiêu', 'Goal')} :
              </RNText>
              <RNText
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[
                  styles.metaValue,
                  styles.metaValueNoLabel,
                  metaValueStyle,
                  {
                    color: '#FF2525',
                    fontWeight: '900',
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                  },
                ]}>
                {props.goal}
              </RNText>
            </View>
          )}
        </View>

        <View
          style={[
            styles.actionStack,
            styles.caromActionStack,
            useTightLandscapeLayout && !useResponsiveCompact
              ? styles.mediumActionStack
              : undefined,
            useResponsiveCompact ? styles.phoneActionStack : undefined,
            useCaromTightLayout ? styles.caromActionStackTight : undefined,
            useCaromConsoleCompact ? styles.caromActionStackCompact : undefined,
            hideCaromCamera ? styles.caromActionStackNoCamera : undefined,
          ]}
          onLayout={event => {
            debugCaromLayout('[GameConsole] carom actionStack layout', event.nativeEvent.layout);
          }}>
          {cameraUtilityRows}
          {mainActionRow}
          {bottomControls}
        </View>
      </View>
    );
  }

  const poolMetaTextStyle = {
    fontSize: Math.round(28 * uiScale),
    lineHeight: Math.round(32 * uiScale),
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
  };

  const poolMetaValueTextStyle = {
    fontSize: Math.round(28 * uiScale),
    lineHeight: Math.round(32 * uiScale),
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
  };

  return (
    <View
      style={[
        styles.wrapper,
        useTightLandscapeLayout && !useResponsiveCompact
          ? styles.mediumWrapper
          : undefined,
        useResponsiveCompact ? styles.phoneWrapper : undefined,
        usePoolBroadcastLayout ? styles.poolWrapper : undefined,
      ]}>
      {isPool15 ? (
        <View style={styles.topButtonRowWrap}>
          <DualButton
            leftLabel={startLabel}
            rightLabel={`✈ ${tr('Kết thúc', 'End')}`}
            onLeftPress={handleBottomLeft}
            onRightPress={viewModel.onStop}
            leftTone={'amber'}
            rightTone={'red'}
            compact={useResponsiveCompact}
            poolCompact={usePoolBroadcastLayout}
            extraCompact={useExtraCompact}
          />
        </View>
      ) : isPool8Temp && props.isStarted && !props.poolBreakEnabled ? (
        <View style={styles.topButtonRowWrap}>
          <TripleButton
            leftLabel={`${tr('Số lượt', 'Turns')} ${props.totalTurns}`}
            centerLabel={tr('Đổi bi', 'Swap balls')}
            rightLabel={`${tr('Mục tiêu', 'Goal')} ${props.goal}`}
            onCenterPress={props.onSwapPool8Groups}
            leftTone={'dark'}
            centerTone={'amber'}
            rightTone={'dark'}
            compact={useResponsiveCompact}
            poolCompact={usePoolBroadcastLayout}
            extraCompact={useExtraCompact}
          />
        </View>
      ) : usePoolBroadcastLayout ? (
        <View
          direction={'row'}
          style={[
            styles.metaInlineRow,
            useResponsiveCompact ? styles.phoneMetaInlineRow : undefined,
            usePoolBroadcastLayout ? styles.poolMetaInlineRow : undefined,
          ]}>
          <View
            style={[
              styles.metaInlineCard,
              useResponsiveCompact ? styles.phoneMetaInlineCard : undefined,
              styles.poolMetaInlineCard,
            ]}>
            <View style={styles.metaInlineCombinedRow}>
              <RNText
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[styles.metaInlineCombinedText, poolMetaTextStyle]}>
                <RNText
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  style={[
                    styles.metaInlineCombinedText,
                    styles.metaInlineCombinedLabelText,
                    poolMetaTextStyle,
                  ]}>
                  {`${tr('Số lượt', 'Turns')}: `}
                </RNText>
                <RNText
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  style={[
                    styles.metaInlineCombinedValueText,
                    poolMetaValueTextStyle,
                  ]}>
                  {props.totalTurns}
                </RNText>
              </RNText>
            </View>
          </View>

          <View
            style={[
              styles.metaInlineCard,
              useResponsiveCompact ? styles.phoneMetaInlineCard : undefined,
              styles.poolMetaInlineCard,
            ]}>
            <View style={styles.metaInlineCombinedRow}>
              <RNText
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[styles.metaInlineCombinedText, poolMetaTextStyle]}>
                <RNText
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  style={[
                    styles.metaInlineCombinedText,
                    styles.metaInlineCombinedLabelText,
                    poolMetaTextStyle,
                  ]}>
                  {`${tr('Mục tiêu', 'Goal')}: `}
                </RNText>
                <RNText
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}
                  style={[
                    styles.metaInlineCombinedValueText,
                    poolMetaValueTextStyle,
                  ]}>
                  {props.goal}
                </RNText>
              </RNText>
            </View>
          </View>
        </View>
      ) : (
        <View
          direction={'row'}
          style={[
            styles.metaRow,
            useTightLandscapeLayout && !useResponsiveCompact
              ? styles.mediumMetaRow
              : undefined,
            useResponsiveCompact ? styles.phoneMetaRow : undefined,
            usePoolBroadcastLayout ? styles.poolMetaRow : undefined,
          ]}>
          <View
            style={[
              styles.metaCard,
              useTightLandscapeLayout && !useResponsiveCompact
                ? styles.mediumMetaCard
                : undefined,
              useResponsiveCompact ? styles.phoneMetaCard : undefined,
              usePoolBroadcastLayout ? styles.poolMetaCard : undefined,
            ]}>
            <Text
              color={'#FFFFFF'}
              fontSize={18}
              fontWeight={'800'}
              style={[
                styles.metaLabel,
                useResponsiveCompact ? styles.phoneMetaLabel : undefined,
              ]}>
              {tr('Số lượt', 'Turns')}
            </Text>
            <Text
              color={'#FF2525'}
              fontWeight={'900'}
              style={[
                styles.metaValue,
                metaValueStyle,
                useResponsiveCompact ? styles.phoneMetaValue : undefined,
              ]}>
              {props.totalTurns}
            </Text>
          </View>

          <View
            style={[
              styles.metaCard,
              useTightLandscapeLayout && !useResponsiveCompact
                ? styles.mediumMetaCard
                : undefined,
              useResponsiveCompact ? styles.phoneMetaCard : undefined,
              usePoolBroadcastLayout ? styles.poolMetaCard : undefined,
            ]}>
            <Text
              color={'#FFFFFF'}
              fontSize={18}
              fontWeight={'800'}
              style={[
                styles.metaLabel,
                useResponsiveCompact ? styles.phoneMetaLabel : undefined,
              ]}>
              {tr('Mục tiêu', 'Goal')} :
            </Text>
            <Text
              color={'#FF2525'}
              fontWeight={'900'}
              style={[
                styles.metaValue,
                metaValueStyle,
                useResponsiveCompact ? styles.phoneMetaValue : undefined,
              ]}>
              {props.goal}
            </Text>
          </View>
        </View>
      )}

      <View
        style={[
          styles.cameraCard,
          useTightLandscapeLayout && !useResponsiveCompact
            ? styles.mediumCameraCard
            : undefined,
          useResponsiveCompact ? styles.phoneCameraCard : undefined,
          isPool15 ? styles.pool15CameraCard : undefined,
          usePoolBroadcastLayout ? styles.poolCameraCard : undefined,
          {minHeight: cameraMinHeight},
        ]}>
        <Webcam
          ref={webcamRef}
          hideBottomControls
          setIsCameraReady={props.setIsCameraReady}
          isCameraReady={props.isCameraReady}
          webcamFolderName={props.webcamFolderName}
          updateWebcamFolderName={props.updateWebcamFolderName}
          cameraRef={props.cameraRef}
          isPaused={props.isPaused}
          isStarted={props.isStarted}
          youtubeLivePreviewActive={props.youtubeLivePreviewActive}
        />
      </View>

      {!isPool15 ? (
        <View
          style={[
            styles.actionStack,
            useTightLandscapeLayout && !useResponsiveCompact
              ? styles.mediumActionStack
              : undefined,
            useResponsiveCompact ? styles.phoneActionStack : undefined,
            usePoolBroadcastLayout ? styles.poolActionStack : undefined,
          ]}>
          {cameraUtilityRows}
          {mainActionRow}
          {bottomControls}
        </View>
      ) : null}

      {pool15Footer}
    </View>
  );
};

const createStyles = (adaptive: any, design: any, rules: any) => createGameplayStyles(adaptive, {
  wrapper: {
    width: '100%',
    flex: 1,
    backgroundColor: '#0F1013',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2C2F35',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 4,
  },
  phoneWrapper: {
    paddingHorizontal: 5,
    paddingTop: 5,
    paddingBottom: 5,
    gap: 4,
  },
  mediumWrapper: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 4,
  },
  poolWrapper: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 4,
  },
  caromWrapper: {
    backgroundColor: '#111216',
    minHeight: 0,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 3,
  },
  caromWrapperNoCamera: {
    justifyContent: 'space-between',
  },
  timeWrap: {
    width: '100%',
  },
  phoneTimeWrap: {},
  mediumTimeWrap: {},
  caromTimeWrap: {},
  caromTimeWrapNoCamera: {},
  timeCard: {
    width: '100%',
    minHeight: 66,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2C2F35',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17181C',
    paddingHorizontal: 12,
  },
  phoneTimeCard: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  mediumTimeCard: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  poolTimeCard: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  caromTimeCard: {
    backgroundColor: '#1A1315',
  },
  timeText: {
    color: '#FF2D2D',
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  phoneTimeText: {},
  caromTimeText: {
    color: '#FF3A3A',
  },
  phoneCaromTimeText: {},
  caromTimeTextNoCamera: {},
  metaRow: {
    width: '100%',
    gap: 8,
  },
  phoneMetaRow: {
    gap: 6,
  },
  mediumMetaRow: {
    gap: 6,
  },
  poolMetaRow: {
    gap: 6,
  },
  metaInlineRow: {
    width: '100%',
    gap: 6,
  },
  phoneMetaInlineRow: {
    gap: 5,
  },
  poolMetaInlineRow: {
    gap: 10,
  },
  metaInlineCard: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2F35',
    backgroundColor: '#17181C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  phoneMetaInlineCard: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  poolMetaInlineCard: {
    minHeight: 60,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  metaInlineTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  metaInlineText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metaInlineCombinedText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metaInlineCombinedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  metaInlineCombinedLabelText: {
    marginRight: 0,
  },
  metaInlineValueText: {
    color: '#FF2525',
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metaInlineCombinedValueText: {
    color: '#FF2525',
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  metaCard: {
    flex: 1,
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2F35',
    backgroundColor: '#17181C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  phoneMetaCard: {
    minHeight: 50,
    borderRadius: 11,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  mediumMetaCard: {
    minHeight: 52,
    borderRadius: 13,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  poolMetaCard: {
    minHeight: 54,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  metaLabel: {
    textAlign: 'center',
    opacity: 0.9,
  },
  phoneMetaLabel: {},
  metaValue: {
    marginTop: 4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  phoneMetaValue: {},
  metaValueNoLabel: {
    marginTop: 0,
  },
  goalRow: {
    width: '100%',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caromGoalInlineRow: {
    gap: 10,
  },
  caromGoalInlineLabel: {
    opacity: 0.9,
  },
  caromGoalInlineValue: {},
  cameraCard: {
    width: '100%',
    flex: 0.98,
    minHeight: 236,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 5,
    borderColor: '#383B40',
    backgroundColor: '#141518',
  },
  phoneCameraCard: {
    minHeight: 170,
    borderRadius: 16,
  },
  mediumCameraCard: {
    minHeight: 188,
    borderRadius: 18,
    borderWidth: 4,
  },
  caromCameraCard: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  caromCameraCardCompact: {
    borderWidth: 4,
    maxHeight: 118,
  },
  caromCameraCardExpanded: {
    flex: 1.2,
    maxHeight: undefined,
  },
  caromCameraCardTight: {
    flex: 0.54,
    maxHeight: 104,
  },
  caromPhoneCameraCard: {
    minHeight: 150,
  },
  poolCameraCard: {
    flex: 1.02,
    borderRadius: 18,
    borderWidth: 4,
    minHeight: 176,
  },
  pool15CameraCard: {
    flex: 1,
    minHeight: 180,
  },
  actionStack: {
    width: '100%',
    alignSelf: 'stretch',
    gap: 8,
    paddingBottom: 0,
  },
  phoneActionStack: {
    gap: 4,
  },
  mediumActionStack: {
    gap: 4,
  },
  poolActionStack: {
    gap: 12,
    paddingTop: 6,
  },
  caromActionStack: {
    gap: 4,
    flexShrink: 0,
  },
  caromActionStackCompact: {
    gap: 3,
  },
  caromActionStackTight: {
    gap: 2,
  },
  caromActionStackNoCamera: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  topButtonRowWrap: {
    width: '100%',
  },
  smallActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  compactSmallActionButton: {
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  extraCompactSmallActionButton: {
    minHeight: 38,
    borderRadius: 9,
    paddingHorizontal: 6,
  },
  tightSmallActionButton: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  poolSmallActionButton: {
    minHeight: 72,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  smallActionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  compactSmallActionText: {
    fontSize: 15,
  },
  extraCompactSmallActionText: {
    fontSize: 13,
  },
  tightSmallActionText: {
    fontSize: 12,
    lineHeight: 14,
  },
  poolSmallActionText: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 31,
  },
  wideButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  compactWideButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  extraCompactWideButton: {
    minHeight: 38,
    borderRadius: 9,
    paddingHorizontal: 6,
  },
  tightWideButton: {
    minHeight: 34,
    borderRadius: 9,
    paddingHorizontal: 6,
  },
  poolWideButton: {
    minHeight: 84,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  wideButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  compactWideButtonText: {
    fontSize: 16,
  },
  extraCompactWideButtonText: {
    fontSize: 14,
  },
  tightWideButtonText: {
    fontSize: 14,
    lineHeight: 16,
  },
  poolWideButtonText: {
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 34,
  },
  dualButtonRow: {
    width: '100%',
    gap: 6,
  },
  compactDualButtonRow: {
    gap: 6,
    flexWrap: 'nowrap',
  },
  dualButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  compactDualButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 8,
    minWidth: 0,
  },
  extraCompactDualButton: {
    minHeight: 38,
    borderRadius: 9,
    paddingHorizontal: 6,
    minWidth: 0,
  },
  tightDualButton: {
    minHeight: 34,
    borderRadius: 9,
    paddingHorizontal: 6,
  },
  poolDualButton: {
    minHeight: 84,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  dualButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  compactDualButtonText: {
    fontSize: 16,
  },
  extraCompactDualButtonText: {
    fontSize: 14,
  },
  tightDualButtonText: {
    fontSize: 13,
    lineHeight: 15,
  },
  poolDualButtonText: {
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 34,
  },
  tripleButtonRow: {
    width: '100%',
    gap: 6,
  },
  compactTripleButtonRow: {
    gap: 6,
    flexWrap: 'nowrap',
  },
  tripleButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  compactTripleButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 6,
    minWidth: 0,
  },
  extraCompactTripleButton: {
    minHeight: 38,
    borderRadius: 9,
    paddingHorizontal: 5,
    minWidth: 0,
  },
  tightTripleButton: {
    minHeight: 34,
    borderRadius: 9,
    paddingHorizontal: 4,
  },
  poolTripleButton: {
    minHeight: 72,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  tripleButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  compactTripleButtonText: {
    fontSize: 15,
  },
  extraCompactTripleButtonText: {
    fontSize: 13,
  },
  tightTripleButtonText: {
    fontSize: 12,
    lineHeight: 14,
  },
  poolTripleButtonText: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 31,
  },
  disabledButton: {
    opacity: 0.5,
  },
  goalCardFullWidth: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2F35',
    backgroundColor: '#17181C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  caromGoalCardFullWidth: {},
  phoneGoalCard: {
    minHeight: 46,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  mediumGoalCard: {
    minHeight: 50,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  caromGoalCardNoCamera: {},
  caromGoalCardInline: {
    minHeight: 44,
    paddingVertical: 4,
  },
  caromGoalCardCompact: {
    minHeight: 40,
    paddingVertical: 3,
  },
  caromGoalCardTight: {
    minHeight: 34,
    paddingVertical: 2,
  },
  caromGoalCardLargeDisplay: {},
  caromInfoWrap: {
    width: '100%',
    flexShrink: 0,
  },
  caromInfoWrapCompact: {
    marginBottom: 0,
  },
  caromInfoWrapNoCamera: {},
  poolBallButton: {
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  poolBallButtonLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  poolBallButtonSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  poolBallStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '31%',
    height: '38%',
  },
  poolBallStripeSmall: {},
  poolBallText: {
    fontWeight: '900',
    includeFontPadding: false,
  },
  poolBallTextLarge: {
    fontSize: 18,
    lineHeight: 18,
  },
  poolBallTextSmall: {
    fontSize: 14,
    lineHeight: 14,
  },
  pool15FooterWrap: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2C2F35',
    backgroundColor: '#141518',
    padding: 10,
    gap: 10,
  },
  pool15WinnerCard: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#17181C',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  pool15WinnerText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  pool15RestartButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF5B5B',
    backgroundColor: '#FF1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pool15RestartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pool15OnlyRow: {
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pool15SideWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  pool15SideScore: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  pool15CenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pool15FreeGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pool15FreeBallWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  pool8FreeFooterRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pool8FreeSideCounter: {
    width: 78,
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2F35',
    backgroundColor: '#17181C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  pool8FreeSideCounterTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  pool8FreeSideCounterValue: {
    color: '#FF2525',
    fontSize: 28,
    fontWeight: '900',
  },
  pool8FreeCenterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pool8FreeRowsWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pool8FreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pool8FreeBallPlaceholder: {
    width: 44,
    height: 44,
  },
  pool8FreeWinnerInline: {
    width: '100%',
    minHeight: 148,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2F35',
    backgroundColor: '#17181C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  pool8FreeWinnerInlineText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
  },
  pool8FreeWinnerInlineButton: {
    minWidth: 164,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1BE4C',
    backgroundColor: '#E2A20A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pool8FreeWinnerInlineButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default memo(GameConsole);
