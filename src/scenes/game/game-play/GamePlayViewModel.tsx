import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import RNFS, { ReadDirItem } from 'react-native-fs';
// import {captureRef} from 'react-native-view-shot';
import {useRealm} from '@realm/react';
import {RootState} from 'data/redux/reducers';
import {gameActions} from 'data/redux/actions/game';
import i18n from 'i18n';
import  { Camera}from 'react-native-vision-camera';
import {goBack} from 'utils/navigation';
import {isPool10Game, isPool9Game, isPoolGame} from 'utils/game';
import Sound from 'utils/sound';
import RemoteControl from 'utils/remote';
import {Player, PlayerSettings} from 'types/player';
import {RemoteControlKeys} from 'types/bluetooth';
import {BallType, PoolBallType} from 'types/ball';
//import {MATCH_COUNTDOWN, WEBCAM_BASE_CAMERA_FOLDER} from 'constants/webcam';
import { NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { screens } from 'scenes/screens';
import {navigate} from 'utils/navigation';


let countdownInterval: NodeJS.Timeout, warmUpCountdownInterval: NodeJS.Timeout;
const { CameraService } = NativeModules;

const GamePlayViewModel = () => {
  const realm = useRealm();
  const dispatch = useDispatch();
  const {updateGameSettings} = useSelector((state: RootState) => state.UI.game);
  const {gameSettings} = useSelector((state: RootState) => state.game);
  const cameraRef = useRef<Camera>(null)
  const matchCountdownRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [poolBreakPlayerIndex, setPoolBreakPlayerIndex] = useState<number>(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(1);
  const [totalTime, setTotalTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [warmUpCount, setWarmUpCount] = useState<number>();
  const [warmUpCountdownTime, setWarmUpCountdownTime] = useState<number>();
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>();
  const [winner, setWinner] = useState<Player>();
  const [isCameraReady, setIsCameraReady] = useState(false);

  const now = gameSettings?.webcamFolderName != null ? gameSettings?.webcamFolderName:  Date.now().toString();

  const [webcamFolderName, setWebcamFolderName] = useState<string>(now)

  const [isStarted, setIsStarted] = useState(
    gameSettings?.mode?.mode === 'fast' ? true : false,
  );

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMatchPaused, setIsMatchPaused] = useState<boolean>(false);
  const [gameBreakEnabled, setGameBreakEnabled] = useState<boolean>(false);
  const [poolBreakEnabled, setPoolBreakEnabled] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [proModeEnabled, setProModeEnabled] = useState(
    gameSettings?.mode?.mode !== 'fast',
  );

  // useEffect(() => {
  //      if(!hasPermission){
  //        requestPermission()
  //      }
  // }, [hasPermission]);

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
      onResetTurn,
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.VOL_DOWN,
      onReset,
    );
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.DEL,
      warmUpCountdownTime ? onEndWarmUp : onWarmUp,
    );
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
    RemoteControl.instance.registerKeyEvents(
      RemoteControlKeys.OK,
      onToggleCountDown,
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isStarted,
    isPaused,
    currentPlayerIndex,
    totalTurns,
    gameSettings,
    playerSettings,
    warmUpCountdownTime,
    warmUpCount,
    poolBreakEnabled,
    countdownTime,
  ]);

  useEffect(() => {
    clearInterval(countdownInterval);
    clearInterval(warmUpCountdownInterval);
    setIsStarted(false);

    if (!playerSettings) {
      setPlayerSettings(gameSettings?.players);
    }

    if (gameSettings?.mode?.warmUpTime) {
      setWarmUpCount(gameSettings.players.playingPlayers.length);
    }

    if (gameSettings?.mode?.countdownTime) {
      setCountdownTime(gameSettings.mode?.countdownTime);
    }

    if (gameSettings?.mode?.mode === 'fast') {
      setCountdownTime(gameSettings?.mode?.countdownTime || 0);
      //setIsPaused(false);
    }

    if (
      isPoolGame(gameSettings?.category) &&
      gameSettings?.mode?.countdownTime
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

      if (!isMatchPaused) {
        setCountdownTime(prev =>
          typeof prev === 'number' && prev > 0 ? prev - 1 : 0,
        );
      }
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [isStarted, isPaused, poolBreakEnabled, isMatchPaused]);

  useEffect(() => {
    if (!warmUpCountdownTime) {
      return;
    }

    warmUpCountdownInterval = setInterval(() => {
      if (gameBreakEnabled) {
        setWarmUpCountdownTime(prev => (prev ? prev + 1 : 1));
      } else {
        setWarmUpCountdownTime(prev => (prev ? prev - 1 : 0));
      }
    }, 1000);

    return () => {
      clearInterval(warmUpCountdownInterval);
    };
  }, [warmUpCountdownTime, gameBreakEnabled]);

  useEffect(() => {
    if (!isStarted || !soundEnabled || !gameSettings?.mode?.countdownTime) {
      return;
    }

    if (countdownTime > 0 && countdownTime <= 10) {
      Sound.beep();
    }
  }, [isStarted, soundEnabled, countdownTime, gameSettings]);

  // useEffect(() => {
  //   if (!matchCountdownRef.current || isCaromGame(gameSettings?.category)) {
  //     return;
  //   }

  //   captureRef(matchCountdownRef, {
  //     format: 'png',
  //     quality: 0.01,
  //     width: 1242,
  //   })
  //     .then(
  //       async uri => {
  //         const matchCountdownImagePath = `${RNFS.DownloadDirectoryPath}/${WEBCAM_BASE_CAMERA_FOLDER}/${MATCH_COUNTDOWN}`;

  //         console.log("matchCountdownImagePath" + matchCountdownImagePath)

  //         const _path = uri.slice(7);
  //         console.log("prh" + _path)

  //         RNFS.copyFile(_path, matchCountdownImagePath);
  //       },
  //       error => console.log('Oops, match countdown failed', error),
  //     )
  //     .catch(e => {
  //       if (__DEV__) {
  //         console.log('Capture countdown error', e);
  //       }
  //     });
  // }, [countdownTime, gameSettings]);

  // useEffect(() => {
  //   return () => {
  //     cancelStreamWebcamToFile();
  //   };
  // }, []);

  const updateWebcamFolderName = useCallback((name: string) => {
    setWebcamFolderName(name);
  }, []);

  const _resetCountdown = useCallback(
    (isResume?: boolean, cumulativeTime?: boolean) => {
      if (!gameSettings || !gameSettings.mode?.countdownTime) {
        return;
      }

      if (cumulativeTime) {
        setCountdownTime(countdownTime + gameSettings!.mode?.countdownTime);
      } else if (!isResume) {
        setCountdownTime(gameSettings!.mode?.countdownTime);
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
                return {
                  ...player,
                  totalPoint: player.totalPoint + addedPoint,
                  proMode: {
                    ...player.proMode,
                    currentPoint:
                      (player.proMode?.currentPoint || 0) + addedPoint,
                  },
                };
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
        setIsMatchPaused(false);
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
    (playerIndex: number, reset?: boolean) => {
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
              violate: reset ? 0 : player.violate ? player.violate + 1 : 1,
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

  const onSwitchPoolBreakPlayerIndex = useCallback(
    (index: number, callback?: (playerIndex: number) => void) => {
      if (!gameSettings) {
        return;
      }
      let newPoolBreakPlayerIndex = 0;

      if (index + 1 > gameSettings.players.playerNumber - 1) {
        newPoolBreakPlayerIndex = 0;
      } else {
        newPoolBreakPlayerIndex = index + 1;
      }

      setPoolBreakPlayerIndex(newPoolBreakPlayerIndex);

      if (callback) {
        callback(newPoolBreakPlayerIndex);
      }
    },
    [gameSettings],
  );

  const onIncreaseTotalTurns = useCallback(() => {
    setTotalTurns(prev => prev + 1);
  }, []);

  const onDecreaseTotalTurns = useCallback(() => {
    setTotalTurns(prev => prev - 1);
  }, []);

  const onToggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  const onToggleProMode = useCallback(() => {
    setProModeEnabled(prev => !prev);
  }, []);

  const onPoolBreak = useCallback(() => {
    if (
      !isStarted ||
      isPaused ||
      !poolBreakEnabled ||
      !gameSettings ||
      !gameSettings.mode?.countdownTime
    ) {
      return;
    }

    setCountdownTime(gameSettings.mode?.countdownTime! * 2);
    setPoolBreakEnabled(false);
    setIsMatchPaused(false);
    setIsStarted(true);
  }, [gameSettings, isStarted, isPaused, poolBreakEnabled]);

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
    if (
      !gameSettings?.mode?.warmUpTime ||
      (typeof warmUpCount === 'number' && warmUpCount <= 0)
    ) {
      return;
    }

    setWarmUpCount(prev => (prev ? prev - 1 : 0));
    setWarmUpCountdownTime(gameSettings?.mode?.warmUpTime);
  }, [gameSettings, warmUpCount]);

  const onGameBreak = useCallback(() => {
    setGameBreakEnabled(true);
    setWarmUpCountdownTime(1);
  }, []);

  const onEndWarmUp = useCallback(() => {
    setWarmUpCountdownTime(undefined);
    setGameBreakEnabled(false);
    clearInterval(warmUpCountdownInterval);
  }, []);

  const onEndTurn = useCallback(
    (isPrevious?: boolean) => {
      if (!gameSettings || !isStarted) {
        return;
      }
      let nextPlayerIndex = 0,
        newTotalTurns: number | null = null;

      switch (true) {
        case isPrevious && currentPlayerIndex - 1 < 0:
          nextPlayerIndex = gameSettings.players.playerNumber - 1;
          newTotalTurns = totalTurns + 1;
          break;
        case isPrevious:
          nextPlayerIndex = currentPlayerIndex - 1;
          break;
        case !isPrevious &&
          currentPlayerIndex + 1 > gameSettings.players.playerNumber - 1:
          nextPlayerIndex = 0;
          newTotalTurns = totalTurns + 1;
          break;
        default:
          nextPlayerIndex = currentPlayerIndex + 1;
          break;
      }

      setIsMatchPaused(false);
      setCurrentPlayerIndex(nextPlayerIndex);
      _resetCountdown();

      setPlayerSettings(
        prev =>
          ({
            ...prev,
            playingPlayers: prev?.playingPlayers.map(player => {
              return {
                ...player,
                proMode: {
                  ...player.proMode,
                  currentPoint: 0,
                },
              };
            }),
          } as PlayerSettings),
      );

      if (newTotalTurns) {
        setTotalTurns(newTotalTurns);
      }
    },
    [isStarted, currentPlayerIndex, totalTurns, gameSettings, _resetCountdown],
  );

  const onResetTurn = useCallback(() => {
    if (!gameSettings || !isStarted) {
      return;
    }

    _resetCountdown();

    setTotalTurns(totalTurns + 1);
    setIsMatchPaused(false);
  }, [isStarted, gameSettings, totalTurns, _resetCountdown]);

  const onSwapPlayers = useCallback(() => {
    const player0: Player = {
      ...playerSettings?.playingPlayers[0],
      name: playerSettings?.playingPlayers[1].name,
    } as Player;
    const player1: Player = {
      ...playerSettings?.playingPlayers[1],
      name: playerSettings?.playingPlayers[0].name,
    } as Player;

    setPlayerSettings({
      ...playerSettings,
      playingPlayers: [player0, player1],
    } as PlayerSettings);
  }, [playerSettings]);

  const onStart = useCallback( async () =>  {
    if (isStarted) {
      return;
    }
  
    const freeDisk = await DeviceInfo.getFreeDiskStorage() / (1024 * 1024 * 1024); // Convert to GB

    console.log("Free disk storae " + freeDisk)

    if(freeDisk <= 10){
      Alert.alert(i18n.t('txtwarn'), i18n.t('msgOutOfMemory'), [
        {
          text: i18n.t('txtCancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('btnHistory'),
          onPress: () => {
            navigate(screens.history);

          },
        },
      ]);
    } else {
      setIsStarted(true);
      await startVideoRecording()
    }
    
  }, [isStarted]);

  const onToggleCountDown = useCallback(() => {
    if (!isStarted || isPaused) {
      return;
    }

    setIsMatchPaused(prev => !prev);
  }, [isStarted, isPaused]);

  const onPause = useCallback(async () => {
    if (isPaused) {
      _resetCountdown(true);
      await startVideoRecording();
    } else {
      clearInterval(countdownInterval);
      await stopVideoRecording();
    }

    setIsPaused(prev => !prev);
  }, [isPaused, _resetCountdown]);

  const onStop = useCallback( async () => {
    Alert.alert(i18n.t('stop'), i18n.t('msgStopGame'), [
      {
        text: i18n.t('txtCancel'),
        style: 'cancel',
      },
      {
        text: i18n.t('stop'),
        onPress: async () => {

          try {
            dispatch(
            
              gameActions.endGame({
                realm,
                gameSettings: {
                  ...gameSettings,
                  players: playerSettings,
                  totalTime,
                  webcamFolderName,
                },
              }),
            );
          } catch (error) {
            console.error(JSON.stringify(error))
          } 
          
          if(isRecording){
            await stopVideoRecording();
          }

          goBack();
        },
      },
    ]);

  }, [
    dispatch,
    realm,
    totalTime,
    gameSettings,
    playerSettings,
    webcamFolderName,
  ]);

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
          extraTimeTurns: gameSettings?.mode?.extraTimeTurns,
        },
      })),
    } as PlayerSettings;

    setPlayerSettings(newPlayerSettings);

    if (
      isPoolGame(gameSettings?.category) &&
      gameSettings?.mode?.countdownTime
    ) {
      setPoolBreakEnabled(true);
    }

    onSwitchPoolBreakPlayerIndex(poolBreakPlayerIndex, playerIndex => {
      setCurrentPlayerIndex(playerIndex);
    });
  }, [
    poolBreakPlayerIndex,
    gameSettings,
    playerSettings,
    onSwitchPoolBreakPlayerIndex,
  ]);

  const startVideoRecording = async () => {
    try {

      setIsRecording(true)

      const folderPath = `${RNFS.DownloadDirectoryPath}/${webcamFolderName}`;
             if (!(await RNFS.exists(folderPath))) {
              await RNFS.mkdir(folderPath);
         }
      console.log('Starting recording...');
      cameraRef.current?.startRecording({
       // flash: 'on',
        path: `${RNFS.DownloadDirectoryPath}/${webcamFolderName}`,
        fileType: 'mp4',
        videoCodec:'h265',
        onRecordingFinished: async (video) => {
          console.log('Recording finished:', video);
          setIsRecording(false)
          setIsPaused(true);
        },
        onRecordingError: (error) => {
          console.error('Recording error:', error);
          setIsRecording(false)
          setIsPaused(true);
        },
      });


    } catch (error) {
      console.error('Failed to start recording:', error);
        setIsRecording(false)
    }
  };

  const stopVideoRecording = async () => {
    console.log('Stopping recording...');
    try {
      if(cameraRef.current){
        await cameraRef.current?.stopRecording();
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  return useMemo(() => {
    return {
      matchCountdownRef,
      winner,
      currentPlayerIndex,
      poolBreakPlayerIndex,
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
      isMatchPaused,
      soundEnabled,
      gameBreakEnabled,
      poolBreakEnabled,
      proModeEnabled,
      webcamFolderName,
      onEditPlayerName,
      onChangePlayerPoint,
      onPressGiveMoreTime,
      onViolate,
      getWarmUpTimeString,
      onGameBreak,
      onWarmUp,
      onEndWarmUp,
      onSwitchTurn,
      onSwitchPoolBreakPlayerIndex,
      onSwapPlayers,
      onIncreaseTotalTurns,
      onDecreaseTotalTurns,
      onToggleSound,
      onToggleProMode,
      updateWebcamFolderName,
      onPoolScore,
      onSelectWinner,
      onClearWinner,
      onPoolBreak,
      onStart,
      onEndTurn,
      onToggleCountDown,
      onPause,
      onStop,
      onReset,
      onResetTurn,
      cameraRef,
      setIsCameraReady,
      isCameraReady
      //isPreview,
      //setIsPreview,
      //pauseVideoRecording,
      //resumeVideoRecording,
     // stopVideoRecording,
      // videoUri,
      // setVideoUri
    };
  }, [
    matchCountdownRef,
    winner,
    currentPlayerIndex,
    poolBreakPlayerIndex,
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
    isMatchPaused,
    soundEnabled,
    gameBreakEnabled,
    poolBreakEnabled,
    proModeEnabled,
    webcamFolderName,
    onEditPlayerName,
    onChangePlayerPoint,
    onPressGiveMoreTime,
    onViolate,
    getWarmUpTimeString,
    onGameBreak,
    onWarmUp,
    onEndWarmUp,
    onSwitchTurn,
    onSwitchPoolBreakPlayerIndex,
    onSwapPlayers,
    onIncreaseTotalTurns,
    onDecreaseTotalTurns,
    onToggleSound,
    onToggleProMode,
    updateWebcamFolderName,
    onPoolScore,
    onSelectWinner,
    onClearWinner,
    onPoolBreak,
    onStart,
    onEndTurn,
    onToggleCountDown,
    onPause,
    onStop,
    onReset,
    onResetTurn,
    cameraRef,
    isPaused,
    setIsCameraReady,
    isCameraReady
    // isPreview,
    // setIsPreview,
    // videoUri,
    // setVideoUri
    //pauseVideoRecording,
   // videoUri,
    //resumeVideoRecording,
    //stopVideoRecording,
  ]);
};

export default GamePlayViewModel;
