import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {RootState} from 'data/redux/reducers';
import {Player, PlayerSettings} from 'types/player';
import {goBack} from 'utils/navigation';
import {gameActions} from 'data/redux/actions/game';
import {COUNTDOWN_WIDTH} from './styles';
import colors from 'configuration/colors';

let countdownInterval: NodeJS.Timeout;

const GamePlayViewModel = () => {
  const dispatch = useDispatch();
  const {updateGameSettings} = useSelector((state: RootState) => state.UI.game);
  const {gameSettings} = useSelector((state: RootState) => state.game);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(1);
  const [totalTime, setTotalTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>();

  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    setPlayerSettings(gameSettings?.players);

    if (gameSettings?.mode.countdownTime) {
      setCountdownTime(gameSettings.mode.countdownTime);
    }

    if (gameSettings?.mode.mode === 'fast') {
      setCountdownTime(gameSettings?.mode.countdownTime || 0);
      setIsPaused(false);
    }
  }, [gameSettings]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    countdownInterval = setInterval(() => {
      setTotalTime(prev => prev + 1);
      setCountdownTime(prev =>
        typeof prev === 'number' && prev > 0 ? prev - 1 : 0,
      );
    }, 1000);
  }, [isPaused]);

  const getCountdownWidthItem = useCallback(() => {
    if (!gameSettings?.mode.countdownTime) {
      return;
    }

    return COUNTDOWN_WIDTH / gameSettings!.mode.countdownTime! - 10;
  }, [gameSettings]);

  const getCountdownColor = useCallback(
    (index: number) => {
      if (!gameSettings?.mode.countdownTime) {
        return;
      }

      const _time = gameSettings!.mode.countdownTime!;
      const section = _time / 4;

      switch (true) {
        case index > section * 3:
          return colors.green;
        case index > section * 2:
          return colors.primary;
        case index > section * 1:
          return colors.yellow;
        case index >= 0:
          return colors.red;
        default:
          return colors.primary;
      }
    },
    [gameSettings],
  );

  const _resetCountdown = useCallback(
    (isResume?: boolean) => {
      if (!gameSettings || !gameSettings.mode.countdownTime) {
        return;
      }

      if (!isResume) {
        setCountdownTime(gameSettings?.mode.countdownTime || 0);
      }
    },
    [gameSettings],
  );

  const onEditPlayerName = useCallback((index: number, newName: string) => {
    setPlayerSettings(
      prev =>
        ({
          ...prev,
          playingPlayers: prev?.playingPlayers.map((player, playerIndex) => {
            if (index === playerIndex) {
              return {...player, name: newName};
            }

            return player;
          }),
        } as PlayerSettings),
    );
  }, []);

  const onChangePlayerPoint = useCallback(
    (addedPoint: number, index: number, stepIndex: number) => {
      if (stepIndex === 4) {
        return;
      }

      setPlayerSettings(
        prev =>
          ({
            ...prev,
            playingPlayers: prev?.playingPlayers.map((player, playerIndex) => {
              if (index === playerIndex) {
                return {...player, totalPoint: player.totalPoint + addedPoint};
              }

              return player;
            }),
          } as PlayerSettings),
      );
    },
    [],
  );

  const onPressGiveMoreTime = useCallback(() => {
    if (!playerSettings) {
      return;
    }

    const newPlayingPlayers = playerSettings.playingPlayers.map(
      (player, index) => {
        if (
          currentPlayerIndex === index &&
          player.proMode &&
          typeof player.proMode.extraTimeTurns === 'number'
        ) {
          return {
            ...player,
            proMode: {
              ...player.proMode,
              extraTimeTurns:
                player.proMode.extraTimeTurns - 1 > 0
                  ? player.proMode.extraTimeTurns - 1
                  : 0,
            },
          } as Player;
        }

        return player;
      },
    );

    _resetCountdown();
    setPlayerSettings({...playerSettings, playingPlayers: newPlayingPlayers});
  }, [playerSettings, currentPlayerIndex, _resetCountdown]);

  const onSwitchTurn = useCallback(() => {
    _resetCountdown();
    setCurrentPlayerIndex(prev => (prev === 0 ? 1 : 0));
  }, [_resetCountdown]);

  const onEndTurn = useCallback(() => {
    if (!gameSettings) {
      return;
    }

    _resetCountdown();
    if (currentPlayerIndex + 1 > gameSettings.players.playerNumber - 1) {
      setCurrentPlayerIndex(0);
      setTotalTurns(totalTurns + 1);
      return;
    }

    setCurrentPlayerIndex(currentPlayerIndex + 1);
  }, [currentPlayerIndex, totalTurns, gameSettings, _resetCountdown]);

  const onSwapPlayers = useCallback(() => {
    const player1: Player = {...playerSettings?.playingPlayers[0]} as Player;
    const player0: Player = {...playerSettings?.playingPlayers[1]} as Player;

    setPlayerSettings({
      ...playerSettings,
      playingPlayers: [player0, player1],
    } as PlayerSettings);
  }, [playerSettings]);

  const onPause = useCallback(() => {
    if (isPaused) {
      //Resume game
      _resetCountdown(true);
    } else {
      clearInterval(countdownInterval);
    }

    setIsPaused(prev => !prev);
  }, [isPaused, _resetCountdown]);

  const onStop = useCallback(() => {
    dispatch(gameActions.updateGameSettings(undefined));
    goBack();
  }, [dispatch]);

  return useMemo(() => {
    return {
      currentPlayerIndex,
      totalTime,
      totalTurns,
      playerSettings,
      gameSettings,
      countdownTime,
      updateGameSettings,
      isPaused,
      getCountdownWidthItem,
      getCountdownColor,
      onEditPlayerName,
      onChangePlayerPoint,
      onPressGiveMoreTime,
      onSwitchTurn,
      onSwapPlayers,
      onEndTurn,
      onPause,
      onStop,
    };
  }, [
    currentPlayerIndex,
    totalTime,
    totalTurns,
    playerSettings,
    gameSettings,
    countdownTime,
    updateGameSettings,
    isPaused,
    getCountdownWidthItem,
    getCountdownColor,
    onEditPlayerName,
    onChangePlayerPoint,
    onPressGiveMoreTime,
    onSwitchTurn,
    onSwapPlayers,
    onEndTurn,
    onPause,
    onStop,
  ]);
};

export default GamePlayViewModel;
