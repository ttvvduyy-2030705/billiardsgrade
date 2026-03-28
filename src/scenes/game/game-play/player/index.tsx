
import React, {memo} from 'react';
import {StyleSheet, TextInput} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import i18n from 'i18n';

import PlayerViewModel, {Props} from './PlayerViewModel';

const GamePlayer = (props: Props & {layout?: 'default' | 'poolArena'}) => {
  const viewModel = PlayerViewModel(props);

  const showStats = !!props.proModeEnabled;
  const showAddTime =
    !!props.isOnTurn &&
    !!props.onPressGiveMoreTime &&
    ((props.player as any)?.proMode?.extraTimeTurns ?? 1) > 0;

  return (
    <View style={styles.panel}>
      <View style={styles.nameRow}>
        {viewModel.nameEditable ? (
          <TextInput
            value={props.player.name}
            onChangeText={viewModel.onChangeName}
            autoFocus
            onBlur={viewModel.onToggleEditName}
            style={styles.nameInput}
            placeholderTextColor={'#8B8D95'}
          />
        ) : (
          <Text style={styles.nameText}>{props.player.name}</Text>
        )}

        <Button onPress={viewModel.onToggleEditName} style={styles.editButton}>
          <Text style={styles.editText}>✎</Text>
        </Button>
      </View>

      <View direction={'row'} style={styles.plusMinusRow}>
        <Button style={styles.stepButton} onPress={viewModel.onDecreasePoint}>
          <Text style={styles.stepButtonText}>−</Text>
        </Button>

        <Button style={styles.stepButton} onPress={viewModel.onIncreasePoint}>
          <Text style={styles.stepButtonText}>＋</Text>
        </Button>
      </View>

      <View direction={'row'} style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>High run</Text>
          <Text style={styles.statValue}>{viewModel.highestRate}</Text>
        </View>

        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Average</Text>
          <Text style={styles.statValue}>{viewModel.averagePoint}</Text>
        </View>
      </View>

      <View style={styles.scoreWrap}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.scoreText}>
          {props.player.totalPoint}
        </Text>
      </View>

      {showAddTime ? (
        <Button onPress={props.onPressGiveMoreTime} style={styles.addTimeButton}>
          <Text style={styles.addTimeText}>＋</Text>
        </Button>
      ) : null}

      <View direction={'row'} style={styles.footerRow}>
        <View style={styles.playingBadge}>
          <Text style={styles.playingText}>{i18n.t('playing')}</Text>
        </View>

        <View direction={'row'} alignItems={'center'} style={styles.violateWrap}>
          <View style={styles.violateCircle}>
            <Text style={styles.violateX}>×</Text>
          </View>
          <Text style={styles.violateCount}>{props.player.violate || 0}</Text>
        </View>
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
    backgroundColor: '#090A0D',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },

  nameRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },

  nameText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },

  nameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    paddingVertical: 0,
  },

  editButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  editText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  plusMinusRow: {
    marginTop: 18,
    justifyContent: 'space-between',
    gap: 14,
  },

  stepButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: '#E8DDF0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepButtonText: {
    color: '#1A1B20',
    fontSize: 22,
    fontWeight: '700',
  },

  statsRow: {
    marginTop: 18,
    justifyContent: 'space-between',
  },

  statBlock: {
    flex: 1,
    alignItems: 'center',
  },

  statLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },

  scoreWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  scoreText: {
    color: '#FFFFFF',
    fontSize: 236,
    lineHeight: 236,
    fontWeight: '800',
    textAlign: 'center',
  },

  addTimeButton: {
    position: 'absolute',
    right: 16,
    top: '46%',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  addTimeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },

  footerRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  playingBadge: {
    minWidth: 154,
    minHeight: 56,
    borderTopRightRadius: 22,
    borderTopLeftRadius: 22,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 22,
    backgroundColor: '#24090B',
    borderWidth: 1,
    borderColor: '#6B1118',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  playingText: {
    color: '#FF3C3C',
    fontSize: 18,
    fontWeight: '800',
  },

  violateWrap: {
    alignItems: 'center',
  },

  violateCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FF1818',
    alignItems: 'center',
    justifyContent: 'center',
  },

  violateX: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '900',
  },

  violateCount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginLeft: 10,
    minWidth: 24,
    textAlign: 'center',
  },
});

export default memo(GamePlayer);
