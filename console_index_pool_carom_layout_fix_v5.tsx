import React, {memo, useEffect, useMemo, useRef} from 'react';
import {
  StyleSheet,
  Text as RNText,
  useWindowDimensions,
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
import {getGameplayScreenProfile, clamp} from '../screenProfile';

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

const isEnglish = () => {
  const locale = String(
    (i18n as any)?.locale || (i18n as any)?.language || '',
  ).toLowerCase();
  return locale.startsWith('en');
};

const tr = (vi: string, en: string) => (isEnglish() ? en : vi);

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
}: {
  label: string;
  onPress?: () => void;
  tone?: ActionButtonTone;
  disabled?: boolean;
  compact?: boolean;
  extraCompact?: boolean;
  poolCompact?: boolean;
}) => {
  return (
    <Button
      onPress={disabled ? undefined : onPress}
      style={[
        styles.smallActionButton,
        poolCompact ? styles.poolSmallActionButton : undefined,
        compact ? styles.compactSmallActionButton : undefined,
        extraCompact ? styles.extraCompactSmallActionButton : undefined,
        buttonToneStyle(tone),
        disabled ? styles.disabledButton : undefined,
      ]}>
      <Text
        color={'#FFFFFF'}
        style={[
          styles.smallActionText,
          poolCompact ? styles.poolSmallActionText : undefined,
          compact ? styles.compactSmallActionText : undefined,
          extraCompact ? styles.extraCompactSmallActionText : undefined,
        ]}>
        {label}
      </Text>
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
}: {
  label: string;
  onPress?: () => void;
  tone?: ActionButtonTone;
  compact?: boolean;
  extraCompact?: boolean;
  poolCompact?: boolean;
}) => {
  return (
    <Button
      onPress={onPress}
      style={[
        styles.wideButton,
        poolCompact ? styles.poolWideButton : undefined,
        compact ? styles.compactWideButton : undefined,
        extraCompact ? styles.extraCompactWideButton : undefined,
        buttonToneStyle(tone),
      ]}>
      <Text
        color={'#FFFFFF'}
        style={[
          styles.wideButtonText,
          poolCompact ? styles.poolWideButtonText : undefined,
          compact ? styles.compactWideButtonText : undefined,
          extraCompact ? styles.extraCompactWideButtonText : undefined,
        ]}>
        {label}
      </Text>
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
          buttonToneStyle(leftTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.wideButtonText,
            poolCompact ? styles.poolWideButtonText : undefined,
            compact ? styles.compactWideButtonText : undefined,
            extraCompact ? styles.extraCompactWideButtonText : undefined,
          ]}>
          {leftLabel}
        </Text>
      </Button>

      <Button
        onPress={onRightPress}
        style={[
          styles.dualButton,
          poolCompact ? styles.poolDualButton : undefined,
          compact ? styles.compactDualButton : undefined,
          extraCompact ? styles.extraCompactDualButton : undefined,
          buttonToneStyle(rightTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.wideButtonText,
            poolCompact ? styles.poolWideButtonText : undefined,
            compact ? styles.compactWideButtonText : undefined,
            extraCompact ? styles.extraCompactWideButtonText : undefined,
          ]}>
          {rightLabel}
        </Text>
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
          buttonToneStyle(leftTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.tripleButtonText,
            poolCompact ? styles.poolTripleButtonText : undefined,
            compact ? styles.compactTripleButtonText : undefined,
            extraCompact ? styles.extraCompactTripleButtonText : undefined,
          ]}>
          {leftLabel}
        </Text>
      </Button>

      <Button
        onPress={onCenterPress}
        style={[
          styles.tripleButton,
          poolCompact ? styles.poolTripleButton : undefined,
          compact ? styles.compactTripleButton : undefined,
          extraCompact ? styles.extraCompactTripleButton : undefined,
          buttonToneStyle(centerTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.tripleButtonText,
            poolCompact ? styles.poolTripleButtonText : undefined,
            compact ? styles.compactTripleButtonText : undefined,
            extraCompact ? styles.extraCompactTripleButtonText : undefined,
          ]}>
          {centerLabel}
        </Text>
      </Button>

      <Button
        onPress={onRightPress}
        style={[
          styles.tripleButton,
          poolCompact ? styles.poolTripleButton : undefined,
          compact ? styles.compactTripleButton : undefined,
          extraCompact ? styles.extraCompactTripleButton : undefined,
          buttonToneStyle(rightTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.tripleButtonText,
            poolCompact ? styles.poolTripleButtonText : undefined,
            compact ? styles.compactTripleButtonText : undefined,
            extraCompact ? styles.extraCompactTripleButtonText : undefined,
          ]}>
          {rightLabel}
        </Text>
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
  const {width, height, fontScale} = useWindowDimensions();
  const profile = getGameplayScreenProfile(width, height, fontScale);
  const {shortestSide, longestSide, isLandscape, isLargeDisplay, isHandheldLandscape} = profile;
  const isMediumLandscape = isLandscape && profile.isMediumDisplay;
  const isCompactLandscape = isHandheldLandscape;
  const isShortLandscape = isLandscape && profile.scale <= 0.84;
  const isVeryShortLandscape = isLandscape && profile.scale <= 0.72;
  const useCaromCondensedLayout =
    isLandscape && isCaromGame(props.gameSettings?.category) && !isLargeDisplay &&
    (profile.scale <= 0.92 || height <= 940);
  const useCaromUltraCondensed =
    useCaromCondensedLayout && (profile.scale <= 0.74 || height <= 820);
  const useResponsiveCompact =
    isCompactLandscape || shortestSide <= 430 || isShortLandscape || useCaromUltraCondensed;
  const useTightLandscapeLayout = isMediumLandscape || useResponsiveCompact;
  const useExtraCompact =
    shortestSide <= 430 || isVeryShortLandscape || isHandheldLandscape || useCaromUltraCondensed;

  const uiScale = useMemo(() => {
    if (isLargeDisplay) {
      return 1;
    }
    if (isHandheldLandscape) {
      return profile.consoleScale;
    }
    return clamp(profile.scale, 0.74, 1);
  }, [isHandheldLandscape, isLargeDisplay, profile.consoleScale, profile.scale]);

  const category = props.gameSettings?.category;
  const isPool = isPoolGame(category);
  const isCarom = isCaromGame(category);
  const isPool15 = isPool15Game(category);
  const isPool15Only = isPool15OnlyGame(category);
  const isPool15Free = isPool15FreeGame(category);
  const usePoolBroadcastLayout = isPool && !isPool15;
  const useInlinePoolMeta = usePoolBroadcastLayout && isHandheldLandscape;
  const isFastMode = props.gameSettings?.mode?.mode === 'fast';
  const forceCompactActionButtons = useCaromCondensedLayout;
  const forceExtraCompactActionButtons = useCaromUltraCondensed;
  const totalTimeText = viewModel.displayTotalTime();
  const players = props.playerSettings?.playingPlayers || [];
  const hideCaromCamera = isCarom && (props.totalPlayers || 0) >= 5;

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
            compact={useResponsiveCompact || forceCompactActionButtons}
            extraCompact={hideCaromCamera || useExtraCompact || forceExtraCompactActionButtons}
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
          compact={useResponsiveCompact || forceCompactActionButtons}
          extraCompact={hideCaromCamera || useExtraCompact || forceExtraCompactActionButtons}
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
    forceCompactActionButtons,
    forceExtraCompactActionButtons,
  ]);

  const cameraUtilityRows = isCarom ? (
    <DualButton
      leftLabel={`↺ ${tr('Làm mới', 'Refresh')}`}
      rightLabel={`⌁ ${tr('Đổi cam', 'Switch cam')}`}
      onLeftPress={() => webcamRef.current?.refresh()}
      onRightPress={() => webcamRef.current?.switchCamera()}
      leftTone={'dark'}
      rightTone={'dark'}
      compact={useResponsiveCompact || forceCompactActionButtons}
      extraCompact={hideCaromCamera || useExtraCompact || forceExtraCompactActionButtons}
    />
  ) : (
    <>
      <WideActionButton
        label={`↺ ${tr('Làm mới', 'Refresh')}`}
        tone={'dark'}
        onPress={() => webcamRef.current?.refresh()}
        compact={useResponsiveCompact}
        poolCompact={usePoolBroadcastLayout}
        extraCompact={hideCaromCamera || useExtraCompact}
      />

      <DualButton
        leftLabel={`◔ ${tr('Giải lao', 'Break')}`}
        rightLabel={`⌁ ${tr('Đổi cam', 'Switch cam')}`}
        onLeftPress={props.onGameBreak}
        onRightPress={() => webcamRef.current?.switchCamera()}
        leftTone={'dark'}
        rightTone={'dark'}
        compact={useResponsiveCompact}
        poolCompact={usePoolBroadcastLayout}
        extraCompact={hideCaromCamera || useExtraCompact}
      />
    </>
  );

  const bottomControls = useMemo(() => {
    if (isPool15) {
      return null;
    }

    if (isCarom) {
      return (
        <TripleButton
          leftLabel={startLabel}
          centerLabel={`◔ ${tr('Giải lao', 'Break')}`}
          rightLabel={`✈ ${tr('Kết thúc', 'End')}`}
          onLeftPress={handleBottomLeft}
          onCenterPress={props.onGameBreak}
          onRightPress={viewModel.onStop}
          leftTone={'amber'}
          centerTone={'dark'}
          rightTone={'red'}
          compact={useResponsiveCompact || forceCompactActionButtons}
          extraCompact={hideCaromCamera || useExtraCompact || forceExtraCompactActionButtons}
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
  ]);

  const pool15Footer = useMemo(() => {
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

    return (
      <View style={styles.pool15FooterWrap}>
        <View style={styles.pool15FreeGrid}>
          {remainingFreeBalls.map(ball => (
            <View
              key={`free-ball-${ball.number}`}
              style={styles.pool15FreeBallWrap}>
              <PoolBallButton
                ball={ball}
                size={useExtraCompact ? 'small' : 'large'}
                onPress={() => props.onPoolScore(ball)}
              />
            </View>
          ))}
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
  ]);

  const caromTimeScale = useCaromUltraCondensed ? 0.58 : useCaromCondensedLayout ? 0.72 : 1;
  const poolTimeScale = usePoolBroadcastLayout && isHandheldLandscape ? 0.72 : 1;
  const timeTextStyle = {
    fontSize: Math.round(
      (isCarom ? 56 * caromTimeScale : usePoolBroadcastLayout ? 64 * poolTimeScale : 64) *
        uiScale,
    ),
    lineHeight: Math.round(
      (isCarom ? 60 * caromTimeScale : usePoolBroadcastLayout ? 68 * poolTimeScale : 68) *
        uiScale,
    ),
  };

  const metaValueStyle = {
    fontSize: Math.round((isHandheldLandscape ? 24 : 30) * uiScale),
    lineHeight: Math.round((isHandheldLandscape ? 28 : 34) * uiScale),
  };

  const cameraMinHeight = useMemo(() => {
    if (isPool15) {
      if (useExtraCompact) {
        return 150;
      }

      if (useResponsiveCompact) {
        return 165;
      }

      return isLargeDisplay ? 260 : 190;
    }

    if (isCarom) {
      if (isHandheldLandscape) {
        return 132;
      }

      if (useCaromUltraCondensed) {
        return 86;
      }

      if (useCaromCondensedLayout) {
        return 104;
      }

      if (useExtraCompact) {
        return 112;
      }

      if (useResponsiveCompact) {
        return 126;
      }

      if (useTightLandscapeLayout) {
        return 175;
      }

      return isLargeDisplay ? 250 : 205;
    }

    if (usePoolBroadcastLayout && isHandheldLandscape) {
      return 148;
    }

    if (useExtraCompact) {
      return 110;
    }

    if (useResponsiveCompact) {
      return 126;
    }

    if (useTightLandscapeLayout) {
      return 195;
    }

    return isLargeDisplay ? 280 : 228;
  }, [
    isCarom,
    isHandheldLandscape,
    isLargeDisplay,
    isPool15,
    useExtraCompact,
    usePoolBroadcastLayout,
    useResponsiveCompact,
    useTightLandscapeLayout,
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
          useCaromCondensedLayout ? styles.caromCondensedWrapper : undefined,
          useCaromUltraCondensed ? styles.caromUltraCondensedWrapper : undefined,
          useResponsiveCompact ? styles.phoneWrapper : undefined,
          isHandheldLandscape ? styles.handheldWrapper : undefined,
          hideCaromCamera ? styles.caromWrapperNoCamera : undefined,
        ]}>
        <View
          style={[
            styles.timeWrap,
            styles.caromTimeWrap,
            useResponsiveCompact ? styles.phoneTimeWrap : undefined,
            hideCaromCamera ? styles.caromTimeWrapNoCamera : undefined,
          ]}>
          <View
            style={[
              styles.timeCard,
              styles.caromTimeCard,
              useCaromCondensedLayout ? styles.caromCondensedTimeCard : undefined,
              useCaromUltraCondensed ? styles.caromUltraCondensedTimeCard : undefined,
              useResponsiveCompact ? styles.phoneTimeCard : undefined,
            ]}>
            <RNText
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
              style={[
                styles.timeText,
                styles.caromTimeText,
                timeTextStyle,
                useResponsiveCompact ? styles.phoneCaromTimeText : undefined,
                hideCaromCamera ? styles.caromTimeTextNoCamera : undefined,
              ]}>
              {totalTimeText}
            </RNText>
          </View>
        </View>

        {props.gameSettings?.mode?.countdownTime ? (
          <View
            style={[
              styles.caromInfoWrap,
              styles.caromInfoWrapCompact,
              useCaromCondensedLayout ? styles.caromCondensedInfoWrap : undefined,
              useCaromUltraCondensed ? styles.caromUltraCondensedInfoWrap : undefined,
              isHandheldLandscape ? styles.handheldCaromInfoWrap : undefined,
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
              useCaromCondensedLayout ? styles.caromCondensedCameraCard : undefined,
              useCaromUltraCondensed ? styles.caromUltraCondensedCameraCard : undefined,
              useResponsiveCompact ? styles.caromPhoneCameraCard : undefined,
              isHandheldLandscape ? styles.handheldCameraCard : undefined,
              isHandheldLandscape ? styles.handheldCaromCameraCard : undefined,
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
        ) : null}

        <View
          style={[
            styles.goalCardFullWidth,
            useTightLandscapeLayout && !useResponsiveCompact
              ? styles.mediumGoalCard
              : undefined,
            styles.caromGoalCardFullWidth,
            useCaromCondensedLayout ? styles.caromCondensedGoalCard : undefined,
            useCaromUltraCondensed ? styles.caromUltraCondensedGoalCard : undefined,
            useResponsiveCompact ? styles.phoneGoalCard : undefined,
            isHandheldLandscape ? styles.handheldGoalCard : undefined,
            hideCaromCamera ? styles.caromGoalCardNoCamera : undefined,
            !hideCaromCamera ? styles.caromGoalCardInline : undefined,
            isLargeDisplay && !useResponsiveCompact
              ? styles.caromGoalCardLargeDisplay
              : undefined,
          ]}>
          {!hideCaromCamera ? (
            <View
              direction={'row'}
              alignItems={'center'}
              justify={'center'}
              style={styles.caromGoalInlineRow}>
              <Text
                color={'#FFFFFF'}
                fontSize={18}
                fontWeight={'800'}
                style={[styles.metaLabel, styles.caromGoalInlineLabel]}>
                {tr('Mục tiêu', 'Goal')}
              </Text>
              <Text
                color={'#FF2525'}
                fontWeight={'900'}
                style={[
                  styles.metaValue,
                  styles.metaValueNoLabel,
                  styles.caromGoalInlineValue,
                  metaValueStyle,
                ]}>
                {props.goal}
              </Text>
            </View>
          ) : (
            <View style={styles.goalRow}>
              <Text color={'#FFFFFF'} fontSize={16} fontWeight={'700'}>
                {tr('Mục tiêu', 'Goal')}
              </Text>
              <Text
                color={'#FF2525'}
                fontWeight={'900'}
                style={[styles.metaValue, styles.metaValueNoLabel, metaValueStyle]}>
                {props.goal}
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.actionStack,
            styles.caromActionStack,
            useCaromCondensedLayout ? styles.caromCondensedActionStack : undefined,
            useCaromUltraCondensed ? styles.caromUltraCondensedActionStack : undefined,
            useTightLandscapeLayout && !useResponsiveCompact
              ? styles.mediumActionStack
              : undefined,
            useResponsiveCompact ? styles.phoneActionStack : undefined,
            isHandheldLandscape ? styles.handheldActionStack : undefined,
            isHandheldLandscape ? styles.handheldCaromActionStack : undefined,
            hideCaromCamera ? styles.caromActionStackNoCamera : undefined,
          ]}>
          {cameraUtilityRows}
          {mainActionRow}
          {bottomControls}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrapper,
        useTightLandscapeLayout && !useResponsiveCompact
          ? styles.mediumWrapper
          : undefined,
        useResponsiveCompact ? styles.phoneWrapper : undefined,
        isHandheldLandscape ? styles.handheldWrapper : undefined,
        usePoolBroadcastLayout ? styles.poolWrapper : undefined,
        isHandheldLandscape && usePoolBroadcastLayout
          ? styles.handheldPoolWrapper
          : undefined,
      ]}>
      <View
        style={[
          styles.timeWrap,
          useTightLandscapeLayout && !useResponsiveCompact
            ? styles.mediumTimeWrap
            : undefined,
          useResponsiveCompact ? styles.phoneTimeWrap : undefined,
        ]}>
        <View
          style={[
            styles.timeCard,
            useTightLandscapeLayout && !useResponsiveCompact
              ? styles.mediumTimeCard
              : undefined,
            useResponsiveCompact ? styles.phoneTimeCard : undefined,
            isHandheldLandscape ? styles.handheldTimeCard : undefined,
            usePoolBroadcastLayout ? styles.poolTimeCard : undefined,
            usePoolBroadcastLayout && isHandheldLandscape
              ? styles.handheldPoolTimeCard
              : undefined,
          ]}>
          <RNText
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.7}
            allowFontScaling={false}
            maxFontSizeMultiplier={1}
            style={[
              styles.timeText,
              timeTextStyle,
              useResponsiveCompact ? styles.phoneTimeText : undefined,
            ]}>
            {totalTimeText}
          </RNText>
        </View>
      </View>

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
      ) : (
        <View
          direction={'row'}
          style={[
            styles.metaRow,
            useTightLandscapeLayout && !useResponsiveCompact
              ? styles.mediumMetaRow
              : undefined,
            useResponsiveCompact ? styles.phoneMetaRow : undefined,
            isHandheldLandscape ? styles.handheldMetaRow : undefined,
            usePoolBroadcastLayout ? styles.poolMetaRow : undefined,
            isHandheldLandscape && usePoolBroadcastLayout
              ? styles.handheldPoolMetaRow
              : undefined,
          ]}>
          <View
            style={[
              styles.metaCard,
              useTightLandscapeLayout && !useResponsiveCompact
                ? styles.mediumMetaCard
                : undefined,
              useResponsiveCompact ? styles.phoneMetaCard : undefined,
              isHandheldLandscape ? styles.handheldMetaCard : undefined,
              usePoolBroadcastLayout ? styles.poolMetaCard : undefined,
              isHandheldLandscape && usePoolBroadcastLayout
                ? styles.handheldPoolMetaCard
                : undefined,
            ]}>
            {useInlinePoolMeta ? (
              <View direction={'row'} alignItems={'center'} justify={'center'} style={styles.poolInlineMetaRow}>
                <Text
                  color={'#FFFFFF'}
                  fontWeight={'800'}
                  style={[styles.metaLabel, styles.poolInlineMetaLabel]}>
                  {tr('Số lượt', 'Turns')}
                </Text>
                <Text
                  color={'#FF2525'}
                  fontWeight={'900'}
                  style={[styles.metaValue, styles.metaValueNoLabel, styles.poolInlineMetaValue]}>
                  {props.totalTurns}
                </Text>
              </View>
            ) : (
              <>
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
              </>
            )}
          </View>

          <View
            style={[
              styles.metaCard,
              useTightLandscapeLayout && !useResponsiveCompact
                ? styles.mediumMetaCard
                : undefined,
              useResponsiveCompact ? styles.phoneMetaCard : undefined,
              isHandheldLandscape ? styles.handheldMetaCard : undefined,
              usePoolBroadcastLayout ? styles.poolMetaCard : undefined,
              isHandheldLandscape && usePoolBroadcastLayout
                ? styles.handheldPoolMetaCard
                : undefined,
            ]}>
            {useInlinePoolMeta ? (
              <View direction={'row'} alignItems={'center'} justify={'center'} style={styles.poolInlineMetaRow}>
                <Text
                  color={'#FFFFFF'}
                  fontWeight={'800'}
                  style={[styles.metaLabel, styles.poolInlineMetaLabel]}>
                  {tr('Mục tiêu', 'Goal')}
                </Text>
                <Text
                  color={'#FF2525'}
                  fontWeight={'900'}
                  style={[styles.metaValue, styles.metaValueNoLabel, styles.poolInlineMetaValue]}>
                  {props.goal}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  color={'#FFFFFF'}
                  fontSize={18}
                  fontWeight={'800'}
                  style={[
                    styles.metaLabel,
                    useResponsiveCompact ? styles.phoneMetaLabel : undefined,
                  ]}>
                  {tr('Mục tiêu', 'Goal')}
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
              </>
            )}
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
          isHandheldLandscape ? styles.handheldCameraCard : undefined,
          isPool15 ? styles.pool15CameraCard : undefined,
          usePoolBroadcastLayout ? styles.poolCameraCard : undefined,
          isHandheldLandscape && usePoolBroadcastLayout
            ? styles.handheldPoolCameraCard
            : undefined,
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
            isHandheldLandscape ? styles.handheldActionStack : undefined,
            usePoolBroadcastLayout ? styles.poolActionStack : undefined,
            isHandheldLandscape && usePoolBroadcastLayout
              ? styles.handheldPoolActionStack
              : undefined,
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

const styles = StyleSheet.create({
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
    gap: 6,
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
  handheldWrapper: {
    paddingHorizontal: 3,
    paddingTop: 3,
    paddingBottom: 3,
    gap: 2,
  },
  poolWrapper: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 4,
  },
  caromWrapper: {
    backgroundColor: '#111216',
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
    minHeight: 44,
    borderRadius: 11,
    paddingHorizontal: 7,
  },
  mediumTimeCard: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  handheldTimeCard: {
    minHeight: 30,
    borderRadius: 9,
    paddingHorizontal: 5,
  },
  poolTimeCard: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  handheldPoolTimeCard: {
    minHeight: 24,
    borderRadius: 8,
    paddingHorizontal: 5,
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
  handheldPoolMetaRow: {
    width: '92%',
    alignSelf: 'center',
    gap: 4,
  },
  handheldMetaRow: {
    gap: 3,
    width: '80%',
    alignSelf: 'center',
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
    minHeight: 44,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  mediumMetaCard: {
    minHeight: 52,
    borderRadius: 13,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  poolMetaCard: {
    minHeight: 48,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  handheldPoolMetaCard: {
    minHeight: 22,
    borderRadius: 8,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  handheldMetaCard: {
    minHeight: 30,
    borderRadius: 9,
    paddingVertical: 2,
    paddingHorizontal: 4,
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
  poolInlineMetaRow: {
    gap: 4,
  },
  poolInlineMetaLabel: {
    fontSize: 11,
    lineHeight: 13,
  },
  poolInlineMetaValue: {
    fontSize: 14,
    lineHeight: 16,
    includeFontPadding: false,
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
    flex: 1,
    minHeight: 228,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 5,
    borderColor: '#383B40',
    backgroundColor: '#141518',
  },
  phoneCameraCard: {
    minHeight: 160,
    borderRadius: 14,
    borderWidth: 4,
  },
  mediumCameraCard: {
    minHeight: 205,
    borderRadius: 18,
    borderWidth: 4,
  },
  caromCameraCard: {},
  caromPhoneCameraCard: {
    minHeight: 148,
  },
  handheldCaromCameraCard: {
    width: '90%',
    alignSelf: 'center',
    flex: 0.96,
    minHeight: 126,
    maxHeight: 186,
    borderRadius: 10,
    borderWidth: 3,
  },
  handheldCameraCard: {
    width: '82%',
    alignSelf: 'center',
    flex: 0.66,
    minHeight: 98,
    maxHeight: 126,
    borderRadius: 10,
    borderWidth: 3,
  },
  poolCameraCard: {
    flex: 1.22,
    borderRadius: 16,
    borderWidth: 4,
    minHeight: 210,
  },
  handheldPoolCameraCard: {
    width: '92%',
    alignSelf: 'center',
    flex: 1.02,
    minHeight: 136,
    maxHeight: 196,
    borderRadius: 10,
    borderWidth: 3,
  },
  pool15CameraCard: {
    flex: 1,
    minHeight: 180,
  },
  actionStack: {
    width: '100%',
    alignSelf: 'stretch',
    gap: 5,
    paddingBottom: 0,
  },
  phoneActionStack: {
    gap: 4,
  },
  handheldActionStack: {
    width: '82%',
    alignSelf: 'center',
    gap: 2,
  },
  mediumActionStack: {
    gap: 4,
  },
  poolActionStack: {
    gap: 3,
  },
  handheldPoolActionStack: {
    width: '92%',
    alignSelf: 'center',
    gap: 2,
  },
  caromActionStack: {},
  handheldCaromActionStack: {
    width: '90%',
    alignSelf: 'center',
    gap: 2,
  },
  caromActionStackNoCamera: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  caromCondensedWrapper: {
    paddingHorizontal: 6,
    paddingTop: 5,
    paddingBottom: 5,
    gap: 4,
  },
  caromUltraCondensedWrapper: {
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 3,
  },
  caromCondensedTimeCard: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 7,
  },
  caromUltraCondensedTimeCard: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  caromCondensedInfoWrap: {
    marginTop: -2,
  },
  caromUltraCondensedInfoWrap: {
    marginTop: -4,
  },
  caromCondensedCameraCard: {
    flex: 0.58,
    maxHeight: 130,
    borderWidth: 3,
    borderRadius: 13,
  },
  caromUltraCondensedCameraCard: {
    flex: 0.48,
    maxHeight: 108,
    borderWidth: 3,
    borderRadius: 12,
  },
  caromCondensedGoalCard: {
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  caromUltraCondensedGoalCard: {
    minHeight: 28,
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  caromCondensedActionStack: {
    gap: 3,
  },
  caromUltraCondensedActionStack: {
    gap: 2,
  },
  topButtonRowWrap: {
    width: '100%',
  },
  smallActionButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  compactSmallActionButton: {
    minHeight: 26,
    borderRadius: 9,
    paddingHorizontal: 6,
  },
  extraCompactSmallActionButton: {
    minHeight: 20,
    borderRadius: 7,
    paddingHorizontal: 4,
  },
  poolSmallActionButton: {
    minHeight: 28,
    borderRadius: 9,
    paddingHorizontal: 6,
  },
  smallActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  compactSmallActionText: {
    fontSize: 9,
  },
  extraCompactSmallActionText: {
    fontSize: 7,
  },
  poolSmallActionText: {
    fontSize: 10,
  },
  wideButton: {
    width: '100%',
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  compactWideButton: {
    minHeight: 28,
    borderRadius: 9,
    paddingHorizontal: 8,
  },
  extraCompactWideButton: {
    minHeight: 21,
    borderRadius: 7,
    paddingHorizontal: 5,
  },
  poolWideButton: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  wideButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  compactWideButtonText: {
    fontSize: 11,
  },
  extraCompactWideButtonText: {
    fontSize: 10,
  },
  poolWideButtonText: {
    fontSize: 11,
  },
  dualButtonRow: {
    width: '100%',
    gap: 6,
  },
  compactDualButtonRow: {
    gap: 4,
  },
  dualButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  compactDualButton: {
    minHeight: 28,
    borderRadius: 9,
    paddingHorizontal: 8,
  },
  extraCompactDualButton: {
    minHeight: 21,
    borderRadius: 7,
    paddingHorizontal: 5,
  },
  poolDualButton: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  tripleButtonRow: {
    width: '100%',
    gap: 6,
  },
  compactTripleButtonRow: {
    gap: 4,
  },
  tripleButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  compactTripleButton: {
    minHeight: 28,
    borderRadius: 9,
    paddingHorizontal: 6,
  },
  extraCompactTripleButton: {
    minHeight: 21,
    borderRadius: 7,
    paddingHorizontal: 4,
  },
  poolTripleButton: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  tripleButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  compactTripleButtonText: {
    fontSize: 10,
  },
  extraCompactTripleButtonText: {
    fontSize: 7,
  },
  poolTripleButtonText: {
    fontSize: 10,
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
  handheldGoalCard: {
    width: '86%',
    alignSelf: 'center',
    minHeight: 26,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  mediumGoalCard: {
    minHeight: 50,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  caromGoalCardNoCamera: {},
  caromGoalCardInline: {},
  caromGoalCardLargeDisplay: {},
  caromInfoWrap: {
    width: '100%',
  },
  caromInfoWrapCompact: {},
  handheldCaromInfoWrap: {
    width: '86%',
    alignSelf: 'center',
    marginTop: -2,
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
});

export default memo(GameConsole);
