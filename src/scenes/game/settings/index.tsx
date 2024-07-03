import React, {memo} from 'react';
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
      <View flex={'1'} direction={'row'} style={styles.container}>
        <View flex={'1'} padding={'20'} style={styles.wrapper}>
          <CategorySettings
            category={viewModel.category}
            gameMode={viewModel.gameMode}
            gameSettingsMode={viewModel.gameSettingsMode}
            extraTimeTurnsEnabled={viewModel.extraTimeTurnsEnabled}
            countdownEnabled={viewModel.countdownEnabled}
            warmUpEnabled={viewModel.warmUpEnabled}
            onSelectCategory={viewModel.onSelectCategory}
            onSelectGameMode={viewModel.onSelectGameMode}
            onSelectExtraTimeTurns={viewModel.onSelectExtraTimeTurns}
            onSelectCountdown={viewModel.onSelectCountdown}
            onSelectWarmUp={viewModel.onSelectWarmUp}
          />
        </View>
        <View flex={'1'} padding={'20'} style={styles.wrapper}>
          <PlayerSettings
            playerSettings={viewModel.playerSettings}
            onSelectPlayerNumber={viewModel.onSelectPlayerNumber}
            onSelectPlayerGoal={viewModel.onSelectPlayerGoal}
            onChangePlayerName={viewModel.onChangePlayerName}
            onChangePlayerPoint={viewModel.onChangePlayerPoint}
          />
        </View>
      </View>
      <View
        direction={'row'}
        alignItems={'center'}
        justify={'end'}
        padding={'20'}>
        <Button style={styles.buttonCancel} onPress={viewModel.onCancel}>
          <Text textDecorationLine={'underline'}>{i18n.t('txtCancel')}</Text>
        </Button>
        <Button style={styles.buttonStart} onPress={viewModel.onStart}>
          <Text fontWeight={'bold'} letterSpacing={1.5}>
            {i18n.t('txtStart')}
          </Text>
        </Button>
      </View>
    </Container>
  );
};

export default memo(GameSettings);
