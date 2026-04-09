import React, {memo} from 'react';
import {StyleSheet, Text as RNText, useWindowDimensions} from 'react-native';

import View from 'components/View';
import Button from 'components/Button';
import Image from 'components/Image';
import Switch from 'components/Switch';

import images from 'assets';
import colors from 'configuration/colors';
import i18n from 'i18n';
import {
  isPoolGame,
  isPool9Game,
  isPool10Game,
  isPool15Game,
  isPool15OnlyGame,
} from 'utils/game';
import {getGameplayScreenProfile, clamp} from './screenProfile';

interface Props {
  title: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  remoteEnabled?: boolean;
  onToggleRemote?: (value: boolean) => void;
  proModeEnabled?: boolean;
  onToggleProMode?: (value: boolean) => void;
  gameSettings?: any;
}

const localeText = (vi: string, en: string) => {
  const locale = String(
    (i18n as any)?.locale || (i18n as any)?.language || '',
  ).toLowerCase();
  return locale.startsWith('en') ? en : vi;
};

const TopMatchHeader = ({
  title,
  soundEnabled,
  onToggleSound,
  remoteEnabled = false,
  onToggleRemote,
  proModeEnabled = false,
  onToggleProMode,
  gameSettings,
}: Props) => {
  const isAnyPoolMode =
    isPoolGame(gameSettings?.category) ||
    isPool9Game(gameSettings?.category) ||
    isPool10Game(gameSettings?.category) ||
    isPool15Game(gameSettings?.category) ||
    isPool15OnlyGame(gameSettings?.category);

  const {width, height, fontScale} = useWindowDimensions();
  const profile = getGameplayScreenProfile(width, height, fontScale);
  const compactScale = profile.headerScale;
  const isCompact = compactScale < 1;
  const isHandheldCaromHeader = profile.isHandheldLandscape && !isAnyPoolMode;

  const headerHeight = isHandheldCaromHeader
    ? Math.max(40, Math.round(46 * compactScale))
    : profile.isHandheldLandscape
    ? Math.round(52 * compactScale)
    : profile.isMediumDisplay
    ? 50
    : 68;
  const horizontalPadding = isHandheldCaromHeader
    ? Math.max(6, Math.round(8 * compactScale))
    : profile.isHandheldLandscape
    ? Math.round(10 * compactScale)
    : isCompact
    ? 8
    : 16;
  const verticalPadding = isHandheldCaromHeader
    ? 2
    : profile.isHandheldLandscape
    ? Math.max(1, Math.round(4 * compactScale))
    : isCompact
    ? 4
    : 8;
  const logoSlotWidth = isHandheldCaromHeader
    ? Math.round(72 * compactScale)
    : profile.isHandheldLandscape
    ? Math.round(100 * compactScale)
    : isCompact
    ? 98
    : 148;
  const logoWidth = isHandheldCaromHeader
    ? Math.round(44 * compactScale)
    : profile.isHandheldLandscape
    ? Math.round(68 * compactScale)
    : isCompact
    ? 68
    : 90;
  const logoHeight = isHandheldCaromHeader
    ? Math.round(18 * compactScale)
    : profile.isHandheldLandscape
    ? Math.round(26 * compactScale)
    : isCompact
    ? 28
    : 36;
  const titleFontSize = isHandheldCaromHeader
    ? Math.round(18 * compactScale)
    : profile.isHandheldLandscape
    ? Math.round(24 * compactScale)
    : isCompact
    ? 20
    : 31;
  const titleLineHeight = Math.round(titleFontSize * 1.08);
  const rightSlotWidth = isHandheldCaromHeader
    ? Math.round(126 * compactScale)
    : profile.isHandheldLandscape
    ? Math.round(180 * compactScale)
    : isCompact
    ? 136
    : 188;
  const switchGroupWidth = isHandheldCaromHeader
    ? Math.round(82 * compactScale)
    : profile.isHandheldLandscape
    ? Math.round((isAnyPoolMode ? 110 : 130) * compactScale)
    : isCompact
    ? 108
    : 146;
  const switchRowHeight = isHandheldCaromHeader
    ? Math.max(14, Math.round(20 * compactScale))
    : profile.isHandheldLandscape
    ? Math.max(16, Math.round(24 * compactScale))
    : isCompact
    ? 20
    : 26;
  const labelFontSize = isHandheldCaromHeader
    ? clamp(Math.round(9 * compactScale), 7, 9)
    : profile.isHandheldLandscape
    ? clamp(Math.round(11 * compactScale), 8, 10)
    : isCompact
    ? 10
    : 12;
  const soundButtonSize = isHandheldCaromHeader
    ? Math.max(16, Math.round(22 * compactScale))
    : profile.isHandheldLandscape
    ? Math.max(18, Math.round(28 * compactScale))
    : isCompact
    ? 24
    : 30;
  const soundIconSize = isHandheldCaromHeader
    ? Math.max(10, Math.round(13 * compactScale))
    : profile.isHandheldLandscape
    ? Math.max(11, Math.round(16 * compactScale))
    : isCompact
    ? 14
    : 18;

  return (
    <View
      style={[
        styles.header,
        {
          minHeight: headerHeight,
          borderRadius: Math.round(headerHeight * 0.34),
          paddingHorizontal: horizontalPadding,
          paddingVertical: verticalPadding,
        },
      ]}>
      <View style={[styles.logoSlot, {width: logoSlotWidth}]}>
        <Image
          source={images.logoSmall || images.logo}
          resizeMode="contain"
          style={{width: logoWidth, height: logoHeight}}
        />
      </View>

      <View style={styles.titleSlot}>
        <RNText
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          style={[
            styles.titleText,
            {
              fontSize: titleFontSize,
              lineHeight: titleLineHeight,
              transform: [{translateX: profile.isHandheldLandscape || isHandheldCaromHeader ? 0 : isCompact ? 0 : 30}],
            },
          ]}>
          {title}
        </RNText>
      </View>

      <View style={[styles.rightSlot, {width: rightSlotWidth}]}>
        <View style={[styles.switchGroup, {width: switchGroupWidth}]}> 
          {!isAnyPoolMode ? (
            <View style={[styles.switchRow, {minHeight: switchRowHeight}]}> 
              <RNText
                numberOfLines={1}
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                style={[styles.switchLabel, {fontSize: labelFontSize}]}> 
                Pro Mode
              </RNText>
              <Switch
                defaultValue={proModeEnabled}
                onChange={value => onToggleProMode?.(value)}
              />
            </View>
          ) : null}

          <View style={[styles.switchRow, {minHeight: switchRowHeight}]}> 
            <RNText
              numberOfLines={1}
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={[styles.switchLabel, {fontSize: labelFontSize}]}> 
              {localeText('Điều khiển', 'Remote')}
            </RNText>
            <Switch
              defaultValue={remoteEnabled}
              onChange={value => onToggleRemote?.(value)}
            />
          </View>
        </View>

        <Button
          onPress={onToggleSound}
          style={[
            styles.soundButton,
            {
              width: soundButtonSize,
              height: soundButtonSize,
              marginLeft: profile.isHandheldLandscape ? 3 : isCompact ? 4 : 8,
            },
          ]}>
          <Image
            source={soundEnabled ? images.game.soundOn : images.game.soundOff}
            style={{
              width: soundIconSize,
              height: soundIconSize,
              tintColor: soundEnabled ? '#FFFFFF' : '#7A7A7A',
            }}
            resizeMode={'contain'}
          />
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    borderWidth: 1.2,
    borderColor: 'rgba(255, 32, 32, 0.55)',
    backgroundColor: '#0A0B0E',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#ff1f1f',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 10,
  },
  logoSlot: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    width: '100%',
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  switchGroup: {},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: colors.white,
    fontWeight: '600',
  },
  soundButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(TopMatchHeader);
