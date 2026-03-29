import React, {memo, useMemo} from 'react';
import {StyleSheet, TextInput, Text as RNText} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import i18n from 'i18n';
import {BallType, PoolBallType} from 'types/ball';
import {isPool15FreeGame, isPool15Game, isPoolGame} from 'utils/game';

import PlayerViewModel, {Props} from './PlayerViewModel';

const isEnglish = () => {
  const locale = String(
    (i18n as any)?.locale || (i18n as any)?.language || '',
  ).toLowerCase();
  return locale.startsWith('en');
};

const tr = (vi: string, en: string) => (isEnglish() ? en : vi);

const GamePlayer = (props: Props & {layout?: 'default' | 'poolArena'}) => {
  const viewModel = PlayerViewModel(props);
  const isPoolMode = isPoolGame(props.gameSettings?.category);
  const isPool15Mode = isPool15Game(props.gameSettings?.category);
  const isPool15FreeMode = isPool15FreeGame(props.gameSettings?.category);
  const isActiveCard = !!props.isOnTurn;

  const extraTimeTurns = Math.max(
    0,
    Number((props.player as any)?.proMode?.extraTimeTurns ?? 0),
  );

  const showAddTime = extraTimeTurns > 0 && !isPool15Mode;

  const addTimeButtons = useMemo(() => {
    return Array.from({length: extraTimeTurns}, (_, index) => index);
  }, [extraTimeTurns]);

  return (
    <View
      style={[
        styles.panel,
        isActiveCard ? styles.panelActive : styles.panelInactive,
      ]}>
      <View style={styles.nameRow}>
        {viewModel.nameEditable ? (
          <TextInput
            value={props.player.name}
            onChangeText={viewModel.onChangeName}
            autoFocus
            onBlur={viewModel.onToggleEditName}
            style={[
              styles.nameInput,
              !isActiveCard && styles.nameTextInactive,
            ]}
            placeholderTextColor={'#8B8D95'}
          />
        ) : (
          <RNText
            style={[
              styles.nameText,
              !isActiveCard && styles.nameTextInactive,
            ]}>
            {props.player.name}
          </RNText>
        )}

        <Button
          onPress={viewModel.onToggleEditName}
          style={[
            styles.editButton,
            !isActiveCard && styles.editButtonInactive,
          ]}>
          <RNText
            style={[
              styles.editText,
              !isActiveCard && styles.editTextInactive,
            ]}>
            ✎
          </RNText>
        </Button>
      </View>

      <View
        direction={'row'}
        style={[
          styles.plusMinusRow,
          !isActiveCard && styles.controlsRowInactive,
        ]}>
        <Button style={styles.stepButton} onPress={viewModel.onDecreasePoint}>
          <RNText style={styles.stepButtonText}>−</RNText>
        </Button>

        <Button style={styles.stepButton} onPress={viewModel.onIncreasePoint}>
          <RNText style={styles.stepButtonText}>＋</RNText>
        </Button>
      </View>

      {!isPoolMode ? (
        <View
          direction={'row'}
          style={[
            styles.statsRow,
            !isActiveCard && styles.statsRowInactive,
          ]}>
          <View style={styles.statBlock}>
            <RNText style={styles.statLabel}>High run</RNText>
            <RNText style={styles.statValue}>{viewModel.highestRate}</RNText>
          </View>

          <View style={styles.statBlock}>
            <RNText style={styles.statLabel}>Average</RNText>
            <RNText style={styles.statValue}>{viewModel.averagePoint}</RNText>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.scoreLayer,
          !isActiveCard && styles.scoreLayerInactive,
          isPool15FreeMode && styles.scoreLayerWithScoredBalls,
        ]}
        pointerEvents="none">
        <RNText style={styles.scoreText}>{props.player.totalPoint}</RNText>
      </View>


      {showAddTime ? (
        <View
          style={[
            styles.addTimeStack,
            !isActiveCard && styles.addTimeStackInactive,
          ]}>
          {addTimeButtons.map(index => (
            <Button
              key={`extra-time-${index}`}
              onPress={isActiveCard ? props.onPressGiveMoreTime : undefined}
              style={[
                styles.addTimeButton,
                !isActiveCard && styles.addTimeButtonInactive,
              ]}>
              <RNText
                style={[
                  styles.addTimeText,
                  !isActiveCard && styles.addTimeTextInactive,
                ]}>
                ◷+
              </RNText>
            </Button>
          ))}
        </View>
      ) : null}

      {isPool15FreeMode && (props.player.scoredBalls || []).length > 0 ? (
        <View
          style={[
            styles.scoredBallStack,
            !isActiveCard && styles.scoredBallStackInactive,
          ]}>
          {(props.player.scoredBalls || []).map((ball, index) => {
            const isBlackBall = ball.number === BallType.B8;
            const textColor = isBlackBall ? '#FFFFFF' : '#111111';

            return (
              <View
                key={`player-scored-ball-${ball.number}-${index}`}
                style={[
                  styles.scoredBallItem,
                  {
                    backgroundColor: ball.cut ? '#FFFFFF' : ball.color,
                    borderColor: ball.color,
                  },
                ]}>
                {ball.cut ? (
                  <View
                    style={[
                      styles.scoredBallStripe,
                      {backgroundColor: ball.color},
                    ]}
                  />
                ) : null}
                <RNText
                  style={[
                    styles.scoredBallText,
                    {color: ball.cut ? '#111111' : textColor},
                  ]}>
                  {ball.number}
                </RNText>
              </View>
            );
          })}
        </View>
      ) : null}

      {isActiveCard ? (
        <Button
          onPress={() => viewModel.onEndTurn()}
          style={[styles.playingBadge, styles.playingBadgeActive]}>
          <RNText style={[styles.playingText, styles.playingTextActive]}>
            {tr('Đang đánh', 'Playing')}
          </RNText>
        </Button>
      ) : (
        <View style={[styles.playingBadge, styles.playingBadgeInactive]}>
          <RNText style={[styles.playingText, styles.playingTextInactive]}>
            {tr('Đang đánh', 'Playing')}
          </RNText>
        </View>
      )}

      <View
        direction={'row'}
        alignItems={'center'}
        style={[
          styles.violateWrap,
          !isActiveCard && styles.violateWrapInactive,
        ]}>
        <View
          style={[
            styles.violateCircle,
            !isActiveCard && styles.violateCircleInactive,
          ]}>
          <RNText
            style={[
              styles.violateX,
              !isActiveCard && styles.violateXInactive,
            ]}>
            ×
          </RNText>
        </View>
        <RNText
          style={[
            styles.violateCount,
            !isActiveCard && styles.violateCountInactive,
          ]}>
          {props.player.violate || 0}
        </RNText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1.4,
    borderColor: '#FF1818',
    backgroundColor: '#000000',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },

  panelActive: {
    opacity: 1,
  },

  panelInactive: {
    opacity: 0.52,
  },

  nameRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },

  nameText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    textAlign: 'center',
  },

  nameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 0,
  },

  nameTextInactive: {
    opacity: 0.9,
  },

  editButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  editButtonInactive: {
    opacity: 0.55,
  },

  editText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },

  editTextInactive: {
    opacity: 0.9,
  },

  plusMinusRow: {
    marginTop: 18,
    justifyContent: 'space-between',
    gap: 14,
  },

  controlsRowInactive: {
    opacity: 0.7,
  },

  stepButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepButtonText: {
    color: '#000000',
    fontSize: 30,
    lineHeight: 40,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },

  statsRow: {
    marginTop: 18,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },

  statsRowInactive: {
    opacity: 0.7,
  },

  statBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },

  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },

  scoreWrap: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 0,
    paddingRight: 58,
    marginTop: 6,
    marginBottom: 6,
  },

  scoreText: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 440,
    lineHeight: 425,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },

  scoreLayerWithScoredBalls: {
    right: 42,
  },

  addTimeStack: {
    position: 'absolute',
    right: 25,
    top: '42%',
    transform: [{translateY: -20}],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 4,
  },

  addTimeStackInactive: {
    opacity: 0.65,
  },

  scoredBallStack: {
    position: 'absolute',
    right: 18,
    top: '34%',
    bottom: 92,
    width: 38,
    alignItems: 'center',
    gap: 8,
    zIndex: 4,
  },

  scoredBallStackInactive: {
    opacity: 0.72,
  },

  scoredBallItem: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  scoredBallStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
    borderRadius: 6,
  },

  scoredBallText: {
    fontSize: 13,
    lineHeight: 14,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },

  addTimeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  addTimeButtonInactive: {
    opacity: 0.8,
  },

  addTimeText: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },

  addTimeTextInactive: {
    opacity: 0.9,
  },

  playingBadge: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    minWidth: 154,
    minHeight: 56,
    borderTopRightRadius: 22,
    borderTopLeftRadius: 22,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    zIndex: 4,
  },

  playingBadgeActive: {
    backgroundColor: '#24090B',
    borderWidth: 1,
    borderColor: '#6B1118',
  },

  playingBadgeInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  playingText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },

  playingTextActive: {
    color: '#FF2A2A',
  },

  playingTextInactive: {
    color: '#9C9C9C',
  },

  violateWrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 4,
  },

  violateWrapInactive: {
    opacity: 0.72,
  },

  violateCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FF1818',
    alignItems: 'center',
    justifyContent: 'center',
  },

  violateCircleInactive: {
    backgroundColor: '#7A1111',
  },

  violateX: {
    color: '#FFFFFF',
    fontSize: 80,
    lineHeight: 78,
    fontWeight: '900',
    includeFontPadding: false,
    textAlign: 'center',
  },

  violateXInactive: {
    opacity: 0.9,
  },

  scoreLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 175,
    bottom: 125,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  scoreLayerInactive: {
    opacity: 0.7,
  },

  violateCount: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    marginLeft: 8,
    minWidth: 18,
    textAlign: 'center',
    includeFontPadding: false,
  },

  violateCountInactive: {
    opacity: 0.9,
  },
});

export default memo(GamePlayer);
