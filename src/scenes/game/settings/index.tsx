import React, {memo} from 'react';
import {ScrollView} from 'react-native';

import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import i18n from 'i18n';

import GameSettingsViewModel, {Props} from './SettingsViewModel';
import CategorySettings from './category';
import PlayerSettings from './player';
import styles from './styles';

const GameSettings = (props: Props) => {
  const viewModel = GameSettingsViewModel(props);

  return (
    <Container>
      <View style={styles.screen}>
        <View style={styles.contentRow}>
          <View style={styles.leftPanel}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.panelScrollContent}>
              <CategorySettings
                category={viewModel.category}
                gameMode={viewModel.gameMode}
                gameSettingsMode={viewModel.gameSettingsMode}
                extraTimeTurnsEnabled={viewModel.extraTimeTurnsEnabled}
                countdownEnabled={viewModel.countdownEnabled}
                warmUpEnabled={viewModel.warmUpEnabled}
                extraTimeBonusEnabled={viewModel.extraTimeBonusEnabled}
                onSelectCategory={viewModel.onSelectCategory}
                onSelectGameMode={viewModel.onSelectGameMode}
                onSelectExtraTimeTurns={viewModel.onSelectExtraTimeTurns}
                onSelectCountdown={viewModel.onSelectCountdown}
                onSelectWarmUp={viewModel.onSelectWarmUp}
                onSelectExtraTimeBonus={viewModel.onSelectExtraTimeBonus}
              />
            </ScrollView>
          </View>

          <View style={styles.rightPanel}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.panelScrollContent}>
              <PlayerSettings
                gameMode={viewModel.gameMode}
                category={viewModel.category}
                playerSettings={viewModel.playerSettings}
                onSelectPlayerNumber={viewModel.onSelectPlayerNumber}
                onSelectPlayerGoal={viewModel.onSelectPlayerGoal}
                onChangePlayerName={viewModel.onChangePlayerName}
                onChangePlayerPoint={viewModel.onChangePlayerPoint}
              />
            </ScrollView>
          </View>
        </View>

        <View style={styles.footerButtons}>
          <Button style={styles.buttonCancel} onPress={viewModel.onCancel}>
            <Text style={styles.buttonCancelText}>{i18n.t('txtCancel')}</Text>
          </Button>

          <Button style={styles.buttonStart} onPress={viewModel.onStart}>
            <Text style={styles.buttonStartText}>{i18n.t('txtStart')}</Text>
          </Button>
        </View>
      </View>
    </Container>
  );
};

export default memo(GameSettings);
