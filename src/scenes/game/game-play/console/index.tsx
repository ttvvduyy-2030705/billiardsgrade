
import React, {memo, useMemo, useRef} from 'react';
import {StyleSheet} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import i18n from 'i18n';

import ConsoleViewModel, {ConsoleViewModelProps} from './ConsoleViewModel';
import Webcam, {WebCamHandle} from './webcam';
import {isPoolGame} from 'utils/game';

type ActionButtonTone =
  | 'dark'
  | 'amber'
  | 'red'
  | 'green'
  | 'muted';

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
      <Text style={styles.smallActionText}>{label}</Text>
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
    <Button onPress={onPress} style={[styles.wideButton, buttonToneStyle(tone)]}>
      <Text style={styles.wideButtonText}>{label}</Text>
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
        style={[styles.dualButton, styles.dualButtonLeft, buttonToneStyle(leftTone)]}>
        <Text style={styles.wideButtonText}>{leftLabel}</Text>
      </Button>

      <Button
        onPress={onRightPress}
        style={[styles.dualButton, styles.dualButtonRight, buttonToneStyle(rightTone)]}>
        <Text style={styles.wideButtonText}>{rightLabel}</Text>
      </Button>
    </View>
  );
};

const GameConsole = (props: ConsoleViewModelProps) => {
  const viewModel = ConsoleViewModel(props);
  const webcamRef = useRef<WebCamHandle>(null);

  const isPool = isPoolGame(props.gameSettings?.category);
  const totalTimeText = viewModel.displayTotalTime();

  const bottomLeftLabel = useMemo(() => {
    if (!props.isStarted) {
      if ((props.warmUpCount ?? 0) > 0) {
        return `${i18n.t('warmUp')} (${props.warmUpCount})`;
      }
      return i18n.t('start');
    }

    return props.isPaused ? i18n.t('resume') : i18n.t('pause');
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

  const middleRow = useMemo(() => {
    if (isPool && props.isStarted && props.poolBreakEnabled) {
      return (
        <WideActionButton
          label={i18n.t('break')}
          tone={'green'}
          onPress={props.onPoolBreak}
        />
      );
    }

    if (isPool && props.isStarted && !props.poolBreakEnabled) {
      return (
        <DualButton
          leftLabel={i18n.t('resetTurn')}
          rightLabel={i18n.t('restart')}
          onLeftPress={props.onResetTurn}
          onRightPress={viewModel.onRestart}
          leftTone={'green'}
          rightTone={'muted'}
        />
      );
    }

    return (
      <WideActionButton
        label={i18n.t('switchPlayer')}
        tone={'amber'}
        onPress={viewModel.onSwapPlayers}
      />
    );
  }, [
    isPool,
    props.isStarted,
    props.poolBreakEnabled,
    props.onPoolBreak,
    props.onResetTurn,
    viewModel.onRestart,
    viewModel.onSwapPlayers,
  ]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.timeCard}>
        <Text style={styles.timeText}>{totalTimeText}</Text>
      </View>

      <View direction={'row'} style={styles.metaRow}>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>{i18n.t('totalTurns')}</Text>
          <Text style={styles.metaValue}>{props.totalTurns}</Text>
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>{i18n.t('goal')}</Text>
          <Text style={styles.metaValue}>{props.goal}</Text>
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
            label={i18n.t('gameBreak')}
            onPress={props.onGameBreak}
          />
          <SmallActionButton
            label={i18n.t('reWatch')}
            onPress={() => webcamRef.current?.rewatch()}
            disabled={!webcamRef.current?.canRewatch()}
          />
        </View>

        <View direction={'row'} style={styles.actionRow}>
          <SmallActionButton
            label={i18n.t('refresh')}
            onPress={() => webcamRef.current?.refresh()}
            disabled={!webcamRef.current?.canRefresh()}
          />
          <SmallActionButton
            label={i18n.t('switchCamera')}
            onPress={() => webcamRef.current?.switchCamera()}
            disabled={!webcamRef.current?.canSwitchCamera()}
          />
        </View>

        {middleRow}

        <DualButton
          leftLabel={bottomLeftLabel}
          rightLabel={i18n.t('stop')}
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
  },

  timeCard: {
    alignSelf: 'center',
    minWidth: 246,
    borderRadius: 18,
    backgroundColor: '#160708',
    paddingHorizontal: 28,
    paddingVertical: 10,
    marginBottom: 10,
  },

  timeText: {
    color: '#FF2020',
    fontSize: 58,
    lineHeight: 64,
    fontWeight: '900',
    textAlign: 'center',
  },

  metaRow: {
    gap: 12,
    marginBottom: 10,
  },

  metaCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2D33',
    backgroundColor: '#17181C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  metaLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

  metaValue: {
    color: '#FF2525',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
    textAlign: 'center',
  },

  cameraCard: {
    flex: 1,
    minHeight: 230,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#383B40',
    backgroundColor: '#141518',
  },

  actionStack: {
    marginTop: 12,
    gap: 10,
  },

  actionRow: {
    gap: 12,
  },

  smallActionButton: {
    flex: 1,
    minHeight: 46,
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
    minHeight: 52,
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
    gap: 12,
  },

  dualButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  dualButtonLeft: {
    marginRight: 6,
  },

  dualButtonRight: {
    marginLeft: 6,
  },

  disabledButton: {
    opacity: 0.5,
  },
});

export default memo(GameConsole);
