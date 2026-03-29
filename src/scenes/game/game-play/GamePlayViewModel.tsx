import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import RNFS from 'react-native-fs';
// import {captureRef} from 'react-native-view-shot';
import {useRealm} from '@realm/react';
import {RootState} from 'data/redux/reducers';
import {gameActions} from 'data/redux/actions/game';
import i18n from 'i18n';
import {Camera} from 'react-native-vision-camera';
import {goBack} from 'utils/navigation';
import {
  isPool10Game,
  isPool15FreeGame,
  isPool15Game,
  isPool15OnlyGame,
  isPool9Game,
  isPoolGame,
} from 'utils/game';
import Sound from 'utils/sound';
import RemoteControl from 'utils/remote';
import {Player, PlayerSettings} from 'types/player';
import {RemoteControlKeys} from 'types/bluetooth';
import {BallType, PoolBallType} from 'types/ball';
//import {MATCH_COUNTDOWN, WEBCAM_BASE_CAMERA_FOLDER} from 'constants/webcam';
import {NativeModules} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {LIVESTREAM_ACCOUNT_STORAGE_KEY} from 'config/livestreamAuth';
import {
  RECORDING_SEGMENT_DURATION_MS,
  MAX_REPLAY_STORAGE_BYTES,
  buildReplayFolderPath,
  ensureReplayFolder,
  registerReplaySegment,
  pruneReplayStorage,
} from 'services/replay/localReplay';
import {screens} from 'scenes/screens';
import {navigate} from 'utils/navigation';
import {
  createYouTubeLiveSession,
  getYouTubeLiveEligibility,
  type YouTubeEligibilityCheck,
  type YouTubeEligibilityResponse,
} from 'services/youtubeLiveFlow';
import {
  startYouTubeNativeLive,
  stopYouTubeNativeLive,
  subscribeYouTubeNativeLiveState,
} from 'services/youtubeNativeLive';

let countdownInterval: NodeJS.Timeout, warmUpCountdownInterval: NodeJS.Timeout;
const {CameraService} = NativeModules;

type Visibility = 'public' | 'private' | 'unlisted';

type StoredSetup = {
  accountName?: string;
  visibility?: Visibility;
  accountId?: string;
};

type StorageShape = {
  facebook?: StoredSetup;
  youtube?: StoredSetup;
  tiktok?: StoredSetup;
};

const setYouTubeNativeCameraLock = (locked: boolean) => {
  (globalThis as any).__APLUS_YOUTUBE_NATIVE_LOCK__ = locked;
};


const getCurrentCameraSource = (): 'back' | 'front' | 'external' => {
  const value = (globalThis as any).__APLUS_CURRENT_CAMERA_SOURCE__;
  return value === 'front' || value === 'external' ? value : 'back';
};

const setYouTubeSourceLock = (source: 'back' | 'front' | 'external' | null) => {
  (globalThis as any).__APLUS_YOUTUBE_SOURCE_LOCK__ = source;
};

const hasDetectedUvcSource = () => {
  return (globalThis as any).__APLUS_UVC_PRESENT__ === true;
};

const getAvailableCameraSources = (): Array<'back' | 'front' | 'external'> => {
  const sources = (globalThis as any).__APLUS_AVAILABLE_CAMERA_SOURCES__;
  return Array.isArray(sources) ? sources : [];
};

const normalizeAvailableCameraSources = (
  sources: Array<'back' | 'front' | 'external'>,
): Array<'back' | 'front' | 'external'> => {
  return Array.from(new Set(sources)).filter(
    (source): source is 'back' | 'front' | 'external' =>
      source === 'back' || source === 'front' || source === 'external',
  );
};

const resolveLockedLiveSource = (
  currentSource: 'back' | 'front' | 'external',
  availableSources: Array<'back' | 'front' | 'external'>,
): 'back' | 'front' | 'external' | null => {
  const normalizedSources = normalizeAvailableCameraSources(availableSources);
  const hasExternal =
    hasDetectedUvcSource() && normalizedSources.includes('external');

  if (currentSource === 'external') {
    return hasExternal ? 'external' : null;
  }

  if (currentSource === 'back' && normalizedSources.includes('back')) {
    return 'back';
  }

  if (currentSource === 'front' && normalizedSources.includes('front')) {
    return 'front';
  }

  if (normalizedSources.includes('back')) {
    return 'back';
  }

  if (normalizedSources.includes('front')) {
    return 'front';
  }

  if (currentSource === 'front' || currentSource === 'back') {
    return currentSource;
  }

  return null;
};

