import React, {memo, useCallback, useMemo} from 'react';
import Text from 'components/Text';
import View from 'components/View';
import Button from 'components/Button';
import TextInput from 'components/TextInput';
import i18n from 'i18n';
import {Player, PlayerNumber, PlayerSettings} from 'types/player';
import {
  PLAYER_NUMBER,
  PLAYER_NUMBER_POOL,
  PLAYER_NUMBER_POOL_15,
  PLAYER_POINT_STEPS,
} from 'constants/player';
import {responsiveDimension} from 'utils/helper';
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
    return isPool15OnlyGame(props.category) ||
      (isPoolGame(props.category) && props.gameMode === 'pro')
      ? PLAYER_NUMBER_POOL_15
      : isPoolGame(props.category)
      ? PLAYER_NUMBER_POOL
      : PLAYER_NUMBER;
  }, [props.category, props.gameMode]);

  const renderPlayerNumber = useCallback(() => {
    return (
      <View style={styles.numberRow}>
        <Text style={styles.numberLabel}>Số người</Text>

        <View direction={'row'}>
          {Object.keys(playerNumberSource).map(key => {
            const item = (playerNumberSource as any)[key];
            const selected = props.playerSettings.playerNumber === item;

            return (
              <Button
                key={`player-number-${key}`}
                style={[styles.numberButton, selected && styles.numberButtonActive]}
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
    );
  }, [playerNumberSource, props]);

  const renderPlayerItem = useCallback(
    (player: Player, index: number) => {
      return (
        <View style={styles.playerItem}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerHeaderText}>{`NGƯỜI CHƠI ${index + 1}`}</Text>
          </View>

          <View style={styles.playerBody}>
            <TextInput
              style={styles.input}
              inputStyle={styles.inputStyle}
              value={player.name}
              onChange={(value: string) => props.onChangePlayerName(value, index)}
            />

            <View style={styles.stepWrapper}>
              {Object.keys(PLAYER_POINT_STEPS).map((key, stepIndex) => {
                const pointValue =
                  stepIndex === 4
                    ? player.totalPoint
                    : (PLAYER_POINT_STEPS as any)[key];

                const onPress = () =>
                  props.onChangePlayerPoint(
                    (PLAYER_POINT_STEPS as any)[key],
                    index,
                    stepIndex,
                  );

                return (
                  <Button
                    key={`${player.name}-${key}-${stepIndex}`}
                    style={[
                      styles.stepItem,
                      stepIndex === 4 && styles.activePlayerPoint,
                    ]}
                    onPress={onPress}>
                    <Text
                      style={[
                        styles.stepText,
                        stepIndex === 4 && styles.stepTextActive,
                      ]}>
                      {pointValue}
                    </Text>
                  </Button>
                );
              })}
            </View>
          </View>
        </View>
      );
    },
    [props],
  );

  const renderRows = useCallback(() => {
    const players = props.playerSettings.playingPlayers;
    const rows: JSX.Element[] = [];

    for (let i = 0; i < players.length; i += 2) {
      rows.push(
        <View
          key={`row-${i}`}
          direction={'row'}
          alignItems={'stretch'}
          style={styles.playerRow}>
          <View flex={'1'}>{renderPlayerItem(players[i], i)}</View>

          {players[i + 1] ? (
            <>
              <View style={{width: responsiveDimension(18)}} />
              <View flex={'1'}>{renderPlayerItem(players[i + 1], i + 1)}</View>
            </>
          ) : (
            <>
              <View style={{width: responsiveDimension(18)}} />
              <View flex={'1'} />
            </>
          )}
        </View>,
      );
    }

    return rows;
  }, [props.playerSettings.playingPlayers, renderPlayerItem]);

  return (
    <View>
      <View style={styles.topHeader}>
        <Text style={styles.screenTitle}>NGƯỜI CHƠI</Text>

        <View style={styles.controlPill}>
          <Text style={styles.controlPillText}>ĐIỀU KHIỂN</Text>
        </View>
      </View>

      {renderPlayerNumber()}

      <View style={styles.playersWrap}>{renderRows()}</View>
    </View>
  );
};

export default memo(PlayerSettingsComponent);