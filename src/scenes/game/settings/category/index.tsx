import React, {memo, useCallback} from 'react';
import Button from 'components/Button';
import Text from 'components/Text';
import View from 'components/View';
import i18n from 'i18n';
import styles from './styles';
import {BilliardCategory} from 'types/category';
import {
  GameCountDownTime,
  GameExtraTimeBonus,
  GameExtraTimeTurns,
  GameMode,
  GameSettingsMode,
  GameWarmUpTime,
} from 'types/settings';
import {CUSHION, LIBRE, POOL} from 'constants/category';
import {
  GAME_COUNT_DOWN_TIME,
  GAME_EXTRA_TIME_BONUS,
  GAME_EXTRA_TIME_TURN,
  GAME_MODE,
  GAME_WARM_UP_TIME,
} from 'constants/game-settings';

interface Props {
  category?: BilliardCategory;
  gameMode?: GameMode;
  gameSettingsMode?: GameSettingsMode;
  extraTimeTurnsEnabled: boolean;
  countdownEnabled: boolean;
  warmUpEnabled: boolean;
  extraTimeBonusEnabled: boolean;
  onSelectCategory: (_selectedCategory: BilliardCategory) => void;
  onSelectGameMode: (_selectedGameMode: GameMode) => void;
  onSelectExtraTimeTurns: (_selectedExtraTimeTurns: GameExtraTimeTurns) => void;
  onSelectCountdown: (_selectedCountdownTime: GameCountDownTime) => void;
  onSelectWarmUp: (selectedWarmUpTime: GameWarmUpTime) => void;
  onSelectExtraTimeBonus: (_selectedExtraTimeBonus: GameExtraTimeBonus) => void;
}

const CategorySettings = (props: Props) => {
  const renderOptionRow = useCallback(
    (
      title: string,
      data: Object,
      currentItem: string | number | undefined,
      onSelect: (item: any) => void,
      useKey = false,
      compact = false,
    ) => {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>

          <View style={[styles.optionsRow, compact && styles.optionsRowCompact]}>
            {Object.keys(data).map(key => {
              const item = (data as any)[key];
              const selected = item === currentItem;

              return (
                <Button
                  key={`${title}-${key}`}
                  style={[styles.button, selected && styles.active]}
                  onPress={() => onSelect(item)}>
                  <Text style={[styles.buttonText, selected && styles.activeText]}>
                    {useKey ? i18n.t(key) : i18n.t(item)}
                  </Text>
                </Button>
              );
            })}
          </View>
        </View>
      );
    },
    [],
  );

  return (
    <View>
      <Text style={styles.screenTitle}>THỂ LOẠI</Text>

      {renderOptionRow('Carom', CUSHION, props.category, props.onSelectCategory)}
      {renderOptionRow('Libre', LIBRE, props.category, props.onSelectCategory)}
      {renderOptionRow('Pool', POOL, props.category, props.onSelectCategory)}
      {renderOptionRow('Chế độ', GAME_MODE, props.gameMode, props.onSelectGameMode)}

      {props.extraTimeTurnsEnabled &&
        renderOptionRow(
          'Hiệp phụ',
          GAME_EXTRA_TIME_TURN,
          props.gameSettingsMode?.extraTimeTurns,
          props.onSelectExtraTimeTurns,
          true,
          true,
        )}

      {props.countdownEnabled &&
        renderOptionRow(
          'Đếm giây',
          GAME_COUNT_DOWN_TIME,
          props.gameSettingsMode?.countdownTime,
          props.onSelectCountdown,
          true,
          true,
        )}

      {props.warmUpEnabled &&
        renderOptionRow(
          'Khởi động',
          GAME_WARM_UP_TIME,
          props.gameSettingsMode?.warmUpTime,
          props.onSelectWarmUp,
          true,
          true,
        )}

      {props.extraTimeBonusEnabled &&
        renderOptionRow(
          'Thưởng giờ',
          GAME_EXTRA_TIME_BONUS,
          props.gameSettingsMode?.extraTimeBonus || 0,
          props.onSelectExtraTimeBonus,
          true,
          true,
        )}
    </View>
  );
};

export default memo(CategorySettings);