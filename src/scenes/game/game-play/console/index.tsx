import React, {memo, useMemo} from 'react';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Image from 'components/Image';
import Switch from 'components/Switch';
import images from 'assets';
import i18n from 'i18n';
import ConsoleViewModel, {Props} from './ConsoleViewModel';
import styles from './styles';
import colors from 'configuration/colors';
import Webcam from './webcam';
import {dims} from 'configuration';
import Ball from 'components/Ball';
import {isPool15Game, isPool15OnlyGame, isPoolGame} from 'utils/game';
import {ScrollView} from 'react-native';
import {BALLS_15} from 'constants/balls';

const GameConsole = (props: Props) => {
  const viewModel = ConsoleViewModel(props);

  const GAME_INFO = useMemo(() => {
    if (props.totalPlayers === 5 && props.currentMode.mode === 'fast') {
      return <View />;
    }

    if (props.currentMode.mode === 'fast') {
      return <View flex={'1'} />;
    }

    return (
      <View marginTop={'15'}>
        <View direction={'row'} alignItems={'center'}>
          <View flex={'1'} alignItems={'center'} justify={'center'}>
            <Text>{i18n.t('totalTurns')}</Text>
            <Text
              fontSize={dims.screenWidth * 0.05}
              color={colors.grayBlue}
              fontWeight={'bold'}>
              {props.totalTurns}
            </Text>
          </View>
          <View flex={'1'} alignItems={'center'} justify={'center'}>
            <Text>{i18n.t('goal')}</Text>
            <Text
              fontSize={dims.screenWidth * 0.05}
              color={colors.grayBlue}
              fontWeight={'bold'}>
              {props.goal}
            </Text>
          </View>
        </View>
        <View
          direction={'row'}
          marginHorizontal={'20'}
          marginTop={'20'}
          marginBottom={'15'}>
          <Button
            onPress={viewModel.onPressGiveMoreTime}
            style={styles.buttonGiveMoreTime}>
            <Text color={colors.white} fontSize={16}>
              {i18n.t('giveMoreTime')}
            </Text>
          </Button>
        </View>
      </View>
    );
  }, [props, viewModel.onPressGiveMoreTime]);

  const BALLS_VIEW = useMemo(() => {
    if (props.winner) {
      return (
        <View
          flex={'1'}
          marginBottom={'15'}
          style={styles.ballPool15OnlyWrapper}>
          <View flex={'1'} />
          <View direction={'row'}>
            <View flex={'1'} alignItems={'center'} justify={'center'}>
              <Text fontSize={24}>
                {i18n.t('msgPool15OnlyWinner', {
                  name: props.winner.name,
                })}
              </Text>
            </View>
          </View>
          <View
            flex={'1'}
            direction={'row'}
            justify={'center'}
            alignItems={'end'}
            marginBottom={'15'}>
            <View flex={'1'} alignItems={'center'}>
              <Button
                style={styles.buttonRestart}
                onPress={viewModel.onRestart}>
                <Text>{i18n.t('restart')}</Text>
              </Button>
            </View>
          </View>
        </View>
      );
    }

    if (isPool15OnlyGame(props.gameSettings.category)) {
      return (
        <View
          flex={'1'}
          marginBottom={'15'}
          style={styles.ballPool15OnlyWrapper}>
          <View flex={'1'} />

          <View flex={'1'} direction={'row'} alignItems={'center'}>
            <View flex={'1'}>
              <View
                paddingRight={'10'}
                paddingVertical={'10'}
                style={[
                  styles.ballsLeft,
                  {
                    backgroundColor: viewModel.colorLeft,
                    paddingLeft: `${viewModel.pool15OnlyPointLeft * 2.8}%`,
                  },
                ]}>
                <View direction={'row'} alignItems={'center'}>
                  <View marginRight={'10'}>
                    <Text fontSize={56}>{viewModel.pool15OnlyPointLeft}</Text>
                  </View>
                  <Ball
                    data={viewModel.ballLeft}
                    onPress={viewModel.onSelectBall}
                  />
                  <View direction={'row'} alignItems={'center'}>
                    <Image
                      source={images.doubleArrow}
                      style={[
                        styles.doubleArrowLeft,
                        {tintColor: viewModel.arrowColorLeft},
                      ]}
                      resizeMode={'contain'}
                    />
                  </View>
                </View>
              </View>
            </View>
            <View>
              <Ball data={BALLS_15[7]} onPress={viewModel.onSelectBall} />
            </View>
            <View flex={'1'} alignItems={'end'}>
              <View
                paddingVertical={'10'}
                paddingLeft={'10'}
                style={[
                  styles.ballsRight,
                  {
                    backgroundColor: viewModel.colorRight,
                    paddingRight: `${viewModel.pool15OnlyPointRight * 2.8}%`,
                  },
                ]}>
                <View direction={'row'} alignItems={'center'}>
                  <View direction={'row'} alignItems={'center'}>
                    <Image
                      source={images.doubleArrow}
                      style={[
                        styles.doubleArrowRight,
                        {tintColor: viewModel.arrowColorRight},
                      ]}
                      resizeMode={'contain'}
                    />
                  </View>
                  <Ball
                    data={viewModel.ballRight}
                    onPress={viewModel.onSelectBall}
                  />
                  <View marginLeft={'10'}>
                    <Text fontSize={56}>{viewModel.pool15OnlyPointRight}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View flex={'1'} />
        </View>
      );
    }

    if (isPool15Game(props.gameSettings.category)) {
      if (viewModel.balls.length === 0) {
        return (
          <View
            flex={'1'}
            direction={'row'}
            justify={'center'}
            alignItems={'end'}
            marginBottom={'15'}>
            <View flex={'1'} alignItems={'center'}>
              <Button
                style={styles.buttonRestart}
                onPress={viewModel.onRestart}>
                <Text>{i18n.t('restart')}</Text>
              </Button>
            </View>
          </View>
        );
      }

      return (
        <ScrollView
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}>
          <View
            style={styles.ballsWrapper}
            direction={'row'}
            alignItems={'center'}
            marginRight={'15'}>
            {viewModel.balls.map((ball, index) => {
              return (
                <View key={`ball-${index}`} marginTop={'15'}>
                  <Ball data={ball} onPress={viewModel.onSelectBall} />
                </View>
              );
            })}
          </View>
        </ScrollView>
      );
    }

    if (props.gameSettings.mode.mode === 'pro') {
      return (
        <View flex={'1'} justify={'center'}>
          <View
            direction={'row'}
            marginHorizontal={'20'}
            marginTop={'20'}
            marginBottom={'15'}>
            <Button
              onPress={viewModel.onPressGiveMoreTime}
              style={styles.buttonGiveMoreTime}>
              <Text color={colors.white} fontSize={16}>
                {i18n.t('giveMoreTime')}
              </Text>
            </Button>
          </View>
        </View>
      );
    }

    return <View />;
  }, [
    props.winner,
    props.gameSettings.mode,
    props.gameSettings.category,
    viewModel.balls,
    viewModel.pool15OnlyPointLeft,
    viewModel.ballLeft,
    viewModel.onSelectBall,
    viewModel.pool15OnlyPointRight,
    viewModel.ballRight,
    viewModel.colorLeft,
    viewModel.colorRight,
    viewModel.arrowColorLeft,
    viewModel.arrowColorRight,
    viewModel.onRestart,
    viewModel.onPressGiveMoreTime,
  ]);

  return (
    <View flex={'1'} style={styles.marginTop}>
      <View style={styles.container} flex={'1'} direction={'row'}>
        <View flex={'1'}>
          <View
            direction={'row'}
            alignItems={'center'}
            marginHorizontal={'15'}
            marginTop={'15'}>
            <View flex={'1'} justify={'center'}>
              <Button onPress={props.onToggleSound} style={styles.buttonSound}>
                {props.soundEnabled ? (
                  <Image
                    key={'sound-on'}
                    source={images.game.soundOn}
                    style={styles.icon}
                  />
                ) : (
                  <Image
                    key={'sound-off'}
                    source={images.game.soundOff}
                    style={styles.icon}
                  />
                )}
              </Button>
            </View>
            <View flex={'1'} alignItems={'center'} justify={'center'}>
              <Text fontSize={16}>{viewModel.buildGameModeTitle()}</Text>
              <View marginTop={'10'}>
                <Text fontSize={32} fontWeight={'bold'} color={colors.primary}>
                  {viewModel.displayTotalTime()}
                </Text>
              </View>
            </View>
            <View flex={'1'} alignItems={'end'} justify={'center'}>
              <View direction={'row'} alignItems={'center'}>
                <View marginRight={'10'}>
                  <Text>{i18n.t('remote')}</Text>
                </View>
                <Switch
                  defaultValue={viewModel.remoteEnabled}
                  onChange={viewModel.onToggleRemote}
                />
              </View>
              <View direction={'row'} alignItems={'center'} marginTop={'10'}>
                <View marginRight={'10'}>
                  <Text>{i18n.t('proMode')}</Text>
                </View>
                <Switch
                  defaultValue={viewModel.proModeEnabled}
                  onChange={viewModel.onToggleProMode}
                />
              </View>
            </View>
          </View>

          <View
            direction={'row'}
            alignItems={'center'}
            marginTop={'20'}
            marginHorizontal={'15'}>
            <View
              flex={'1'}
              direction={'row'}
              justify={'center'}
              alignItems={'center'}>
              {typeof props.warmUpCount === 'number' &&
              props.warmUpCount > 0 ? (
                <Button
                  style={[styles.button, styles.pauseButton]}
                  onPress={viewModel.onWarmUp}>
                  <Text fontWeight={'bold'} letterSpacing={1.2}>
                    {i18n.t('warmUp')} {`(${props.warmUpCount})`}
                  </Text>
                </Button>
              ) : !props.isStarted ? (
                <Button
                  style={[styles.button, styles.pauseButton]}
                  onPress={viewModel.onStart}>
                  <Text fontWeight={'bold'} letterSpacing={1.2}>
                    {i18n.t('start')}
                  </Text>
                </Button>
              ) : (
                <Button
                  style={[styles.button, styles.pauseButton]}
                  onPress={viewModel.onPause}>
                  <Text fontWeight={'bold'} letterSpacing={1.2}>
                    {i18n.t(props.isPaused ? 'resume' : 'pause')}
                  </Text>
                </Button>
              )}
            </View>
            <View marginHorizontal={'10'} />
            <View
              flex={'1'}
              direction={'row'}
              justify={'center'}
              alignItems={'center'}>
              <Button
                style={[styles.button, styles.stopButton]}
                onPress={viewModel.onStop}>
                <Text fontWeight={'bold'} letterSpacing={1.2}>
                  {i18n.t('stop')}
                </Text>
              </Button>
            </View>
          </View>

          {props.totalPlayers < 5 || props.currentMode.mode === 'fast' ? (
            <Webcam />
          ) : (
            <View />
          )}

          {isPoolGame(props.gameSettings.category) ? BALLS_VIEW : GAME_INFO}

          {props.totalPlayers === 5 ? (
            <View flex={'1'} direction={'row'}>
              {props.renderLastPlayer()}
            </View>
          ) : (
            <View />
          )}

          {props.totalPlayers === 2 &&
          (props.currentMode.mode === 'fast' || !props.isStarted) ? (
            <View
              direction={'row'}
              alignItems={'center'}
              marginHorizontal={'15'}
              marginBottom={'15'}>
              <View
                flex={'1'}
                direction={'row'}
                justify={'center'}
                alignItems={'center'}>
                <Button style={styles.button} onPress={viewModel.onSwitchTurn}>
                  <Text>{i18n.t('switchTurn')}</Text>
                </Button>
              </View>
              <View marginHorizontal={'10'} />
              {!isPoolGame(props.gameSettings.category) ? (
                <View
                  flex={'1'}
                  direction={'row'}
                  justify={'center'}
                  alignItems={'center'}>
                  <Button
                    style={styles.button}
                    onPress={viewModel.onSwapPlayers}>
                    <Text>{i18n.t('switchPlayer')}</Text>
                  </Button>
                </View>
              ) : (
                <View />
              )}
            </View>
          ) : (
            <View />
          )}
        </View>
      </View>
    </View>
  );
};

export default memo(GameConsole);
