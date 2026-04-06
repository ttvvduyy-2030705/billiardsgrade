import React, {memo, useMemo} from 'react';
import {
  StyleSheet,
  TextInput,
  Text as RNText,
  Image as RNImage,
  useWindowDimensions,
} from 'react-native';

import View from 'components/View';
import Button from 'components/Button';
import i18n from 'i18n';
import {isPool15FreeGame, isPool15Game, isPoolGame} from 'utils/game';

import PlayerViewModel, {Props} from './PlayerViewModel';
import {getCountryFlagImageUri} from '../../settings/player/countries';

const isEnglish = () => {
  const locale = String(
    (i18n as any)?.locale || (i18n as any)?.language || '',
  ).toLowerCase();
  return locale.startsWith('en');
};

const tr = (vi: string, en: string) => (isEnglish() ? en : vi);


const isRemoteUri = (value?: string) => /^https?:\/\//i.test(String(value || '').trim());

const getPlayerFlagImageUri = (player?: {countryCode?: string; flag?: string}) => {
  const fromCode = getCountryFlagImageUri(player?.countryCode, 160);
  if (fromCode) {
    return fromCode;
  }

  const rawFlag = String(player?.flag || '').trim();
  return isRemoteUri(rawFlag) ? rawFlag : '';
};

const getPlayerFlagText = (player?: {flag?: string}) => {
  const rawFlag = String(player?.flag || '').trim();
  return isRemoteUri(rawFlag) ? '' : rawFlag;
};

