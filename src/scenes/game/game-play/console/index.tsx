import React, {memo, useMemo, useRef} from 'react';
import {StyleSheet, Text as RNText} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';

import ConsoleViewModel, {ConsoleViewModelProps} from './ConsoleViewModel';
import Webcam, {WebCamHandle} from './webcam';
import {isPoolGame} from 'utils/game';
import i18n from 'i18n';

type ActionButtonTone = 'dark' | 'amber' | 'red' | 'green' | 'muted';

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
      <Text color={'#FFFFFF'} style={styles.smallActionText}>{label}</Text>
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
      <Text color={'#FFFFFF'} style={styles.wideButtonText}>{label}</Text>
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
      <Button onPress={onLeftPress} style={[styles.dualButton, buttonToneStyle(leftTone)]}>
        <Text color={'#FFFFFF'} style={styles.wideButtonText}>{leftLabel}</Text>
      </Button>

      <Button onPress={onRightPress} style={[styles.dualButton, buttonToneStyle(rightTone)]}>
        <Text color={'#FFFFFF'} style={styles.wideButtonText}>{rightLabel}</Text>
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
      <Button onPress={onLeftPress} style={[styles.tripleButton, buttonToneStyle(leftTone)]}>
        <Text color={'#FFFFFF'} style={styles.tripleButtonText}>{leftLabel}</Text>
      </Button>

      <Button onPress={onCenterPress} style={[styles.tripleButton, buttonToneStyle(centerTone)]}>
        <Text color={'#FFFFFF'} style={styles.tripleButtonText}>{centerLabel}</Text>
      </Button>

      <Button onPress={onRightPress} style={[styles.tripleButton, buttonToneStyle(rightTone)]}>
        <Text color={'#FFFFFF'} style={styles.tripleButtonText}>{rightLabel}</Text>
      </Button>
    </View>
  );
};

const GameConsole = (props: ConsoleViewModelProps) => {
  const viewModel = ConsoleViewModel(props);
  const webcamRef = useRef<WebCamHandle>(null);

  const isPool = isPoolGame(props.gameSettings?.category);
  const totalTimeText = viewModel.displayTotalTime();

  const startLabel = useMemo(() => {
    if (!props.isStarted) {
      if ((props.warmUpCount ?? 0) > 0) {
        return `▷ ${tr(`Khởi động (${props.warmUpCount})`, `Warm-up (${props.warmUpCount})`)}`;
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
    props.isStarted,
    props.poolBreakEnabled,
    props.onPoolBreak,
    props.onResetTurn,
    viewModel.onPressGiveMoreTime,
    props.onReset,
    viewModel.onSwitchTurn,
  ]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.timeWrap}>
        <View style={styles.timeCard}>
          <RNText style={styles.timeText}>{totalTimeText}</RNText>
        </View>
      </View>

      <View direction={'row'} style={styles.metaRow}>
        <View style={styles.metaCard}>
          <Text color={'#FFFFFF'} fontSize={18} fontWeight={'800'} style={styles.metaLabel}>{tr('Số lượt', 'Turns')}</Text>
          <Text color={'#FF2525'} fontSize={30} fontWeight={'900'} style={styles.metaValue}>{props.totalTurns}</Text>
        </View>

        <View style={styles.metaCard}>
          <Text color={'#FFFFFF'} fontSize={18} fontWeight={'800'} style={styles.metaLabel}>{tr('Mục tiêu', 'Goal')}</Text>
          <Text color={'#FF2525'} fontSize={30} fontWeight={'900'} style={styles.metaValue}>{props.goal}</Text>
        </View>
      </View>

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

        <DualButton
          leftLabel={startLabel}
          rightLabel={`✈ ${tr('Kết thúc', 'End')}`}
          onLeftPress={handleBottomLeft}
          onRightPress={viewModel.onStop}
          leftTone={'amber'}
          rightTone={'red'}
        />
      </View>
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
    backgroundColor: '#17181c',
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
    backgroundColor: '#141518',
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

  disabledButton: {
    opacity: 0.5,
  },
});

export default memo(GameConsole);
