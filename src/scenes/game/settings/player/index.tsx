import React, {memo, useCallback} from 'react';
import Text from 'components/Text';
import View from 'components/View';
import i18n from 'i18n';
import Button from 'components/Button';
import {Player, PlayerNumber, PlayerSettings} from 'types/player';
import {PLAYER_NUMBER, PLAYER_POINT_STEPS} from 'constants/player';
import styles from './styles';
import TextInput from 'components/TextInput';

interface Props {
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
  const renderPlayerNumber = useCallback(() => {
    return (
      <View direction={'row'} alignItems={'center'} marginTop={'20'}>
        <View marginRight={'15'}>
          <Text letterSpacing={1.2}>{i18n.t('playerNumber')}</Text>
        </View>
        <View direction={'row'} alignItems={'center'}>
          {Object.keys(PLAYER_NUMBER).map(key => {
            const item = (PLAYER_NUMBER as any)[key];

            return (
              <Button
                key={`${i18n.t('playerNumber')}-${key}`}
                style={
                  item === props.playerSettings.playerNumber
                    ? [styles.button, styles.active]
                    : styles.button
                }
                onPress={props.onSelectPlayerNumber.bind(
                  PlayerSettingsComponent,
                  item,
                )}>
                <Text fontSize={20}>{(PLAYER_NUMBER as any)[key]}</Text>
              </Button>
            );
          })}
        </View>
      </View>
    );
  }, [props]);

  const renderPlayGoal = useCallback(() => {
    return (
      <View direction={'row'} alignItems={'center'} marginTop={'20'}>
        <View marginRight={'15'}>
          <Text letterSpacing={1.2}>{i18n.t('goal')}</Text>
        </View>
        <View direction={'row'} alignItems={'center'}>
          {[
            ...props.playerSettings.goal.pointSteps.slice(0, 2),
            props.playerSettings.goal.goal,
            ...props.playerSettings.goal.pointSteps.slice(-2),
          ].map((step, index) => {
            return (
              <Button
                key={`goal-${step}`}
                style={
                  index === 2 ? [styles.button, styles.active] : styles.button
                }
                onPress={props.onSelectPlayerGoal.bind(
                  PlayerSettingsComponent,
                  step,
                  index,
                )}>
                <Text fontSize={20}>{step}</Text>
              </Button>
            );
          })}
        </View>
      </View>
    );
  }, [props]);

  const renderPlayerItem = useCallback(
    (player: Player, index: number) => {
      return (
        <View style={styles.playerItem} padding={'15'}>
          <View direction={'row'} alignItems={'center'}>
            <View style={styles.avatar} marginRight={'15'}>
              <Text>{player.name[0]}</Text>
            </View>
            <View flex={'1'}>
              <TextInput
                style={styles.input}
                value={player.name}
                onChange={(value: string) =>
                  props.onChangePlayerName(value, index)
                }
              />
            </View>
          </View>
          <View direction={'row'}>
            <View
              flex={'1'}
              direction={'row'}
              alignItems={'center'}
              marginTop={'15'}
              style={styles.stepWrapper}>
              {Object.keys(PLAYER_POINT_STEPS).map((key, stepIndex) => {
                return (
                  <Button
                    key={`point-step-${key}`}
                    onPress={props.onChangePlayerPoint.bind(
                      PlayerSettingsComponent,
                      (PLAYER_POINT_STEPS as any)[key],
                      index,
                      stepIndex,
                    )}
                    style={
                      stepIndex === 4
                        ? [styles.stepItem, styles.active]
                        : styles.stepItem
                    }>
                    <Text fontSize={18}>
                      {stepIndex === 4
                        ? player.totalPoint
                        : (PLAYER_POINT_STEPS as any)[key]}
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

  const renderPlayers = useCallback(() => {
    return (
      <View marginTop={'20'} paddingTop={'20'}>
        <View direction={'row'} alignItems={'center'} marginBottom={'10'}>
          <View flex={'1'}>
            {renderPlayerItem(props.playerSettings.playingPlayers[0], 0)}
          </View>
          <View marginHorizontal={'15'} />
          <View flex={'1'}>
            {renderPlayerItem(props.playerSettings.playingPlayers[1], 1)}
          </View>
        </View>
        <View
          direction={'row'}
          alignItems={'center'}
          marginTop={'20'}
          marginBottom={'10'}>
          {props.playerSettings.playingPlayers[2] && (
            <View flex={'1'}>
              {renderPlayerItem(props.playerSettings.playingPlayers[2], 2)}
            </View>
          )}
          <View marginHorizontal={'15'} />
          {props.playerSettings.playingPlayers[3] ? (
            <View flex={'1'}>
              {renderPlayerItem(props.playerSettings.playingPlayers[3], 3)}
            </View>
          ) : (
            <View flex={'1'} />
          )}
        </View>
        <View direction={'row'} alignItems={'center'} marginTop={'20'}>
          {props.playerSettings.playingPlayers[4] && (
            <View flex={'1'}>
              {renderPlayerItem(props.playerSettings.playingPlayers[4], 4)}
            </View>
          )}
          <View marginHorizontal={'15'} />
          <View flex={'1'} />
        </View>
      </View>
    );
  }, [props, renderPlayerItem]);

  return (
    <View flex={'1'}>
      <Text fontSize={24} fontWeight={'bold'} letterSpacing={1.2}>
        {i18n.t('player')}
      </Text>
      <View direction={'row'}>
        <View
          flex={'1'}
          direction={'row'}
          alignItems={'center'}
          justify={'between'}>
          {renderPlayerNumber()}
          {renderPlayGoal()}
        </View>
      </View>
      <View>{renderPlayers()}</View>
    </View>
  );
};

export default memo(PlayerSettingsComponent);
