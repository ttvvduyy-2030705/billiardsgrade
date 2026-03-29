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
import {Platform} from 'react-native';
import {
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  View as RNView,
} from 'react-native';

import View from 'components/View';
import Text from 'components/Text';
import Loading from 'components/Loading';
import Video from 'components/Video';

import images from 'assets';
import i18n from 'i18n';
import colors from 'configuration/colors';

import WebCamViewModel, {Props} from './WebCamViewModel';
import YouTubeAndroidLivePreview from './YouTubeAndroidLivePreview';
import {
  getCameraFullscreen,
  setCameraFullscreen,
  subscribeCameraFullscreen,
} from '../../cameraFullscreenStore';

const BASE_ZOOM_STEPS = [1, 2, 5, 10];

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

const WebCam = forwardRef<WebCamHandle, WebCamComponentProps>((props, ref) => {
  const viewModel = WebCamViewModel(props);

  const [isFullscreen, setIsFullscreenLocal] = useState(getCameraFullscreen());
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomSteps, setZoomSteps] = useState<number[]>(BASE_ZOOM_STEPS);
  const [currentZoom, setCurrentZoom] = useState(1);

  const youtubeControllerRef = useRef<any>(null);
  const lastStableZoomInfoRef = useRef<CameraZoomInfo | null>(null);
  const fullscreenSourceRef =
    useRef<'back' | 'front' | 'external' | null>(null);

  useEffect(() => {
    return subscribeCameraFullscreen(setIsFullscreenLocal);
  }, []);

  const liveSourceLock = getYouTubeSourceLock();
  const currentCameraSource = getCurrentCameraSourceSnapshot();

  const externalLiveLocked =
    props.youtubeLivePreviewActive && liveSourceLock === 'external';

  const baseCameraSource =
    (viewModel.webcamType as 'back' | 'front' | 'external' | undefined) ||
    currentCameraSource ||
    liveSourceLock ||
    'back';

  const effectiveCameraSource =
    (isFullscreen ? fullscreenSourceRef.current : null) || baseCameraSource;

  const effectiveCameraFacing =
    effectiveCameraSource === 'front' ? 'front' : 'back';

  const effectiveSourceType =
    effectiveCameraSource === 'external' ? 'webcam' : 'phone';

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
      console.log(
        '[WebCam] block switch camera while external live lock is active',
      );
      return;
    }

    if (props.youtubeLivePreviewActive && Platform.OS === 'android') {
      youtubeControllerRef.current?.switchCamera?.();
      return;
    }

    viewModel.onSwitchCamera();
  };

  const useYouTubeNativePreview =
    props.youtubeLivePreviewActive &&
    Platform.OS === 'android' &&
    !externalLiveLocked;

  const allowRefresh =
    !useYouTubeNativePreview && !externalLiveLocked && viewModel.canRefresh;

  const allowSwitchCamera = externalLiveLocked
    ? false
    : useYouTubeNativePreview
      ? true
      : viewModel.canSwitchCamera;

  const containerStyle = useMemo(() => {
    const prefersLandscapeExternal = effectiveCameraSource === 'external';
    const embeddedAspectRatio = prefersLandscapeExternal
      ? 16 / 9
      : props.innerControls
        ? 2
        : 1.565;

    return [styles.embeddedRoot, {aspectRatio: embeddedAspectRatio}];
  }, [effectiveCameraSource, props.innerControls]);

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
    <ImageBackground
      source={images.logoSmall || images.logo}
      style={styles.background}
      resizeMode="contain">
      <View
        flex={'1'}
        style={styles.fullWidth}
        alignItems={'center'}
        justify={'center'}>
        <Loading isLoading size={'large'} showPlainLoading />
      </View>
    </ImageBackground>
  );

  const renderCameraContent = () => {
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
            />
          )}
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
      {renderCameraChrome()}
    </RNView>
  );

  return (
    <>
      {!isFullscreen ? (
        <RNView style={containerStyle} pointerEvents="box-none">
          <RNView style={styles.videoHost}>{renderCameraView(false)}</RNView>

          {props.innerControls ? (
            <Pressable
              style={styles.overlayTouch}
              onPress={viewModel.onToggleInnerControls}
            />
          ) : null}

          {showBottomControls ? (
            <RNView style={styles.bottomBar}>
              <Pressable
                disabled={!allowRefresh}
                onPress={allowRefresh ? viewModel.onRefresh : undefined}
                style={[
                  styles.actionButton,
                  !allowRefresh && styles.actionButtonDisabled,
                ]}>
                <Text>↻ Làm mới</Text>
              </Pressable>

              <Pressable
                disabled={!allowSwitchCamera}
                onPress={allowSwitchCamera ? onSwitchCameraPress : undefined}
                style={[
                  styles.actionButton,
                  styles.switchButton,
                  !allowSwitchCamera && styles.actionButtonDisabled,
                ]}>
                <Text>⇄ Chuyển camera</Text>
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

  fullscreenRoot: {
    flex: 1,
    backgroundColor: '#000',
  },

  videoHost: {
    flex: 1,
    backgroundColor: '#000',
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

  fullWidth: {
    width: '100%',
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
    zIndex: 5,
  },
});

export default memo(WebCam);
