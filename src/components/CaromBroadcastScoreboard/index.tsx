import React, {memo} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import CaromInfo from 'scenes/game/game-play/console/carom-info';
import {isCaromGame} from 'utils/game';

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

const getMetrics = (variant: Variant) => {
  switch (variant) {
    case 'fullscreen':
      return {
        left: 16,
        bottom: 18,
        width: 520,
        scale: 0.64,
      };
    case 'playback':
      return {
        left: 12,
        bottom: 58,
        width: 470,
        scale: 0.58,
      };
    case 'camera':
    default:
      return {
        left: 10,
        bottom: 12,
        width: 410,
        scale: 0.48,
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

  const metrics = getMetrics(variant);

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
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    overflow: 'visible',
    zIndex: 14,
    elevation: 14,
    alignItems: 'flex-start',
  },
  scaleRoot: {
    alignSelf: 'flex-start',
    transformOrigin: 'left top' as any,
  },
});

export default memo(CaromBroadcastScoreboard);
