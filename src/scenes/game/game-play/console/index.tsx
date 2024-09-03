import React, {memo} from 'react';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Image from 'components/Image';
import Switch from 'components/Switch';
import images from 'assets';
import i18n from 'i18n';
import ConsoleViewModel, {Props} from './ConsoleViewModel';
import colors from 'configuration/colors';
import {isPoolGame} from 'utils/game';
import ButtonsConsole from './buttons';
import GameInfo from './game-info';
import Webcam from './webcam';
import styles from './styles';
import BallsView from './balls-view';

const GameConsole = (props: Props) => {
  const viewModel = ConsoleViewModel(props);

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
              {!isPoolGame(props.gameSettings.category) ? (
                <View direction={'row'} alignItems={'center'} marginTop={'10'}>
                  <View marginRight={'10'}>
                    <Text>{i18n.t('proMode')}</Text>
                  </View>
                  <Switch
                    defaultValue={viewModel.proModeEnabled}
                    onChange={viewModel.onToggleProMode}
                  />
                </View>
              ) : (
                <View />
              )}
            </View>
          </View>

          <ButtonsConsole
            isStarted={props.isStarted}
            isPaused={props.isPaused}
            warmUpCount={props.warmUpCount}
            poolBreakEnabled={props.poolBreakEnabled}
            onPoolBreak={props.onPoolBreak}
            onWarmUp={viewModel.onWarmUp}
            onStart={viewModel.onStart}
            onPause={viewModel.onPause}
            onStop={viewModel.onStop}
          />

          {props.totalPlayers < 5 || props.currentMode.mode === 'fast' ? (
            <Webcam />
          ) : (
            <View />
          )}

          {props.totalPlayers === 2 &&
          (props.currentMode.mode === 'fast' || !props.isStarted) ? (
            <View
              direction={'row'}
              justify={'end'}
              alignItems={'center'}
              marginHorizontal={'15'}
              marginTop={'15'}>
              {!isPoolGame(props.gameSettings.category) ? (
                <View
                  flex={'1'}
                  direction={'row'}
                  justify={'center'}
                  alignItems={'center'}>
                  <Button
                    style={styles.button}
                    onPress={viewModel.onSwitchTurn}>
                    <Text>{i18n.t('switchTurn')}</Text>
                  </Button>
                </View>
              ) : (
                <View />
              )}
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

          {isPoolGame(props.gameSettings.category) ? (
            <BallsView
              isStarted={props.isStarted}
              winner={props.winner}
              gameSettings={props.gameSettings}
              balls={viewModel.balls}
              ballLeft={viewModel.ballLeft}
              ballRight={viewModel.ballRight}
              colorLeft={viewModel.colorLeft}
              colorRight={viewModel.colorRight}
              arrowColorLeft={viewModel.arrowColorLeft}
              arrowColorRight={viewModel.arrowColorRight}
              pool15OnlyPointLeft={viewModel.pool15OnlyPointLeft}
              pool15OnlyPointRight={viewModel.pool15OnlyPointRight}
              poolBreakEnabled={props.poolBreakEnabled}
              onPoolBreak={props.onPoolBreak}
              onSelectBall={viewModel.onSelectBall}
              onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
              onRestart={viewModel.onRestart}
              onResetTurn={props.onResetTurn}
            />
          ) : (
            <GameInfo
              goal={props.goal}
              totalTurns={props.totalTurns}
              totalPlayers={props.totalPlayers}
              currentMode={props.currentMode}
              onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
              onResetTurn={props.onResetTurn}
            />
          )}

          {props.totalPlayers === 5 ? (
            <View flex={'1'} direction={'row'}>
              {props.renderLastPlayer()}
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
