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
import {Platform} from 'react-native';
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
import useSafeScreenInsets, {ZERO_INSETS} from 'theme/safeArea';
import useDesignSystem from 'theme/useDesignSystem';
import {createGameplayLayoutRules, createGameplayStyles} from '../../layoutRules';

const BASE_ZOOM_STEPS = [1, 2, 5, 10];

const DEBUG_CAMERA = true;

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
  if (DEBUG_CAMERA) {
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
  cameraScaleMode?: 'contain' | 'cover';
};

export type WebCamHandle = {
  refresh: () => void;
  switchCamera: () => void;
  rewatch: () => void;
  canRefresh: () => boolean;
  canSwitchCamera: () => boolean;
  canRewatch: () => boolean;
};

const LiveStreamImagesOverlay = memo(() => {
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
      />
    </RNView>
  );
});

const PoolScoreboardOverlay = memo(({fullscreenMode = false}: {fullscreenMode?: boolean}) => {
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

  return (
    <PoolBroadcastScoreboard
      currentPlayerIndex={state.currentPlayerIndex}
      countdownTime={state.countdownTime}
      gameSettings={state.gameSettings}
      playerSettings={state.playerSettings}
      variant={fullscreenMode ? 'fullscreen' : 'camera'}
      bottomOffset={fullscreenMode ? 18 : 12}
    />
  );
});

const CaromScoreboardOverlay = memo(({fullscreenMode = false}: {fullscreenMode?: boolean}) => {
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

  return (
    <CaromBroadcastScoreboard
      currentPlayerIndex={state.currentPlayerIndex}
      countdownTime={state.countdownTime}
      totalTurns={state.totalTurns}
      gameSettings={state.gameSettings}
      playerSettings={state.playerSettings}
      variant={fullscreenMode ? 'fullscreen' : 'camera'}
      bottomOffset={fullscreenMode ? 18 : -32}
    />
  );
});

