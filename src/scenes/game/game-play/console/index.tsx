import React, {memo, useMemo, useRef} from 'react';
import {StyleSheet, Text as RNText} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import {BALLS_15} from 'constants/balls';
import {BallType, PoolBallType} from 'types/ball';
import ConsoleViewModel, {ConsoleViewModelProps} from './ConsoleViewModel';
import Webcam, {WebCamHandle} from './webcam';
import {
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
}: {
  label: string;
  onPress?: () => void;
  tone?: ActionButtonTone;
  disabled?: boolean;
}) => {
  return (
    <Button
      onPress={disabled ? undefined : onPress}
      style={[
        styles.smallActionButton,
        buttonToneStyle(tone),
        disabled ? styles.disabledButton : undefined,
      ]}>
      <Text color={'#FFFFFF'} style={styles.smallActionText}>
        {label}
      </Text>
    </Button>
  );
};

const WideActionButton = ({
  label,
  onPress,
  tone = 'amber',
}: {
  label: string;
  onPress?: () => void;
  tone?: ActionButtonTone;
}) => {
  return (
    <Button
      onPress={onPress}
      style={[styles.wideButton, buttonToneStyle(tone)]}>
      <Text color={'#FFFFFF'} style={styles.wideButtonText}>
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
}: {
  leftLabel: string;
  rightLabel: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  leftTone?: ActionButtonTone;
  rightTone?: ActionButtonTone;
}) => {
  return (
    <View direction={'row'} style={styles.dualButtonRow}>
      <Button
        onPress={onLeftPress}
        style={[styles.dualButton, buttonToneStyle(leftTone)]}>
        <Text color={'#FFFFFF'} style={styles.wideButtonText}>
          {leftLabel}
        </Text>
      </Button>

      <Button
        onPress={onRightPress}
        style={[styles.dualButton, buttonToneStyle(rightTone)]}>
        <Text color={'#FFFFFF'} style={styles.wideButtonText}>
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
}) => {
  return (
    <View direction={'row'} style={styles.tripleButtonRow}>
      <Button
        onPress={onLeftPress}
        style={[styles.tripleButton, buttonToneStyle(leftTone)]}>
        <Text color={'#FFFFFF'} style={styles.tripleButtonText}>
          {leftLabel}
        </Text>
      </Button>

      <Button
        onPress={onCenterPress}
        style={[styles.tripleButton, buttonToneStyle(centerTone)]}>
        <Text color={'#FFFFFF'} style={styles.tripleButtonText}>
          {centerLabel}
        </Text>
      </Button>

      <Button
        onPress={onRightPress}
        style={[styles.tripleButton, buttonToneStyle(rightTone)]}>
        <Text color={'#FFFFFF'} style={styles.tripleButtonText}>
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
  const webcamRef = useRef<WebCamHandle>(null);

  const category = props.gameSettings?.category;
  const isPool = isPoolGame(category);
  const isPool15 = isPool15Game(category);
  const isPool15Only = isPool15OnlyGame(category);
  const isPool15Free = isPool15FreeGame(category);
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
      if ((props.warmUpCount ?? 0) > 0) {
        return `▷ ${tr(
          `Khởi động (${props.warmUpCount})`,
          `Warm-up (${props.warmUpCount})`,
        )}`;
      }
      return `▷ ${tr('Bắt đầu', 'Start')}`;
    }

    return props.isPaused
      ? `▷ ${tr('Tiếp tục', 'Resume')}`
      : `⏸ ${tr('Tạm dừng', 'Pause')}`;
  }, [props.isStarted, props.isPaused, props.warmUpCount]);

  const handleBottomLeft = () => {
    if (!props.isStarted) {
      if ((props.warmUpCount ?? 0) > 0) {
        viewModel.onWarmUp();
        return;
      }
      viewModel.onStart();
      return;
    }

    viewModel.onPause();
  };

  const mainActionRow = useMemo(() => {
    if (isPool15) {
      return null;
    }

    if (isPool && props.isStarted && props.poolBreakEnabled) {
      return (
        <WideActionButton
          label={`↗ ${tr('Phá bi', 'Break shot')}`}
          tone={'green'}
          onPress={props.onPoolBreak}
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
        />
      );
    }

    return (
      <WideActionButton
        label={`↗ ${tr('Đổi người', 'Switch turn')}`}
        tone={'amber'}
        onPress={viewModel.onSwitchTurn}
      />
    );
  }, [
    isPool,
    isPool15,
    props.isStarted,
    props.poolBreakEnabled,
    props.onPoolBreak,
    props.onResetTurn,
    viewModel.onPressGiveMoreTime,
    props.onReset,
    viewModel.onSwitchTurn,
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

  return (
    <View style={styles.wrapper}>
      <View style={styles.timeWrap}>
        <View style={styles.timeCard}>
          <RNText style={styles.timeText}>{totalTimeText}</RNText>
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
          />
        </View>
      ) : (
        <View direction={'row'} style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text
              color={'#FFFFFF'}
              fontSize={18}
              fontWeight={'800'}
              style={styles.metaLabel}>
              {tr('Số lượt', 'Turns')}
            </Text>
            <Text
              color={'#FF2525'}
              fontSize={30}
              fontWeight={'900'}
              style={styles.metaValue}>
              {props.totalTurns}
            </Text>
          </View>

          <View style={styles.metaCard}>
            <Text
              color={'#FFFFFF'}
              fontSize={18}
              fontWeight={'800'}
              style={styles.metaLabel}>
              {tr('Mục tiêu', 'Goal')}
            </Text>
            <Text
              color={'#FF2525'}
              fontSize={30}
              fontWeight={'900'}
              style={styles.metaValue}>
              {props.goal}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.cameraCard}>
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

      <View style={styles.actionStack}>
        <View direction={'row'} style={styles.actionRow}>
          <SmallActionButton
            label={`◔ ${tr('Giải lao', 'Break')}`}
            onPress={props.onGameBreak}
          />
          <SmallActionButton
            label={`◷ ${tr('Xem lại', 'Replay')}`}
            onPress={() => webcamRef.current?.rewatch()}
            disabled={!webcamRef.current?.canRewatch()}
          />
        </View>

        <View direction={'row'} style={styles.actionRow}>
          <SmallActionButton
            label={`↺ ${tr('Làm mới', 'Refresh')}`}
            onPress={() => webcamRef.current?.refresh()}
            disabled={!webcamRef.current?.canRefresh()}
          />
          <SmallActionButton
            label={`⌁ ${tr('Đổi cam', 'Switch cam')}`}
            onPress={() => webcamRef.current?.switchCamera()}
            disabled={!webcamRef.current?.canSwitchCamera()}
          />
        </View>

        {mainActionRow}

        {!isPool15 ? (
          <DualButton
            leftLabel={startLabel}
            rightLabel={`✈ ${tr('Kết thúc', 'End')}`}
            onLeftPress={handleBottomLeft}
            onRightPress={viewModel.onStop}
            leftTone={'amber'}
            rightTone={'red'}
          />
        ) : null}
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
    paddingBottom: 8,
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
    backgroundColor: '#000000',
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
    marginBottom: 10,
  },

  metaCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2D33',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  metaLabel: {
    textAlign: 'center',
  },

  metaValue: {
    marginTop: 2,
    textAlign: 'center',
  },

  cameraCard: {
    width: '100%',
    height: 218,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#383B40',
    backgroundColor: '#000000',
    marginBottom: 8,
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
    backgroundColor: '#000000',
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

  disabledButton: {
    opacity: 0.5,
  },
});

export default memo(GameConsole);
