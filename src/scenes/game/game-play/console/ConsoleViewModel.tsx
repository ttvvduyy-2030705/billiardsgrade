import {gameActions} from 'data/redux/actions/game';
import {RootState} from 'data/redux/reducers';
import i18n from 'i18n';
import {ReactNode, useCallback, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';
import {useSelector} from 'react-redux';
import {GameSettings, GameSettingsMode} from 'types/settings';

export interface Props {
  gameSettings: GameSettings;
  currentMode: GameSettingsMode;
  totalPlayers: number;
  countdownTime: string;
  totalTurns: number;
  goal: number;
  onPressGiveMoreTime: () => void;
  onSwitchTurn: () => void;
  onSwapPlayers: () => void;
  renderLastPlayer: () => ReactNode;
  onPause: () => void;
  onStop: () => void;
}

const ConsoleViewModel = (props: Props) => {
  const dispatch = useDispatch();
  const {gameSettings} = useSelector((state: RootState) => state.game);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [proModeEnabled, setProModeEnabled] = useState(
    props.currentMode.mode !== 'fast',
  );

  const onToggleValue = useCallback(
    (setValue: React.Dispatch<React.SetStateAction<boolean>>) => () => {
      setValue(prev => !prev);
    },
    [],
  );

  const buildGameModeTitle = useCallback(() => {
    return `${i18n.t(`${gameSettings?.category}`).toUpperCase()} - ${i18n
      .t(`${gameSettings?.mode.mode}`)
      .toUpperCase()}`;
  }, [gameSettings]);

  const toggleProMode = useCallback(() => {
    setProModeEnabled(prev => !prev);
    dispatch(
      gameActions.updateGameSettings({
        ...props.gameSettings,
        mode: {
          ...props.currentMode,
          mode: props.currentMode.mode === 'fast' ? 'pro' : 'fast',
        },
      }),
    );
  }, [dispatch, props]);

  const onPressGiveMoreTime = useCallback(() => {
    props.onPressGiveMoreTime();
  }, [props]);

  const onSwitchTurn = useCallback(() => {
    if (props.totalPlayers > 2) {
      return;
    }

    props.onSwitchTurn();
  }, [props]);

  const onSwapPlayers = useCallback(() => {
    if (props.totalPlayers > 2) {
      return;
    }

    props.onSwapPlayers();
  }, [props]);

  const onPause = useCallback(() => {
    props.onPause();
  }, [props]);

  const onStop = useCallback(() => {
    props.onStop();
  }, [props]);

  return useMemo(() => {
    return {
      soundEnabled,
      remoteEnabled,
      proModeEnabled,
      gameSettings,
      buildGameModeTitle,
      onToggleSound: onToggleValue(setSoundEnabled),
      onToggleRemote: onToggleValue(setRemoteEnabled),
      onToggleProMode: toggleProMode,
      onPressGiveMoreTime,
      onSwitchTurn,
      onSwapPlayers,
      onPause,
      onStop,
    };
  }, [
    soundEnabled,
    remoteEnabled,
    proModeEnabled,
    gameSettings,
    buildGameModeTitle,
    onToggleValue,
    toggleProMode,
    onPressGiveMoreTime,
    onSwitchTurn,
    onSwapPlayers,
    onPause,
    onStop,
  ]);
};

export default ConsoleViewModel;
