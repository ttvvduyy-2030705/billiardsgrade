import React, {memo} from 'react';
import {ScrollView} from 'react-native';
import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Image from 'components/Image';
import images from 'assets';
import GameSettingsViewModel, {Props} from './SettingsViewModel';
import CategorySettings from './category';
import PlayerSettings from './player';
import styles from './styles';

const GameSettings = (props: Props) => {
  const viewModel = GameSettingsViewModel(props);

  return (
    <Container style={styles.screen} safeAreaDisabled>
      <View style={styles.frame}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={images.logo}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.title}>CÀI ĐẶT TRẬN ĐẤU</Text>
            <View style={styles.titleUnderline} />
          </View>

          <View style={styles.headerRight}>
            <View style={styles.historyButton}>
              <Text style={styles.historyText}>Lịch sử</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentRow}>
          <View style={styles.wrapperLeft}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
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

          <View style={styles.wrapperRight}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
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
            <Text style={styles.buttonCancelText}>Hủy</Text>
          </Button>

          <Button style={styles.buttonStart} onPress={viewModel.onStart}>
            <Text style={styles.buttonStartText}>Bắt đầu trận</Text>
          </Button>
        </View>
      </View>
    </Container>
  );
};

export default memo(GameSettings);