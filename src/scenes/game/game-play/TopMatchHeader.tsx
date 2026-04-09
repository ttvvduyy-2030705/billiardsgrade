import React, {memo} from 'react';
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

  return (
    <View style={styles.header}>
      <View style={styles.logoSlot}>
        <Image
          source={images.logoSmall || images.logo}
          resizeMode="contain"
          style={styles.logo}
        />
      </View>

      <View style={styles.titleSlot}>
        <RNText style={styles.titleText}>{title}</RNText>
      </View>

      <View style={styles.rightSlot}>
        <View style={styles.switchGroup}>
          {!isAnyPoolMode ? (
            <View style={styles.switchRow}>
              <RNText style={styles.switchLabel}>Pro Mode</RNText>
              <Switch
                defaultValue={proModeEnabled}
                onChange={value => onToggleProMode?.(value)}
              />
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <RNText style={styles.switchLabel}>
              {localeText('Điều khiển', 'Remote')}
            </RNText>
            <Switch
              defaultValue={remoteEnabled}
              onChange={value => onToggleRemote?.(value)}
            />
          </View>
        </View>

        <Button onPress={onToggleSound} style={styles.soundButton}>
          <Image
            source={soundEnabled ? images.game.soundOn : images.game.soundOff}
            style={[
              styles.soundIcon,
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
  },

  titleText: {
    color: '#FFFFFF',
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    width: '100%',
    transform: [{translateX: 30}],
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