const GamePlayer = (
  props: Props & {layout?: 'default' | 'poolArena'; compact?: boolean},
) => {
  const viewModel = PlayerViewModel(props);
  const isPoolMode = isPoolGame(props.gameSettings?.category);
  const isPool15Mode = isPool15Game(props.gameSettings?.category);
  const isPool15FreeMode = isPool15FreeGame(props.gameSettings?.category);
  const isActiveCard = !!props.isOnTurn;
  const {width, height} = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 600;
  const isPhoneLandscape = !isTablet && width > height;
  const useForcedCompact = isPhoneLandscape || shortestSide < 480;

  const isCompactLayout = Boolean(
    props.compact || useForcedCompact || (props.totalPlayers || 2) > 2,
  );
  const isCaromMode = !isPoolMode;
  const isLibreMode = props.gameSettings?.category === 'libre';
  const totalPointValue = Number(props.player.totalPoint || 0);
  const rawPlayerColor = String((props.player as any)?.color || '').trim();
  const useColoredPanel = Boolean(rawPlayerColor) && isCaromMode;
  const playerPanelColor = useColoredPanel ? rawPlayerColor : '#000000';
  const primaryTextColor = useColoredPanel ? '#111111' : '#FFFFFF';
  const secondaryTextColor = useColoredPanel
    ? 'rgba(17,17,17,0.72)'
    : '#FFFFFF';
  const inactiveTextColor = useColoredPanel
    ? 'rgba(17,17,17,0.52)'
    : '#8B8D95';
  const panelDynamicStyle = useColoredPanel
    ? {backgroundColor: playerPanelColor, borderColor: 'rgba(17,17,17,0.28)'}
    : {backgroundColor: '#000000', borderColor: '#FF1818'};
  const textColorStyle = {color: primaryTextColor};
  const inactivePlaceholderColor = inactiveTextColor;
  const isPhoneLandscapeTwoPlayer =
    isPhoneLandscape && (props.totalPlayers || 2) <= 2;
  const isExtraCompactLayout =
    (props.totalPlayers || 2) >= 4 || (!isTablet && shortestSide <= 430);

  const scoreLayerDynamicStyle = isCaromMode
    ? isPhoneLandscapeTwoPlayer
      ? styles.scoreLayerCaromPhoneLandscape
      : isExtraCompactLayout
      ? styles.scoreLayerCaromExtraCompact
      : isCompactLayout
      ? styles.scoreLayerCaromCompact
      : styles.scoreLayerCarom
    : isPhoneLandscapeTwoPlayer
    ? styles.scoreLayerPhoneLandscape
    : isExtraCompactLayout
    ? styles.scoreLayerExtraCompact
    : isCompactLayout
    ? styles.scoreLayerCompact
    : undefined;

  const scoreTextDynamicStyle = isCaromMode
    ? isPhoneLandscapeTwoPlayer
      ? styles.scoreTextCaromPhoneLandscape
      : isExtraCompactLayout
      ? styles.scoreTextCaromExtraCompact
      : isCompactLayout
      ? styles.scoreTextCaromCompact
      : styles.scoreTextCarom
    : isPhoneLandscapeTwoPlayer
    ? styles.scoreTextPhoneLandscape
    : isExtraCompactLayout
    ? styles.scoreTextExtraCompact
    : isCompactLayout
    ? styles.scoreTextCompact
    : undefined;

  const libreScoreTextStyle = useMemo(() => {
    if (!isLibreMode || totalPointValue < 100) {
      return undefined;
    }

    if (isPhoneLandscapeTwoPlayer) {
      return totalPointValue >= 1000
        ? styles.scoreTextLibre4DigitsPhoneLandscape
        : styles.scoreTextLibre3DigitsPhoneLandscape;
    }

    if (isExtraCompactLayout) {
      return totalPointValue >= 1000
        ? styles.scoreTextLibre4DigitsExtraCompact
        : styles.scoreTextLibre3DigitsExtraCompact;
    }

    if (isCompactLayout) {
      return totalPointValue >= 1000
        ? styles.scoreTextLibre4DigitsCompact
        : styles.scoreTextLibre3DigitsCompact;
    }

    return totalPointValue >= 1000
      ? styles.scoreTextLibre4Digits
      : styles.scoreTextLibre3Digits;
  }, [
    isLibreMode,
    totalPointValue,
    isPhoneLandscapeTwoPlayer,
    isExtraCompactLayout,
    isCompactLayout,
  ]);

  const extraTimeTurns = Math.max(
    0,
    Number((props.player as any)?.proMode?.extraTimeTurns ?? 0),
  );

  const showAddTime = extraTimeTurns > 0 && !isPool15Mode;

  const addTimeButtons = useMemo(() => {
    return Array.from({length: extraTimeTurns}, (_, index) => index);
  }, [extraTimeTurns]);

  const playerFlag = getPlayerFlagText(props.player as any);
  const playerFlagImage = getPlayerFlagImageUri(props.player as any);

  return (
    <View
      style={[
        styles.panel,
        isPhoneLandscape ? styles.panelPhoneLandscape : undefined,
        panelDynamicStyle,
        isActiveCard ? styles.panelActive : styles.panelInactive,
      ]}>
      <View style={[styles.nameRow, isCompactLayout && styles.nameRowCompact]}>
        {playerFlagImage || playerFlag ? (
          <View
            style={[
              styles.flagBadge,
              isCompactLayout && styles.flagBadgeCompact,
              isActiveCard ? styles.flagBadgeActive : styles.flagBadgeInactive,
            ]}>
            {playerFlagImage ? (
              <RNImage
                source={{uri: playerFlagImage}}
                resizeMode="cover"
                fadeDuration={0}
                style={{width: '100%', height: '100%', backgroundColor: '#FFFFFF'}}
              />
            ) : (
              <RNText
                style={[
                  styles.flagText,
                  isCompactLayout && styles.flagTextCompact,
                  !isActiveCard && styles.flagTextInactive,
                ]}>
                {playerFlag}
              </RNText>
            )}
          </View>
        ) : null}

        {viewModel.nameEditable ? (
          <TextInput
            value={viewModel.draftName}
            onChangeText={viewModel.onChangeDraftName}
            autoFocus
            onBlur={viewModel.onCommitName}
            onSubmitEditing={viewModel.onCommitName}
            blurOnSubmit
            style={[
              styles.nameInput,
              playerFlag && styles.nameInputWithFlag,
              isCompactLayout && styles.nameInputCompact,
              textColorStyle,
              !isActiveCard && styles.nameTextInactive,
            ]}
            placeholderTextColor={inactivePlaceholderColor}
          />
        ) : (
          <RNText
            style={[
              styles.nameText,
              playerFlag && styles.nameTextWithFlag,
              isCompactLayout && styles.nameTextCompact,
              textColorStyle,
              !isActiveCard && styles.nameTextInactive,
            ]}>
            {props.player.name}
          </RNText>
        )}

        <Button
          onPress={viewModel.onToggleEditName}
          style={[
            styles.editButton,
            isCompactLayout && styles.editButtonCompact,
            !isActiveCard && styles.editButtonInactive,
          ]}>
          <RNText
            style={[
              styles.editText,
              isCompactLayout && styles.editTextCompact,
              textColorStyle,
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
          isCompactLayout && styles.plusMinusRowCompact,
          !isActiveCard && styles.controlsRowInactive,
        ]}>
        <Button
          style={[styles.stepButton, isCompactLayout && styles.stepButtonCompact]}
          onPress={viewModel.onDecreasePoint}>
          <RNText
            style={[
              styles.stepButtonText,
              isCompactLayout && styles.stepButtonTextCompact,
            ]}>
            −
          </RNText>
        </Button>

        <Button
          style={[styles.stepButton, isCompactLayout && styles.stepButtonCompact]}
          onPress={viewModel.onIncreasePoint}>
          <RNText
            style={[
              styles.stepButtonText,
              isCompactLayout && styles.stepButtonTextCompact,
            ]}>
            ＋
          </RNText>
        </Button>
      </View>

      {viewModel.showProMode ? (
        <View
          direction={'row'}
          style={[
            styles.statsRow,
            isCompactLayout && styles.statsRowCompact,
            !isActiveCard && styles.statsRowInactive,
          ]}>
          <View style={styles.statBlock}>
            <RNText
              style={[
                styles.statLabel,
                isCompactLayout && styles.statLabelCompact,
                {color: secondaryTextColor},
              ]}>
              High run
            </RNText>
            <RNText
              style={[
                styles.statValue,
                isCompactLayout && styles.statValueCompact,
                textColorStyle,
              ]}>
              {viewModel.highestRate}
            </RNText>
          </View>

          <View style={styles.statBlock}>
            <RNText
              style={[
                styles.statLabel,
                isCompactLayout && styles.statLabelCompact,
                {color: secondaryTextColor},
              ]}>
              Average
            </RNText>
            <RNText
              style={[
                styles.statValue,
                isCompactLayout && styles.statValueCompact,
                textColorStyle,
              ]}>
              {viewModel.averagePoint}
            </RNText>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.scoreLayer,
          scoreLayerDynamicStyle,
          !isActiveCard && styles.scoreLayerInactive,
          isPool15FreeMode && styles.scoreLayerWithScoredBalls,
        ]}
        pointerEvents="none">
        <RNText
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          style={[
            styles.scoreText,
            scoreTextDynamicStyle,
            libreScoreTextStyle,
            textColorStyle,
          ]}>
          {totalPointValue}
        </RNText>
      </View>

      {showAddTime ? (
        <View
          style={[
            styles.addTimeStack,
            isCompactLayout && styles.addTimeStackCompact,
            !isActiveCard && styles.addTimeStackInactive,
          ]}>
          {addTimeButtons.map(index => (
            <Button
              key={`extra-time-${index}`}
              onPress={isActiveCard ? props.onPressGiveMoreTime : undefined}
              style={[
                styles.addTimeButton,
                isCompactLayout && styles.addTimeButtonCompact,
                !isActiveCard && styles.addTimeButtonInactive,
              ]}>
              <RNText
                style={[
                  styles.addTimeText,
                  isCompactLayout && styles.addTimeTextCompact,
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
            isCompactLayout && styles.scoredBallStackCompact,
            !isActiveCard && styles.scoredBallStackInactive,
          ]}>
          {(props.player.scoredBalls || []).map((ball, index) => {
            const isBlackBall = ball.number === 8;
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
          style={[
            styles.playingBadge,
            isCompactLayout && styles.playingBadgeCompact,
            styles.playingBadgeActive,
          ]}>
          <RNText
            style={[
              styles.playingText,
              isCompactLayout && styles.playingTextCompact,
              styles.playingTextActive,
            ]}>
            {tr('Đang đánh', 'Playing')}
          </RNText>
        </Button>
      ) : (
        <View
          style={[
            styles.playingBadge,
            isCompactLayout && styles.playingBadgeCompact,
            styles.playingBadgeInactive,
          ]}>
          <RNText
            style={[
              styles.playingText,
              isCompactLayout && styles.playingTextCompact,
              styles.playingTextInactive,
            ]}>
            {tr('Đang đánh', 'Playing')}
          </RNText>
        </View>
      )}

      <View
        direction={'row'}
        alignItems={'center'}
        style={[
          styles.violateWrap,
          isCompactLayout && styles.violateWrapCompact,
          !isActiveCard && styles.violateWrapInactive,
        ]}>
        <View
          style={[
            styles.violateCircle,
            isCompactLayout && styles.violateCircleCompact,
            !isActiveCard && styles.violateCircleInactive,
          ]}>
          <RNText
            style={[
              styles.violateX,
              isCompactLayout && styles.violateXCompact,
              !isActiveCard && styles.violateXInactive,
            ]}>
            ×
          </RNText>
        </View>
        <RNText
          style={[
            styles.violateCount,
            isCompactLayout && styles.violateCountCompact,
            textColorStyle,
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

  panelPhoneLandscape: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 20,
  },

  nameRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },


  flagBadge: {
    width: 90,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    overflow: 'hidden',
  },

  flagBadgeActive: {
    opacity: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },

  flagBadgeInactive: {
    opacity: 0.52,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(255,255,255,0.35)',
  },

  flagText: {
    fontSize: 70,
    lineHeight: 70,
    textAlign: 'center',
    includeFontPadding: false,
  },

  flagTextInactive: {
    opacity: 0.92,
  },

  nameText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    textAlign: 'center',
  },

  nameTextWithFlag: {
    textAlign: 'left',
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

  nameInputWithFlag: {
    textAlign: 'left',
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
    minWidth: 420,
    minHeight: 80,
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
    fontSize: 48,
    lineHeight: 50,
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

  nameRowCompact: {
    minHeight: 40,
  },


  flagBadgeCompact: {
    width: 38,
    height: 28,
    borderRadius: 7,
    marginRight: 8,
  },

  flagTextCompact: {
    fontSize: 16,
    lineHeight: 18,
  },

  nameTextCompact: {
    fontSize: 26,
    lineHeight: 30,
  },

  nameInputCompact: {
    fontSize: 26,
    lineHeight: 30,
  },

  editButtonCompact: {
    width: 26,
    height: 26,
    marginLeft: 4,
  },

  editTextCompact: {
    fontSize: 16,
    lineHeight: 16,
  },

  plusMinusRowCompact: {
    marginTop: 10,
    gap: 10,
  },

  stepButtonCompact: {
    minHeight: 34,
  },

  stepButtonTextCompact: {
    fontSize: 22,
    lineHeight: 28,
  },

  statsRowCompact: {
    marginTop: 10,
  },

  statLabelCompact: {
    fontSize: 13,
  },

  statValueCompact: {
    fontSize: 16,
    marginTop: 2,
  },

  scoreLayerCompact: {
    top: 94,
    bottom: 64,
  },

  scoreTextCompact: {
    fontSize: 170,
    lineHeight: 158,
  },

  scoreLayerPhoneLandscape: {
    top: 88,
    bottom: 60,
  },

  scoreTextPhoneLandscape: {
    fontSize: 150,
    lineHeight: 140,
  },

  scoreLayerCarom: {
    top: 200,
    bottom: 40,
  },

  scoreTextCarom: {
    fontSize: 450,
    lineHeight: 460,
  },

  scoreTextLibre3Digits: {
    fontSize: 300,
    lineHeight: 300,
  },

  scoreTextLibre4Digits: {
    fontSize: 220,
    lineHeight: 220,
  },

  scoreLayerCaromCompact: {
    top: 108,
    bottom: 64,
  },

  scoreTextCaromCompact: {
    fontSize: 138,
    lineHeight: 130,
  },

  scoreTextLibre3DigitsCompact: {
    fontSize: 100,
    lineHeight: 100,
  },

  scoreTextLibre4DigitsCompact: {
    fontSize: 78,
    lineHeight: 80,
  },

  scoreLayerCaromPhoneLandscape: {
    top: 100,
    bottom: 58,
  },

  scoreTextCaromPhoneLandscape: {
    fontSize: 126,
    lineHeight: 118,
  },

  scoreTextLibre3DigitsPhoneLandscape: {
    fontSize: 96,
    lineHeight: 96,
  },

  scoreTextLibre4DigitsPhoneLandscape: {
    fontSize: 76,
    lineHeight: 78,
  },

  scoreLayerExtraCompact: {
    top: 88,
    bottom: 58,
  },

  scoreTextExtraCompact: {
    fontSize: 128,
    lineHeight: 118,
  },

  scoreLayerCaromExtraCompact: {
    top: 90,
    bottom: 58,
  },

  scoreTextCaromExtraCompact: {
    fontSize: 108,
    lineHeight: 100,
  },

  scoreTextLibre3DigitsExtraCompact: {
    fontSize: 84,
    lineHeight: 84,
  },

  scoreTextLibre4DigitsExtraCompact: {
    fontSize: 68,
    lineHeight: 70,
  },

  addTimeStackCompact: {
    right: 14,
    gap: 6,
  },

  addTimeButtonCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  addTimeTextCompact: {
    fontSize: 16,
    lineHeight: 18,
  },

  scoredBallStackCompact: {
    right: 10,
    top: '32%',
    bottom: 58,
    width: 28,
    gap: 5,
  },

  playingBadgeCompact: {
    minWidth: 92,
    minHeight: 34,
    borderTopRightRadius: 14,
    borderTopLeftRadius: 14,
    paddingHorizontal: 8,
  },

  playingTextCompact: {
    fontSize: 14,
    lineHeight: 18,
  },

  violateWrapCompact: {
    bottom: 6,
    right: 6,
  },

  violateCircleCompact: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  violateXCompact: {
    fontSize: 54,
    lineHeight: 50,
  },

  violateCountCompact: {
    fontSize: 14,
    lineHeight: 16,
    marginLeft: 6,
  },
});

export default memo(GamePlayer);