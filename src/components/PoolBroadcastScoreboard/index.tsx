import React, {memo, useMemo} from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {PlayerSettings} from 'types/player';
import {GameSettings} from 'types/settings';
import {isPool10Game, isPool15Game, isPool9Game} from 'utils/game';

type Variant = 'camera' | 'fullscreen' | 'playback';

export interface PoolBroadcastScoreboardProps {
  gameSettings?: GameSettings | any;
  playerSettings?: PlayerSettings | any;
  currentPlayerIndex?: number;
  countdownTime?: number;
  variant?: Variant;
  bottomOffset?: number;
  style?: StyleProp<ViewStyle>;
}

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

const safeNumber = (value: any, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getTimerColor = (countdownTime: number) => {
  if (countdownTime <= 5) {
    return '#FF4D4F';
  }

  if (countdownTime <= 10) {
    return '#F7B500';
  }

  return '#34C759';
};

const getVariantMetrics = (variant: Variant) => {
  switch (variant) {
    case 'fullscreen':
      return {
        wrapperWidth: '88%',
        barHeight: 48,
        bottomGap: 18,
        playerNameSize: 17,
        playerScoreSize: 27,
        centerLabelSize: 10,
        centerValueSize: 20,
        timerHeight: 16,
        timerTextSize: 11,
        flagWidth: 34,
        scoreMinWidth: 54,
        horizontalPadding: 12,
      };
    case 'playback':
      return {
        wrapperWidth: '90%',
        barHeight: 50,
        bottomGap: 62,
        playerNameSize: 17,
        playerScoreSize: 28,
        centerLabelSize: 10,
        centerValueSize: 21,
        timerHeight: 16,
        timerTextSize: 11,
        flagWidth: 34,
        scoreMinWidth: 56,
        horizontalPadding: 12,
      };
    case 'camera':
    default:
      return {
        wrapperWidth: '92%',
        barHeight: 40,
        bottomGap: 12,
        playerNameSize: 14,
        playerScoreSize: 22,
        centerLabelSize: 9,
        centerValueSize: 17,
        timerHeight: 14,
        timerTextSize: 10,
        flagWidth: 28,
        scoreMinWidth: 46,
        horizontalPadding: 10,
      };
  }
};

const PoolBroadcastScoreboard = ({
  gameSettings,
  playerSettings,
  currentPlayerIndex = 0,
  countdownTime = 0,
  variant = 'camera',
  bottomOffset,
  style,
}: PoolBroadcastScoreboardProps) => {
  const category = gameSettings?.category;
  const isSupportedCategory =
  isPool9Game(category) || isPool10Game(category) || isPool15Game(category);
  const playingPlayers = playerSettings?.playingPlayers || [];

  if (!isSupportedCategory || playingPlayers.length < 2) {
    return null;
  }

  const metrics = getVariantMetrics(variant);
  const goal = safeNumber(
    gameSettings?.players?.goal?.goal ?? playerSettings?.goal?.goal,
    0,
  );
  const baseCountdown = safeNumber(gameSettings?.mode?.countdownTime, 0);
  const normalizedCountdown = Math.max(0, safeNumber(countdownTime, 0));
  const fillRatio =
    baseCountdown > 0 ? clamp(normalizedCountdown / baseCountdown, 0, 1) : 0;
  const timerColor = getTimerColor(normalizedCountdown);
  const leftPlayer = playingPlayers[0] || {};
  const rightPlayer = playingPlayers[1] || {};

  const bottomValue = bottomOffset ?? metrics.bottomGap;

  const playerNameStyle = useMemo<StyleProp<TextStyle>>(
    () => [styles.playerName, {fontSize: metrics.playerNameSize}],
    [metrics.playerNameSize],
  );

  const playerScoreStyle = useMemo<StyleProp<TextStyle>>(
    () => [styles.playerScore, {fontSize: metrics.playerScoreSize}],
    [metrics.playerScoreSize],
  );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          width: metrics.wrapperWidth as any,
          bottom: bottomValue,
        },
        style,
      ]}>
      <View
        style={[
          styles.topBar,
          {
            minHeight: metrics.barHeight,
          },
        ]}>
        <View
          style={[
            styles.flagPlaceholder,
            {width: metrics.flagWidth, minWidth: metrics.flagWidth},
          ]}
        />

        <LinearGradient
          colors={['#FF5B57', '#CC1212']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[
            styles.playerPanel,
            styles.playerPanelLeft,
            currentPlayerIndex === 0 && styles.activePlayerPanel,
            {paddingHorizontal: metrics.horizontalPadding},
          ]}>
          <Text
            numberOfLines={1}
            style={[playerNameStyle, styles.playerNameLeft]}>
            {leftPlayer?.name?.trim() || 'Player 1'}
          </Text>
          <View
            style={[
              styles.scoreBox,
              {minWidth: metrics.scoreMinWidth},
            ]}>
            <Text style={playerScoreStyle}>{safeNumber(leftPlayer?.totalPoint, 0)}</Text>
          </View>
        </LinearGradient>

        <View
          style={[
            styles.centerPanelWrap,
            {width: metrics.scoreMinWidth + 44, minWidth: metrics.scoreMinWidth + 44},
          ]}>
          <LinearGradient
            colors={['#111111', '#272727']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.centerPanel}>
            <Text style={[styles.centerLabel, {fontSize: metrics.centerLabelSize}]}>MỤC TIÊU</Text>
            <Text style={[styles.centerValue, {fontSize: metrics.centerValueSize}]}>
              {goal}
            </Text>
          </LinearGradient>
        </View>

        <LinearGradient
          colors={['#CC1212', '#FF5B57']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[
            styles.playerPanel,
            styles.playerPanelRight,
            currentPlayerIndex === 1 && styles.activePlayerPanel,
            {paddingHorizontal: metrics.horizontalPadding},
          ]}>
          <View
            style={[
              styles.scoreBox,
              {minWidth: metrics.scoreMinWidth},
            ]}>
            <Text style={playerScoreStyle}>{safeNumber(rightPlayer?.totalPoint, 0)}</Text>
          </View>
          <Text
            numberOfLines={1}
            style={[playerNameStyle, styles.playerNameRight]}>
            {rightPlayer?.name?.trim() || 'Player 2'}
          </Text>
        </LinearGradient>

        <View
          style={[
            styles.flagPlaceholder,
            {width: metrics.flagWidth, minWidth: metrics.flagWidth},
          ]}
        />
      </View>

      <View
        style={[
          styles.timerTrack,
          {
            height: metrics.timerHeight,
          },
        ]}>
        <View
          style={[
            styles.timerFill,
            {
              backgroundColor: timerColor,
              width: `${fillRatio * 100}%`,
            },
          ]}
        />
        <Text style={[styles.timerText, {fontSize: metrics.timerTextSize}]}>
          {baseCountdown > 0 ? `${normalizedCountdown}s` : '--'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 30,
    elevation: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: '#161616',
  },
  flagPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.35)',
  },
  playerPanel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  playerPanelLeft: {
    justifyContent: 'space-between',
  },
  playerPanelRight: {
    justifyContent: 'space-between',
  },
  activePlayerPanel: {
    borderTopWidth: 2,
    borderTopColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
  },
  playerName: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  playerNameLeft: {
    textAlign: 'left',
    marginRight: 8,
  },
  playerNameRight: {
    textAlign: 'right',
    marginLeft: 8,
  },
  scoreBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 6,
  },
  playerScore: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  centerPanelWrap: {
    width: 82,
    minWidth: 82,
  },
  centerPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  centerLabel: {
    color: '#E6E6E6',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  centerValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: -2,
  },
  timerTrack: {
    marginTop: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
  },
  timerFill: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default memo(PoolBroadcastScoreboard);
