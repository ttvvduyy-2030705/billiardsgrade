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
import useDesignSystem from 'theme/useDesignSystem';

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

const LEFT_PANEL_COLORS = ['#FF5B57', '#CC1212'];
const RIGHT_PANEL_COLORS = ['#CC1212', '#FF5B57'];
const LEFT_FLAG_BG = '#FF5B57';
const RIGHT_FLAG_BG = '#FF5B57';
const LEFT_FLAG_BORDER = '#FF5B57';
const RIGHT_FLAG_BORDER = '#FF5B57';

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

const shouldUseCompactMetrics = (variant: Variant, adaptive?: any) => {
  if (!adaptive?.isLandscape) {
    return false;
  }

  const baseCompact =
    adaptive.layoutPreset === 'phone' ||
    adaptive.isConstrainedLandscape ||
    adaptive.shortSide <= 620;

  if (variant === 'camera') {
    return (
      baseCompact ||
      adaptive.shortSide <= 780 ||
      adaptive.height <= 840 ||
      adaptive.width <= 1280
    );
  }

  return baseCompact;
};

const getVariantMetrics = (variant: Variant, compact = false, adaptive?: any) => {
  const s = adaptive?.s || ((value: number) => value);
  const fs = adaptive?.fs || ((value: number) => value);

  switch (variant) {
    case 'fullscreen':
      if (compact) {
        return {
          wrapperWidth: '84%',
          barHeight: s(42),
          bottomGap: s(12),
          playerNameSize: fs(14, 0.78, 0.92),
          playerScoreSize: fs(24, 0.78, 0.94),
          centerLabelSize: fs(9, 0.76, 0.9),
          centerValueSize: fs(17, 0.78, 0.94),
          timerHeight: s(13),
          timerTextSize: fs(10, 0.78, 0.92),
          flagWidth: s(28),
          scoreMinWidth: s(46),
          horizontalPadding: s(10),
        };
      }
      return {
        wrapperWidth: '88%',
        barHeight: s(48),
        bottomGap: s(18),
        playerNameSize: fs(17, 0.8, 0.96),
        playerScoreSize: fs(27, 0.82, 0.98),
        centerLabelSize: fs(10, 0.82, 0.96),
        centerValueSize: fs(20, 0.82, 0.98),
        timerHeight: s(16),
        timerTextSize: fs(11, 0.82, 0.96),
        flagWidth: s(34),
        scoreMinWidth: s(54),
        horizontalPadding: s(12),
      };
    case 'playback':
      return {
        wrapperWidth: compact ? '86%' : '90%',
        barHeight: compact ? s(44) : s(50),
        bottomGap: compact ? s(52) : s(62),
        playerNameSize: compact ? fs(15, 0.78, 0.92) : fs(17, 0.82, 0.98),
        playerScoreSize: compact ? fs(24, 0.78, 0.94) : fs(28, 0.82, 0.98),
        centerLabelSize: compact ? fs(9, 0.76, 0.9) : fs(10, 0.82, 0.96),
        centerValueSize: compact ? fs(18, 0.78, 0.94) : fs(21, 0.82, 0.98),
        timerHeight: compact ? s(14) : s(16),
        timerTextSize: compact ? fs(10, 0.78, 0.92) : fs(11, 0.82, 0.96),
        flagWidth: compact ? s(29) : s(34),
        scoreMinWidth: compact ? s(48) : s(56),
        horizontalPadding: compact ? s(10) : s(12),
      };
    case 'camera':
    default:
      if (compact) {
        return {
          wrapperWidth: '78%',
          barHeight: s(30),
          bottomGap: s(4),
          playerNameSize: fs(10, 0.74, 0.86),
          playerScoreSize: fs(15, 0.74, 0.88),
          centerLabelSize: fs(7, 0.72, 0.84),
          centerValueSize: fs(12, 0.74, 0.86),
          timerHeight: s(10),
          timerTextSize: fs(8, 0.74, 0.86),
          flagWidth: s(20),
          scoreMinWidth: s(32),
          horizontalPadding: s(6),
        };
      }
      return {
        wrapperWidth: '88%',
        barHeight: s(36),
        bottomGap: s(10),
        playerNameSize: fs(13, 0.8, 0.92),
        playerScoreSize: fs(20, 0.8, 0.94),
        centerLabelSize: fs(8, 0.8, 0.92),
        centerValueSize: fs(15, 0.8, 0.94),
        timerHeight: s(12),
        timerTextSize: fs(9, 0.8, 0.92),
        flagWidth: s(24),
        scoreMinWidth: s(40),
        horizontalPadding: s(8),
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

  const {adaptive} = useDesignSystem();
  const useCompactMetrics = shouldUseCompactMetrics(variant, adaptive);

  const metrics = getVariantMetrics(variant, useCompactMetrics, adaptive);
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
  const leftFlag = String((leftPlayer as any)?.flag || '').trim();
  const rightFlag = String((rightPlayer as any)?.flag || '').trim();

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
            styles.flagPlaceholderLeft,
            currentPlayerIndex === 0 && styles.flagPlaceholderActive,
            {
              width: metrics.flagWidth,
              minWidth: metrics.flagWidth,
            },
          ]}>
          {leftFlag ? (
            <Text
              style={[
                styles.flagText,
                {fontSize: Math.max(14, metrics.flagWidth * 0.72)},
                currentPlayerIndex !== 0 && styles.flagTextInactive,
              ]}>
              {leftFlag}
            </Text>
          ) : null}
        </View>

        <LinearGradient
          colors={LEFT_PANEL_COLORS}
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
            <Text style={playerScoreStyle}>
              {safeNumber(leftPlayer?.totalPoint, 0)}
            </Text>
          </View>
        </LinearGradient>

        <View
          style={[
            styles.centerPanelWrap,
            {
              width: metrics.scoreMinWidth + 44,
              minWidth: metrics.scoreMinWidth + 44,
            },
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
          colors={RIGHT_PANEL_COLORS}
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
            <Text style={playerScoreStyle}>
              {safeNumber(rightPlayer?.totalPoint, 0)}
            </Text>
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
            styles.flagPlaceholderRight,
            currentPlayerIndex === 1 && styles.flagPlaceholderActive,
            {
              width: metrics.flagWidth,
              minWidth: metrics.flagWidth,
            },
          ]}>
          {rightFlag ? (
            <Text
              style={[
                styles.flagText,
                {fontSize: Math.max(14, metrics.flagWidth * 0.72)},
                currentPlayerIndex !== 1 && styles.flagTextInactive,
              ]}>
              {rightFlag}
            </Text>
          ) : null}
        </View>
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
    zIndex: 12,
    elevation: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagPlaceholderLeft: {
    backgroundColor: LEFT_FLAG_BG,
    borderRightWidth: 1,
    borderRightColor: LEFT_FLAG_BORDER,
  },
  flagPlaceholderRight: {
    backgroundColor: RIGHT_FLAG_BG,
    borderLeftWidth: 1,
    borderLeftColor: RIGHT_FLAG_BORDER,
  },
  flagPlaceholderActive: {
    backgroundColor: '#FF5B57',
  },
  flagText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  flagTextInactive: {
    opacity: 0.55,
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
    borderTopColor: '#FF5B57',
    borderBottomWidth: 2,
    borderBottomColor: '#FF5B57',
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
