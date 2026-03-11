import React, { memo, RefObject } from 'react';
import View from 'components/View';
import Text from 'components/Text';
import Button from 'components/Button';
import Image from 'components/Image';
import Switch from 'components/Switch';
import images from 'assets';
import i18n from 'i18n';
import ConsoleViewModel, { ConsoleViewModelProps } from './ConsoleViewModel';
import colors from 'configuration/colors';
import { isCaromGame, isPoolGame } from 'utils/game';
import ButtonsConsole from './buttons';
import GameInfo from './game-info';
import Webcam from './webcam';
import styles from './styles';
import BallsView from './balls-view';
import CaromInfo from './carom-info';

const GameConsole = (props: ConsoleViewModelProps) => {
  const viewModel = ConsoleViewModel(props);

  return (
    <View flex={'1'} style={styles.marginTop}>
      <View style={styles.container} flex={'1'} direction={'row'}>
        <View flex={'1'}>
          <View flex={'1'}>
            <View
              direction={'row'}
              alignItems={'center'}
              marginHorizontal={'15'}>
              <View flex={'1'}>
                <View
                  flex={'1'}
                  justify={viewModel.tableNumber ? 'around' : 'center'}>
                  {viewModel.tableNumber ? (
                    <View>
                      <Text fontWeight={'bold'}>
                        {i18n.t('tableNumber')}{' '}
                        <Text fontSize={20}>{viewModel.tableNumber}</Text>
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}
                  <Button
                    onPress={props.onToggleSound}
                    style={styles.buttonSound}>
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
              </View>
              <View flex={'2'} alignItems={'center'} justify={'center'}>
                {/* {props.totalPlayers < 5 &&
                  !(
                    isCaromGame(props.gameSettings.category) &&
                    props.gameSettings.mode?.mode === 'pro'
                  ) &&
                  (props.isStarted || isPoolGame(props.gameSettings.category)) ? (
                  <Image
                    source={images.logo}
                    style={styles.logo}
                    resizeMode={'contain'}
                  />
                ) : (
                  <View />
                )} */}
                <Text fontSize={16}>{viewModel.buildGameModeTitle()}</Text>
                <View>
                  <Text
  fontSize={32}
  fontWeight={'bold'}
  color="#FFFFFF"
  style={{
    textShadowColor: '#000000',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  }}>
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
                {!isPoolGame(props.gameSettings?.category) ? (
                  <View direction={'row'} alignItems={'center'}>
                    <View marginRight={'10'}>
                      <Text>{i18n.t('proMode')}</Text>
                    </View>
                    <Switch
                      defaultValue={props.proModeEnabled}
                      onChange={props.onToggleProMode}
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
              onGameBreak={props.onGameBreak}
              onPoolBreak={props.onPoolBreak}
              onWarmUp={viewModel.onWarmUp}
              onStart={viewModel.onStart}
              onPause={viewModel.onPause}
              onStop={viewModel.onStop}
              isCameraReady={props.isCameraReady}
            />

            {isCaromGame(props.gameSettings.category) &&
              props.gameSettings.mode?.mode === 'pro' ? (
              <CaromInfo
                isStarted={props.isStarted}
                isPaused={props.isPaused}
                isMatchPaused={props.isMatchPaused}
                goal={props.goal}
                totalTurns={props.totalTurns}
                countdownTime={props.countdownTime}
                currentPlayerIndex={props.currentPlayerIndex}
                gameSettings={props.gameSettings}
                playerSettings={props.playerSettings}
              />
            ) : props.totalPlayers < 5 || props.currentMode?.mode === 'fast' ? (
              <Webcam
                setIsCameraReady={props.setIsCameraReady}
                isCameraReady={props.isCameraReady}
                webcamFolderName={props.webcamFolderName}
               // enderMatchInfo={props.renderMatchInfo}
                updateWebcamFolderName={props.updateWebcamFolderName}
                cameraRef={props.cameraRef}
                isPaused={props.isPaused}
                isStarted={props.isStarted}
              />
            ) : (
              <View />
            )}

            {/* doi bi */}
            {
              !isCaromGame(props.gameSettings?.category) && (
                props.totalPlayers === 2 &&
                  (props.currentMode?.mode === 'fast' || !props.isStarted) ? (
                  <View
                    direction={'row'}
                    justify={'end'}
                    alignItems={'center'}
                    marginTop={'10'}
                    marginHorizontal={'15'}>
                    {!isPoolGame(props.gameSettings?.category) ? (
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
                    {!isPoolGame(props.gameSettings?.category) ? (
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
                ) : isCaromGame(props.gameSettings.category) && props.isStarted ? (
                  <View direction={'row'} marginHorizontal={'20'} marginTop={'10'}>
                    <View
                      flex={'1'}
                      direction={'row'}
                      justify={'center'}
                      alignItems={'center'}>
                      <Button
                        style={styles.button}
                        onPress={props.onIncreaseTotalTurns}>
                        <Text>{i18n.t('increaseTotalTurns')}</Text>
                      </Button>
                      <View marginHorizontal={'10'} />
                      <Button
                        style={styles.button}
                        onPress={props.onDecreaseTotalTurns}>
                        <Text>{i18n.t('decreaseTotalTurns')}</Text>
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View />
                )
              )
            }
            {/* end doi bi */}

            {isPoolGame(props.gameSettings?.category) ? (
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
                onSwapPlayers={viewModel.onSwapPlayers}
                onRestart={viewModel.onRestart}
                onResetTurn={props.onResetTurn}
                
              />
            ) : (
              <View flex={props.totalPlayers === 5 ? '0' : '1'}>
                <GameInfo
                  
                    isStarted={props.isStarted}
                    webcamFolderName={props.webcamFolderName}
                    goal={props.goal}
                    totalTurns={props.totalTurns}
                    totalPlayers={props.totalPlayers}
                    currentMode={props.currentMode}
                    gameSettings={props.gameSettings}
                    onPressGiveMoreTime={viewModel.onPressGiveMoreTime}
                    //renderMatchInfo={props.renderMatchInfo}
                    updateWebcamFolderName={props.updateWebcamFolderName}
                    onIncreaseTotalTurns={props.onIncreaseTotalTurns}
                    onDecreaseTotalTurns={props.onDecreaseTotalTurns}
                    onSwapPlayers={props.onSwapPlayers}
                    isPaused={props.isPaused}
                    setIsCameraReady={props.setIsCameraReady}
                    isCameraReady={props.isCameraReady}
                    cameraRef={props.cameraRef}
                    />
              </View>
            )}
            {/* doi bi */}
            {/* {
              isCaromGame(props.gameSettings?.category) && (
                props.totalPlayers === 2 &&
                  (props.currentMode?.mode === 'fast' || !props.isStarted) ? (
                  <View
                    direction={'row'}
                    justify={'end'}
                    alignItems={'center'}
                    marginTop={'10'}
                    marginHorizontal={'15'}>
                    {!isPoolGame(props.gameSettings?.category) ? (
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
                    {!isPoolGame(props.gameSettings?.category) ? (
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
                )  : (
                  <View />
                )
              )
            } */}
            {/* end doi bi */}

            {/* {
              isCaromGame(props.gameSettings.category) && (<View
                style={styles.buttonWrapper}
                direction={'row'} alignItems={'end'}>
                <Button
                  onPress={viewModel.onPressGiveMoreTime}
                  style={[styles.button, styles.buttonGiveMoreTime]}
                >
                  <Text color={colors.white} fontSize={16}>
                    {i18n.t('giveMoreTime')}
                  </Text>
                </Button>
              </View>)
            } */}

            {props.totalPlayers === 5 ? (
              <View flex={'1'} direction={'row'} marginTop={'20'}>
                {props.renderLastPlayer()}
              </View>
            ) : (
              <View />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default memo(GameConsole);