const WebCam = forwardRef<WebCamHandle, WebCamComponentProps>((props, ref) => {
  const viewModel = WebCamViewModel(props);
  const {adaptive, design} = useDesignSystem();
  const safeInsets = useSafeScreenInsets();
  const overlaySafeInsets = useMemo(() => ({
    ...safeInsets,
    top: ZERO_INSETS.top,
  }), [safeInsets.bottom, safeInsets.left, safeInsets.right, safeInsets.top]);
  const layoutRules = useMemo(() => createGameplayLayoutRules(adaptive, design), [adaptive.styleKey]);
  const styles = useMemo(() => createStyles(adaptive, design, layoutRules, overlaySafeInsets), [adaptive.styleKey, overlaySafeInsets.top, overlaySafeInsets.right, overlaySafeInsets.bottom, overlaySafeInsets.left]);
  const cameraScaleMode = props.cameraScaleMode || 'contain';

  const [isFullscreen, setIsFullscreenLocal] = useState(getCameraFullscreen());
  const [cameraVisualReady, setCameraVisualReady] = useState(false);
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

  const baseCameraSource = currentCameraSource || liveSourceLock || 'back';

  const effectiveCameraSource =
    (isFullscreen ? fullscreenSourceRef.current : null) || baseCameraSource;

  const effectiveCameraFacing =
    effectiveCameraSource === 'front' ? 'front' : 'back';

  const effectiveSourceType =
    effectiveCameraSource === 'external' ? 'webcam' : 'phone';

  const showLogoOnly = !hasDetectedExternalWebcam();
  const streamUri =
    typeof viewModel.source?.uri === 'string' ? viewModel.source.uri.trim() : '';
  const hasStreamUri = streamUri.length > 0;
  const handleCameraReadyChange = useCallback(
    (nextReady: boolean) => {
      setCameraVisualReady(prev => (prev === nextReady ? prev : nextReady));
      props.setIsCameraReady(nextReady);
      debugCameraLog('[WebCam] visual ready changed', {
        nextReady,
        effectiveCameraSource,
        effectiveSourceType,
        streamUri,
      });
    },
    [effectiveCameraSource, effectiveSourceType, props, streamUri],
  );

  useEffect(() => {
    setCameraVisualReady(false);
    debugCameraLog('[WebCam] reset visual ready for source signature', {
      effectiveCameraSource,
      effectiveSourceType,
      streamUri,
      youtubeLivePreviewActive: !!props.youtubeLivePreviewActive,
      refreshing: !!viewModel.refreshing,
    });
  }, [
    effectiveCameraSource,
    effectiveSourceType,
    streamUri,
    props.youtubeLivePreviewActive,
    viewModel.refreshing,
  ]);

  const effectiveCameraReady = props.isCameraReady && cameraVisualReady;
  const shouldShowPhonePlaceholder =
    effectiveSourceType === 'phone' && !effectiveCameraReady;
  const shouldShowExternalPlaceholder =
    effectiveSourceType === 'webcam' &&
    (!effectiveCameraReady || showLogoOnly || !hasStreamUri);
  const shouldShowLogoPlaceholder =
    shouldShowPhonePlaceholder || shouldShowExternalPlaceholder;

  useEffect(() => {
    debugCameraLog('[WebCam] placeholder branch', {
      effectiveCameraSource,
      effectiveSourceType,
      streamUri,
      hasStreamUri,
      propsIsCameraReady: props.isCameraReady,
      cameraVisualReady,
      effectiveCameraReady,
      shouldShowPhonePlaceholder,
      shouldShowExternalPlaceholder,
      shouldShowLogoPlaceholder,
    });
  }, [
    cameraVisualReady,
    effectiveCameraSource,
    effectiveSourceType,
    effectiveCameraReady,
    hasStreamUri,
    props.isCameraReady,
    shouldShowExternalPlaceholder,
    shouldShowLogoPlaceholder,
    shouldShowPhonePlaceholder,
    streamUri,
  ]);

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

  const [cameraStageBounds, setCameraStageBounds] = useState({width: 0, height: 0});

  const targetCameraAspectRatio = useMemo(() => {
    if (effectiveCameraSource === 'external') {
      return 16 / 9;
    }

    return props.innerControls ? 2 : 16 / 10;
  }, [effectiveCameraSource, props.innerControls]);

  const cameraStageStyle = useMemo(() => {
    const containerWidth = Math.max(cameraStageBounds.width, 0);
    const containerHeight = Math.max(cameraStageBounds.height, 0);

    if (!containerWidth || !containerHeight) {
      return undefined;
    }

    const containerAspect = containerWidth / Math.max(containerHeight, 1);

    if (cameraScaleMode === 'cover') {
      if (containerAspect > targetCameraAspectRatio) {
        const height = containerWidth / targetCameraAspectRatio;
        return {width: containerWidth, height};
      }

      const width = containerHeight * targetCameraAspectRatio;
      return {width, height: containerHeight};
    }

    if (containerAspect > targetCameraAspectRatio) {
      const width = containerHeight * targetCameraAspectRatio;
      return {width, height: containerHeight};
    }

    const height = containerWidth / targetCameraAspectRatio;
    return {width: containerWidth, height};
  }, [cameraScaleMode, cameraStageBounds.height, cameraStageBounds.width, targetCameraAspectRatio]);

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
        onLoad={() => {
          debugCameraLog('[WebCam] logo placeholder loaded', {
            source: effectiveCameraSource,
            type: effectiveSourceType,
            shouldShowLogoPlaceholder,
          });
        }}
        onError={error => {
          console.log('[WebCam] logo placeholder image error', error?.nativeEvent || error);
        }}
      />
    </RNView>
  );

  const hasThumbnailImages =
    thumbnailOverlay.topLeft.length > 0 ||
    thumbnailOverlay.topRight.length > 0 ||
    thumbnailOverlay.bottomLeft.length > 0 ||
    thumbnailOverlay.bottomRight.length > 0;

  const renderOverlay = () => {
    if (thumbnailOverlay.enabled) {
      return null;
    }

    return <LiveStreamImagesOverlay />;
  };

  const renderScoreboardOverlay = (fullscreenMode = false) => {
    return (
      <>
        <PoolScoreboardOverlay fullscreenMode={fullscreenMode} />
        <CaromScoreboardOverlay fullscreenMode={fullscreenMode} />
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
    debugCameraLog('[WebCam] renderCameraContent branch', {
      refreshing: viewModel.refreshing,
      useYouTubeNativePreview,
      effectiveCameraSource,
      effectiveSourceType,
      shouldShowLogoPlaceholder,
      propsIsCameraReady: props.isCameraReady,
      cameraVisualReady,
      effectiveCameraReady,
      streamUri,
    });

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
              setIsCameraReady={handleCameraReadyChange}
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
              setIsCameraReady={handleCameraReadyChange}
              overlayContent={
                effectiveCameraSource === 'external'
                  ? renderOverlay()
                  : undefined
              }
              cameraScaleMode={cameraScaleMode}
            />
          )}
          {effectiveCameraSource !== 'external' ? renderOverlay() : null}
        </RNView>
      );
    }

    return fullLogoPlaceholder;
  };

  const fullscreenChromeOffsets = {
    top: Math.max(18, overlaySafeInsets.top + 8),
    left: Math.max(18, overlaySafeInsets.left + 8),
    right: Math.max(16, overlaySafeInsets.right + 8),
    bottom: Math.max(24, overlaySafeInsets.bottom + 12),
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
        <Pressable style={[styles.closeButton, {top: fullscreenChromeOffsets.top, left: fullscreenChromeOffsets.left}]} onPress={closeFullscreen}>
          <Text color={colors.white} fontSize={16}>
            Đóng
          </Text>
        </Pressable>

        <RNView style={[styles.zoomRail, {top: fullscreenChromeOffsets.top + 52, right: fullscreenChromeOffsets.right, bottom: fullscreenChromeOffsets.bottom}]}>
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

  const renderCameraView = (fullscreenMode: boolean) => {
    if (shouldShowLogoPlaceholder) {
      return (
        <RNView
          style={fullscreenMode ? styles.fullscreenVideoClipPlaceholder : styles.videoClipPlaceholder}
          onLayout={event => {
            debugCameraLog('[WebCam] placeholder surface layout', event.nativeEvent.layout);
          }}>
          {fullLogoPlaceholder}
        </RNView>
      );
    }

    return (
      <RNView
        style={fullscreenMode ? styles.fullscreenVideoClip : styles.videoClip}>
        {renderCameraContent()}
        {renderThumbnailOverlay(fullscreenMode)}
        {renderScoreboardOverlay(fullscreenMode)}
        {renderCameraChrome()}
      </RNView>
    );
  };

  return (
    <>
      {!isFullscreen ? (
        <RNView style={styles.embeddedRoot} pointerEvents="box-none">
          <RNView
            style={styles.videoStageSlot}
            pointerEvents="box-none"
            onLayout={event => {
              const {width: nextWidth, height: nextHeight} = event.nativeEvent.layout;
              setCameraStageBounds(prev => {
                if (prev.width === nextWidth && prev.height === nextHeight) {
                  return prev;
                }

                return {width: nextWidth, height: nextHeight};
              });
            }}>
            <RNView
              style={shouldShowLogoPlaceholder
                ? [styles.videoHost, styles.placeholderStageHost]
                : [styles.videoHost, styles.videoStage, cameraStageStyle]}
              pointerEvents="box-none">
              {renderCameraView(false)}

              {props.innerControls && !shouldShowLogoPlaceholder ? (
                <Pressable
                  style={styles.overlayTouch}
                  pointerEvents="box-only"
                  onPress={viewModel.onToggleInnerControls}
                />
              ) : null}
            </RNView>
          </RNView>

          {showBottomControls && !shouldShowLogoPlaceholder ? (
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

const createStyles = (adaptive: any, design: any, rules: any, safeInsets: any) => createGameplayStyles(adaptive, {
  embeddedRoot: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignSelf: 'stretch',
    marginTop: 0,
    backgroundColor: colors.black,
  },

  videoStageSlot: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
    overflow: 'hidden',
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

  videoStage: {
    maxWidth: '100%',
    maxHeight: '100%',
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },

  fullscreenVideoHost: {
    flex: 1,
    backgroundColor: '#000',
  },

  placeholderStageHost: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    minHeight: adaptive.s(96),
  },

  videoClipPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: adaptive.s(96),
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullscreenVideoClipPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  logoOnlyImage: {
    width: '72%',
    height: '72%',
    alignSelf: 'center',
    opacity: 0.98,
  },

  logoOnlyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    zIndex: 999,
    elevation: 999,
  },

  logoOnlyOverlayImage: {
    width: '76%',
    height: '76%',
    alignSelf: 'center',
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
    width: adaptive.s(92),
    height: adaptive.s(52),
    marginRight: 8,
  },

  thumbnailImageFullscreen: {
    width: adaptive.s(150),
    height: adaptive.s(84),
    marginRight: 10,
  },

  fullscreenFab: {
    position: 'absolute',
    top: rules.camera.overlayInset,
    right: rules.camera.overlayInset,
    width: adaptive.s(42),
    height: adaptive.s(42),
    borderRadius: adaptive.s(21),
    backgroundColor: 'rgba(0,0,0,0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  closeButton: {
    position: 'absolute',
    top: Math.max(rules.camera.overlayInset + safeInsets.top, adaptive.s(18)),
    left: Math.max(rules.camera.overlayInset + safeInsets.left, adaptive.s(18)),
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.78)',
    zIndex: 30,
  },

  zoomRail: {
    position: 'absolute',
    right: Math.max(rules.camera.overlayInset + safeInsets.right, adaptive.s(16)),
    top: Math.max(safeInsets.top + adaptive.s(70), adaptive.s(70)),
    bottom: Math.max(safeInsets.bottom + adaptive.s(24), adaptive.s(24)),
    width: rules.camera.fullscreenRailWidth,
    borderRadius: adaptive.s(28),
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
    borderRadius: rules.camera.cardRadius,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },

  zoomUnsupportedBadge: {
    width: 44,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: rules.camera.cardRadius,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
  },

  zoomStepButton: {
    minWidth: 38,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: rules.camera.cardRadius,
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
    minHeight: rules.controlHeights.compact,
    borderRadius: design.radius.md,
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