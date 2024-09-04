import React, {memo, useMemo} from 'react';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Image from 'components/Image';
import images from 'assets';
import TextInput from 'components/TextInput';
import {
  GAME_PLAY_POINTS_STEPS,
  GAME_PLAY_POINTS_STEPS_SHORT,
} from 'constants/game-play';
import PlayerViewModel, {Props} from './PlayerViewModel';
import styles from './styles';
import i18n from 'i18n';
import {responsiveDimension} from 'utils/helper';
import {dims} from 'configuration';
import {isPoolGame} from 'utils/game';
import colors from 'configuration/colors';
import Ball from 'components/Ball';

const GamePlayer = (props: Props) => {
  const viewModel = PlayerViewModel(props);
  const PAIR_PLAY = props.gameSettings?.players?.playingPlayers?.length === 2;

  const POINT_STEPS = useMemo(() => {
    let STEPS =
      props.gameSettings?.category === 'libre' &&
      props.gameSettings?.mode?.mode === 'fast'
        ? GAME_PLAY_POINTS_STEPS
        : GAME_PLAY_POINTS_STEPS_SHORT;

    return (
      <View direction={'row'}>
        <View
          flex={'1'}
          style={styles.stepsWrapper}
          direction={'row'}
          alignItems={'center'}
          justify={'center'}
          marginLeft={'15'}>
          {Object.keys(STEPS).map((key, index) => {
            return (
              <Button
                key={`game-step-${index}`}
                style={[
                  styles.buttonStep,
                  {
                    paddingVertical: PAIR_PLAY
                      ? responsiveDimension(15)
                      : responsiveDimension(10),
                  },
                ]}
                onPress={viewModel.onPressPointStep.bind(
                  GamePlayer,
                  (STEPS as any)[key],
                )}>
                <Text fontSize={PAIR_PLAY ? 32 : 24}>
                  +{(STEPS as any)[key]}
                </Text>
              </Button>
            );
          })}
        </View>
      </View>
    );
  }, [PAIR_PLAY, props, viewModel.onPressPointStep]);

  const EXTRA_TIME_TURNS = useMemo(() => {
    if (
      !props.gameSettings?.mode?.extraTimeTurns ||
      props.gameSettings?.mode?.extraTimeTurns === 'infinity'
    ) {
      return null;
    }

    if ((props.player.proMode?.extraTimeTurns as number) === 0) {
      return <View marginRight={'15'} style={styles.extraTimeTurnsEmpty} />;
    }

    return (
      <View>
        {Array.from(
          {length: (props.player.proMode?.extraTimeTurns as number) || 0},
          (_, i) => {
            return (
              <View
                key={`extra-time-turns-${i}`}
                style={styles.extraTimeTurnsWrapper}>
                <View style={styles.extraTimeTurns} />
              </View>
            );
          },
        )}
      </View>
    );
  }, [props]);

  const PRO_MODE_VIEW = useMemo(() => {
    return (
      <View direction={'row'}>
        <View
          flex={'1'}
          direction={'row'}
          justify={'between'}
          alignItems={'end'}>
          {props.isOnTurn ? (
            <Button
              style={styles.buttonEndTurn}
              onPress={viewModel.onEndTurn.bind(GamePlayer, undefined)}>
              <Text fontSize={dims.screenWidth * 0.02}>{i18n.t('turn')}</Text>
            </Button>
          ) : (
            <View style={styles.buttonEndTurnEmpty} />
          )}
          <View style={styles.totalPointInTurn} paddingVertical={'10'}>
            <Text fontSize={dims.screenWidth * 0.02} fontWeight={'bold'}>
              {viewModel.totalPointInTurn}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [props.isOnTurn, viewModel.onEndTurn, viewModel.totalPointInTurn]);

  const ADDITIONAL_POINTS = useMemo(() => {
    return (
      <View marginLeft={'15'} marginTop={'10'} justify={'center'}>
        <View flex={'1'} justify={'end'}>
          <Text fontWeight={'bold'} fontSize={dims.screenWidth * 0.01}>
            {'HR'}
          </Text>
          <View flex={'1'}>
            <Text
              fontSize={dims.screenWidth * 0.03}
              lineHeight={dims.screenWidth * 0.0325}
              fontWeight={'bold'}>
              {viewModel.highestRate}
            </Text>
          </View>
        </View>
        <View flex={'1'}>
          <Text fontWeight={'bold'} fontSize={dims.screenWidth * 0.01}>
            {'AVG'}
          </Text>
          <Text
            fontSize={dims.screenWidth * 0.03}
            lineHeight={dims.screenWidth * 0.0325}
            fontWeight={'bold'}>
            {viewModel.averagePoint}
          </Text>
        </View>
      </View>
    );
  }, [viewModel.averagePoint, viewModel.highestRate]);

  const BALLS_VIEW = useMemo(() => {
    return (
      <View
        style={styles.ballsWrapper}
        direction={'row'}
        marginLeft={'15'}
        marginTop={'10'}
        justify={'around'}>
        {props.player.scoredBalls?.map((ball, index) => {
          return (
            <Ball key={`selected-ball-${index}`} data={ball} size={'small'} />
          );
        })}
      </View>
    );
  }, [props]);

  const POOL_MODE_VIEW = useMemo(() => {
    return (
      <View direction={'row'}>
        <View
          flex={'1'}
          direction={'row'}
          justify={'between'}
          alignItems={'end'}>
          {props.isOnTurn ? (
            <Button
              style={styles.buttonEndTurn}
              onPress={viewModel.onEndTurn.bind(GamePlayer, undefined)}>
              <Text fontSize={dims.screenWidth * 0.02}>{i18n.t('turn')}</Text>
            </Button>
          ) : (
            <View style={styles.buttonEndTurnEmpty} />
          )}
          <View
            direction={'row'}
            alignItems={'center'}
            marginRight={'15'}
            marginBottom={'10'}>
            <Button style={styles.buttonViolate} onPress={viewModel.onViolate}>
              <Text color={colors.white} fontWeight={'bold'}>
                {'X'}
              </Text>
            </Button>
            <View marginLeft={'10'}>
              <Text fontSize={32}>{props.player.violate || 0}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }, [
    props.isOnTurn,
    props.player.violate,
    viewModel.onEndTurn,
    viewModel.onViolate,
  ]);

  return (
    <View
      flex={'1'}
      style={[styles.container, {backgroundColor: props.player.color}]}
      marginHorizontal={'20'}>
      <View
        direction={'row'}
        alignItems={'center'}
        paddingHorizontal={'15'}
        marginTop={'10'}>
        <View flex={'1'}>
          <TextInput
            inputStyle={styles.input}
            value={props.player.name}
            onChange={viewModel.onChangeName}
            disabled={!viewModel.nameEditable}
          />
        </View>
        <Button style={styles.buttonEdit} onPress={viewModel.onToggleEditName}>
          <Image source={images.game.edit} style={styles.editIcon} />
        </Button>
      </View>

      <View
        direction={'row'}
        alignItems={'center'}
        marginHorizontal={'20'}
        marginTop={'10'}>
        <Button style={styles.button} onPress={viewModel.onDecreasePoint}>
          <Text fontSize={PAIR_PLAY ? 48 : 24} fontWeight={'bold'}>
            {'-'}
          </Text>
        </Button>
        <View marginHorizontal={'10'} />
        <Button style={styles.button} onPress={viewModel.onIncreasePoint}>
          <Text fontSize={PAIR_PLAY ? 48 : 24} fontWeight={'bold'}>
            {'+'}
          </Text>
        </Button>
      </View>

      <View
        flex={'1'}
        direction={'row'}
        alignItems={'center'}
        justify={'center'}>
        {props.gameSettings?.mode?.mode !== 'fast' &&
        !isPoolGame(props.gameSettings?.category) ? (
          ADDITIONAL_POINTS
        ) : isPoolGame(props.gameSettings?.category) ? (
          BALLS_VIEW
        ) : (
          <View />
        )}
        <View flex={'1'} alignItems={'center'} justify={'center'}>
          <Text fontSize={512} adjustsFontSizeToFit={true}>
            {props.player.totalPoint}
          </Text>
        </View>
        {props.gameSettings?.mode?.mode !== 'fast' ? (
          <View marginRight={'15'}>{EXTRA_TIME_TURNS}</View>
        ) : (
          <View />
        )}
      </View>

      {props.gameSettings?.mode?.mode === 'fast' &&
      !isPoolGame(props.gameSettings?.category)
        ? POINT_STEPS
        : isPoolGame(props.gameSettings?.category)
        ? POOL_MODE_VIEW
        : PRO_MODE_VIEW}
    </View>
  );
};

export default memo(GamePlayer);
