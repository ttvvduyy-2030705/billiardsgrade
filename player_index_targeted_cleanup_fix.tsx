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

const isRemoteUri = (value?: string) =>
  /^https?:\/\//i.test(String(value || '').trim()) ||
  /^file:\/\//i.test(String(value || '').trim());

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

const isLightColor = (value?: string) => {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw) {
    return false;
  }

  if (raw === 'white' || raw === '#fff' || raw === '#ffffff') {
    return true;
  }

  const hex = raw.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 186;
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 186;
  }

  const rgbMatch = raw.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 186;
  }

  return false;
};

const GamePlayer = (
  props: Props & {layout?: 'default' | 'poolArena'; compact?: boolean},
) => {
  const viewModel = PlayerViewModel(props);
  const isPoolMode = isPoolGame(props.gameSettings?.category);
  const isPool15Mode = isPool15Game(props.gameSettings?.category);
  const isPool15FreeMode = isPool15FreeGame(props.gameSettings?.category);
  const isActiveCard = !!props.isOnTurn;

  const {width, height, fontScale} = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const isLandscape = width > height;
  const isLargeDisplay = longestSide >= 1600 || shortestSide >= 900;
  const isMediumLandscape =
    isLandscape && !isLargeDisplay && shortestSide >= 650 && shortestSide < 900;
  const isCompactLandscape =
    isLandscape && !isLargeDisplay && shortestSide < 650;
  const isShortLandscapeDisplay = isLandscape && height <= 820;
  const isVeryShortLandscapeDisplay = isLandscape && height <= 720;
  const useForcedCompact =
    isCompactLandscape || shortestSide < 430 || isShortLandscapeDisplay;

  const isCompactLayout = Boolean(
    props.compact || useForcedCompact || (props.totalPlayers || 2) > 2,
  );
  const isMediumResponsiveLayout =
    !isCompactLayout &&
    isMediumLandscape &&
    !isShortLandscapeDisplay &&
    (props.totalPlayers || 2) <= 2;

  const isPhoneLandscapeTwoPlayer =
    isLandscape &&
    !isLargeDisplay &&
    (props.totalPlayers || 2) <= 2 &&
    (shortestSide < 650 || isShortLandscapeDisplay);

  const isExtraCompactLayout =
    (props.totalPlayers || 2) >= 4 ||
    (!isLargeDisplay && (shortestSide <= 430 || isVeryShortLandscapeDisplay));

  const uiScale = useMemo(() => {
    if (isLargeDisplay) {
      return 1;
    }

    const base = Math.max(0.72, Math.min(1, shortestSide / 900));
    const landscapeFactor = isVeryShortLandscapeDisplay
      ? 0.86
      : isShortLandscapeDisplay
      ? 0.92
      : 1;
    return Math.max(
      0.64,
      Math.min(1, (base * landscapeFactor) / Math.min(fontScale || 1, 1.15)),
    );
  }, [
    fontScale,
    isLargeDisplay,
    isShortLandscapeDisplay,
    isVeryShortLandscapeDisplay,
    shortestSide,
  ]);

  const nameFontSize = Math.round((isPhoneLandscapeTwoPlayer ? 34 : 42) * uiScale);
  const nameLineHeight = Math.round((isPhoneLandscapeTwoPlayer ? 38 : 48) * uiScale);
  const nameMinimumScale = isPhoneLandscapeTwoPlayer ? 0.5 : 0.72;

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

  const isLightPlayerPanel = useColoredPanel && isLightColor(playerPanelColor);
  const addTimeButtonDynamicStyle = isLightPlayerPanel
    ? {
        borderColor: 'rgba(17,17,17,0.5)',
        backgroundColor: 'rgba(17,17,17,0.08)',
      }
    : undefined;
  const addTimeTextDynamicStyle = isLightPlayerPanel
    ? {color: '#111111'}
    : undefined;

  const textColorStyle = {color: primaryTextColor};
  const inactivePlaceholderColor = inactiveTextColor;

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
        !isLargeDisplay && styles.panelScaled,
        isMediumResponsiveLayout ? styles.panelMedium : undefined,
        isPhoneLandscapeTwoPlayer ? styles.panelPhoneLandscape : undefined,
        panelDynamicStyle,
        isActiveCard ? styles.panelActive : styles.panelInactive,
      ]}>
      <View
        style={[
          styles.nameRow,
          isMediumResponsiveLayout ? styles.nameRowMedium : undefined,
          isCompactLayout && styles.nameRowCompact,
        ]}>
        {playerFlagImage || playerFlag ? (
          <View
            style={[
              styles.flagBadge,
              isMediumResponsiveLayout ? styles.flagBadgeMedium : undefined,
              isCompactLayout && styles.flagBadgeCompact,
              isPhoneLandscapeTwoPlayer ? styles.flagBadgePhoneLandscape : undefined,
              isActiveCard ? styles.flagBadgeActive : styles.flagBadgeInactive,
            ]}>
            {playerFlagImage ? (
              <RNImage
                source={{uri: playerFlagImage}}
                resizeMode="cover"
                fadeDuration={0}
                style={styles.flagImage}
              />
            ) : (
              <RNText
                style={[
                  styles.flagText,
                  isMediumResponsiveLayout ? styles.flagTextMedium : undefined,
                  isCompactLayout && styles.flagTextCompact,
                  !isActiveCard && styles.flagTextInactive,
                ]}
                allowFontScaling={false}
                maxFontSizeMultiplier={1}>
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
            numberOfLines={1}
            allowFontScaling={false}
            maxFontSizeMultiplier={1}
            style={[
              styles.nameInput,
              {fontSize: nameFontSize, lineHeight: nameLineHeight},
              (playerFlagImage || playerFlag) && styles.nameTextWithFlag,
              isMediumResponsiveLayout ? styles.nameInputMedium : undefined,
              isCompactLayout && styles.nameInputCompact,
              isPhoneLandscapeTwoPlayer ? styles.nameInputPhoneLandscape : undefined,
              textColorStyle,
              !isActiveCard && styles.nameTextInactive,
            ]}
            placeholderTextColor={inactivePlaceholderColor}
          />
        ) : (
          <RNText
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={nameMinimumScale}
            allowFontScaling={false}
            maxFontSizeMultiplier={1}
            style={[
              styles.nameText,
              {fontSize: nameFontSize, lineHeight: nameLineHeight},
              (playerFlagImage || playerFlag) && styles.nameTextWithFlag,
              isMediumResponsiveLayout ? styles.nameTextMedium : undefined,
              isCompactLayout && styles.nameTextCompact,
              isPhoneLandscapeTwoPlayer ? styles.nameTextPhoneLandscape : undefined,
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
            isMediumResponsiveLayout ? styles.editButtonMedium : undefined,
            isCompactLayout && styles.editButtonCompact,
            isPhoneLandscapeTwoPlayer ? styles.editButtonPhoneLandscape : undefined,
            !isActiveCard && styles.editButtonInactive,
          ]}>
          <RNText
            style={[
              styles.editText,
              isMediumResponsiveLayout ? styles.editTextMedium : undefined,
              isCompactLayout && styles.editTextCompact,
              isPhoneLandscapeTwoPlayer ? styles.editTextPhoneLandscape : undefined,
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
          isMediumResponsiveLayout ? styles.plusMinusRowMedium : undefined,
          isCompactLayout && styles.plusMinusRowCompact,
          !isActiveCard && styles.controlsRowInactive,
        ]}>
        <Button
          style={[
            styles.stepButton,
            isMediumResponsiveLayout ? styles.stepButtonMedium : undefined,
            isCompactLayout && styles.stepButtonCompact,
          ]}
          onPress={viewModel.onDecreasePoint}>
          <RNText
            style={[
              styles.stepButtonText,
              {fontSize: Math.round((isCompactLayout ? 26 : 30) * uiScale)},
              isMediumResponsiveLayout ? styles.stepButtonTextMedium : undefined,
              isCompactLayout && styles.stepButtonTextCompact,
            ]}>
            −
          </RNText>
        </Button>

        <Button
          style={[
            styles.stepButton,
            isMediumResponsiveLayout ? styles.stepButtonMedium : undefined,
            isCompactLayout && styles.stepButtonCompact,
          ]}
          onPress={viewModel.onIncreasePoint}>
          <RNText
            style={[
              styles.stepButtonText,
              {fontSize: Math.round((isCompactLayout ? 26 : 30) * uiScale)},
              isMediumResponsiveLayout ? styles.stepButtonTextMedium : undefined,
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
            isMediumResponsiveLayout ? styles.statsRowMedium : undefined,
            isCompactLayout && styles.statsRowCompact,
            !isActiveCard && styles.statsRowInactive,
          ]}>
          <View style={styles.statBlock}>
            <RNText
              style={[
                styles.statLabel,
                isMediumResponsiveLayout ? styles.statLabelMedium : undefined,
                isCompactLayout && styles.statLabelCompact,
                {color: secondaryTextColor},
              ]}
              allowFontScaling={false}
              maxFontSizeMultiplier={1}>
              High run
            </RNText>
            <RNText
              style={[
                styles.statValue,
                isMediumResponsiveLayout ? styles.statValueMedium : undefined,
                isCompactLayout && styles.statValueCompact,
                textColorStyle,
              ]}
              allowFontScaling={false}
              maxFontSizeMultiplier={1}>
              {viewModel.highestRate}
            </RNText>
          </View>

          <View style={styles.statBlock}>
            <RNText
              style={[
                styles.statLabel,
                isMediumResponsiveLayout ? styles.statLabelMedium : undefined,
                isCompactLayout && styles.statLabelCompact,
                {color: secondaryTextColor},
              ]}
              allowFontScaling={false}
              maxFontSizeMultiplier={1}>
              Average
            </RNText>
            <RNText
              style={[
                styles.statValue,
                isMediumResponsiveLayout ? styles.statValueMedium : undefined,
                isCompactLayout && styles.statValueCompact,
                textColorStyle,
              ]}
              allowFontScaling={false}
              maxFontSizeMultiplier={1}>
              {viewModel.averagePoint}
            </RNText>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.scoreLayer,
          isMediumResponsiveLayout ? styles.scoreLayerMedium : undefined,
          scoreLayerDynamicStyle,
          !isActiveCard && styles.scoreLayerInactive,
          isPool15FreeMode && styles.scoreLayerWithScoredBalls,
        ]}
        pointerEvents="none">
        <View
          style={[
            styles.scoreTextBox,
            isMediumResponsiveLayout ? styles.scoreTextBoxMedium : undefined,
            isCompactLayout && styles.scoreTextBoxCompact,
          ]}>
          <RNText
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            style={[
              styles.scoreText,
              isMediumResponsiveLayout ? styles.scoreTextMedium : undefined,
              scoreTextDynamicStyle,
              libreScoreTextStyle,
              textColorStyle,
            ]}
            allowFontScaling={false}
            maxFontSizeMultiplier={1}>
            {totalPointValue}
          </RNText>
        </View>
      </View>

      {showAddTime ? (
        <View
          style={[
            styles.addTimeStack,
            isMediumResponsiveLayout ? styles.addTimeStackMedium : undefined,
            isCompactLayout && styles.addTimeStackCompact,
            !isActiveCard && styles.addTimeStackInactive,
          ]}>
          {addTimeButtons.map(index => (
            <Button
              key={`extra-time-${index}`}
              onPress={isActiveCard ? props.onPressGiveMoreTime : undefined}
              style={[
                styles.addTimeButton,
                isMediumResponsiveLayout ? styles.addTimeButtonMedium : undefined,
                isCompactLayout && styles.addTimeButtonCompact,
                addTimeButtonDynamicStyle,
                !isActiveCard && styles.addTimeButtonInactive,
              ]}>
              <RNText
                style={[
                  styles.addTimeText,
                  isMediumResponsiveLayout ? styles.addTimeTextMedium : undefined,
                  isCompactLayout && styles.addTimeTextCompact,
                  addTimeTextDynamicStyle,
                  !isActiveCard && styles.addTimeTextInactive,
                ]}
                allowFontScaling={false}
                maxFontSizeMultiplier={1}>
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
            isMediumResponsiveLayout ? styles.scoredBallStackMedium : undefined,
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
                  ]}
                  allowFontScaling={false}
                  maxFontSizeMultiplier={1}>
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
            isMediumResponsiveLayout ? styles.playingBadgeMedium : undefined,
            isCompactLayout && styles.playingBadgeCompact,
            styles.playingBadgeActive,
          ]}>
          <RNText
            style={[
              styles.playingText,
              isMediumResponsiveLayout ? styles.playingTextMedium : undefined,
              isCompactLayout && styles.playingTextCompact,
              styles.playingTextActive,
            ]}
            allowFontScaling={false}
            maxFontSizeMultiplier={1}>
            {tr('Đang đánh', 'Playing')}
          </RNText>
        </Button>
      ) : (
        <View
          style={[
            styles.playingBadge,
            isMediumResponsiveLayout ? styles.playingBadgeMedium : undefined,
            isCompactLayout && styles.playingBadgeCompact,
            styles.playingBadgeInactive,
          ]}>
          <RNText
            style={[
              styles.playingText,
              isMediumResponsiveLayout ? styles.playingTextMedium : undefined,
              isCompactLayout && styles.playingTextCompact,
              styles.playingTextInactive,
            ]}
            allowFontScaling={false}
            maxFontSizeMultiplier={1}>
            {tr('Đang đánh', 'Playing')}
          </RNText>
        </View>
      )}

      <View
        direction={'row'}
        alignItems={'center'}
        style={[
          styles.violateWrap,
          isMediumResponsiveLayout ? styles.violateWrapMedium : undefined,
          isCompactLayout && styles.violateWrapCompact,
          !isActiveCard && styles.violateWrapInactive,
        ]}>
        <View
          style={[
            styles.violateCircle,
            isMediumResponsiveLayout ? styles.violateCircleMedium : undefined,
            isCompactLayout && styles.violateCircleCompact,
            !isActiveCard && styles.violateCircleInactive,
          ]}>
          <RNText
            style={[
              styles.violateX,
              isMediumResponsiveLayout ? styles.violateXMedium : undefined,
              isCompactLayout && styles.violateXCompact,
              !isActiveCard && styles.violateXInactive,
            ]}
            allowFontScaling={false}
            maxFontSizeMultiplier={1}>
            ×
          </RNText>
        </View>
        <RNText
          style={[
            styles.violateCount,
            isMediumResponsiveLayout ? styles.violateCountMedium : undefined,
            isCompactLayout && styles.violateCountCompact,
            textColorStyle,
            !isActiveCard && styles.violateCountInactive,
          ]}
          allowFontScaling={false}
          maxFontSizeMultiplier={1}>
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
  panelScaled: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 20,
  },
  panelActive: {
    opacity: 1,
  },
  panelInactive: {
    opacity: 0.52,
  },
  panelPhoneLandscape: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 18,
  },
  panelVeryShortLandscape: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 16,
  },
  panelMedium: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 22,
  },
  nameRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameRowMedium: {
    minHeight: 54,
  },
  nameRowCompact: {
    minHeight: 46,
  },
  flagBadge: {
    width: 112,
    height: 76,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.92)',
    overflow: 'hidden',
  },
  flagBadgeMedium: {
    width: 92,
    height: 62,
    marginRight: 12,
  },
  flagBadgeCompact: {
    width: 76,
    height: 50,
    marginRight: 10,
  },
  flagBadgePhoneLandscape: {
    width: 64,
    height: 44,
    marginRight: 8,
  },
  flagBadgeActive: {
    opacity: 1,
  },
  flagBadgeInactive: {
    opacity: 0.78,
  },
  flagImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  flagText: {
    width: '100%',
    fontSize: 52,
    lineHeight: 56,
    textAlign: 'center',
    includeFontPadding: false,
  },
  flagTextMedium: {
    fontSize: 42,
    lineHeight: 44,
  },
  flagTextCompact: {
    fontSize: 34,
    lineHeight: 36,
  },
  flagTextInactive: {
    opacity: 0.92,
  },
  nameText: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
  },
  nameTextWithFlag: {
    textAlign: 'left',
  },
  nameTextMedium: {},
  nameTextCompact: {},
  nameTextPhoneLandscape: {
    letterSpacing: -0.4,
  },
  nameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 0,
  },
  nameInputMedium: {},
  nameInputCompact: {},
  nameInputPhoneLandscape: {
    letterSpacing: -0.4,
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
  editButtonMedium: {
    width: 32,
    height: 32,
  },
  editButtonCompact: {
    width: 28,
    height: 28,
  },
  editButtonPhoneLandscape: {
    width: 24,
    height: 24,
    marginLeft: 4,
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
  editTextMedium: {
    fontSize: 18,
    lineHeight: 18,
  },
  editTextCompact: {
    fontSize: 16,
    lineHeight: 16,
  },
  editTextPhoneLandscape: {
    fontSize: 14,
    lineHeight: 14,
  },
  editTextInactive: {
    opacity: 0.9,
  },
  plusMinusRow: {
    marginTop: 18,
    justifyContent: 'space-between',
    gap: 14,
  },
  plusMinusRowMedium: {
    marginTop: 12,
    gap: 10,
  },
  plusMinusRowCompact: {
    marginTop: 8,
    gap: 8,
  },
  controlsRowInactive: {
    opacity: 0.7,
  },
  stepButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonMedium: {
    minHeight: 40,
  },
  stepButtonCompact: {
    minHeight: 36,
  },
  stepButtonText: {
    color: '#000000',
    fontWeight: '700',
    includeFontPadding: false,
  },
  stepButtonTextMedium: {},
  stepButtonTextCompact: {},
  statsRow: {
    marginTop: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  statsRowMedium: {
    marginTop: 10,
    gap: 10,
  },
  statsRowCompact: {
    marginTop: 8,
    gap: 8,
  },
  statsRowInactive: {
    opacity: 0.7,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '500',
  },
  statLabelMedium: {
    fontSize: 14,
    lineHeight: 16,
  },
  statLabelCompact: {
    fontSize: 12,
    lineHeight: 14,
  },
  statValue: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
  statValueMedium: {
    marginTop: 5,
    fontSize: 18,
    lineHeight: 20,
  },
  statValueCompact: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 18,
  },
  scoreLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 172,
    bottom: 104,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  scoreLayerMedium: {
    top: 146,
    bottom: 88,
  },
  scoreLayerCompact: {
    top: 122,
    bottom: 70,
  },
  scoreLayerExtraCompact: {
    top: 112,
    bottom: 62,
  },
  scoreLayerPhoneLandscape: {
    top: 118,
    bottom: 64,
  },
  scoreLayerCarom: {
    top: 172,
    bottom: 104,
  },
  scoreLayerCaromCompact: {
    top: 122,
    bottom: 70,
  },
  scoreLayerCaromExtraCompact: {
    top: 112,
    bottom: 62,
  },
  scoreLayerCaromPhoneLandscape: {
    top: 122,
    bottom: 76,
  },
  scoreLayerInactive: {
    opacity: 0.88,
  },
  scoreLayerWithScoredBalls: {
    right: 44,
  },
  scoreTextBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  scoreTextBoxMedium: {
    paddingHorizontal: 8,
  },
  scoreTextBoxCompact: {
    paddingHorizontal: 6,
  },
  scoreText: {
    width: '90%',
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 230,
    lineHeight: 230,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  scoreTextMedium: {
    fontSize: 198,
    lineHeight: 198,
  },
  scoreTextCompact: {
    fontSize: 165,
    lineHeight: 165,
  },
  scoreTextExtraCompact: {
    fontSize: 135,
    lineHeight: 135,
  },
  scoreTextPhoneLandscape: {
    fontSize: 150,
    lineHeight: 150,
  },
  scoreTextCarom: {
    fontSize: 230,
    lineHeight: 230,
  },
  scoreTextCaromCompact: {
    fontSize: 170,
    lineHeight: 170,
  },
  scoreTextCaromExtraCompact: {
    fontSize: 140,
    lineHeight: 140,
  },
  scoreTextCaromPhoneLandscape: {
    fontSize: 118,
    lineHeight: 120,
  },
  scoreTextLibre3Digits: {
    fontSize: 190,
    lineHeight: 190,
  },
  scoreTextLibre4Digits: {
    fontSize: 150,
    lineHeight: 150,
  },
  scoreTextLibre3DigitsCompact: {
    fontSize: 150,
    lineHeight: 150,
  },
  scoreTextLibre4DigitsCompact: {
    fontSize: 120,
    lineHeight: 120,
  },
  scoreTextLibre3DigitsExtraCompact: {
    fontSize: 128,
    lineHeight: 128,
  },
  scoreTextLibre4DigitsExtraCompact: {
    fontSize: 104,
    lineHeight: 104,
  },
  scoreTextLibre3DigitsPhoneLandscape: {
    fontSize: 132,
    lineHeight: 132,
  },
  scoreTextLibre4DigitsPhoneLandscape: {
    fontSize: 106,
    lineHeight: 106,
  },
  scoreTextSingleDigit: {},
  scoreTextSingleDigitMedium: {},
  scoreTextSingleDigitCompact: {},
  scoreTextSingleDigitExtraCompact: {},
  scoreTextSingleDigitPhoneLandscape: {},
  scoreTextDoubleDigit: {},
  scoreTextDoubleDigitMedium: {},
  scoreTextDoubleDigitCompact: {},
  scoreTextDoubleDigitExtraCompact: {},
  scoreTextDoubleDigitPhoneLandscape: {},
  addTimeStack: {
    position: 'absolute',
    right: 12,
    top: '38%',
    gap: 8,
  },
  addTimeStackMedium: {
    right: 10,
    gap: 7,
  },
  addTimeStackCompact: {
    right: 8,
    gap: 6,
  },
  addTimeStackInactive: {
    opacity: 0.7,
  },
  addTimeButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeButtonMedium: {
    width: 38,
    height: 38,
  },
  addTimeButtonCompact: {
    width: 34,
    height: 34,
  },
  addTimeButtonInactive: {
    opacity: 0.65,
  },
  addTimeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  addTimeTextMedium: {
    fontSize: 14,
  },
  addTimeTextCompact: {
    fontSize: 12,
  },
  addTimeTextInactive: {
    opacity: 0.92,
  },
  scoredBallStack: {
    position: 'absolute',
    right: 10,
    top: 120,
    gap: 6,
    alignItems: 'center',
  },
  scoredBallStackMedium: {
    top: 104,
    gap: 5,
  },
  scoredBallStackCompact: {
    top: 92,
    gap: 4,
  },
  scoredBallStackInactive: {
    opacity: 0.8,
  },
  scoredBallItem: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scoredBallStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '38%',
    marginTop: '31%',
  },
  scoredBallText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    includeFontPadding: false,
  },
  playingBadge: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '38%',
    minWidth: 180,
    minHeight: 50,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 4,
    backgroundColor: '#1C1C20',
  },
  playingBadgeMedium: {
    width: '36%',
    minWidth: 150,
    minHeight: 40,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    paddingHorizontal: 10,
  },
  playingBadgeCompact: {
    width: '34%',
    minWidth: 118,
    minHeight: 34,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 8,
  },
  playingBadgeActive: {
    backgroundColor: '#1A1416',
  },
  playingBadgeInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  playingText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },
  playingTextMedium: {
    fontSize: 18,
    lineHeight: 20,
  },
  playingTextCompact: {
    fontSize: 14,
    lineHeight: 16,
  },
  playingTextActive: {
    color: '#FF3844',
  },
  playingTextInactive: {
    color: '#FFFFFF',
    opacity: 0.45,
  },
  violateWrap: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    gap: 6,
  },
  violateWrapMedium: {
    right: 9,
    bottom: 9,
    gap: 5,
  },
  violateWrapCompact: {
    right: 8,
    bottom: 8,
    gap: 4,
  },
  violateWrapInactive: {
    opacity: 0.78,
  },
  violateCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#FF2A32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  violateCircleMedium: {
    width: 46,
    height: 46,
  },
  violateCircleCompact: {
    width: 42,
    height: 42,
  },
  violateCircleInactive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  violateX: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '900',
    includeFontPadding: false,
  },
  violateXMedium: {
    fontSize: 30,
    lineHeight: 30,
  },
  violateXCompact: {
    fontSize: 26,
    lineHeight: 26,
  },
  violateXInactive: {
    opacity: 0.82,
  },
  violateCount: {
    color: '#FFFFFF',
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '700',
  },
  violateCountMedium: {
    fontSize: 16,
  },
  violateCountCompact: {
    fontSize: 14,
  },
  violateCountInactive: {
    opacity: 0.8,
  },
});

export default memo(GamePlayer);
