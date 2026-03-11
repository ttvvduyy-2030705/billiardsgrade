import React, {memo, useMemo} from 'react';

import Text from 'components/Text';
import View from 'components/View';
import Button from 'components/Button';
import TextInput from 'components/TextInput';

import {Player, PlayerNumber, PlayerSettings} from 'types/player';
import {
  PLAYER_NUMBER,
  PLAYER_NUMBER_POOL,
  PLAYER_NUMBER_POOL_15,
  PLAYER_POINT_STEPS,
} from 'constants/player';
import {BilliardCategory} from 'types/category';
import {isPool15OnlyGame, isPoolGame} from 'utils/game';
import {GameMode} from 'types/settings';

import styles from './styles';

interface Props {
  gameMode?: GameMode;
  category: BilliardCategory;
  playerSettings: PlayerSettings;
  onSelectPlayerNumber: (playerNumber: PlayerNumber) => void;
  onSelectPlayerGoal: (addedPoint: number, index: number) => void;
  onChangePlayerName: (newName: string, index: number) => void;
  onChangePlayerPoint: (
    addedPoint: number,
    index: number,
    stepIndex: number,
  ) => void;
}

const PlayerSettingsComponent = (props: Props) => {
  const playerNumberSource = useMemo(() => {
    if (
      isPool15OnlyGame(props.category) ||
      (isPoolGame(props.category) && props.gameMode === 'pro')
    ) {
      return PLAYER_NUMBER_POOL_15;
    }

    if (isPoolGame(props.category)) {
      return PLAYER_NUMBER_POOL;
    }

    return PLAYER_NUMBER;
  }, [props.category, props.gameMode]);

  const goalValues = useMemo(
    () => [
      ...props.playerSettings.goal.pointSteps.slice(0, 2),
      props.playerSettings.goal.goal,
      ...props.playerSettings.goal.pointSteps.slice(-2),
    ],
    [props.playerSettings.goal],
  );

  const players = props.playerSettings.playingPlayers || [];
  const playerRows: Player[][] = [];

  for (let i = 0; i < players.length; i += 2) {
    playerRows.push(players.slice(i, i + 2));
  }

  const renderPlayerCard = (player: Player, index: number) => {
    return (
      <View
        key={`player-${index}`}
        style={[styles.playerCard, index === 0 && styles.playerCardPrimary]}>
        <View
          style={[
            styles.playerCardHeader,
            index === 0 && styles.playerCardHeaderPrimary,
          ]}>
          <Text style={styles.playerCardHeaderText}>{`NGƯỜI CHƠI ${
            index + 1
          }`}</Text>
        </View>

        <View style={styles.playerCardBody}>
          <TextInput
            style={styles.playerInput}
            inputStyle={styles.playerInputStyle}
            value={player.name}
            onChange={(value: string) => props.onChangePlayerName(value, index)}
          />

          <View style={styles.stepRow}>
            {Object.keys(PLAYER_POINT_STEPS).map((key, stepIndex) => {
              const stepValue =
                stepIndex === 4
                  ? player.totalPoint
                  : (PLAYER_POINT_STEPS as any)[key];

              return (
                <Button
                  key={`point-${index}-${key}`}
                  onPress={() =>
                    props.onChangePlayerPoint(
                      (PLAYER_POINT_STEPS as any)[key],
                      index,
                      stepIndex,
                    )
                  }
                  style={[
                    styles.stepButton,
                    stepIndex === 4 && styles.stepButtonActive,
                    stepIndex === 0 && styles.stepButtonFirst,
                    stepIndex === Object.keys(PLAYER_POINT_STEPS).length - 1 &&
                      styles.stepButtonLast,
                  ]}>
                  <Text
                    style={[
                      styles.stepButtonText,
                      stepIndex === 4 && styles.stepButtonTextActive,
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

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Người chơi</Text>

        <View style={styles.goalGroup}>
          <Text style={styles.goalLabel}>Điểm</Text>
          <View style={styles.goalButtonsRow}>
            {goalValues.map((step, index) => (
              <Button
                key={`goal-${step}-${index}`}
                style={[
                  styles.goalButton,
                  index === 2 && styles.goalButtonActive,
                ]}
                onPress={() => props.onSelectPlayerGoal(step, index)}>
                <Text
                  style={[
                    styles.goalButtonText,
                    index === 2 && styles.goalButtonTextActive,
                  ]}>
                  {step}
                </Text>
              </Button>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.numberRow}>
        <Text style={styles.numberLabel}>Số người</Text>
        <View style={styles.numberButtonsRow}>
          {Object.keys(playerNumberSource).map(key => {
            const item = (playerNumberSource as any)[key];
            const selected = item === props.playerSettings.playerNumber;

            return (
              <Button
                key={`player-number-${key}`}
                style={[
                  styles.numberButton,
                  selected && styles.numberButtonActive,
                ]}
                onPress={() => props.onSelectPlayerNumber(item)}>
                <Text
                  style={[
                    styles.numberButtonText,
                    selected && styles.numberButtonTextActive,
                  ]}>
                  {item}
                </Text>
              </Button>
            );
          })}
        </View>
      </View>

      <View style={styles.playersWrap}>
        {playerRows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.playerRow}>
            <View style={styles.playerCol}>{renderPlayerCard(row[0], rowIndex * 2)}</View>

            {row[1] ? (
              <View style={[styles.playerCol, styles.playerColSpacing]}>
                {renderPlayerCard(row[1], rowIndex * 2 + 1)}
              </View>
            ) : (
              <View style={[styles.playerCol, styles.playerColSpacing]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export default memo(PlayerSettingsComponent);