const GamePlayViewModel = () => {
  const realm = useRealm();
  const dispatch = useDispatch();
  const {updateGameSettings} = useSelector((state: RootState) => state.UI.game);
  const {gameSettings} = useSelector((state: RootState) => state.game);
  const selectedLivestreamPlatform =
    ((updateGameSettings as any)?.livestreamPlatform ||
      (gameSettings as any)?.livestreamPlatform ||
      null) as 'facebook' | 'youtube' | 'tiktok' | 'device' | null;
  const saveToDeviceWhileStreaming = Boolean(
    (updateGameSettings as any)?.saveToDeviceWhileStreaming ??
      (gameSettings as any)?.saveToDeviceWhileStreaming ??
      false,
  );
  const shouldUseYouTubeLive = selectedLivestreamPlatform === 'youtube';
  const shouldUseLocalRecordingOnly = selectedLivestreamPlatform !== 'youtube';
  const cameraRef = useRef<Camera>(null);
  const matchCountdownRef = useRef(null);
  const recordingRotateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRetryRef = useRef<NodeJS.Timeout | null>(null);
  const restartAfterStopRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isStoppingRecordingRef = useRef(false);
  const pendingStartRecordingRef = useRef(false);
  const lastRecordedVideoPathRef = useRef<string | undefined>(undefined);
  const recordingFinishedResolverRef = useRef<((videoPath?: string) => void) | null>(null);
  const recordingFinishedPromiseRef = useRef<Promise<string | undefined> | null>(null);
  const shouldStartRecordingRef = useRef(false);
  const pendingYouTubeNativeStartRef = useRef<{
    url: string;
    options: {
      width: number;
      height: number;
      fps: number;
      bitrate: number;
      audioBitrate: number;
      sampleRate: number;
      isStereo: boolean;
      cameraFacing: 'front' | 'back';
      sourceType: 'phone' | 'webcam';
    };
  } | null>(null);
  const isEndingGameRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [poolBreakPlayerIndex, setPoolBreakPlayerIndex] = useState<number>(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [warmUpCount, setWarmUpCount] = useState<number>();
  const [warmUpCountdownTime, setWarmUpCountdownTime] = useState<number>();
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>();
  const [winner, setWinner] = useState<Player>();
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const clearRecordingStartRetry = useCallback(() => {
    if (recordingStartRetryRef.current) {
      clearInterval(recordingStartRetryRef.current);
      recordingStartRetryRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recordingRotateTimeoutRef.current) {
        clearTimeout(recordingRotateTimeoutRef.current);
      }
      clearRecordingStartRetry();
    };
  }, [clearRecordingStartRetry]);

  useEffect(() => {
    const unsubscribe = subscribeYouTubeNativeLiveState(event => {
      console.log('[YouTubeNativeLive]', event);
      if (event?.type === 'error' && event?.message) {
        if (
          event.message.includes('cameraId was null') ||
          event.message.includes('webcam USB') ||
          event.message.includes('Không tìm thấy camera')
        ) {
          pendingYouTubeNativeStartRef.current = null;
          shouldStartRecordingRef.current = false;
          pendingStartRecordingRef.current = false;
          setYoutubeLivePreparing(false);
          setYoutubeLivePreviewActive(false);
          setIsCameraReady(false);
          setIsStarted(false);
          setYouTubeNativeCameraLock(false);
          setYouTubeSourceLock(null);
        }
        setYoutubeLiveOverlay({
          visible: true,
          title: 'Live YouTube lỗi',
          message: event.message,
          checks: [],
        });
      }
    });

    return () => {
      unsubscribe();
      void stopYouTubeNativeLive();
    };
  }, []);


  const readYouTubeVisibilityFromStorage = useCallback(
    async (): Promise<Visibility> => {
      try {
        const raw = await AsyncStorage.getItem(LIVESTREAM_ACCOUNT_STORAGE_KEY);
        if (!raw) {
          return 'public';
        }

        const parsed = JSON.parse(raw) as StorageShape;
        const visibility = parsed?.youtube?.visibility;

        if (
          visibility === 'public' ||
          visibility === 'private' ||
          visibility === 'unlisted'
        ) {
          return visibility;
        }

        return 'public';
      } catch (_error) {
        return 'public';
      }
    },
    [],
  );

  const now =
    gameSettings?.webcamFolderName != null
      ? gameSettings?.webcamFolderName
      : Date.now().toString();

  const [webcamFolderName, setWebcamFolderName] = useState<string>(now);

  const [isStarted, setIsStarted] = useState(
    gameSettings?.mode?.mode === 'fast' ? true : false,
  );

  type YouTubeLiveOverlayState = {
    visible: boolean;
    title: string;
    message: string;
    checks: YouTubeEligibilityCheck[];
  };

  const [youtubeLiveOverlay, setYoutubeLiveOverlay] =
    useState<YouTubeLiveOverlayState | null>(null);
  const [youtubeLivePreviewActive, setYoutubeLivePreviewActive] =
    useState(false);
  const [youtubeLivePreparing, setYoutubeLivePreparing] = useState(false);
  const [youtubeNativeStartNonce, setYoutubeNativeStartNonce] = useState(0);
  const youtubeLiveNativeMode = youtubeLivePreviewActive || youtubeLivePreparing;

  useEffect(() => {
    setYouTubeNativeCameraLock(youtubeLiveNativeMode);

    if (!youtubeLiveNativeMode) {
      setYouTubeSourceLock(null);
    }

    return () => {
      setYouTubeNativeCameraLock(false);
      setYouTubeSourceLock(null);
    };
  }, [youtubeLiveNativeMode]);

  useEffect(() => {
    if (shouldUseYouTubeLive) {
      return;
    }

    pendingYouTubeNativeStartRef.current = null;
    setYoutubeLivePreparing(false);
    setYoutubeLivePreviewActive(false);
    setYouTubeNativeCameraLock(false);
    setYouTubeSourceLock(null);
  }, [shouldUseYouTubeLive]);

  useEffect(() => {
    if (!youtubeLiveNativeMode || !isCameraReady) {
      return;
    }

    const pending = pendingYouTubeNativeStartRef.current;
    if (!pending) {
      return;
    }

    pendingYouTubeNativeStartRef.current = null;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (cancelled) {
            return;
          }

          console.log('[YouTube Live] native start requested');
          await startYouTubeNativeLive(pending.url, pending.options);
        } catch (error: any) {
          console.log('[YouTube Live] native start failed:', error);
          pendingYouTubeNativeStartRef.current = null;
          setYoutubeLivePreparing(false);
          setYoutubeLivePreviewActive(false);
          setIsCameraReady(false);
          setIsStarted(false);
          setYouTubeNativeCameraLock(false);
          setYouTubeSourceLock(null);
          setYoutubeLiveOverlay({
            visible: true,
            title: 'Live YouTube lỗi',
            message: error?.message || 'Không thể bắt đầu live YouTube.',
            checks: [],
          });
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isCameraReady, youtubeLiveNativeMode, youtubeNativeStartNonce]);

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMatchPaused, setIsMatchPaused] = useState<boolean>(false);
  const [gameBreakEnabled, setGameBreakEnabled] = useState<boolean>(false);
  const [poolBreakEnabled, setPoolBreakEnabled] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [proModeEnabled, setProModeEnabled] = useState(
  !isPoolGame(gameSettings?.category) && gameSettings?.mode?.mode !== 'fast',
);

  // useEffect(() => {
  //      if(!hasPermission){
  //        requestPermission()
  //      }
  // }, [hasPermission]);

  useEffect(() => {
  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.START,
    isStarted ? onPause : onStart,
  );

  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.WARM_UP,
    warmUpCountdownTime ? onEndWarmUp : onWarmUp,
  );

  // Stop chỉ dừng countdown lượt
  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.STOP,
    onToggleCountDown,
  );

  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.BREAK,
    onPoolBreak,
  );

  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.EXTENSION,
    onPressGiveMoreTime,
  );

  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.TIMER,
    onResetTurn,
  );

  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.NEW_GAME,
    onReset,
  );

  // Lên / xuống = tăng giảm điểm
  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.UP,
    onChangePlayerPoint.bind(GamePlayViewModel, 1, currentPlayerIndex, 0),
  );

  RemoteControl.instance.registerKeyEvents(
    RemoteControlKeys.DOWN,
    onChangePlayerPoint.bind(GamePlayViewModel, -1, currentPlayerIndex, 0),
  );

  // Trái / phải = đổi lượt
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
      !isPool15Game(gameSettings?.category) &&
      gameSettings?.mode?.countdownTime
    ) {
      setPoolBreakEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSettings]);

  useEffect(() => {
    if (!isStarted || isPaused || !isCameraReady) {
      clearRecordingStartRetry();
      return;
    }

    if (youtubeLiveNativeMode) {
      clearRecordingStartRetry();
      return;
    }

    if (!shouldStartRecordingRef.current && !pendingStartRecordingRef.current) {
      return;
    }

    if (isRecordingRef.current || isStoppingRecordingRef.current) {
      return;
    }

    if (recordingStartRetryRef.current) {
      return;
    }

    console.log('[Replay] auto start recording after camera ready');

    let attempts = 0;
    recordingStartRetryRef.current = setInterval(() => {
      attempts += 1;
      console.log('[Replay] start retry attempt:', attempts);

      const started = startVideoRecording();

      if (started) {
        shouldStartRecordingRef.current = false;
        pendingStartRecordingRef.current = false;
        clearRecordingStartRetry();
        return;
      }

      if (attempts >= 12) {
        console.log('[Replay] failed to start recording after retries');
        shouldStartRecordingRef.current = false;
        pendingStartRecordingRef.current = false;
        clearRecordingStartRetry();
      }
    }, 500);

    return () => {
      clearRecordingStartRetry();
    };
  }, [
    isStarted,
    isPaused,
    isCameraReady,
    isRecording,
    clearRecordingStartRetry,
    webcamFolderName,
    youtubeLivePreviewActive,
  ]);

  useEffect(() => {
    if (!isStarted || isPaused) {
      return;
    }

    countdownInterval = setInterval(() => {
      setTotalTime(prev => prev + 1);

      if (!isMatchPaused && !poolBreakEnabled) {
        setCountdownTime(prev =>
          typeof prev === 'number' && prev > 0 ? prev - 1 : 0,
        );
      }
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [isStarted, isPaused, isMatchPaused, poolBreakEnabled]);

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
      !gameSettings?.mode?.countdownTime ||
      (typeof playerSettings.playingPlayers[currentPlayerIndex].proMode
        ?.extraTimeTurns === 'number' &&
        playerSettings.playingPlayers[currentPlayerIndex].proMode
          ?.extraTimeTurns <= 0)
    ) {
      return;
    }

    const extraTimeBonus = Number(gameSettings.mode?.extraTimeBonus || 0);
    if (extraTimeBonus <= 0) {
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

    setCountdownTime(prev => prev + extraTimeBonus);
    setIsMatchPaused(false);
    setPlayerSettings({...playerSettings, playingPlayers: newPlayingPlayers});
  }, [
    isStarted,
    playerSettings,
    currentPlayerIndex,
    gameSettings,
    setCountdownTime,
    setIsMatchPaused,
  ]);

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

  const onSelectWinnerByIndex = useCallback(
    (playerIndex: number, addMatchPoint?: boolean) => {
      if (!playerSettings?.playingPlayers?.[playerIndex]) {
        return;
      }

      const winnerPlayer = playerSettings.playingPlayers[playerIndex];
      setWinner(winnerPlayer);

      if (!addMatchPoint) {
        return;
      }

      setPlayerSettings(
        prev =>
          ({
            ...prev,
            playingPlayers: prev?.playingPlayers.map((player, currentIndex) => {
              if (playerIndex === currentIndex) {
                return {...player, totalPoint: player.totalPoint + 1};
              }

              return player;
            }),
          } as PlayerSettings),
      );
    },
    [playerSettings],
  );

  const onSelectWinner = useCallback(() => {
    onSelectWinnerByIndex(
      currentPlayerIndex,
      isPool9Game(gameSettings?.category) || isPool10Game(gameSettings?.category),
    );
  }, [currentPlayerIndex, gameSettings?.category, onSelectWinnerByIndex]);

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

  const onPool15OnlyScore = useCallback(
    (playerIndex: number) => {
      if (
        !isStarted ||
        !playerSettings ||
        !isPool15OnlyGame(gameSettings?.category) ||
        winner
      ) {
        return;
      }

      const targetPlayer = playerSettings.playingPlayers[playerIndex];
      if (!targetPlayer) {
        return;
      }

      const nextPoint = Math.min(8, Number(targetPlayer.totalPoint || 0) + 1);
      const newPlayingPlayers = playerSettings.playingPlayers.map(
        (player, index) => {
          if (index === playerIndex) {
            return {
              ...player,
              totalPoint: nextPoint,
            } as Player;
          }

          return player;
        },
      );

      setPlayerSettings({...playerSettings, playingPlayers: newPlayingPlayers});

      if (nextPoint >= 8) {
        setWinner(newPlayingPlayers[playerIndex]);
      }
    },
    [gameSettings?.category, isStarted, playerSettings, winner],
  );

  const onPoolScore = useCallback(
    (ball: PoolBallType) => {
      if (
        !isStarted ||
        !playerSettings ||
        !isPoolGame(gameSettings?.category) ||
        winner
      ) {
        return;
      }

      const newPlayingPlayers = playerSettings.playingPlayers.map(
        (player, index) => {
          if (currentPlayerIndex === index) {
            const nextScoredBalls = [...(player.scoredBalls || []), ball];
            return {
              ...player,
              scoredBalls: nextScoredBalls,
              totalPoint: isPool15FreeGame(gameSettings?.category)
                ? nextScoredBalls.length
                : player.totalPoint,
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
        case isPool15FreeGame(gameSettings?.category): {
          const totalScoredBalls = newPlayingPlayers.reduce(
            (sum, player) => sum + (player.scoredBalls?.length || 0),
            0,
          );

          if (totalScoredBalls >= 15) {
            const [firstPlayer, secondPlayer] = newPlayingPlayers;
            const winnerIndex =
              Number(firstPlayer?.totalPoint || 0) >=
              Number(secondPlayer?.totalPoint || 0)
                ? 0
                : 1;
            setWinner(newPlayingPlayers[winnerIndex]);
          }
          break;
        }
        default:
          break;
      }
    },
    [
      currentPlayerIndex,
      gameSettings?.category,
      isStarted,
      onSelectWinner,
      playerSettings,
      winner,
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

  const onToggleProMode = useCallback(() => {}, []);

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
    const extraTimeBonus = gameSettings.mode?.extraTimeBonus || 0;
    setCountdownTime(gameSettings.mode?.countdownTime! + extraTimeBonus);
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

      const totalPlayers = Math.max(
        2,
        playerSettings?.playingPlayers?.length ||
          gameSettings.players?.playingPlayers?.length ||
          0,
      );

      let nextPlayerIndex = 0,
        newTotalTurns: number | null = null;

      switch (true) {
        case isPrevious && currentPlayerIndex - 1 < 0:
          nextPlayerIndex = totalPlayers - 1;
          newTotalTurns = totalTurns + 1;
          break;
        case isPrevious:
          nextPlayerIndex = currentPlayerIndex - 1;
          break;
        case !isPrevious && currentPlayerIndex + 1 > totalPlayers - 1:
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

      if (newTotalTurns !== null) {
        setTotalTurns(newTotalTurns);
      }
    },
    [
      isStarted,
      currentPlayerIndex,
      totalTurns,
      gameSettings,
      playerSettings,
      _resetCountdown,
    ],
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

  const dismissYouTubeLiveOverlay = useCallback(() => {
    setYoutubeLiveOverlay(null);
  }, []);

  const openYouTubeLiveLogin = useCallback(() => {
    setYoutubeLiveOverlay(null);
    navigate(screens.livePlatformSetupYoutube);
  }, []);

  const buildYouTubeLiveOverlay = useCallback(
    (
      eligibility: YouTubeEligibilityResponse | null,
      fallbackMessage?: string,
    ): YouTubeLiveOverlayState => {
      const subscriberCount = eligibility?.subscriberCount;
      const hiddenSubscriberCount = Boolean(eligibility?.hiddenSubscriberCount);
      const liveEnabled = eligibility?.liveEnabled;
      const liveEnabledReason = eligibility?.liveEnabledReason || fallbackMessage || '';

      const subscriberCheck: YouTubeEligibilityCheck = {
        key: 'subscribers',
        label: 'Tối thiểu 50 người đăng ký',
        status:
          typeof subscriberCount === 'number'
            ? subscriberCount >= 50
              ? 'pass'
              : 'fail'
            : hiddenSubscriberCount
            ? 'unknown'
            : 'unknown',
        detail:
          typeof subscriberCount === 'number'
            ? `Kênh hiện có ${subscriberCount} người đăng ký.`
            : hiddenSubscriberCount
            ? 'Không đọc được số người đăng ký vì kênh đang ẩn số người đăng ký.'
            : 'Không đọc được số người đăng ký của kênh.',
      };

      const liveEnabledCheck: YouTubeEligibilityCheck = {
        key: 'liveEnabled',
        label: 'Phát trực tiếp đã bật',
        status:
          liveEnabled === true ? 'pass' : liveEnabled === false ? 'fail' : 'unknown',
        detail:
          liveEnabled === true
            ? 'Kênh hiện có thể dùng tính năng phát trực tiếp.'
            : liveEnabled === false
            ? liveEnabledReason || 'YouTube báo kênh hiện chưa được bật quyền livestream.'
            : 'Chưa xác định được trạng thái phát trực tiếp từ YouTube.',
      };

      return {
        visible: true,
        title: 'Chưa thể live YouTube',
        message:
          fallbackMessage ||
          eligibility?.message ||
          'Để live YouTube, kênh cần từ 50 người đăng ký và tính năng Phát trực tiếp phải dùng được.',
        checks: [subscriberCheck, liveEnabledCheck],
      };
    },
    [],
  );

  const showYouTubeLiveFailure = useCallback(
    (
      eligibility: YouTubeEligibilityResponse | null,
      fallbackMessage?: string,
    ) => {
      const overlayState = buildYouTubeLiveOverlay(eligibility, fallbackMessage);
      setYoutubeLiveOverlay(overlayState);
    },
    [buildYouTubeLiveOverlay],
  );


  const onStart = useCallback(async () => {
    if (isStarted) {
      return;
    }

    const freeDisk =
      (await DeviceInfo.getFreeDiskStorage()) / (1024 * 1024 * 1024);

    console.log('Free disk storae ' + freeDisk);

    if (freeDisk <= 10) {
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
      return;
    }

    console.log('[Replay] onStart pressed');
    console.log('[Live] selected platform:', selectedLivestreamPlatform, {
      saveToDeviceWhileStreaming,
      shouldUseYouTubeLive,
      shouldUseLocalRecordingOnly,
    });

    const currentSource = getCurrentCameraSource();
    const availableSources = normalizeAvailableCameraSources(
      getAvailableCameraSources(),
    );
    const hasExternalSource =
      hasDetectedUvcSource() && availableSources.includes('external');

    const lockedLiveSource = resolveLockedLiveSource(
      currentSource,
      availableSources,
    );

    if (currentSource === 'external' && !hasExternalSource) {
      Alert.alert(
        'Chưa nhận được webcam USB',
        'App chưa thấy webcam ngoài. Hãy kiểm tra OTG/nguồn và cắm lại webcam rồi thử lại.',
      );
      return;
    }

    if (!lockedLiveSource) {
      Alert.alert(
        'Không tìm thấy camera',
        'Thiết bị hiện không có nguồn camera phù hợp để bắt đầu live.',
      );
      return;
    }

    const nativeSourceType =
      lockedLiveSource === 'external' ? 'webcam' : 'phone';
    const nativePhoneFacing = lockedLiveSource === 'front' ? 'front' : 'back';

    if (!shouldUseYouTubeLive) {
      console.log('[Live] local recording mode only:', {
        selectedLivestreamPlatform,
        currentSource,
        availableSources,
        lockedLiveSource,
      });

      pendingYouTubeNativeStartRef.current = null;
      setYoutubeLiveOverlay(null);
      setYoutubeLivePreparing(false);
      setYoutubeLivePreviewActive(false);
      setYouTubeNativeCameraLock(false);
      setYouTubeSourceLock(null);
      shouldStartRecordingRef.current = true;
      pendingStartRecordingRef.current = true;
      setIsStarted(true);
      return;
    }

    setYouTubeSourceLock(lockedLiveSource);
    console.log('[YouTube Live] source resolved:', {
      currentSource,
      availableSources,
      lockedLiveSource,
      nativeSourceType,
      nativePhoneFacing,
    });

    shouldStartRecordingRef.current = false;
    pendingStartRecordingRef.current = false;
    pendingYouTubeNativeStartRef.current = null;
    setYoutubeLiveOverlay(null);
    setYoutubeLivePreparing(true);
    setYoutubeLivePreviewActive(false);
    setIsCameraReady(false);
    setIsStarted(true);

    const firstPlayerName =
      playerSettings?.playingPlayers?.[0]?.name?.trim() || 'Player 1';
    const secondPlayerName =
      playerSettings?.playingPlayers?.[1]?.name?.trim() || 'Player 2';

    const youtubeTitle = `${firstPlayerName} vs ${secondPlayerName} - ${new Date().toLocaleString()}`;

    void (async () => {
      try {
        await stopYouTubeNativeLive();
        await stopVideoRecording(false);

        const selectedLiveVisibility =
          await readYouTubeVisibilityFromStorage();

        const liveResponse = await createYouTubeLiveSession({
          title: youtubeTitle,
          description: `Live score từ trận đấu ${firstPlayerName} vs ${secondPlayerName}`,
          privacyStatus: selectedLiveVisibility,
          enableAutoStart: true,
          enableAutoStop: true,
        });

        console.log('[YouTube Live] created:', liveResponse?.session);

        pendingYouTubeNativeStartRef.current = {
          url: liveResponse.session.streamUrlWithKey,
          options: {
            width: 1280,
            height: 720,
            fps: 30,
            bitrate: 4500 * 1024,
            audioBitrate: 128 * 1024,
            sampleRate: 44100,
            isStereo: true,
            cameraFacing: nativePhoneFacing,
            sourceType: nativeSourceType,
          },
        };

        setYoutubeLivePreviewActive(true);
        setYoutubeLivePreparing(false);
        setYoutubeNativeStartNonce(value => value + 1);
      } catch (error: any) {
        console.log('[YouTube Live] create failed:', error);

        pendingYouTubeNativeStartRef.current = null;
        setYoutubeLivePreparing(false);
        setYoutubeLivePreviewActive(false);
        setIsCameraReady(false);
        setIsStarted(false);
        setYouTubeSourceLock(null);

        try {
          await stopYouTubeNativeLive();
        } catch {}

        const payload = error?.payload as YouTubeEligibilityResponse | undefined;
        const fallbackMessage =
          payload?.message ||
          error?.message ||
          'Không thể khởi tạo live YouTube.';

        try {
          const eligibility =
            payload?.checks?.length || payload?.subscriberCount !== undefined
              ? payload
              : await getYouTubeLiveEligibility();

          showYouTubeLiveFailure(eligibility, fallbackMessage);
        } catch (eligibilityError: any) {
          console.log('[YouTube Live] eligibility failed:', eligibilityError);

          showYouTubeLiveFailure(
            null,
            fallbackMessage ||
              eligibilityError?.message ||
              'Không thể kiểm tra điều kiện YouTube.',
          );
        }
      }
    })();
  }, [
    isStarted,
    playerSettings,
    readYouTubeVisibilityFromStorage,
    saveToDeviceWhileStreaming,
    selectedLivestreamPlatform,
    shouldUseLocalRecordingOnly,
    shouldUseYouTubeLive,
    showYouTubeLiveFailure,
  ]);

  const onToggleCountDown = useCallback(() => {
    if (!isStarted || isPaused) {
      return;
    }

    setIsMatchPaused(prev => !prev);
  }, [isStarted, isPaused]);

  const onPause = useCallback(async () => {
    if (isPaused) {
      _resetCountdown(true);

      if (!youtubeLiveNativeMode) {
        shouldStartRecordingRef.current = true;
        pendingStartRecordingRef.current = true;
      }
    } else {
      clearInterval(countdownInterval);
      shouldStartRecordingRef.current = false;
      pendingStartRecordingRef.current = false;

      if (!youtubeLiveNativeMode) {
        await stopVideoRecording(false);
      }
    }

    setIsPaused(prev => !prev);
  }, [isPaused, _resetCountdown, youtubeLiveNativeMode]);

  const onStop = useCallback(async () => {
  Alert.alert(i18n.t('stop'), i18n.t('msgStopGame'), [
    {
      text: i18n.t('txtCancel'),
      style: 'cancel',
    },
    {
      text: i18n.t('stop'),
      onPress: async () => {
        if (isEndingGameRef.current) {
          return;
        }

        isEndingGameRef.current = true;

        try {
          shouldStartRecordingRef.current = false;
          pendingStartRecordingRef.current = false;
          pendingYouTubeNativeStartRef.current = null;
          setYoutubeLivePreparing(false);
          await stopYouTubeNativeLive();
          setYoutubeLivePreviewActive(false);
          setIsCameraReady(false);

          const recordedPath =
            (await stopVideoRecording(false)) ??
            (await getLatestReplaySegmentPath());

          console.log('[Replay] recorded path before endGame:', recordedPath);

          if (!recordedPath) {
            isEndingGameRef.current = false;

            Alert.alert(
              i18n.t('txtwarn'),
              totalTime > 0
                ? 'Video chưa khả dụng. Bạn có muốn thoát trận và không lưu video xem lại không?'
                : 'Bạn chưa bắt đầu quay. Bạn có muốn thoát trận luôn không?',
              [
                {
                  text: i18n.t('txtCancel'),
                  style: 'cancel',
                },
                {
                  text: 'Thoát không lưu',
                  style: 'destructive',
                  onPress: () => {
                    goBack();
                  },
                },
              ],
            );

            return;
          }

          dispatch(
            gameActions.endGame({
              realm,
              gameSettings: {
                ...gameSettings,
                players: playerSettings,
                totalTime,
                webcamFolderName,
                replayPath: recordedPath,
              },
            }),
          );

          goBack();
        } catch (error) {
          isEndingGameRef.current = false;
          console.error(JSON.stringify(error));
        }
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
    const shouldResetRackScore = isPool15Game(gameSettings?.category);

    const newPlayerSettings = {
      ...playerSettings,
      playingPlayers: playerSettings?.playingPlayers.map(player => ({
        ...player,
        totalPoint: shouldResetRackScore ? 0 : player.totalPoint,
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
    setWinner(undefined);

    if (
      isPoolGame(gameSettings?.category) &&
      gameSettings?.mode?.countdownTime
    ) {
      const extraTimeBonus = gameSettings.mode?.extraTimeBonus || 0;
      setCountdownTime(gameSettings.mode?.countdownTime! + extraTimeBonus);
      setPoolBreakEnabled(!isPool15Game(gameSettings?.category));
    }

    if (isPool15Game(gameSettings?.category)) {
      setIsMatchPaused(false);
      return;
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

  const getLatestReplaySegmentPath = async () => {
    try {
      const folderPath = buildReplayFolderPath(webcamFolderName);
      const folderExists = await RNFS.exists(folderPath);

      if (!folderExists) {
        return undefined;
      }

      const entries = await RNFS.readDir(folderPath);
      const files = entries.filter(entry => entry.isFile());

      if (!files.length) {
        return undefined;
      }

      files.sort((a, b) => {
        const aTime = a.mtime ? new Date(a.mtime).getTime() : 0;
        const bTime = b.mtime ? new Date(b.mtime).getTime() : 0;
        return bTime - aTime;
      });

      return files[0].path;
    } catch (error) {
      console.log('[Replay] Failed to get latest replay segment:', error);
      return undefined;
    }
  };

  const startVideoRecording = () => {
    if (!cameraRef.current) {
      console.log('[Replay] skip start: cameraRef null');
      return false;
    }

    if (isRecordingRef.current) {
      console.log('[Replay] skip start: already recording');
      return true;
    }

    if (isStoppingRecordingRef.current) {
      console.log('[Replay] skip start: stopping in progress');
      return false;
    }

    try {
      restartAfterStopRef.current = false;
      isStoppingRecordingRef.current = false;
      lastRecordedVideoPathRef.current = undefined;
      setIsRecording(true);

      recordingFinishedPromiseRef.current = new Promise(resolve => {
        recordingFinishedResolverRef.current = resolve;
      });

      if (recordingRotateTimeoutRef.current) {
        clearTimeout(recordingRotateTimeoutRef.current);
      }

      console.log('Starting recording...');
      cameraRef.current.startRecording({
        fileType: 'mp4',
        videoCodec: 'h264',
        onRecordingFinished: async video => {
          console.log('Recording finished:', video?.path);
          setIsRecording(false);
          isStoppingRecordingRef.current = false;

          if (recordingRotateTimeoutRef.current) {
            clearTimeout(recordingRotateTimeoutRef.current);
            recordingRotateTimeoutRef.current = null;
          }

          let finalPath = video?.path;

          try {
            if (video?.path) {
              const replayFolderPath = await ensureReplayFolder(webcamFolderName);
              const segmentFileName = `segment_${Date.now()}.mp4`;
              const targetPath = `${replayFolderPath}/${segmentFileName}`;

              try {
                await RNFS.moveFile(video.path, targetPath);
                finalPath = targetPath;
              } catch (moveError) {
                console.log('[Replay] moveFile failed, trying copy:', moveError);
                await RNFS.copyFile(video.path, targetPath);
                finalPath = targetPath;
              }

              await registerReplaySegment(webcamFolderName, finalPath);
              await pruneReplayStorage(MAX_REPLAY_STORAGE_BYTES, [webcamFolderName]);
            }
          } catch (segmentError) {
            console.error('Failed to register replay segment:', segmentError);
          } finally {
            lastRecordedVideoPathRef.current = finalPath;
            recordingFinishedResolverRef.current?.(finalPath);
            recordingFinishedResolverRef.current = null;
            recordingFinishedPromiseRef.current = null;
          }

          if (restartAfterStopRef.current) {
            restartAfterStopRef.current = false;
            pendingStartRecordingRef.current = true;
          }
        },
        onRecordingError: error => {
          console.error('Recording error:', error);
          setIsRecording(false);
          isStoppingRecordingRef.current = false;

          if (recordingRotateTimeoutRef.current) {
            clearTimeout(recordingRotateTimeoutRef.current);
            recordingRotateTimeoutRef.current = null;
          }

          recordingFinishedResolverRef.current?.(undefined);
          recordingFinishedResolverRef.current = null;
          recordingFinishedPromiseRef.current = null;
        },
      });

      recordingRotateTimeoutRef.current = setTimeout(async () => {
        if (!isRecordingRef.current || isStoppingRecordingRef.current) {
          return;
        }

        try {
          pendingStartRecordingRef.current = true;
          await stopVideoRecording(true);
        } catch (rotationError) {
          console.error('Failed to rotate recording:', rotationError);
        }
      }, RECORDING_SEGMENT_DURATION_MS);

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      isStoppingRecordingRef.current = false;
      recordingFinishedResolverRef.current?.(undefined);
      recordingFinishedResolverRef.current = null;
      recordingFinishedPromiseRef.current = null;
      return false;
    }
  };

  const stopVideoRecording = async (restartAfterStop = false) => {
    if (recordingRotateTimeoutRef.current) {
      clearTimeout(recordingRotateTimeoutRef.current);
      recordingRotateTimeoutRef.current = null;
    }

    restartAfterStopRef.current = restartAfterStop;

    if (isStoppingRecordingRef.current) {
      console.log('[Replay] skip stop: already stopping');
      return (
        (await recordingFinishedPromiseRef.current) ??
        lastRecordedVideoPathRef.current ??
        (await getLatestReplaySegmentPath())
      );
    }

    if (!cameraRef.current || !isRecordingRef.current) {
      console.log('[Replay] skip stop: not recording');
      return lastRecordedVideoPathRef.current ?? (await getLatestReplaySegmentPath());
    }

    isStoppingRecordingRef.current = true;
    console.log('Stopping recording...');

    try {
      const waitForFinish =
        recordingFinishedPromiseRef.current ||
        new Promise<string | undefined>(resolve => resolve(undefined));

      await cameraRef.current.stopRecording();

      let recordedPath = await waitForFinish;

      if (!recordedPath) {
        await new Promise(resolve => setTimeout(resolve, 700));
        recordedPath =
          lastRecordedVideoPathRef.current ?? (await getLatestReplaySegmentPath());
      }

      console.log('[Replay] stopVideoRecording finished with path:', recordedPath);
      return recordedPath;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      isStoppingRecordingRef.current = false;
      restartAfterStopRef.current = false;
      return lastRecordedVideoPathRef.current ?? (await getLatestReplaySegmentPath());
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
      onPool15OnlyScore,
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
      youtubeLiveOverlay,
      youtubeLivePreviewActive,
      dismissYouTubeLiveOverlay,
      openYouTubeLiveLogin,
      cameraRef,
      setIsCameraReady,
      isCameraReady,
      isRecording,
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
    onPool15OnlyScore,
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
    youtubeLiveOverlay,
    youtubeLivePreviewActive,
    dismissYouTubeLiveOverlay,
    openYouTubeLiveLogin,
    cameraRef,
    isPaused,
    setIsCameraReady,
    isCameraReady,
    isRecording,
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