import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import SoundPlayer from 'react-native-sound-player';
import {RootState} from 'data/redux/reducers';
import {Player, PlayerSettings} from 'types/player';
import {goBack} from 'utils/navigation';
import {gameActions} from 'data/redux/actions/game';
import {COUNTDOWN_WIDTH} from './styles';
import colors from 'configuration/colors';
import {isPool10Game, isPool9Game, isPoolGame} from 'utils/game';
import {BallType, PoolBallType} from 'types/ball';

let countdownInterval: NodeJS.Timeout, warmUpCountdownInterval: NodeJS.Timeout;

const GamePlayViewModel = () => {
  const dispatch = useDispatch();
  const {updateGameSettings} = useSelector((state: RootState) => state.UI.game);
  const {gameSettings} = useSelector((state: RootState) => state.game);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(1);
  const [totalTime, setTotalTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [warmUpCount, setWarmUpCount] = useState<number>();
  const [warmUpCountdownTime, setWarmUpCountdownTime] = useState<number>();
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [winner, setWinner] = useState<Player>();

  const [isStarted, setIsStarted] = useState(
    gameSettings?.mode.mode === 'fast' ? true : false,
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    setPlayerSettings(gameSettings?.players);

    if (gameSettings?.mode.warmUpTime) {
      setWarmUpCount(2);
    }

    if (gameSettings?.mode.countdownTime) {
      setCountdownTime(gameSettings.mode.countdownTime);
    }

    if (gameSettings?.mode.mode === 'fast') {
      setCountdownTime(gameSettings?.mode.countdownTime || 0);
      setIsPaused(false);
    }
  }, [gameSettings]);

  useEffect(() => {
    if (!isStarted || isPaused) {
      return;
    }

    countdownInterval = setInterval(() => {
      setTotalTime(prev => prev + 1);
      setCountdownTime(prev =>
        typeof prev === 'number' && prev > 0 ? prev - 1 : 0,
      );
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [isStarted, isPaused]);

  useEffect(() => {
    if (!warmUpCountdownTime) {
      return;
    }

    warmUpCountdownInterval = setInterval(() => {
      setWarmUpCountdownTime(prev => (prev ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(warmUpCountdownInterval);
    };
  }, [warmUpCountdownTime]);

  useEffect(() => {
    if (!isStarted || !soundEnabled) {
      return;
    }

    try {
      if (countdownTime === 0) {
        SoundPlayer.playSoundFile('timeout', 'm4a');
        return;
      }

      if (countdownTime > 0) {
        SoundPlayer.playSoundFile('beep', 'wav');
      }
    } catch (e) {
      console.log('Cannot play the sound file', e);
    }
  }, [isStarted, soundEnabled, countdownTime]);

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
      if (!isStarted || stepIndex === 4) {
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

      _resetCountdown();
    },
    [isStarted, _resetCountdown],
  );

  const onPressGiveMoreTime = useCallback(() => {
    if (!playerSettings || !isStarted) {
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
  }, [isStarted, playerSettings, currentPlayerIndex, _resetCountdown]);

  const onViolate = useCallback(
    (playerIndex: number) => {
      if (
        !isStarted ||
        !playerSettings ||
        playerIndex !== currentPlayerIndex ||
        !isPoolGame(gameSettings?.category)
      ) {
        return;
      }

      const newPlayingPlayers = playerSettings.playingPlayers.map(
        (player, index) => {
          if (playerIndex === index) {
            return {
              ...player,
              violate: player.violate ? player.violate + 1 : 1,
            } as Player;
          }

          return player;
        },
      );

      setPlayerSettings({...playerSettings, playingPlayers: newPlayingPlayers});
    },
    [isStarted, currentPlayerIndex, gameSettings, playerSettings],
  );

  const onSelectWinner = useCallback(() => {
    setWinner(playerSettings?.playingPlayers[currentPlayerIndex]);

    if (
      isPool9Game(gameSettings?.category) ||
      isPool10Game(gameSettings?.category)
    ) {
      setPlayerSettings(
        prev =>
          ({
            ...prev,
            playingPlayers: prev?.playingPlayers.map((player, playerIndex) => {
              if (currentPlayerIndex === playerIndex) {
                return {...player, totalPoint: player.totalPoint + 1};
              }

              return player;
            }),
          } as PlayerSettings),
      );
    }
  }, [currentPlayerIndex, playerSettings, gameSettings]);

  const onClearWinner = useCallback(() => {
    if (!playerSettings) {
      return;
    }

    const newPlayingPlayers = playerSettings?.playingPlayers.map(player => {
      return {...player, scoredBalls: undefined} as Player;
    });

    setPlayerSettings({...playerSettings, playingPlayers: newPlayingPlayers});
    setWinner(undefined);
  }, [playerSettings]);

  const onPoolScore = useCallback(
    (ball: PoolBallType) => {
      if (
        !isStarted ||
        !playerSettings ||
        !isPoolGame(gameSettings?.category)
      ) {
        return;
      }

      const newPlayingPlayers = playerSettings.playingPlayers.map(
        (player, index) => {
          if (currentPlayerIndex === index) {
            return {
              ...player,
              scoredBalls: [...(player.scoredBalls || []), ball],
            } as Player;
          }

          return player;
        },
      );

      setPlayerSettings({...playerSettings, playingPlayers: newPlayingPlayers});

      switch (true) {
        case isPool9Game(gameSettings?.category):
          if (ball.number === BallType.B9) {
            onSelectWinner();
          }
          break;
        case isPool10Game(gameSettings?.category):
          if (ball.number === BallType.B10) {
            onSelectWinner();
          }
          break;
        default:
          break;
      }
    },
    [
      currentPlayerIndex,
      gameSettings?.category,
      isStarted,
      playerSettings,
      onSelectWinner,
    ],
  );

  const onSwitchTurn = useCallback(() => {
    _resetCountdown();

    const player0: Player = {
      ...playerSettings?.playingPlayers[0],
      color: playerSettings?.playingPlayers[1].color,
    } as Player;
    const player1: Player = {
      ...playerSettings?.playingPlayers[1],
      color: playerSettings?.playingPlayers[0].color,
    } as Player;

    setPlayerSettings({
      ...playerSettings,
      playingPlayers: [player0, player1],
    } as PlayerSettings);
  }, [_resetCountdown, playerSettings]);

  const onToggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  const getWarmUpTimeString = useCallback(() => {
    if (!warmUpCountdownTime) {
      return '';
    }

    const minutes = Math.floor(warmUpCountdownTime / 60);
    const seconds = Math.floor(warmUpCountdownTime % 60);

    return `${minutes < 10 ? '0' : ''}${minutes}:${
      seconds < 10 ? '0' : ''
    }${seconds}`;
  }, [warmUpCountdownTime]);

  const onWarmUp = useCallback(() => {
    if (!gameSettings?.mode.warmUpTime) {
      return;
    }

    setWarmUpCount(prev => (prev ? prev - 1 : 0));
    setWarmUpCountdownTime(gameSettings?.mode.warmUpTime);
  }, [gameSettings]);

  const onEndWarmUp = useCallback(() => {
    setWarmUpCountdownTime(undefined);
    clearInterval(warmUpCountdownInterval);
  }, []);

  const onEndTurn = useCallback(() => {
    if (!gameSettings || !isStarted) {
      return;
    }

    _resetCountdown();
    if (currentPlayerIndex + 1 > gameSettings.players.playerNumber - 1) {
      setCurrentPlayerIndex(0);
      setTotalTurns(totalTurns + 1);
      return;
    }

    setCurrentPlayerIndex(currentPlayerIndex + 1);
  }, [
    isStarted,
    currentPlayerIndex,
    totalTurns,
    gameSettings,
    _resetCountdown,
  ]);

  const onSwapPlayers = useCallback(() => {
    const player1: Player = {...playerSettings?.playingPlayers[0]} as Player;
    const player0: Player = {...playerSettings?.playingPlayers[1]} as Player;

    setPlayerSettings({
      ...playerSettings,
      playingPlayers: [player0, player1],
    } as PlayerSettings);
  }, [playerSettings]);

  const onStart = useCallback(() => {
    if (isStarted) {
      return;
    }

    setIsStarted(true);
  }, [isStarted]);

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
      winner,
      currentPlayerIndex,
      totalTime,
      totalTurns,
      playerSettings,
      gameSettings,
      countdownTime,
      warmUpCount,
      warmUpCountdownTime,
      updateGameSettings,
      isStarted,
      isPaused,
      soundEnabled,
      getCountdownWidthItem,
      getCountdownColor,
      onEditPlayerName,
      onChangePlayerPoint,
      onPressGiveMoreTime,
      onViolate,
      getWarmUpTimeString,
      onWarmUp,
      onEndWarmUp,
      onSwitchTurn,
      onSwapPlayers,
      onToggleSound,
      onPoolScore,
      onSelectWinner,
      onClearWinner,
      onStart,
      onEndTurn,
      onPause,
      onStop,
    };
  }, [
    winner,
    currentPlayerIndex,
    totalTime,
    totalTurns,
    playerSettings,
    gameSettings,
    countdownTime,
    warmUpCount,
    warmUpCountdownTime,
    updateGameSettings,
    isStarted,
    isPaused,
    soundEnabled,
    getCountdownWidthItem,
    getCountdownColor,
    onEditPlayerName,
    onChangePlayerPoint,
    onPressGiveMoreTime,
    onViolate,
    getWarmUpTimeString,
    onWarmUp,
    onEndWarmUp,
    onSwitchTurn,
    onSwapPlayers,
    onToggleSound,
    onPoolScore,
    onSelectWinner,
    onClearWinner,
    onStart,
    onEndTurn,
    onPause,
    onStop,
  ]);
};

export default GamePlayViewModel;
