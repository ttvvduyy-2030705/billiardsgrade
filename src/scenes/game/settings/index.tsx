import React, {memo, useMemo} from 'react';
import {
  ScrollView,
  TextInput as RNTextInput,
  Text as RNText,
  View as RNView,
} from 'react-native';

import Container from 'components/Container';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
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

const HistoryIcon = () => <RNText style={styles.headerActionIcon}>↺</RNText>;
const ControlIcon = () => <RNText style={styles.controlIcon}>☷</RNText>;
const PlayIcon = () => <RNText style={styles.startIcon}>▶</RNText>;

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
      <RNView style={styles.optionSection}>
        <Text style={styles.sectionLabel}>{title}</Text>

        <RNView
          style={[
            styles.choiceGroup,
            compact && styles.choiceGroupCompact,
          ]}>
          {Object.keys(data).map((key, index) => {
            const item = (data as any)[key];
            const selected = item === currentItem;
            const label = useKey ? i18n.t(key) : i18n.t(item);

            return (
              <Button
                key={`${title}-${key}-${index}`}
                style={[
                  styles.choiceButton,
                  compact && styles.choiceButtonCompact,
                  selected && styles.choiceButtonSelected,
                ]}
                onPress={() => onSelect(item)}>
                <Text
                  style={[
                    styles.choiceButtonText,
                    compact && styles.choiceButtonTextCompact,
                    selected && styles.choiceButtonTextSelected,
                  ]}>
                  {label}
                </Text>
              </Button>
            );
          })}
        </RNView>
      </RNView>
    );
  };

  const renderPlayerNumbers = () => {
    return (
      <RNView style={styles.playerNumberRow}>
        <Text style={styles.playerCountLabel}>Số người</Text>

        <RNView style={styles.playerCountButtons}>
          {Object.keys(playerNumberSource).map((key, index) => {
            const item = (playerNumberSource as any)[key];
            const selected = viewModel.playerSettings.playerNumber === item;

            return (
              <Button
                key={`player-number-${key}-${index}`}
                style={[
                  styles.playerCountButton,
                  selected && styles.playerCountButtonSelected,
                ]}
                onPress={() => viewModel.onSelectPlayerNumber(item)}>
                <Text
                  style={[
                    styles.playerCountButtonText,
                    selected && styles.playerCountButtonTextSelected,
                  ]}>
                  {item}
                </Text>
              </Button>
            );
          })}
        </RNView>
      </RNView>
    );
  };

  const renderPlayerCard = (player: any, index: number) => {
    const isPrimary = index === 0;

    return (
      <RNView
        key={`player-card-${index}`}
        style={[
          styles.playerCard,
          isPrimary ? styles.playerCardPrimary : styles.playerCardSecondary,
        ]}>
        <RNView
          style={[
            styles.playerCardHeader,
            isPrimary
              ? styles.playerCardHeaderPrimary
              : styles.playerCardHeaderSecondary,
          ]}>
          <Text style={styles.playerCardTitle}>{`NGƯỜI CHƠI ${index + 1}`}</Text>
        </RNView>

        <RNView style={styles.playerCardBody}>
          <RNText style={styles.playerNameCaption}>N</RNText>

          <RNTextInput
            value={player?.name || ''}
            placeholder=""
            placeholderTextColor="#7d7d86"
            onChangeText={value => viewModel.onChangePlayerName(value, index)}
            style={styles.playerNameInput}
          />

          <RNView style={styles.pointRow}>
            {Object.keys(PLAYER_POINT_STEPS).map((key, stepIndex) => {
              const stepValue =
                stepIndex === 4
                  ? player?.totalPoint ?? 0
                  : (PLAYER_POINT_STEPS as any)[key];

              const isCenter = stepIndex === 4;

              return (
                <Button
                  key={`point-${index}-${key}-${stepIndex}`}
                  style={[
                    styles.pointButton,
                    isCenter && styles.pointButtonCenter,
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
                      isCenter && styles.pointButtonTextCenter,
                    ]}>
                    {stepValue}
                  </Text>
                </Button>
              );
            })}
          </RNView>
        </RNView>
      </RNView>
    );
  };

  const renderPlayerGrid = () => {
    const players = viewModel.playerSettings.playingPlayers || [];

    return (
      <RNView style={styles.playerGrid}>
        {players.map((player, index) => (
          <RNView
            key={`player-wrap-${index}`}
            style={[
              styles.playerGridItem,
              players.length === 1 && styles.playerGridItemSingle,
            ]}>
            {renderPlayerCard(player, index)}
          </RNView>
        ))}
      </RNView>
    );
  };

  return (
    <Container>
      <ScrollView
  style={styles.scroll}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
  scrollEnabled={false}>
        <RNView style={styles.screen}>
          <RNView style={styles.shell}>
            <RNView style={styles.header}>
              <RNView style={styles.brandWrap}>
                <RNText style={styles.brandMain}>APlus</RNText>
                <RNText style={styles.brandSub}>BILLIARDS</RNText>
              </RNView>

              <RNView style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>CÀI ĐẶT TRẬN ĐẤU</Text>
                <RNView style={styles.headerUnderline} />
              </RNView>

              <Button style={styles.headerActionButton}>
                <HistoryIcon />
                <Text style={styles.headerActionText}>Lịch sử</Text>
              </Button>
            </RNView>

            <RNView style={styles.topDivider} />

            <RNView style={styles.mainContent}>
              <RNView style={styles.leftPanel}>
                <Text style={styles.panelTitle}>THỂ LOẠI</Text>

                <RNView style={styles.segmentRow}>
                  <Button
                    style={[
                      styles.segmentButton,
                      viewModel.category !== '3-cushion' &&
                        styles.segmentButtonMuted,
                    ]}>
                    <Text style={styles.segmentButtonText}>1 băng</Text>
                  </Button>

                  <Button style={[styles.segmentButton, styles.segmentButtonActive]}>
                    <Text style={[styles.segmentButtonText, styles.segmentButtonTextActive]}>
                      3 băng
                    </Text>
                  </Button>
                </RNView>

                {renderChoiceGroup(
                  'Carom',
                  CUSHION,
                  viewModel.category,
                  viewModel.onSelectCategory,
                )}

                {renderChoiceGroup(
                  'Libre',
                  LIBRE,
                  viewModel.category,
                  viewModel.onSelectCategory,
                )}

                {renderChoiceGroup(
                  'POOL',
                  POOL,
                  viewModel.category,
                  viewModel.onSelectCategory,
                )}

                {renderChoiceGroup(
                  'CHẾ ĐỘ',
                  GAME_MODE,
                  viewModel.gameMode,
                  viewModel.onSelectGameMode,
                )}

                {viewModel.extraTimeTurnsEnabled &&
  renderChoiceGroup(
    'HIỆP PHỤ',
    GAME_EXTRA_TIME_TURN,
    viewModel.gameSettingsMode?.extraTimeTurns,
    viewModel.onSelectExtraTimeTurns,
    true,
    true,
  )}

{viewModel.countdownEnabled &&
  renderChoiceGroup(
    'ĐẾM GIÂY',
    GAME_COUNT_DOWN_TIME,
    viewModel.gameSettingsMode?.countdownTime,
    viewModel.onSelectCountdown,
    true,
    true,
  )}

{viewModel.warmUpEnabled &&
  renderChoiceGroup(
    'KHỞI ĐỘNG',
    GAME_WARM_UP_TIME,
    viewModel.gameSettingsMode?.warmUpTime,
    viewModel.onSelectWarmUp,
    true,
    true,
  )}

{viewModel.extraTimeBonusEnabled &&
  renderChoiceGroup(
    'THƯỞNG GIỜ',
    GAME_EXTRA_TIME_BONUS,
    viewModel.gameSettingsMode?.extraTimeBonus || 0,
    viewModel.onSelectExtraTimeBonus,
    true,
    true,
  )}
              </RNView>

              <RNView style={styles.rightPanel}>
                <RNView style={styles.rightPanelHeader}>
                  <Text style={styles.panelTitle}>NGƯỜI CHƠI</Text>

                  <Button style={styles.controlButton}>
                    <ControlIcon />
                    <Text style={styles.controlButtonText}>ĐIỀU KHIỂN</Text>
                  </Button>
                </RNView>

                {renderPlayerNumbers()}

                <RNView style={styles.playersArea}>{renderPlayerGrid()}</RNView>

                <RNView style={styles.footerActions}>
                  <Button style={styles.cancelButton} onPress={viewModel.onCancel}>
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </Button>

                  <Button style={styles.startButton} onPress={viewModel.onStart}>
                    <PlayIcon />
                    <Text style={styles.startButtonText}>Bắt đầu trận</Text>
                  </Button>
                </RNView>
              </RNView>
            </RNView>
          </RNView>
        </RNView>
      </ScrollView>
    </Container>
  );
};

export default memo(GameSettings);