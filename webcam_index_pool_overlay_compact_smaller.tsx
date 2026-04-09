import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform, useWindowDimensions} from 'react-native';
import {
  Image as RNImage,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  View as RNView,
} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Video from 'components/Video';

import images from 'assets';
import i18n from 'i18n';
import colors from 'configuration/colors';
import {keys} from 'configuration/keys';

import WebCamViewModel, {Props} from './WebCamViewModel';
import YouTubeAndroidLivePreview from './YouTubeAndroidLivePreview';
import LiveStreamImages from '../../livestream-images';
import PoolBroadcastScoreboard from 'components/PoolBroadcastScoreboard';
import CaromBroadcastScoreboard from 'components/CaromBroadcastScoreboard';
import {isCaromGame, isPool10Game, isPool15Game, isPool9Game} from 'utils/game';
import {
  EMPTY_POOL_CAMERA_SCOREBOARD_STATE,
  subscribePoolCameraScoreboardState,
  type PoolCameraScoreboardState,
} from './poolScoreboardStore';
import {
  EMPTY_CAROM_CAMERA_SCOREBOARD_STATE,
  subscribeCaromCameraScoreboardState,
  type CaromCameraScoreboardState,
} from './caromScoreboardStore';
import {
  getCameraFullscreen,
  setCameraFullscreen,
  subscribeCameraFullscreen,
} from '../../cameraFullscreenStore';

const BASE_ZOOM_STEPS = [1, 2, 5, 10];

const DEBUG_CAMERA = false;

type ThumbnailOverlayData = {
  enabled: boolean;
  topLeft: string[];
  topRight: string[];
  bottomLeft: string[];
  bottomRight: string[];
};

const EMPTY_THUMBNAILS: ThumbnailOverlayData = {
  enabled: false,
  topLeft: [],
  topRight: [],
  bottomLeft: [],
  bottomRight: [],
};

const debugCameraLog = (...args: any[]) => {
  if (__DEV__ && DEBUG_CAMERA) {
    console.log(...args);
  }
};

