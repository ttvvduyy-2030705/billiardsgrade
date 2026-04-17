import React, {memo} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import CaromInfo from 'scenes/game/game-play/console/carom-info';
import {isCaromGame} from 'utils/game';
import useDesignSystem from 'theme/useDesignSystem';

type Variant = 'camera' | 'fullscreen' | 'playback';

export interface CaromBroadcastScoreboardProps {
  gameSettings?: any;
  playerSettings?: any;
  currentPlayerIndex?: number;
  countdownTime?: number;
  totalTurns?: number;
  variant?: Variant;
  bottomOffset?: number;
  style?: StyleProp<ViewStyle>;
}

const shouldUseCompactMetrics = (variant: Variant, adaptive?: any) => {
  if (!adaptive?.isLandscape) {
    return false;
  }

  const baseCompact =
    adaptive.layoutPreset === 'phone' ||
    adaptive.isConstrainedLandscape ||
    adaptive.shortSide <= 620;

  if (variant === 'fullscreen') {
    return (
      baseCompact ||
      adaptive.shortSide <= 780 ||
      adaptive.height <= 840 ||
      adaptive.width <= 1280
    );
  }

  return baseCompact;
};

const getMetrics = (variant: Variant, compact = false, adaptive?: any) => {
  const s = adaptive?.s || ((value: number) => value);

  switch (variant) {
    case 'fullscreen':
      return compact
        ? {
            left: s(10),
            bottom: s(8),
            width: s(280),
            scale: 0.46,
          }
        : {
            left: s(14),
            bottom: s(14),
            width: s(360),
            scale: 0.56,
          };
    case 'playback':
      return compact
        ? {
            left: s(10),
            bottom: s(52),
            width: s(360),
            scale: 0.5,
          }
        : {
            left: s(12),
            bottom: s(58),
            width: s(470),
            scale: 0.58,
          };
    case 'camera':
    default:
      return compact
        ? {
            left: s(6),
            bottom: s(4),
            width: s(186),
            scale: 0.34,
          }
        : {
            left: s(8),
            bottom: s(10),
            width: s(236),
            scale: 0.42,
          };
  }
};

const CaromBroadcastScoreboard = ({
  gameSettings,
  playerSettings,
  currentPlayerIndex = 0,
  countdownTime = 0,
  totalTurns = 1,
  variant = 'camera',
  bottomOffset,
  style,
}: CaromBroadcastScoreboardProps) => {
  const category = gameSettings?.category;
  const players = playerSettings?.playingPlayers || [];

  if (!isCaromGame(category) || players.length < 2) {
    return null;
  }

  const {adaptive} = useDesignSystem();
  const useCompactMetrics = shouldUseCompactMetrics(variant, adaptive);

  const metrics = getMetrics(variant, useCompactMetrics, adaptive);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          left: metrics.left,
          bottom: bottomOffset ?? metrics.bottom,
          width: metrics.width,
        },
        style,
      ]}>
      <View
        style={[
          styles.scaleRoot,
          {
            width: metrics.width / metrics.scale,
            transform: [{scale: metrics.scale}],
          },
        ]}>
        <CaromInfo
          isStarted={false}
          isPaused={true}
          isMatchPaused={true}
          goal={Number(gameSettings?.players?.goal?.goal ?? playerSettings?.goal?.goal ?? 0)}
          totalTurns={Math.max(1, Number(totalTurns || 1))}
          countdownTime={Math.max(0, Number(countdownTime || 0))}
          currentPlayerIndex={Math.max(0, Number(currentPlayerIndex || 0))}
          gameSettings={gameSettings}
          playerSettings={playerSettings}
          compact={variant === 'fullscreen' ? useCompactMetrics : false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    overflow: 'visible',
    zIndex: 18,
    elevation: 18,
    alignItems: 'flex-start',
  },
  scaleRoot: {
    alignSelf: 'flex-start',
    transformOrigin: 'left top' as any,
  },
});

export default memo(CaromBroadcastScoreboard);
