import {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {RootState} from 'data/redux/reducers';
import {gameActions} from 'data/redux/actions/game';
import colors from 'configuration/colors';

import {goBack} from 'utils/navigation';
import {isPool10Game, isPool9Game, isPoolGame} from 'utils/game';
import Sound from 'utils/sound';
import RemoteControl from 'utils/remote';

import {Player, PlayerSettings} from 'types/player';
import {RemoteControlKeys} from 'types/bluetooth';
import {BallType, PoolBallType} from 'types/ball';
import i18n from 'i18n';
import {COUNTDOWN_WIDTH} from './styles';

let countdownInterval: NodeJS.Timeout, warmUpCountdownInterval: NodeJS.Timeout;

const GamePlayViewModel = () => {
  const dispatch = useDispatch();
  const {updateGameSettings} = useSelector((state: RootState) => state.UI.game);
  const {gameSettings} = useSelector((state: RootState) => state.game);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(1);
  const [totalTime, setTotalTime] = useState(0);
  const [poolBreakEnabled, setPoolBreakEnabled] = useState<boolean>(false);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [warmUpCount, setWarmUpCount] = useState<number>();
  const [warmUpCountdownTime, setWarmUpCountdownTime] = useState<number>();
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [winner, setWinner] = useState<Player>();

  const [isStarted, setIsStarted] = useState(
    gameSettings?.mode?.mode === 'fast' ? true : false,
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.PLAY_OR_PAUSE,
      isStarted ? onPause : onStart,
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.LIGHT,
      onSwitchTurn,
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.PAGE_UP,
      onPoolBreak,
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.PAGE_DOWN,
      onPressGiveMoreTime,
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.VOL_UP,
      onEndTurn,
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.VOL_DOWN,
      onReset,
    );
    RemoteControl.instance.registerKeyEvents(RemoteControlKeys.DEL, onWarmUp);
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.MUTE,
      onToggleSound,
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.UP,
      onChangePlayerPoint.bind(GamePlayViewModel, 1, currentPlayerIndex, 0),
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.DOWN,
      onChangePlayerPoint.bind(GamePlayViewModel, -1, currentPlayerIndex, 0),
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.LEFT,
      onEndTurn.bind(GamePlayViewModel, true),
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.RIGHT,
      onEndTurn,
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isStarted,
    isPaused,
    currentPlayerIndex,
    totalTurns,
    gameSettings,
    playerSettings,
  ]);

  useEffect(() => {
    return () => {
      RemoteControl.instance.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    clearInterval(countdownInterval);
    clearInterval(warmUpCountdownInterval);
    setIsStarted(false);

    if (!playerSettings) {
      setPlayerSettings(gameSettings?.players);
    }

    if (gameSettings?.mode.warmUpTime) {
      setWarmUpCount(gameSettings.players.playingPlayers.length);
    }

    if (gameSettings?.mode.countdownTime) {
      setCountdownTime(gameSettings.mode.countdownTime);
    }

    if (gameSettings?.mode.mode === 'fast') {
      setCountdownTime(gameSettings?.mode.countdownTime || 0);
      setIsPaused(false);
    }

    if (
      isPoolGame(gameSettings?.category) &&
      gameSettings?.mode.countdownTime
    ) {
      setPoolBreakEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSettings]);

  useEffect(() => {
    if (!isStarted || isPaused || poolBreakEnabled) {
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
  }, [isStarted, isPaused, poolBreakEnabled]);

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
    if (!isStarted || !soundEnabled || !gameSettings?.mode.countdownTime) {
      return;
    }

    if (countdownTime === 0) {
      Sound.timeout();
      return;
    }

    if (countdownTime > 0 && countdownTime <= 10) {
      Sound.beep();
    }
  }, [isStarted, soundEnabled, countdownTime, gameSettings]);

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
    (isResume?: boolean, cumulativeTime?: boolean) => {
      if (!gameSettings || !gameSettings.mode.countdownTime) {
        return;
      }

      if (cumulativeTime) {
        setCountdownTime(countdownTime + gameSettings!.mode.countdownTime);
      } else if (!isResume) {
        setCountdownTime(gameSettings!.mode.countdownTime);
      }
    },
    [gameSettings, countdownTime],
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
      if (!isStarted || stepIndex === 4 || !playerSettings || !gameSettings) {
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

      const player = playerSettings!.playingPlayers[index];
      if (player.totalPoint + addedPoint >= gameSettings!.players.goal.goal) {
        Alert.alert(
          i18n.t('txtWin'),
          i18n.t('msgWinner', {player: player.name}),
          [{text: i18n.t('txtClose')}],
        );
        setIsPaused(true);
      }

      if (!isPoolGame(gameSettings.category)) {
        _resetCountdown();
      }
    },
    [isStarted, gameSettings, playerSettings, _resetCountdown],
  );

  const onPressGiveMoreTime = useCallback(() => {
    if (
      !playerSettings ||
      !isStarted ||
      (typeof playerSettings.playingPlayers[currentPlayerIndex].proMode
        ?.extraTimeTurns === 'number' &&
        playerSettings.playingPlayers[currentPlayerIndex].proMode
          ?.extraTimeTurns <= 0)
    ) {
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

    _resetCountdown(undefined, true);
    setPlayerSettings({...playerSettings, playingPlayers: newPlayingPlayers});
  }, [isStarted, playerSettings, currentPlayerIndex, _resetCountdown]);

  const onViolate = useCallback(
    (playerIndex: number) => {
      if (
        !isStarted ||
        !playerSettings ||
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
    [isStarted, gameSettings, playerSettings],
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

    if (soundEnabled) {
      Sound.speak(
        i18n.t('msgWinner', {
          player: playerSettings?.playingPlayers[currentPlayerIndex].name,
        }),
      );
    }
  }, [currentPlayerIndex, playerSettings, gameSettings, soundEnabled]);

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

      if (soundEnabled) {
        Sound.speak(i18n.t(`ball${ball.number}`));
      }

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
      soundEnabled,
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

  const onPoolBreak = useCallback(() => {
    if (
      !isStarted ||
      isPaused ||
      !gameSettings ||
      !gameSettings.mode.countdownTime
    ) {
      return;
    }

    setCountdownTime(gameSettings.mode.countdownTime! * 2);
    setPoolBreakEnabled(false);
    setIsStarted(true);
  }, [gameSettings, isStarted, isPaused]);

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

  const onEndTurn = useCallback(
    (isPrevious?: boolean) => {
      if (!gameSettings || !isStarted) {
        return;
      }

      _resetCountdown();

      if (isPrevious) {
        if (currentPlayerIndex - 1 < 0) {
          setCurrentPlayerIndex(gameSettings.players.playerNumber - 1);
          setTotalTurns(totalTurns + 1);
          return;
        }

        setCurrentPlayerIndex(currentPlayerIndex - 1);
        return;
      }

      if (currentPlayerIndex + 1 > gameSettings.players.playerNumber - 1) {
        setCurrentPlayerIndex(0);
        setTotalTurns(totalTurns + 1);
        return;
      }

      setCurrentPlayerIndex(currentPlayerIndex + 1);
    },
    [isStarted, currentPlayerIndex, totalTurns, gameSettings, _resetCountdown],
  );

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
    Alert.alert(i18n.t('stop'), i18n.t('msgStopGame'), [
      {
        text: i18n.t('txtCancel'),
        style: 'cancel',
      },
      {
        text: i18n.t('stop'),
        onPress: () => {
          goBack();
          dispatch(gameActions.updateGameSettings(undefined));
        },
      },
    ]);
  }, [dispatch]);

  const onReset = useCallback(() => {
    const newPlayerSettings = {
      ...playerSettings,
      playingPlayers: playerSettings?.playingPlayers.map(player => ({
        ...player,
        violate: 0,
        scoredBalls: [],
        proMode: {
          ...player.proMode,
          highestRate: 0,
          average: 0,
          extraTimeTurns: gameSettings?.mode.extraTimeTurns,
        },
      })),
    } as PlayerSettings;

    setPlayerSettings(newPlayerSettings);

    if (
      isPoolGame(gameSettings?.category) &&
      gameSettings?.mode.countdownTime
    ) {
      setPoolBreakEnabled(true);
    }
  }, [gameSettings, playerSettings]);

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
      poolBreakEnabled,
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
      onPoolBreak,
      onStart,
      onEndTurn,
      onPause,
      onStop,
      onReset,
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
    poolBreakEnabled,
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
    onPoolBreak,
    onStart,
    onEndTurn,
    onPause,
    onStop,
    onReset,
  ]);
};

export default GamePlayViewModel;
