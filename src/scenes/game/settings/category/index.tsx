import Button from 'components/Button';
import Text from 'components/Text';
import View from 'components/View';
import i18n from 'i18n';
import React, {memo, useCallback} from 'react';
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
import colors from 'configuration/colors';
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
  const {
    category,
    gameMode,
    gameSettingsMode,
    extraTimeTurnsEnabled,
    countdownEnabled,
    warmUpEnabled,
    extraTimeBonusEnabled,
    onSelectCategory,
    onSelectGameMode,
    onSelectExtraTimeTurns,
    onSelectCountdown,
    onSelectWarmUp,
    onSelectExtraTimeBonus,
  } = props;

  const renderCategoryLine = useCallback(
    (
      title: string,
      data: Object,
      onSelect: (item: any) => void,
      currentItem: string | number | undefined,
      useKey = false,
    ) => {
      return (
        <View
          direction={'row'}
          alignItems={'center'}
          marginTop={'20'}
          marginBottom={'10'}>
          <View flex={'1'}>
            <Text fontSize={18} letterSpacing={1.2} color={colors.deepGray}>
              {title}
            </Text>
          </View>
          <View flex={'4'} direction={'row'} alignItems={'center'}>
            {Object.keys(data).map(key => {
              const item = (data as any)[key];

              return (
                <Button
                  key={`${title}-${key}`}
                  style={
                    item === currentItem
                      ? [styles.button, styles.active]
                      : styles.button
                  }
                  onPress={onSelect.bind(CategorySettings, item)}>
                  <Text fontSize={20}>
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
    <View flex={'1'}>
      <Text fontSize={24} fontWeight={'bold'} letterSpacing={1.2}>
        {i18n.t('category')}
      </Text>
      {renderCategoryLine(i18n.t('carom'), CUSHION, onSelectCategory, category)}
      {renderCategoryLine(i18n.t('libre'), LIBRE, onSelectCategory, category)}
      {renderCategoryLine(i18n.t('pool'), POOL, onSelectCategory, category)}
      {renderCategoryLine(
        i18n.t('mode'),
        GAME_MODE,
        onSelectGameMode,
        gameMode,
      )}
      {extraTimeTurnsEnabled &&
        renderCategoryLine(
          i18n.t('extraTimeTurns'),
          GAME_EXTRA_TIME_TURN,
          onSelectExtraTimeTurns,
          gameSettingsMode?.extraTimeTurns,
          true,
        )}
      {countdownEnabled &&
        renderCategoryLine(
          i18n.t('countdown'),
          GAME_COUNT_DOWN_TIME,
          onSelectCountdown,
          gameSettingsMode?.countdownTime,
          true,
        )}
      {warmUpEnabled &&
        renderCategoryLine(
          i18n.t('warmUp'),
          GAME_WARM_UP_TIME,
          onSelectWarmUp,
          gameSettingsMode?.warmUpTime,
          true,
        )}
      {extraTimeBonusEnabled &&
        renderCategoryLine(
          i18n.t('extraTimeBonus'),
          GAME_EXTRA_TIME_BONUS,
          onSelectExtraTimeBonus,
          gameSettingsMode?.extraTimeBonus || 0,
          true,
        )}
    </View>
  );
};

export default memo(CategorySettings);