type CameraZoomInfo = {
  supported?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoom?: number;
  source?: string;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

const getNearestStepIndex = (steps: number[], value: number) => {
  if (!steps.length) {
    return 0;
  }

  return steps.reduce((bestIndex, step, index) => {
    const bestDistance = Math.abs(steps[bestIndex] - value);
    const currentDistance = Math.abs(step - value);
    return currentDistance < bestDistance ? index : bestIndex;
  }, 0);
};

const formatZoomLabel = (value: number) => {
  if (value >= 10 || Number.isInteger(value)) {
    return `${value.toFixed(0)}x`;
  }

  return `${value.toFixed(1)}x`;
};

const getYouTubeSourceLock = (): 'back' | 'front' | 'external' | null => {
  const value = (globalThis as any).__APLUS_YOUTUBE_SOURCE_LOCK__;
  return value === 'back' || value === 'front' || value === 'external'
    ? value
    : null;
};

const getCurrentCameraSourceSnapshot = (): 'back' | 'front' | 'external' | null => {
  const value = (globalThis as any).__APLUS_CURRENT_CAMERA_SOURCE__;
  return value === 'back' || value === 'front' || value === 'external'
    ? value
    : null;
};

const hasDetectedExternalWebcam = (): boolean => {
  return (globalThis as any).__APLUS_UVC_PRESENT__ === true;
};

type RecordingInfo = {
  state?: 'idle' | 'starting' | 'recording' | 'stopping';
  activeBackend?: 'vision' | 'uvc' | 'youtube-native' | null;
  source?: 'back' | 'front' | 'external';
  isRecording?: boolean;
};

const getCameraRecordingInfo = (cameraRef: any): RecordingInfo => {
  const fromRef = cameraRef?.current?.getRecordingInfo?.();
  if (fromRef) {
    return fromRef;
  }

  return (globalThis as any).__APLUS_CAMERA_RECORDING_SNAPSHOT__ || {
    state: 'idle',
    activeBackend: null,
    source: 'back',
    isRecording: false,
  };
};

type WebCamComponentProps = Props & {
  hideBottomControls?: boolean;
};

export type WebCamHandle = {
  refresh: () => void;
  switchCamera: () => void;
  rewatch: () => void;
  canRefresh: () => boolean;
  canSwitchCamera: () => boolean;
  canRewatch: () => boolean;
};

const LiveStreamImagesOverlay = memo(
  ({
    fullscreenMode = false,
    compactMode = false,
  }: {
    fullscreenMode?: boolean;
    compactMode?: boolean;
  }) => {
    const [state, setState] = useState<PoolCameraScoreboardState>(
      EMPTY_POOL_CAMERA_SCOREBOARD_STATE,
    );

    useEffect(() => {
      return subscribePoolCameraScoreboardState(setState);
    }, []);

    return (
      <RNView pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LiveStreamImages
          currentPlayerIndex={state.currentPlayerIndex}
          countdownTime={state.countdownTime}
          gameSettings={state.gameSettings}
          playerSettings={state.playerSettings}
          variant={fullscreenMode ? 'fullscreen' : 'embedded'}
          compact={compactMode}
        />
      </RNView>
    );
  },
);

const PoolScoreboardOverlay = memo(
  ({
    fullscreenMode = false,
    compactMode = false,
  }: {
    fullscreenMode?: boolean;
    compactMode?: boolean;
  }) => {
    const [state, setState] = useState<PoolCameraScoreboardState>(
      EMPTY_POOL_CAMERA_SCOREBOARD_STATE,
    );

    useEffect(() => {
      return subscribePoolCameraScoreboardState(setState);
    }, []);

    const poolCategory = state.gameSettings?.category;
    const shouldShowPool =
      isPool9Game(poolCategory) ||
      isPool10Game(poolCategory) ||
      isPool15Game(poolCategory);

    if (!shouldShowPool) {
      return null;
    }

    const scoreboard = (
      <PoolBroadcastScoreboard
        currentPlayerIndex={state.currentPlayerIndex}
        countdownTime={state.countdownTime}
        gameSettings={state.gameSettings}
        playerSettings={state.playerSettings}
        variant={fullscreenMode ? 'fullscreen' : 'camera'}
        bottomOffset={fullscreenMode ? 18 : compactMode ? 4 : 12}
      />
    );

    if (!compactMode || fullscreenMode) {
      return scoreboard;
    }

    return (
      <RNView pointerEvents="none" style={styles.poolScoreboardCompactOverlay}>
        <RNView style={styles.poolScoreboardCompactScale}>{scoreboard}</RNView>
      </RNView>
    );
  },
);

const CaromScoreboardOverlay = memo(
  ({
    fullscreenMode = false,
    compactMode = false,
  }: {
    fullscreenMode?: boolean;
    compactMode?: boolean;
  }) => {
    const [state, setState] = useState<CaromCameraScoreboardState>(
      EMPTY_CAROM_CAMERA_SCOREBOARD_STATE,
    );

    useEffect(() => {
      return subscribeCaromCameraScoreboardState(setState);
    }, []);

    const shouldShowCarom = isCaromGame(state.gameSettings?.category);
    if (!shouldShowCarom) {
      return null;
    }

    const scoreboard = (
      <CaromBroadcastScoreboard
        currentPlayerIndex={state.currentPlayerIndex}
        countdownTime={state.countdownTime}
        totalTurns={state.totalTurns}
        gameSettings={state.gameSettings}
        playerSettings={state.playerSettings}
        variant={fullscreenMode ? 'fullscreen' : 'camera'}
        bottomOffset={fullscreenMode ? 12 : compactMode ? -4 : -6}
      />
    );

    if (!compactMode && !fullscreenMode) {
      return scoreboard;
    }

    if (fullscreenMode) {
      return (
        <RNView pointerEvents="none" style={styles.caromScoreboardFullscreenOverlay}>
          <RNView style={styles.caromScoreboardFullscreenScale}>{scoreboard}</RNView>
        </RNView>
      );
    }

    return (
      <RNView pointerEvents="none" style={styles.caromScoreboardCompactOverlay}>
        <RNView style={styles.caromScoreboardCompactScale}>{scoreboard}</RNView>
      </RNView>
    );
  },
);

const WebCam = forwardRef<WebCamHandle, WebCamComponentProps>((props, ref) => {
  const viewModel = WebCamViewModel(props);
  const {width, height} = useWindowDimensions();
  const isHandheldLandscape =
    width > height && Math.max(width, height) <= 1400 && Math.min(width, height) <= 900;

  const [isFullscreen, setIsFullscreenLocal] = useState(getCameraFullscreen());
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomSteps, setZoomSteps] = useState<number[]>(BASE_ZOOM_STEPS);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [thumbnailOverlay, setThumbnailOverlay] =
    useState<ThumbnailOverlayData>(EMPTY_THUMBNAILS);

  const youtubeControllerRef = useRef<any>(null);
  const lastStableZoomInfoRef = useRef<CameraZoomInfo | null>(null);
  const fullscreenSourceRef =
    useRef<'back' | 'front' | 'external' | null>(null);

  const loadThumbnailOverlay = useCallback(async () => {
    try {
      const result = await AsyncStorage.multiGet([
        keys.SHOW_THUMBNAILS_ON_LIVESTREAM,
        keys.THUMBNAILS_TOP_LEFT,
        keys.THUMBNAILS_TOP_RIGHT,
        keys.THUMBNAILS_BOTTOM_LEFT,
        keys.THUMBNAILS_BOTTOM_RIGHT,
      ]);

      const parseImages = (value: string | null): string[] => {
        if (!value) {
          return [];
        }

        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
          return [];
        }
      };

      const topLeft = parseImages(result?.[1]?.[1] ?? null);
      const topRight = parseImages(result?.[2]?.[1] ?? null);
      const bottomLeft = parseImages(result?.[3]?.[1] ?? null);
      const bottomRight = parseImages(result?.[4]?.[1] ?? null);
      const hasAnyOverlayImages =
        topLeft.length > 0 ||
        topRight.length > 0 ||
        bottomLeft.length > 0 ||
        bottomRight.length > 0;

      const enabledRaw = result?.[0]?.[1];
      const enabledFromStorage =
        typeof enabledRaw === 'string'
          ? enabledRaw === '1' || enabledRaw.toLowerCase() === 'true'
          : enabledRaw == null
            ? true
            : !!enabledRaw;

      const enabled = enabledFromStorage || hasAnyOverlayImages;

      if (enabled && !enabledFromStorage) {
        try {
          await AsyncStorage.setItem(keys.SHOW_THUMBNAILS_ON_LIVESTREAM, '1');
          console.log('[WebCam] repaired thumbnail overlay enabled flag');
        } catch (persistError) {
          console.log('[WebCam] failed to repair thumbnail overlay enabled flag', persistError);
        }
      }

      if (__DEV__) {
        console.log('[WebCam] thumbnail overlay loaded', {
          enabled,
          enabledFromStorage,
          topLeftCount: topLeft.length,
          topRightCount: topRight.length,
          bottomLeftCount: bottomLeft.length,
          bottomRightCount: bottomRight.length,
        });
      }

      setThumbnailOverlay({
        enabled,
        topLeft: enabled ? topLeft : [],
        topRight: enabled ? topRight : [],
        bottomLeft: enabled ? bottomLeft : [],
        bottomRight: enabled ? bottomRight : [],
      });
    } catch (error) {
      console.log('[WebCam] load thumbnail overlay failed', error);
      setThumbnailOverlay(EMPTY_THUMBNAILS);
    }
  }, []);

  useEffect(() => {
    return subscribeCameraFullscreen(setIsFullscreenLocal);
  }, []);

  useEffect(() => {
    loadThumbnailOverlay();
  }, [loadThumbnailOverlay]);

  const liveSourceLock = getYouTubeSourceLock();
  const currentCameraSource = getCurrentCameraSourceSnapshot();
  const recordingInfo = getCameraRecordingInfo(props.cameraRef);

  const externalLiveLocked =
    recordingInfo?.isRecording === true &&
    (recordingInfo?.source === 'external' || liveSourceLock === 'external');

  const hasExternalWebcam = hasDetectedExternalWebcam();

  const baseCameraSource = currentCameraSource || liveSourceLock || 'back';

  const requestedCameraSource =
    (isFullscreen ? fullscreenSourceRef.current : null) || baseCameraSource;

  const effectiveCameraSource =
    requestedCameraSource === 'external' && !hasExternalWebcam
      ? 'back'
      : requestedCameraSource;

  const effectiveCameraFacing =
    effectiveCameraSource === 'front' ? 'front' : 'back';

  const effectiveSourceType =
    effectiveCameraSource === 'external' ? 'webcam' : 'phone';

  const showLogoOnly = false;

  const canRewatch = useMemo(() => {
    return props.isStarted && props.isPaused && !props.youtubeLivePreviewActive;
  }, [props.isStarted, props.isPaused, props.youtubeLivePreviewActive]);

  const getCameraHandle = useCallback(() => {
    if (props.youtubeLivePreviewActive && !externalLiveLocked) {
      return youtubeControllerRef.current;
    }
    return (props.cameraRef as any)?.current ?? null;
  }, [props.cameraRef, props.youtubeLivePreviewActive, externalLiveLocked]);

  const syncZoomInfo = useCallback(() => {
    const cameraHandle = getCameraHandle();
    const info = cameraHandle?.getZoomInfo?.() as CameraZoomInfo | undefined;

    if (!info) {
      const fallback = lastStableZoomInfoRef.current;
      if (fallback) {
        const minZoom =
          typeof fallback.minZoom === 'number' ? fallback.minZoom : 1;
        const maxZoom =
          typeof fallback.maxZoom === 'number' ? fallback.maxZoom : 1;
        const zoom = clamp(
          typeof fallback.zoom === 'number' ? fallback.zoom : 1,
          minZoom,
          maxZoom,
        );
        const availableSteps = BASE_ZOOM_STEPS.filter(step => {
          return step >= minZoom - 0.001 && step <= maxZoom + 0.001;
        });
        const mergedSteps = Array.from(
          new Set<number>([
            ...(availableSteps.length ? availableSteps : [minZoom, maxZoom]),
            zoom,
          ]),
        ).sort((a, b) => a - b);

        setZoomSupported(!!fallback.supported);
        setZoomSteps(mergedSteps.length ? mergedSteps : [1]);
        setCurrentZoom(zoom);
        return;
      }

      setZoomSupported(false);
      setZoomSteps(BASE_ZOOM_STEPS);
      setCurrentZoom(1);
      return;
    }

    const minZoom = typeof info.minZoom === 'number' ? info.minZoom : 1;
    const maxZoom = typeof info.maxZoom === 'number' ? info.maxZoom : 1;
    const zoom = clamp(
      typeof info.zoom === 'number' ? info.zoom : 1,
      minZoom,
      maxZoom,
    );

    const availableSteps = BASE_ZOOM_STEPS.filter(step => {
      return step >= minZoom - 0.001 && step <= maxZoom + 0.001;
    });

    const mergedSteps = Array.from(
      new Set<number>([
        ...(availableSteps.length ? availableSteps : [minZoom, maxZoom]),
        zoom,
      ]),
    ).sort((a, b) => a - b);

    if (info.supported || maxZoom > 1.001) {
      lastStableZoomInfoRef.current = {
        ...info,
        supported: true,
        minZoom,
        maxZoom,
        zoom,
      };
    }

    setZoomSupported(!!info.supported || maxZoom > 1.001);
    setZoomSteps(mergedSteps.length ? mergedSteps : [1]);
    setCurrentZoom(zoom);
  }, [getCameraHandle]);

  useEffect(() => {
    syncZoomInfo();

    const timeouts = [150, 500, 1200].map(delay => {
      return setTimeout(() => {
        syncZoomInfo();
      }, delay);
    });

    let interval: any = null;
    if (isFullscreen) {
      interval = setInterval(() => {
        syncZoomInfo();
      }, 800);
    }

    return () => {
      timeouts.forEach(clearTimeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [syncZoomInfo, isFullscreen, props.isCameraReady]);

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const cameraHandle = getCameraHandle();
      if (!cameraHandle?.setZoom) {
        return;
      }

      const info = cameraHandle?.getZoomInfo?.() as CameraZoomInfo | undefined;
      const minZoom = typeof info?.minZoom === 'number' ? info.minZoom : 1;
      const maxZoom = typeof info?.maxZoom === 'number' ? info.maxZoom : 1;
      const clampedZoom = clamp(nextZoom, minZoom, maxZoom);
      const appliedZoom = cameraHandle.setZoom(clampedZoom);

      setCurrentZoom(
        typeof appliedZoom === 'number' ? appliedZoom : clampedZoom,
      );

      syncZoomInfo();
    },
    [getCameraHandle, syncZoomInfo],
  );

  const activeZoomIndex = useMemo(() => {
    return getNearestStepIndex(zoomSteps, currentZoom);
  }, [zoomSteps, currentZoom]);

  const openFullscreen = () => {
    fullscreenSourceRef.current =
      (viewModel.webcamType as 'back' | 'front' | 'external' | undefined) ||
      currentCameraSource ||
      liveSourceLock ||
      'back';
    setCameraFullscreen(true);
  };

  const closeFullscreen = () => {
    setCameraFullscreen(false);
    fullscreenSourceRef.current = null;
  };

  const zoomIn = () => {
    if (!zoomSupported || !zoomSteps.length) {
      return;
    }

    const nextIndex = Math.min(activeZoomIndex + 1, zoomSteps.length - 1);
    applyZoom(zoomSteps[nextIndex]);
  };

  const zoomOut = () => {
    if (!zoomSupported || !zoomSteps.length) {
      return;
    }

    const nextIndex = Math.max(activeZoomIndex - 1, 0);
    applyZoom(zoomSteps[nextIndex]);
  };

  const selectZoom = (index: number) => {
    if (!zoomSupported || !zoomSteps[index]) {
      return;
    }

    applyZoom(zoomSteps[index]);
  };

  const onSwitchCameraPress = () => {
    if (externalLiveLocked) {
      debugCameraLog(
        '[WebCam] block switch camera while external recording lock is active',
      );
      return;
    }

    viewModel.onSwitchCamera();
  };

  const useYouTubeNativePreview =
    props.youtubeLivePreviewActive &&
    Platform.OS === 'android' &&
    !externalLiveLocked;

  const isExplicitRecording =
    recordingInfo?.isRecording === true ||
    recordingInfo?.state === 'starting' ||
    recordingInfo?.state === 'recording' ||
    recordingInfo?.state === 'stopping';

  const isVideoSessionLocked =
    isExplicitRecording || !!props.youtubeLivePreviewActive || externalLiveLocked;

  const allowRefresh = !viewModel.refreshing && !isVideoSessionLocked;

  const allowSwitchCamera = !isVideoSessionLocked;
  const lastButtonAvailabilityLogRef = useRef('');

  useEffect(() => {
    if (!__DEV__ || !DEBUG_CAMERA) {
      return;
    }

    const payload = {
      allowRefresh,
      allowSwitchCamera,
      isExplicitRecording,
      isVideoSessionLocked,
      recordingState: recordingInfo?.state || 'idle',
      refreshing: viewModel.refreshing,
      youtubeLivePreviewActive: !!props.youtubeLivePreviewActive,
    };

    const key = JSON.stringify(payload);
    if (key === lastButtonAvailabilityLogRef.current) {
      return;
    }

    lastButtonAvailabilityLogRef.current = key;
    debugCameraLog('[WebCam] button availability:', payload);
  }, [
    allowRefresh,
    allowSwitchCamera,
    isExplicitRecording,
    isVideoSessionLocked,
    recordingInfo?.state,
    viewModel.refreshing,
    props.youtubeLivePreviewActive,
  ]);

  const containerStyle = useMemo(() => {
    const prefersLandscapeExternal = effectiveCameraSource === 'external';
    const embeddedAspectRatio = prefersLandscapeExternal
      ? 16 / 9
      : props.innerControls
        ? 2
        : 1.565;

    return [
      styles.embeddedRoot,
      isHandheldLandscape ? styles.embeddedRootHandheld : undefined,
      {aspectRatio: embeddedAspectRatio},
    ];
  }, [effectiveCameraSource, isHandheldLandscape, props.innerControls]);

  const showBottomControls =
    (!props.innerControls || viewModel.innerControlsShow) &&
    !isFullscreen &&
    !props.hideBottomControls;

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => {
        if (allowRefresh) {
          viewModel.onRefresh();
        }
      },
      switchCamera: () => {
        if (allowSwitchCamera) {
          onSwitchCameraPress();
        }
      },
      rewatch: () => {
        if (canRewatch) {
          viewModel.onReWatch();
        }
      },
      canRefresh: () => !!allowRefresh,
      canSwitchCamera: () => !!allowSwitchCamera,
      canRewatch: () => !!canRewatch,
    }),
    [
      allowRefresh,
      allowSwitchCamera,
      canRewatch,
      onSwitchCameraPress,
      viewModel,
    ],
  );

  const fullLogoPlaceholder = (
    <RNView style={styles.logoOnlyBackground}>
      <RNImage
        source={images.logoSmall || images.logo}
        style={styles.logoOnlyImage}
        resizeMode="contain"
      />
    </RNView>
  );

  const hasThumbnailImages =
    thumbnailOverlay.topLeft.length > 0 ||
    thumbnailOverlay.topRight.length > 0 ||
    thumbnailOverlay.bottomLeft.length > 0 ||
    thumbnailOverlay.bottomRight.length > 0;

  const renderOverlay = (fullscreenMode = false) => {
    if (thumbnailOverlay.enabled) {
      return null;
    }

    const compactMode = !fullscreenMode;

    return (
      <LiveStreamImagesOverlay
        fullscreenMode={fullscreenMode}
        compactMode={compactMode}
      />
    );
  };

  const renderScoreboardOverlay = (fullscreenMode = false) => {
    const compactMode = !fullscreenMode;

    return (
      <>
        <PoolScoreboardOverlay
          fullscreenMode={fullscreenMode}
          compactMode={compactMode}
        />
        <CaromScoreboardOverlay
          fullscreenMode={fullscreenMode}
          compactMode={compactMode}
        />
      </>
    );
  };

  const renderThumbnailGroup = (
    imageUris: string[],
    positionStyle: any,
    fullscreenMode: boolean,
  ) => {
    if (!thumbnailOverlay.enabled || !imageUris?.length) {
      return null;
    }

    return (
      <RNView pointerEvents="none" style={[styles.thumbnailSlot, positionStyle]}>
        {imageUris.map((uri, index) => (
          <RNImage
            key={`${uri}-${index}`}
            source={{uri}}
            style={[
              styles.thumbnailImage,
              !fullscreenMode && styles.thumbnailImageCompact,
              fullscreenMode && styles.thumbnailImageFullscreen,
            ]}
            resizeMode="contain"
          />
        ))}
      </RNView>
    );
  };

  const renderFallbackThumbnail = (fullscreenMode: boolean) => {
    const fallbackSource = images.logoSmall || images.logo;
    if (!fallbackSource) {
      return null;
    }

    return (
      <RNView pointerEvents="none" style={styles.thumbnailOverlay}>
        <RNView pointerEvents="none" style={[styles.thumbnailSlot, styles.thumbnailTopLeft]}>
          <RNImage
            source={fallbackSource}
            style={[
              styles.thumbnailImage,
              !fullscreenMode && styles.thumbnailImageCompact,
              fullscreenMode && styles.thumbnailImageFullscreen,
            ]}
            resizeMode="contain"
          />
        </RNView>
      </RNView>
    );
  };

  const renderThumbnailOverlay = (fullscreenMode: boolean) => {
    if (!thumbnailOverlay.enabled) {
      return null;
    }

    if (!hasThumbnailImages) {
      return renderFallbackThumbnail(fullscreenMode);
    }

    return (
      <RNView pointerEvents="none" style={styles.thumbnailOverlay}>
        {renderThumbnailGroup(
          thumbnailOverlay.topLeft,
          styles.thumbnailTopLeft,
          fullscreenMode,
        )}
        {renderThumbnailGroup(
          thumbnailOverlay.topRight,
          styles.thumbnailTopRight,
          fullscreenMode,
        )}
        {renderThumbnailGroup(
          thumbnailOverlay.bottomLeft,
          styles.thumbnailBottomLeft,
          fullscreenMode,
        )}
        {renderThumbnailGroup(
          thumbnailOverlay.bottomRight,
          styles.thumbnailBottomRight,
          fullscreenMode,
        )}
      </RNView>
    );
  };

  const renderCameraContent = () => {
    if (showLogoOnly) {
      return fullLogoPlaceholder;
    }

    if (!viewModel.refreshing || useYouTubeNativePreview) {
      const contentKey = [
        isFullscreen ? 'fullscreen' : 'embedded',
        effectiveCameraSource,
        externalLiveLocked ? 'external-lock' : 'normal',
      ].join('-');

      return (
        <RNView key={contentKey} style={styles.videoScaleWrap}>
          {useYouTubeNativePreview ? (
            <YouTubeAndroidLivePreview
              controllerRef={youtubeControllerRef}
              setIsCameraReady={props.setIsCameraReady}
              sourceType={externalLiveLocked ? 'webcam' : effectiveSourceType}
              cameraFacing={effectiveCameraFacing}
            />
          ) : (
            <Video
              key={contentKey}
              gestureDisabled
              source={viewModel.source}
              initialScale={viewModel.webcam?.scale}
              initialTranslateX={viewModel.webcam?.translateX}
              initialTranslateY={viewModel.webcam?.translateY}
              onFullscreenPlayerDidPresent={
                viewModel.onFullscreenPlayerDidPresent
              }
              onBuffer={viewModel.onBuffer}
              onSeek={viewModel.onSeek}
              onLoad={viewModel.onLoad}
              onVideoTracks={viewModel.onVideoTracks}
              onEnd={viewModel.onEnd}
              onError={viewModel.onWebcamError}
              loadingDisabled
              cameraRef={props.cameraRef}
              isPaused={props.isPaused}
              isStarted={props.isStarted}
              videoUri={props.videoUri}
              webcamType={effectiveCameraSource as any}
              setIsCameraReady={props.setIsCameraReady}
              overlayContent={
                effectiveCameraSource === 'external'
                  ? renderOverlay(isFullscreen)
                  : undefined
              }
            />
          )}
          {effectiveCameraSource !== 'external' ? renderOverlay(isFullscreen) : null}
        </RNView>
      );
    }

    return fullLogoPlaceholder;
  };

  const renderCameraChrome = () => {
    if (!isFullscreen) {
      return (
        <Pressable style={styles.fullscreenFab} onPress={openFullscreen}>
          <Text color={colors.white} fontSize={20}>
            ⛶
          </Text>
        </Pressable>
      );
    }

    return (
      <>
        <Pressable style={styles.closeButton} onPress={closeFullscreen}>
          <Text color={colors.white} fontSize={16}>
            Đóng
          </Text>
        </Pressable>

        <RNView style={styles.zoomRail}>
          <Pressable
            style={[
              styles.zoomControlButton,
              (!zoomSupported || activeZoomIndex === zoomSteps.length - 1) &&
                styles.zoomControlDisabled,
            ]}
            onPress={zoomIn}>
            <Text color={colors.white} fontSize={20}>
              +
            </Text>
          </Pressable>

          <RNView style={styles.zoomStepsWrap}>
            <RNView style={styles.currentZoomBadge}>
              <Text color={colors.white} fontSize={12}>
                {formatZoomLabel(currentZoom)}
              </Text>
            </RNView>

            {zoomSupported ? (
              zoomSteps.map((item, index) => {
                const active = index === activeZoomIndex;
                return (
                  <Pressable
                    key={`zoom-${item}`}
                    style={[
                      styles.zoomStepButton,
                      active && styles.zoomStepButtonActive,
                    ]}
                    onPress={() => selectZoom(index)}>
                    <Text
                      color={active ? colors.black : colors.white}
                      fontSize={12}>
                      {formatZoomLabel(item)}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <RNView style={styles.zoomUnsupportedBadge}>
                <Text color={colors.white} fontSize={11}>
                  Không hỗ trợ zoom
                </Text>
              </RNView>
            )}
          </RNView>

          <Pressable
            style={[
              styles.zoomControlButton,
              (!zoomSupported || activeZoomIndex === 0) &&
                styles.zoomControlDisabled,
            ]}
            onPress={zoomOut}>
            <Text color={colors.white} fontSize={20}>
              −
            </Text>
          </Pressable>
        </RNView>
      </>
    );
  };

  const renderCameraView = (fullscreenMode: boolean) => (
    <RNView
      style={fullscreenMode ? styles.fullscreenVideoClip : styles.videoClip}>
      {renderCameraContent()}
      {showLogoOnly ? null : renderThumbnailOverlay(fullscreenMode)}
      {showLogoOnly ? null : renderScoreboardOverlay(fullscreenMode)}
      {showLogoOnly ? null : renderCameraChrome()}
    </RNView>
  );

  return (
    <>
      {!isFullscreen ? (
        <RNView style={containerStyle} pointerEvents="box-none">
          <RNView style={styles.videoHost} pointerEvents="box-none">
            {renderCameraView(false)}

            {props.innerControls && !showLogoOnly ? (
              <Pressable
                style={styles.overlayTouch}
                pointerEvents="box-only"
                onPress={viewModel.onToggleInnerControls}
              />
            ) : null}
          </RNView>

          {showBottomControls && !showLogoOnly ? (
            <RNView style={styles.bottomBar} pointerEvents="box-none">
              <Pressable
                onPress={() => {
                  if (!allowRefresh) {
                    return;
                  }
                  viewModel.onRefresh();
                }}
                style={[
                  styles.actionButton,
                  !allowRefresh && styles.actionButtonDisabled,
                ]}>
                <Text color={colors.white} fontSize={14}>↻ Làm mới</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!allowSwitchCamera) {
                    return;
                  }
                  onSwitchCameraPress();
                }}
                style={[
                  styles.actionButton,
                  styles.switchButton,
                  !allowSwitchCamera && styles.actionButtonDisabled,
                ]}>
                <Text color={colors.white} fontSize={14}>⇄ Chuyển camera</Text>
              </Pressable>

              <Pressable
                onPress={viewModel.onReWatch}
                disabled={!canRewatch}
                style={[
                  styles.actionButton,
                  !canRewatch && styles.actionButtonDisabled,
                ]}>
                <Text color={colors.white} fontSize={14}>
                  ▶ {i18n.t('reWatch')}
                </Text>
              </Pressable>
            </RNView>
          ) : null}
        </RNView>
      ) : null}

      <Modal
        visible={isFullscreen}
        transparent={false}
        animationType="fade"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait', 'landscape']}
        statusBarTranslucent
        onRequestClose={closeFullscreen}>
        <RNView style={styles.fullscreenRoot}>
          <RNView style={styles.fullscreenVideoHost}>
            {renderCameraView(true)}
          </RNView>
        </RNView>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  embeddedRoot: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: colors.black,
  },

  embeddedRootHandheld: {
    width: '92%',
    marginTop: 0,
  },

  fullscreenRoot: {
    flex: 1,
    backgroundColor: '#000',
  },

  videoHost: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  fullscreenVideoHost: {
    flex: 1,
    backgroundColor: '#000',
  },

  videoClip: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  fullscreenVideoClip: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  videoScaleWrap: {
    flex: 1,
    backgroundColor: '#000',
  },

  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoOnlyBackground: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  logoOnlyImage: {
    width: '90%',
    height: '82%',
    opacity: 0.96,
  },

  fullWidth: {
    width: '100%',
  },

  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    elevation: 12,
  },

  thumbnailSlot: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '42%',
  },

  thumbnailTopLeft: {
    top: 12,
    left: 12,
  },

  thumbnailTopRight: {
    top: 12,
    right: 12,
    justifyContent: 'flex-end',
  },

  thumbnailBottomLeft: {
    bottom: 12,
    left: 12,
  },

  thumbnailBottomRight: {
    bottom: 12,
    right: 12,
    justifyContent: 'flex-end',
  },

  thumbnailImage: {
    width: 92,
    height: 52,
    marginRight: 8,
  },

  thumbnailImageCompact: {
    width: 72,
    height: 40,
    marginRight: 6,
  },

  scoreboardCompactOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 14,
    elevation: 14,
  },

  poolScoreboardCompactOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 2,
    paddingHorizontal: 4,
    zIndex: 14,
    elevation: 14,
  },

  caromScoreboardCompactOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingBottom: 14,
    zIndex: 14,
    elevation: 14,
  },

  caromScoreboardFullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingLeft: 20,
    paddingBottom: 20,
    zIndex: 14,
    elevation: 14,
  },

  poolScoreboardCompactScale: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    transform: [{scaleX: 0.92}, {scaleY: 0.36}],
  },

  caromScoreboardCompactScale: {
    transform: [{scaleX: 0.58}, {scaleY: 0.78}],
  },

  caromScoreboardFullscreenScale: {
    transform: [{scaleX: 0.86}, {scaleY: 1.18}],
  },

  thumbnailImageFullscreen: {
    width: 150,
    height: 84,
    marginRight: 10,
  },

  fullscreenFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  closeButton: {
    position: 'absolute',
    top: 18,
    left: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.78)',
    zIndex: 30,
  },

  zoomRail: {
    position: 'absolute',
    right: 16,
    top: 70,
    bottom: 24,
    width: 64,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },

  zoomControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  zoomControlDisabled: {
    opacity: 0.4,
  },

  zoomStepsWrap: {
    alignItems: 'center',
    gap: 10,
  },

  currentZoomBadge: {
    minWidth: 44,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },

  zoomUnsupportedBadge: {
    width: 44,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
  },

  zoomStepButton: {
    minWidth: 38,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
  },

  zoomStepButtonActive: {
    backgroundColor: '#ffffff',
  },

  bottomBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    position: 'relative',
    zIndex: 50,
    elevation: 50,
  },

  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  switchButton: {
    backgroundColor: '#9d1010',
  },

  actionButtonDisabled: {
    opacity: 0.45,
  },

  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});

export default memo(WebCam);