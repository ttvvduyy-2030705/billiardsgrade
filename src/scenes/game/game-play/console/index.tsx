import React, {memo, useEffect, useMemo, useRef} from 'react';
import {StyleSheet, Text as RNText, useWindowDimensions} from 'react-native';

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
        compact ? styles.caromSmallActionButton : undefined,
        extraCompact ? styles.caromSmallActionButtonNoCamera : undefined,
        buttonToneStyle(tone),
        disabled ? styles.disabledButton : undefined,
      ]}>
      <Text
        color={'#FFFFFF'}
        style={[
          styles.smallActionText,
          poolCompact ? styles.poolSmallActionText : undefined,
          compact ? styles.caromSmallActionText : undefined,
          extraCompact ? styles.caromSmallActionTextNoCamera : undefined,
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
        compact ? styles.caromWideButton : undefined,
        extraCompact ? styles.caromWideButtonNoCamera : undefined,
        buttonToneStyle(tone),
      ]}>
      <Text
        color={'#FFFFFF'}
        style={[
          styles.wideButtonText,
          poolCompact ? styles.poolWideButtonText : undefined,
          compact ? styles.caromWideButtonText : undefined,
          extraCompact ? styles.caromWideButtonTextNoCamera : undefined,
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
    <View direction={'row'} style={[styles.dualButtonRow, compact ? styles.caromDualButtonRow : undefined]}>
      <Button
        onPress={onLeftPress}
        style={[
          styles.dualButton,
          poolCompact ? styles.poolDualButton : undefined,
          poolCompact ? styles.poolDualButton : undefined,
          compact ? styles.caromDualButton : undefined,
          extraCompact ? styles.caromWideButtonNoCamera : undefined,
          buttonToneStyle(leftTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.wideButtonText,
            poolCompact ? styles.poolWideButtonText : undefined,
            poolCompact ? styles.poolWideButtonText : undefined,
            compact ? styles.caromWideButtonText : undefined,
            extraCompact ? styles.caromWideButtonTextNoCamera : undefined,
          ]}>
          {leftLabel}
        </Text>
      </Button>

      <Button
        onPress={onRightPress}
        style={[
          styles.dualButton,
          compact ? styles.caromDualButton : undefined,
          extraCompact ? styles.caromWideButtonNoCamera : undefined,
          buttonToneStyle(rightTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.wideButtonText,
            compact ? styles.caromWideButtonText : undefined,
            extraCompact ? styles.caromWideButtonTextNoCamera : undefined,
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
    <View direction={'row'} style={[styles.tripleButtonRow, compact ? styles.caromTripleButtonRow : undefined]}>
      <Button
        onPress={onLeftPress}
        style={[
          styles.tripleButton,
          poolCompact ? styles.poolTripleButton : undefined,
          poolCompact ? styles.poolTripleButton : undefined,
          poolCompact ? styles.poolTripleButton : undefined,
          compact ? styles.caromTripleButton : undefined,
          extraCompact ? styles.caromTripleButtonNoCamera : undefined,
          buttonToneStyle(leftTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.tripleButtonText,
            poolCompact ? styles.poolTripleButtonText : undefined,
            poolCompact ? styles.poolTripleButtonText : undefined,
            poolCompact ? styles.poolTripleButtonText : undefined,
            compact ? styles.caromTripleButtonText : undefined,
            extraCompact ? styles.caromTripleButtonTextNoCamera : undefined,
          ]}>
          {leftLabel}
        </Text>
      </Button>

      <Button
        onPress={onCenterPress}
        style={[
          styles.tripleButton,
          compact ? styles.caromTripleButton : undefined,
          extraCompact ? styles.caromTripleButtonNoCamera : undefined,
          buttonToneStyle(centerTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.tripleButtonText,
            compact ? styles.caromTripleButtonText : undefined,
            extraCompact ? styles.caromTripleButtonTextNoCamera : undefined,
          ]}>
          {centerLabel}
        </Text>
      </Button>

      <Button
        onPress={onRightPress}
        style={[
          styles.tripleButton,
          compact ? styles.caromTripleButton : undefined,
          extraCompact ? styles.caromTripleButtonNoCamera : undefined,
          buttonToneStyle(rightTone),
        ]}>
        <Text
          color={'#FFFFFF'}
          style={[
            styles.tripleButtonText,
            compact ? styles.caromTripleButtonText : undefined,
            extraCompact ? styles.caromTripleButtonTextNoCamera : undefined,
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
  const {width, height} = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 600;
  const isPhoneLandscape = !isTablet && width > height;
  const useResponsiveCompact = isPhoneLandscape || shortestSide <= 430;
  const useExtraCompact = shortestSide <= 430;
  const isLargeDisplay = width >= 1600 || shortestSide >= 900;

  const category = props.gameSettings?.category;
  const isPool = isPoolGame(category);
  const isCarom = isCaromGame(category);
  const isPool15 = isPool15Game(category);
  const isPool15Only = isPool15OnlyGame(category);
  const isPool15Free = isPool15FreeGame(category);
  const usePoolBroadcastLayout = isPool && !isPool15;
  const isFastMode = props.gameSettings?.mode?.mode === 'fast';
  const totalTimeText = viewModel.displayTotalTime();
  const players = props.playerSettings?.playingPlayers || [];

  const leftScore = Number(players[0]?.totalPoint || 0);
  const rightScore = Number(players[1]?.totalPoint || 0);

  const leftBall = useMemo(() => {
    return getPoolBall(
      LEFT_POOL_15_SEQUENCE[Math.min(leftScore, LEFT_POOL_15_SEQUENCE.length - 1)],
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

    return BALLS_15.filter(ball => !selectedBallNumbers.has(String(ball.number)));
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
      ? `▷ ${tr(isCarom || isFastMode ? 'Bắt đầu' : 'Tiếp tục', isCarom || isFastMode ? 'Start' : 'Resume')}`
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
            compact
            extraCompact={hideCaromCamera || useExtraCompact}
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
          compact={useResponsiveCompact}
        poolCompact={usePoolBroadcastLayout}
          extraCompact={hideCaromCamera || useExtraCompact}
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
  ]);

  const hideCaromCamera = isCarom && props.totalPlayers >= 5;

  const cameraUtilityRows = isCarom ? (
    <DualButton
      leftLabel={`↺ ${tr('Làm mới', 'Refresh')}`}
      rightLabel={`⌁ ${tr('Đổi cam', 'Switch cam')}`}
      onLeftPress={() => webcamRef.current?.refresh()}
      onRightPress={() => webcamRef.current?.switchCamera()}
      leftTone={'dark'}
      rightTone={'dark'}
      compact
      extraCompact={hideCaromCamera}
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
          compact
          extraCompact={hideCaromCamera}
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
    isCarom,
    isPool15,
    props.onGameBreak,
    startLabel,
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
            <RNText style={styles.pool15WinnerText}>
              {tr('Chúc mừng ', 'Congratulations ')}
              {props.winner.name}
              {tr(' đã chiến thắng', ' won')}
            </RNText>
          </View>
          <Button style={styles.pool15RestartButton} onPress={viewModel.onRestart}>
            <RNText style={styles.pool15RestartText}>{tr('Ván mới', 'New game')}</RNText>
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
            <View key={`free-ball-${ball.number}`} style={styles.pool15FreeBallWrap}>
              <PoolBallButton ball={ball} onPress={() => props.onPoolScore(ball)} />
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
    viewModel.onRestart,
  ]);

  if (isCarom) {
    return (
      <View style={[styles.wrapper, styles.caromWrapper, useResponsiveCompact ? styles.phoneWrapper : undefined, hideCaromCamera ? styles.caromWrapperNoCamera : undefined]}>
        <View style={[styles.timeWrap, styles.caromTimeWrap, useResponsiveCompact ? styles.phoneTimeWrap : undefined, hideCaromCamera ? styles.caromTimeWrapNoCamera : undefined]}>
          <View style={[styles.timeCard, styles.caromTimeCard, useResponsiveCompact ? styles.phoneTimeCard : undefined]}>
            <RNText style={[styles.timeText, styles.caromTimeText, useResponsiveCompact ? styles.phoneCaromTimeText : undefined, hideCaromCamera ? styles.caromTimeTextNoCamera : undefined]}>{totalTimeText}</RNText>
          </View>
        </View>

        {props.gameSettings?.mode?.countdownTime ? (
          <View style={[styles.caromInfoWrap, styles.caromInfoWrapCompact, hideCaromCamera ? styles.caromInfoWrapNoCamera : undefined]}>
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
    useResponsiveCompact ? styles.phoneCameraCard : undefined,
    styles.caromCameraCard,
    useResponsiveCompact ? styles.caromPhoneCameraCard : undefined,
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
            styles.caromGoalCardFullWidth,
            useResponsiveCompact ? styles.phoneGoalCard : undefined,
            hideCaromCamera ? styles.caromGoalCardNoCamera : undefined,
            !hideCaromCamera ? styles.caromGoalCardInline : undefined,
            isLargeDisplay && !useResponsiveCompact ? styles.caromGoalCardLargeDisplay : undefined,
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
                fontSize={30}
                fontWeight={'900'}
                style={[styles.metaValue, styles.metaValueNoLabel, styles.caromGoalInlineValue]}>
                {props.goal}
              </Text>
            </View>
          ) : (
            <Text
              color={'#FF2525'}
              fontSize={26}
              fontWeight={'900'}
              style={[styles.metaValue, styles.metaValueNoLabel]}>
              {props.goal}
            </Text>
          )}
        </View>

        <View style={[styles.actionStack, styles.caromActionStack, useResponsiveCompact ? styles.phoneActionStack : undefined, hideCaromCamera ? styles.caromActionStackNoCamera : undefined]}>
          {cameraUtilityRows}
          {mainActionRow}
          {bottomControls}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, useResponsiveCompact ? styles.phoneWrapper : undefined]}>
      <View style={[styles.timeWrap, useResponsiveCompact ? styles.phoneTimeWrap : undefined]}>
        <View style={[styles.timeCard, useResponsiveCompact ? styles.phoneTimeCard : undefined]}>
          <RNText style={[styles.timeText, useResponsiveCompact ? styles.phoneTimeText : undefined]}>{totalTimeText}</RNText>
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
        <View direction={'row'} style={[styles.metaRow, useResponsiveCompact ? styles.phoneMetaRow : undefined]}>
          <View style={[styles.metaCard, useResponsiveCompact ? styles.phoneMetaCard : undefined]}>
            <Text
              color={'#FFFFFF'}
              fontSize={18}
              fontWeight={'800'}
              style={[styles.metaLabel, useResponsiveCompact ? styles.phoneMetaLabel : undefined]}>
              {tr('Số lượt', 'Turns')}
            </Text>
            <Text
              color={'#FF2525'}
              fontSize={30}
              fontWeight={'900'}
              style={[styles.metaValue, useResponsiveCompact ? styles.phoneMetaValue : undefined]}>
              {props.totalTurns}
            </Text>
          </View>

          <View style={[styles.metaCard, useResponsiveCompact ? styles.phoneMetaCard : undefined]}>
            <Text
              color={'#FFFFFF'}
              fontSize={18}
              fontWeight={'800'}
              style={[styles.metaLabel, useResponsiveCompact ? styles.phoneMetaLabel : undefined]}>
              {tr('Mục tiêu', 'Goal')}
            </Text>
            <Text
              color={'#FF2525'}
              fontSize={30}
              fontWeight={'900'}
              style={[styles.metaValue, useResponsiveCompact ? styles.phoneMetaValue : undefined]}>
              {props.goal}
            </Text>
          </View>
        </View>
      )}

      <View
        style={[
          styles.cameraCard,
          useResponsiveCompact ? styles.phoneCameraCard : undefined,
          usePoolBroadcastLayout ? styles.poolCameraCard : undefined,
          useResponsiveCompact && usePoolBroadcastLayout
            ? styles.poolPhoneCameraCard
            : undefined,
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

      <View
        style={[
          styles.actionStack,
          useResponsiveCompact ? styles.phoneActionStack : undefined,
          usePoolBroadcastLayout ? styles.poolActionStack : undefined,
        ]}>
        {cameraUtilityRows}
        {mainActionRow}
        {bottomControls}
      </View>

      {pool15Footer}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    paddingBottom: 2,
  },

  caromWrapper: {
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },

  caromWrapperNoCamera: {
    paddingBottom: 0,
    justifyContent: 'flex-start',
  },

  timeWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  timeCard: {
    minWidth: 380,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#2c0202',
    paddingHorizontal: 28,
    paddingVertical: 10,
    overflow: 'visible',
  },

  timeText: {
    color: '#FF2020',
    fontSize: 70,
    lineHeight: 70,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },

  topButtonRowWrap: {
    marginBottom: 10,
  },

  metaRow: {
    width: '100%',
    gap: 12,
    marginBottom: 6,
  },

  metaCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2D33',
    backgroundColor: '#17181c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  goalCardFullWidth: {
    width: '100%',
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2D33',
    backgroundColor: '#17181c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 10,
  },

  metaLabel: {
    textAlign: 'center',
  },

  metaValue: {
    marginTop: 2,
    textAlign: 'center',
  },

  metaValueNoLabel: {
    marginTop: 0,
  },

  caromInfoWrap: {
    width: '100%',
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },

  cameraCard: {
    width: '100%',
    height: 345,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#383B40',
    backgroundColor: '#141518',
    marginBottom: 8,
  },

  poolCameraCard: {
    height: 392,
    marginBottom: 6,
  },

  poolPhoneCameraCard: {
    height: 272,
    marginBottom: 6,
  },

  poolActionStack: {
    gap: 6,
    paddingBottom: 0,
    marginTop: -2,
  },

  actionStack: {
    width: '100%',
    alignSelf: 'stretch',
    gap: 8,
    paddingBottom: 4,
  },

  actionRow: {
    width: '100%',
    gap: 12,
  },

  smallActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  smallActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  wideButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  wideButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  dualButtonRow: {
    width: '100%',
    gap: 12,
  },

  dualButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  tripleButtonRow: {
    width: '100%',
    gap: 12,
  },

  tripleButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  tripleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  poolSmallActionButton: {
    minHeight: 38,
    borderRadius: 12,
  },

  poolSmallActionText: {
    fontSize: 13,
  },

  poolWideButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 10,
  },

  poolWideButtonText: {
    fontSize: 15,
  },

  poolDualButtonRow: {
    gap: 8,
  },

  poolDualButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 10,
  },

  poolTripleButtonRow: {
    gap: 8,
  },

  poolTripleButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 6,
  },

  poolTripleButtonText: {
    fontSize: 13,
  },

  caromTimeWrap: {
    marginBottom: 6,
  },

  caromTimeCard: {
    minWidth: 340,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },

  caromTimeText: {
    fontSize: 58,
    lineHeight: 60,
  },

  caromTimeWrapNoCamera: {
    marginBottom: 4,
  },

  caromTimeTextNoCamera: {
    fontSize: 42,
    lineHeight: 44,
  },

  caromInfoWrapCompact: {
    marginBottom: 6,
  },

  caromInfoWrapNoCamera: {
    marginBottom: 3,
  },

  caromCameraCard: {
  height: 360,
  marginBottom: 4,
},

caromPhoneCameraCard: {
  height: 220,
},

  caromGoalCardFullWidth: {
    minHeight: 40,
    paddingVertical: 2,
    marginTop: 4,
  },

  caromGoalCardInline: {
    justifyContent: 'center',
  },

  caromGoalInlineRow: {
    width: '100%',
    paddingHorizontal: 12,
    gap: 8,
  },

  caromGoalInlineLabel: {
    textAlign: 'center',
  },

  caromGoalInlineValue: {
    marginTop: 0,
  },

  caromGoalCardLargeDisplay: {
    minHeight: 28,
    paddingVertical: 1,
    marginTop: 1,
  },

  caromGoalCardNoCamera: {
    marginTop: 3,
    minHeight: 34,
    paddingVertical: 3,
  },

  caromActionStack: {
    gap: 2,
    paddingBottom: 0,
    marginTop: -1,
  },

  caromActionStackNoCamera: {
    gap: 3,
    paddingBottom: 0,
  },

  caromActionRow: {
    gap: 4,
  },

  caromSmallActionButton: {
    minHeight: 38,
    borderRadius: 12,
  },

  caromSmallActionButtonNoCamera: {
    minHeight: 34,
    borderRadius: 10,
  },

  caromSmallActionText: {
    fontSize: 13,
  },

  caromSmallActionTextNoCamera: {
    fontSize: 11,
  },

  caromWideButton: {
    minHeight: 42,
    borderRadius: 12,
  },

  caromWideButtonNoCamera: {
    minHeight: 36,
    borderRadius: 10,
  },

  caromWideButtonText: {
    fontSize: 15,
  },

  caromWideButtonTextNoCamera: {
    fontSize: 12,
  },

  caromDualButtonRow: {
    gap: 8,
  },

  caromDualButton: {
    minHeight: 42,
    borderRadius: 12,
  },

  caromTripleButtonRow: {
    gap: 8,
  },

  caromTripleButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 6,
  },

  caromTripleButtonNoCamera: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 4,
  },

  caromTripleButtonText: {
    fontSize: 13,
  },

  caromTripleButtonTextNoCamera: {
    fontSize: 11,
  },

  pool15FooterWrap: {
    marginTop: 10,
    paddingTop: 6,
  },

  pool15OnlyRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  pool15SideWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  pool15CenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  pool15SideScore: {
    minWidth: 28,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },

  pool15FreeGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },

  pool15FreeBallWrap: {
    marginHorizontal: 3,
    marginVertical: 4,
  },

  pool15WinnerCard: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#462326',
    backgroundColor: '#0B0C10',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  pool15WinnerText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },

  pool15RestartButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6C6C',
    backgroundColor: '#FF5A5A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  pool15RestartText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },

  poolBallButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    overflow: 'hidden',
  },

  poolBallButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  poolBallButtonSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  poolBallStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 24,
    borderRadius: 10,
  },

  poolBallStripeSmall: {
    height: 12,
    borderRadius: 6,
  },

  poolBallText: {
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },

  poolBallTextLarge: {
    fontSize: 24,
    lineHeight: 26,
  },

  poolBallTextSmall: {
    fontSize: 13,
    lineHeight: 14,
  },


  phoneWrapper: {
    paddingBottom: 4,
  },

  phoneTimeWrap: {
    marginBottom: 6,
  },

  phoneTimeCard: {
    width: '100%',
    minWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  phoneTimeText: {
    fontSize: 50,
    lineHeight: 50,
  },

  phoneCaromTimeText: {
    fontSize: 42,
    lineHeight: 44,
  },

  phoneMetaRow: {
    gap: 8,
    marginBottom: 8,
  },

  phoneMetaCard: {
    minHeight: 52,
    borderRadius: 12,
    paddingVertical: 6,
  },

  phoneMetaLabel: {
    fontSize: 14,
    lineHeight: 16,
  },

  phoneMetaValue: {
    marginTop: 0,
    fontSize: 24,
    lineHeight: 26,
  },

  phoneGoalCard: {
    minHeight: 46,
    borderRadius: 12,
    paddingVertical: 4,
    marginTop: 6,
  },

  phoneCameraCard: {
    height: 172,
    borderRadius: 14,
    marginBottom: 6,
  },

  phoneActionStack: {
    gap: 6,
  },

  phoneActionRow: {
    gap: 8,
  },

  disabledButton: {
    opacity: 0.5,
  },
});

export default memo(GameConsole);
