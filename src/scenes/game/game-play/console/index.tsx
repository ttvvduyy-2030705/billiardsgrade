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
            <Text fontSize={96} color={colors.grayBlue} fontWeight={'bold'}>
              {props.totalTurns}
            </Text>
          </View>
          <View flex={'1'} alignItems={'center'} justify={'center'}>
            <Text>{i18n.t('goal')}</Text>
            <Text fontSize={96} color={colors.grayBlue} fontWeight={'bold'}>
              {props.goal}
            </Text>
          </View>
        </View>
        <View direction={'row'} marginHorizontal={'20'} marginVertical={'20'}>
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

  const STYLE = useMemo(() => {
    if (props.totalPlayers === 5) {
      return styles.marginTop;
    }

    return styles.marginVertical;
  }, [props]);

  return (
    <View flex={'1'} style={STYLE}>
      <View style={styles.container} flex={'1'} direction={'row'}>
        <View flex={'1'}>
          <View
            direction={'row'}
            alignItems={'center'}
            marginHorizontal={'15'}
            marginTop={'15'}>
            <View flex={'1'} justify={'center'}>
              <Button
                onPress={viewModel.onToggleSound}
                style={styles.buttonSound}>
                <Image source={images.game.soundOn} style={styles.icon} />
              </Button>
            </View>
            <View flex={'1'} alignItems={'center'} justify={'center'}>
              <Text fontSize={16}>{viewModel.buildGameModeTitle()}</Text>
              <View marginTop={'10'}>
                <Text fontSize={32} fontWeight={'bold'} color={colors.primary}>
                  {props.countdownTime}
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
              <Button
                style={[styles.button, styles.pauseButton]}
                onPress={viewModel.onPause}>
                <Text fontWeight={'bold'} letterSpacing={1.2}>
                  {i18n.t('pause')}
                </Text>
              </Button>
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

          {GAME_INFO}

          {props.totalPlayers === 5 ? (
            <View flex={'1'} direction={'row'}>
              {props.renderLastPlayer()}
            </View>
          ) : (
            <View />
          )}

          {props.totalPlayers === 2 && props.currentMode.mode === 'fast' ? (
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
              <View
                flex={'1'}
                direction={'row'}
                justify={'center'}
                alignItems={'center'}>
                <Button style={styles.button} onPress={viewModel.onSwapPlayers}>
                  <Text>{i18n.t('switchPlayer')}</Text>
                </Button>
              </View>
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
