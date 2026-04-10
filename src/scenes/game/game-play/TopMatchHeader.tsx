import React, {memo, useMemo} from 'react';
import {StyleSheet, Text as RNText} from 'react-native';

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
import useAdaptiveLayout from '../useAdaptiveLayout';

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

  const adaptive = useAdaptiveLayout();
  const isHandheldLandscape =
    adaptive.isLandscape &&
    (adaptive.systemMetrics.smallestScreenWidthDp < 600 || adaptive.isConstrainedLandscape);

  const dynamicStyles = useMemo(() => {
    const headerHeight = isHandheldLandscape
      ? adaptive.s(46)
      : adaptive.layoutPreset === 'tv'
        ? adaptive.s(76)
        : adaptive.s(68);

    const logoWidth = isHandheldLandscape ? adaptive.s(60) : adaptive.s(98);
    const logoHeight = isHandheldLandscape ? adaptive.s(24) : adaptive.s(40);
    const logoSlotWidth = isHandheldLandscape ? adaptive.s(84) : adaptive.s(170);
    const rightSlotWidth = isHandheldLandscape
      ? adaptive.s(isAnyPoolMode ? 106 : 130)
      : adaptive.s(isAnyPoolMode ? 188 : 224);
    const switchGroupWidth = isHandheldLandscape
      ? adaptive.s(isAnyPoolMode ? 82 : 104)
      : adaptive.s(isAnyPoolMode ? 138 : 172);

    return {
      header: {
        minHeight: headerHeight,
        borderRadius: isHandheldLandscape ? adaptive.s(18) : adaptive.s(24),
        paddingHorizontal: isHandheldLandscape ? adaptive.s(12) : adaptive.s(18),
        paddingVertical: isHandheldLandscape ? adaptive.s(8) : adaptive.s(10),
      },
      logoSlot: {
        width: logoSlotWidth,
      },
      logo: {
        width: logoWidth,
        height: logoHeight,
      },
      titleText: {
        fontSize: isHandheldLandscape ? adaptive.fs(24, 0.68, 0.9) : adaptive.fs(35, 0.82, 1.02),
        lineHeight: isHandheldLandscape ? adaptive.fs(28, 0.68, 0.9) : adaptive.fs(40, 0.82, 1.02),
      },
      rightSlot: {
        width: rightSlotWidth,
      },
      switchGroup: {
        width: switchGroupWidth,
      },
      switchRow: {
        minHeight: isHandheldLandscape ? adaptive.s(20) : adaptive.s(30),
      },
      switchLabel: {
        fontSize: isHandheldLandscape ? adaptive.fs(10, 0.76, 0.9) : adaptive.fs(14, 0.86, 1),
      },
      soundButton: {
        width: isHandheldLandscape ? adaptive.s(28) : adaptive.s(36),
        height: isHandheldLandscape ? adaptive.s(28) : adaptive.s(36),
        marginLeft: isHandheldLandscape ? adaptive.s(8) : adaptive.s(12),
      },
      soundIcon: {
        width: isHandheldLandscape ? adaptive.s(18) : adaptive.s(22),
        height: isHandheldLandscape ? adaptive.s(18) : adaptive.s(22),
      },
    };
  }, [adaptive, isAnyPoolMode, isHandheldLandscape]);

  return (
    <View style={[styles.header, dynamicStyles.header]}>
      <View style={[styles.logoSlot, dynamicStyles.logoSlot]}>
        <Image
          source={images.logoSmall || images.logo}
          resizeMode="contain"
          style={[styles.logo, dynamicStyles.logo]}
        />
      </View>

      <View style={styles.titleSlot}>
        <RNText
          style={[styles.titleText, dynamicStyles.titleText]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.62}>
          {title}
        </RNText>
      </View>

      <View style={[styles.rightSlot, dynamicStyles.rightSlot]}>
        <View style={[styles.switchGroup, dynamicStyles.switchGroup]}>
          {!isAnyPoolMode ? (
            <View style={[styles.switchRow, dynamicStyles.switchRow]}>
              <RNText style={[styles.switchLabel, dynamicStyles.switchLabel]}>Pro Mode</RNText>
              <Switch
                defaultValue={proModeEnabled}
                onChange={value => onToggleProMode?.(value)}
              />
            </View>
          ) : null}

          <View style={[styles.switchRow, dynamicStyles.switchRow]}>
            <RNText style={[styles.switchLabel, dynamicStyles.switchLabel]}>
              {localeText('Điều khiển', 'Remote')}
            </RNText>
            <Switch
              defaultValue={remoteEnabled}
              onChange={value => onToggleRemote?.(value)}
            />
          </View>
        </View>

        <Button onPress={onToggleSound} style={[styles.soundButton, dynamicStyles.soundButton]}>
          <Image
            source={soundEnabled ? images.game.soundOn : images.game.soundOff}
            style={[
              styles.soundIcon,
              dynamicStyles.soundIcon,
              {tintColor: soundEnabled ? '#FFFFFF' : '#7A7A7A'},
            ]}
            resizeMode={'contain'}
          />
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    minHeight: 74,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 32, 32, 0.55)',
    backgroundColor: '#0A0B0E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#ff1f1f',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 10,
  },
  logoSlot: {
    width: 170,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logo: {
    width: 98,
    height: 40,
  },
  titleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    width: '100%',
  },
  rightSlot: {
    width: 224,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  switchGroup: {
    width: 172,
  },
  switchRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  soundButton: {
    width: 36,
    height: 36,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },
});

export default memo(TopMatchHeader);
