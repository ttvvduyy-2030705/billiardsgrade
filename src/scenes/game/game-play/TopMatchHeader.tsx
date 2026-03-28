
import React, {memo} from 'react';
import {StyleSheet} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Image from 'components/Image';
import Switch from 'components/Switch';

import images from 'assets';
import colors from 'configuration/colors';
import i18n from 'i18n';

interface Props {
  title: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  remoteEnabled?: boolean;
  onToggleRemote?: (value: boolean) => void;
  proModeEnabled?: boolean;
  onToggleProMode?: (value: boolean) => void;
}

const TopMatchHeader = ({
  title,
  soundEnabled,
  onToggleSound,
  remoteEnabled = false,
  onToggleRemote,
  proModeEnabled = false,
  onToggleProMode,
}: Props) => {
  return (
    <View style={styles.header}>
      <View style={styles.logoSlot}>
        <Image
          source={images.logo}
          resizeMode={'contain'}
          style={styles.logo}
        />
      </View>

      <View style={styles.titleSlot}>
        <Text style={styles.titleText}>{title}</Text>
      </View>

      <View style={styles.rightSlot}>
        <View style={styles.switchGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Pro Mode</Text>
            <Switch
              defaultValue={proModeEnabled}
              onChange={value => onToggleProMode?.(value)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{i18n.t('remote')}</Text>
            <Switch
              defaultValue={remoteEnabled}
              onChange={value => onToggleRemote?.(value)}
            />
          </View>
        </View>

        <Button onPress={onToggleSound} style={styles.soundButton}>
          <Image
            source={soundEnabled ? images.game.soundOn : images.game.soundOff}
            style={styles.soundIcon}
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
    borderColor: 'rgba(255, 32, 32, 0.5)',
    backgroundColor: '#090A0E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#ff1f1f',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 0},
    elevation: 10,
  },

  logoSlot: {
    width: 180,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  logo: {
    width: 96,
    height: 40,
  },

  titleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  titleText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },

  rightSlot: {
    width: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  switchGroup: {
    width: 160,
  },

  switchRow: {
    minHeight: 28,
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
    width: 34,
    height: 34,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  soundIcon: {
    width: 24,
    height: 24,
  },
});

export default memo(TopMatchHeader);
