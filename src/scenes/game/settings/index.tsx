import React, {memo, useMemo} from 'react';
import {ScrollView} from 'react-native';
import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Image from 'components/Image';
import TextInput from 'components/TextInput';
import images from 'assets';
import i18n from 'i18n';
import GameSettingsViewModel, {Props} from './SettingsViewModel';
import styles from './styles';

import {CUSHION, LIBRE, POOL} from 'constants/category';
import {
  GAME_COUNT_DOWN_TIME,
  GAME_EXTRA_TIME_BONUS,
  GAME_EXTRA_TIME_TURN,
  GAME_MODE,
  GAME_WARM_UP_TIME,
} from 'constants/game-settings';
import {
  PLAYER_NUMBER,
  PLAYER_NUMBER_POOL,
  PLAYER_NUMBER_POOL_15,
  PLAYER_POINT_STEPS,
} from 'constants/player';
import {isPool15OnlyGame, isPoolGame} from 'utils/game';

const GameSettings = (props: Props) => {
  const viewModel = GameSettingsViewModel(props);

  const playerNumberSource = useMemo(() => {
    return isPool15OnlyGame(viewModel.category) ||
      (isPoolGame(viewModel.category) && viewModel.gameMode === 'pro')
      ? PLAYER_NUMBER_POOL_15
      : isPoolGame(viewModel.category)
      ? PLAYER_NUMBER_POOL
      : PLAYER_NUMBER;
  }, [viewModel.category, viewModel.gameMode]);

  const renderChoiceGroup = (
    title: string,
    data: Object,
    currentItem: string | number | undefined,
    onSelect: (item: any) => void,
    useKey = false,
    compact = false,
  ) => {
    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{title}</Text>

        <View style={[styles.optionWrap, compact && styles.optionWrapCompact]}>
          {Object.keys(data).map(key => {
            const item = (data as any)[key];
            const selected = item === currentItem;

            return (
              <Button
                key={`${title}-${key}`}
                style={[
                  styles.optionButton,
                  compact && styles.optionButtonCompact,
                  selected && styles.optionButtonActive,
                ]}
                onPress={() => onSelect(item)}>
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextActive,
                  ]}>
                  {useKey ? i18n.t(key) : i18n.t(item)}
                </Text>
              </Button>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPlayerNumbers = () => {
    return (
      <View style={styles.playerNumberRow}>
        <Text style={styles.playerNumberLabel}>Số người</Text>

        <View style={styles.playerNumberButtons}>
          {Object.keys(playerNumberSource).map(key => {
            const item = (playerNumberSource as any)[key];
            const selected = viewModel.playerSettings.playerNumber === item;

            return (
              <Button
                key={`player-number-${key}`}
                style={[
                  styles.playerNumberButton,
                  selected && styles.playerNumberButtonActive,
                ]}
                onPress={() => viewModel.onSelectPlayerNumber(item)}>
                <Text
                  style={[
                    styles.playerNumberButtonText,
                    selected && styles.playerNumberButtonTextActive,
                  ]}>
                  {item}
                </Text>
              </Button>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPlayerCard = (player: any, index: number) => {
    return (
      <View key={`player-card-${index}`} style={styles.playerCard}>
        <View style={styles.playerCardHeader}>
          <Text style={styles.playerCardHeaderText}>
            {`NGƯỜI CHƠI ${index + 1}`}
          </Text>
        </View>

        <View style={styles.playerCardBody}>
          <TextInput
            style={styles.playerInput}
            inputStyle={styles.playerInputStyle}
            value={player.name}
            onChange={(value: string) =>
              viewModel.onChangePlayerName(value, index)
            }
          />

          <View style={styles.pointRow}>
            {Object.keys(PLAYER_POINT_STEPS).map((key, stepIndex) => {
              const stepValue =
                stepIndex === 4
                  ? player.totalPoint
                  : (PLAYER_POINT_STEPS as any)[key];

              return (
                <Button
                  key={`player-${index}-point-${key}-${stepIndex}`}
                  style={[
                    styles.pointButton,
                    stepIndex === 4 && styles.pointButtonActive,
                    stepIndex === Object.keys(PLAYER_POINT_STEPS).length - 1 &&
                      styles.pointButtonLast,
                  ]}
                  onPress={() =>
                    viewModel.onChangePlayerPoint(
                      (PLAYER_POINT_STEPS as any)[key],
                      index,
                      stepIndex,
                    )
                  }>
                  <Text
                    style={[
                      styles.pointButtonText,
                      stepIndex === 4 && styles.pointButtonTextActive,
                    ]}>
                    {stepValue}
                  </Text>
                </Button>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderPlayerGrid = () => {
    const players = viewModel.playerSettings.playingPlayers || [];
    const rows = [];

    for (let i = 0; i < players.length; i += 2) {
      rows.push(
        <View key={`player-row-${i}`} style={styles.playerCardsRow}>
          <View style={styles.playerCardCol}>{renderPlayerCard(players[i], i)}</View>

          {players[i + 1] ? (
            <View style={styles.playerCardCol}>
              {renderPlayerCard(players[i + 1], i + 1)}
            </View>
          ) : (
            <View style={styles.playerCardCol} />
          )}
        </View>,
      );
    }

    return rows;
  };

  return (
    <Container style={styles.screen} safeAreaDisabled>
      <View style={styles.frame}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={images.logo} style={styles.logo} resizeMode="contain" />
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
          <View style={styles.leftPanel}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.leftScrollContent}>
              <Text style={styles.panelTitle}>THỂ LOẠI</Text>

              {renderChoiceGroup('Carom', CUSHION, viewModel.category, viewModel.onSelectCategory)}
              {renderChoiceGroup('Libre', LIBRE, viewModel.category, viewModel.onSelectCategory)}
              {renderChoiceGroup('Pool', POOL, viewModel.category, viewModel.onSelectCategory)}
              {renderChoiceGroup('Chế độ', GAME_MODE, viewModel.gameMode, viewModel.onSelectGameMode)}

              {viewModel.extraTimeTurnsEnabled &&
                renderChoiceGroup(
                  'Hiệp phụ',
                  GAME_EXTRA_TIME_TURN,
                  viewModel.gameSettingsMode?.extraTimeTurns,
                  viewModel.onSelectExtraTimeTurns,
                  true,
                  true,
                )}

              {viewModel.countdownEnabled &&
                renderChoiceGroup(
                  'Đếm giây',
                  GAME_COUNT_DOWN_TIME,
                  viewModel.gameSettingsMode?.countdownTime,
                  viewModel.onSelectCountdown,
                  true,
                  true,
                )}

              {viewModel.warmUpEnabled &&
                renderChoiceGroup(
                  'Khởi động',
                  GAME_WARM_UP_TIME,
                  viewModel.gameSettingsMode?.warmUpTime,
                  viewModel.onSelectWarmUp,
                  true,
                  true,
                )}

              {viewModel.extraTimeBonusEnabled &&
                renderChoiceGroup(
                  'Thưởng giờ',
                  GAME_EXTRA_TIME_BONUS,
                  viewModel.gameSettingsMode?.extraTimeBonus || 0,
                  viewModel.onSelectExtraTimeBonus,
                  true,
                  true,
                )}
            </ScrollView>
          </View>

          <View style={styles.rightPanel}>
            <View style={styles.rightPanelTop}>
              <View style={styles.rightPanelHeaderRow}>
                <Text style={styles.panelTitle}>NGƯỜI CHƠI</Text>

                <View style={styles.controlPill}>
                  <Text style={styles.controlPillText}>ĐIỀU KHIỂN</Text>
                </View>
              </View>

              {renderPlayerNumbers()}

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.rightScrollContent}>
                {renderPlayerGrid()}
              </ScrollView>
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
        </View>
      </View>
    </Container>
  );
};

export default memo(GameSettings);