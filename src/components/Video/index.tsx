import React, {
  memo,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  AppStateStatus,
  Image,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import RNFS from 'react-native-fs';
import {Video as RNVideo} from 'react-native-video';
import {Camera, useCameraDevice} from 'react-native-vision-camera';

import View from 'components/View';
import VideoViewModel, {Props} from './VideoViewModel';
import {WebcamType} from 'types/webcam';
import images from 'assets';
import {
  getUvcZoomInfo,
  listUsbDevices,
  setUvcZoom,
  startUvcRecording,
  stopUvcRecording,
  UvcZoomInfo,
} from 'services/uvc';
import UvcCameraView from 'components/UvcCameraView';
import styles from './styles';
import {
  CameraSource,
  subscribeCycleCameraSource,
} from 'utils/cameraSourceSwitcher';
import YouTubeAndroidNativePreview from './YouTubeAndroidNativePreview';
import {
  addYouTubeCameraStreamListener,
  getYouTubeNativeZoomInfo,
  isYouTubeNativeCameraEnabled,
  setYouTubeNativeZoom,
  startYouTubeNativeRecord,
  stopYouTubeNativeRecord,
  YouTubeNativeZoomInfo,
} from 'services/youtubeCameraStream';

type PermissionState = 'loading' | 'granted' | 'denied';
type BackendType = 'vision' | 'uvc' | 'youtube-native' | null;
type ZoomSnapshot = {
  supported: boolean;
  minZoom: number;
  maxZoom: number;
  zoom: number;
  source: CameraSource;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

const assignRef = (target: any, value: any) => {
  if (!target) {
    return;
  }

  if (typeof target === 'function') {
    target(value);
    return;
  }

  try {
    target.current = value;
  } catch {}
};

const DEFAULT_UVC_ZOOM: UvcZoomInfo = {
  supported: false,
  minZoom: 1,
  maxZoom: 1,
  zoom: 1,
  source: 'external',
};

const DEFAULT_YOUTUBE_NATIVE_ZOOM: YouTubeNativeZoomInfo = {
  zoom: 1,
  minZoom: 1,
  maxZoom: 8,
  source: 'youtube-native',
};

const USB_RESCAN_INTERVAL_MS = 1500;
const UVC_PRESENCE_GRACE_MS = 3000;
const UVC_ZOOM_REFRESH_INTERVAL_MS = 1200;

const isYouTubeNativeCameraLocked = () => {
  return (globalThis as any).__APLUS_YOUTUBE_NATIVE_LOCK__ === true;
};


const getYouTubeNativeSourceLock = (): CameraSource | null => {
  const value = (globalThis as any).__APLUS_YOUTUBE_SOURCE_LOCK__;
  return value === 'back' || value === 'front' || value === 'external' ? value : null;
};

const setCurrentCameraSourceSnapshot = (source: CameraSource) => {
  (globalThis as any).__APLUS_CURRENT_CAMERA_SOURCE__ = source;
};

const setUvcPresenceSnapshot = (present: boolean) => {
  (globalThis as any).__APLUS_UVC_PRESENT__ = present;
};

const setAvailableCameraSourcesSnapshot = (sources: CameraSource[]) => {
  (globalThis as any).__APLUS_AVAILABLE_CAMERA_SOURCES__ = [...sources];
};

const AplusVideo = (props: Props, ref: React.LegacyRef<any>) => {
  const viewModel = VideoViewModel(props);
  const isFocused = useIsFocused();

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [permissionState, setPermissionState] = useState<PermissionState>('loading');
  const [usbDevices, setUsbDevices] = useState<any[]>([]);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<CameraSource>('back');
  const [zoom, setZoom] = useState(1);
  const [uvcZoomInfoState, setUvcZoomInfoState] = useState<UvcZoomInfo>(DEFAULT_UVC_ZOOM);
  const [youtubeNativeZoomInfoState, setYoutubeNativeZoomInfoState] =
    useState<YouTubeNativeZoomInfo>(DEFAULT_YOUTUBE_NATIVE_ZOOM);
  const [stableHasUvcWebcam, setStableHasUvcWebcam] = useState(false);

  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const externalDevice = useCameraDevice('external');

  const resolvedRef = (((props as any)?.cameraRef ?? ref) as any) || null;
  const visionCameraRef = useRef<any>(null);
  const controllerRef = useRef<any>(null);
  const uvcCallbacksRef = useRef<any>(null);
  const nativeRecordingCallbacksRef = useRef<any>(null);
  const lastUvcRecordingPathRef = useRef<string | undefined>(undefined);
  const activeRecordingBackendRef = useRef<BackendType>(null);
  const recordingStateRef = useRef<'idle' | 'starting' | 'recording' | 'stopping'>('idle');
  const selectedSourceRef = useRef<CameraSource>('back');
  const usingUvcRef = useRef(false);
  const deviceRef = useRef<any>(null);
  const zoomSnapshotRef = useRef<ZoomSnapshot>({
    supported: false,
    minZoom: 1,
    maxZoom: 1,
    zoom: 1,
    source: 'back',
  });
  const uvcZoomInfoRef = useRef<UvcZoomInfo>(DEFAULT_UVC_ZOOM);
  const youtubeNativeZoomInfoRef = useRef<YouTubeNativeZoomInfo>(
    DEFAULT_YOUTUBE_NATIVE_ZOOM,
  );
  const uvcPresenceTimeoutRef = useRef<any>(null);
  const lastRawUvcPresenceRef = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const devices = Camera.getAvailableCameraDevices();
    console.log(
      '[Video] available cameras:',
      devices.map(d => ({
        id: d.id,
        name: d.name,
        physicalDevices: d.physicalDevices,
        position: d.position,
      })),
    );
  }, [backDevice?.id, frontDevice?.id, externalDevice?.id]);

  const refreshUsbDevices = useCallback(async (reason: string = 'manual') => {
    try {
      const devices = await listUsbDevices();
      console.log('[UVC] usb devices:', {reason, devices});
      setUsbDevices(devices);
      return devices;
    } catch (error) {
      console.log('[UVC] usb devices error:', {reason, error});
      setUsbDevices([]);
      return [] as any[];
    }
  }, []);

  useEffect(() => {
    refreshUsbDevices('mount');
  }, [refreshUsbDevices]);

  useEffect(() => {
    if (appState === 'active' && isFocused && viewModel.webcamType === WebcamType.camera) {
      refreshUsbDevices('focus-active');
    }
  }, [appState, isFocused, viewModel.webcamType, refreshUsbDevices]);

  useEffect(() => {
    if (viewModel.webcamType !== WebcamType.camera) {
      return;
    }

    const interval = setInterval(() => {
      if (appState === 'active' && isFocused) {
        refreshUsbDevices('interval');
      }
    }, USB_RESCAN_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [appState, isFocused, viewModel.webcamType, refreshUsbDevices]);


  const hasUvcWebcam = useMemo(() => {
    return usbDevices.some(d => d.looksLikeVideo);
  }, [usbDevices]);

  useEffect(() => {
    const hadUvcLastTime = lastRawUvcPresenceRef.current;
    lastRawUvcPresenceRef.current = hasUvcWebcam;

    if (hasUvcWebcam) {
      if (!hadUvcLastTime) {
        console.log('[UVC] video device detected again');
      }
      if (uvcPresenceTimeoutRef.current) {
        clearTimeout(uvcPresenceTimeoutRef.current);
        uvcPresenceTimeoutRef.current = null;
      }
      setStableHasUvcWebcam(true);
      return;
    }

    if (hadUvcLastTime) {
      console.log('[UVC] video device temporarily missing, keep external source during grace period');
    }

    if (uvcPresenceTimeoutRef.current) {
      clearTimeout(uvcPresenceTimeoutRef.current);
    }

    uvcPresenceTimeoutRef.current = setTimeout(() => {
      console.log('[UVC] video device grace period expired');
      setStableHasUvcWebcam(false);
      uvcPresenceTimeoutRef.current = null;
    }, UVC_PRESENCE_GRACE_MS);

    return () => {
      if (uvcPresenceTimeoutRef.current) {
        clearTimeout(uvcPresenceTimeoutRef.current);
        uvcPresenceTimeoutRef.current = null;
      }
    };
  }, [hasUvcWebcam]);

  const availableSources = useMemo(() => {
    const sources: CameraSource[] = [];
    if (backDevice) sources.push('back');
    if (frontDevice) sources.push('front');
    if (externalDevice || stableHasUvcWebcam) sources.push('external');
    return sources;
  }, [backDevice, frontDevice, externalDevice, stableHasUvcWebcam]);

  useEffect(() => {
    setUvcPresenceSnapshot(!!(externalDevice || stableHasUvcWebcam));
    setAvailableCameraSourcesSnapshot(availableSources);

    return () => {
      setUvcPresenceSnapshot(false);
      setAvailableCameraSourcesSnapshot([]);
    };
  }, [externalDevice, stableHasUvcWebcam, availableSources]);

  const youtubeSourceLock = getYouTubeNativeSourceLock();

  const preferredSource = useMemo<CameraSource>(() => {
    if (youtubeSourceLock === 'external' && availableSources.includes('external')) {
      return 'external';
    }

    if (youtubeSourceLock === 'front' && availableSources.includes('front')) {
      return 'front';
    }

    if (youtubeSourceLock === 'back' && availableSources.includes('back')) {
      return 'back';
    }

    if (availableSources.includes('back')) return 'back';
    if (availableSources.includes('front')) return 'front';
    return 'external';
  }, [availableSources, youtubeSourceLock]);

  useEffect(() => {
    if (!availableSources.length) {
      return;
    }

    setSelectedSource(current => {
      if (youtubeSourceLock && availableSources.includes(youtubeSourceLock)) {
        if (current !== youtubeSourceLock) {
          console.log('[Video] force source because youtube lock is active:', {
            from: current,
            to: youtubeSourceLock,
          });
        }
        return youtubeSourceLock;
      }

      if (availableSources.includes(current)) {
        return current;
      }
      return preferredSource;
    });
  }, [availableSources, preferredSource, youtubeSourceLock]);

  const resolveBackendForSource = useCallback(
    (source: CameraSource): BackendType => {
      const sourceUsesUvc =
        viewModel.webcamType === WebcamType.camera &&
        source === 'external' &&
        !externalDevice &&
        stableHasUvcWebcam;
      return sourceUsesUvc ? 'uvc' : 'vision';
    },
    [viewModel.webcamType, externalDevice, stableHasUvcWebcam],
  );

  useEffect(() => {
    const unsubscribe = subscribeCycleCameraSource(() => {
      setSelectedSource(current => {
        if (youtubeSourceLock === 'external') {
          console.log('[Video] block cycle camera source while external live lock is active');
          return 'external';
        }

        if (!availableSources.length) {
          return current;
        }

        const currentIndex = availableSources.indexOf(current);
        const safeIndex = currentIndex >= 0 ? currentIndex : -1;
        const nextIndex = (safeIndex + 1) % availableSources.length;
        const nextSource = availableSources[nextIndex];
        const currentBackend = resolveBackendForSource(current);
        const nextBackend = resolveBackendForSource(nextSource);
        const isCrossBackendSwitch = currentBackend !== nextBackend;
        const isRecordingBusy =
          activeRecordingBackendRef.current !== null ||
          recordingStateRef.current !== 'idle';

        if (isCrossBackendSwitch && isRecordingBusy) {
          console.log('[Video] block camera source switch during cross-backend recording', {
            from: current,
            to: nextSource,
            currentBackend,
            nextBackend,
            recordingState: recordingStateRef.current,
            activeBackend: activeRecordingBackendRef.current,
          });
          return current;
        }

        console.log('[Video] cycle camera source:', {
          availableSources,
          from: current,
          to: nextSource,
        });

        return nextSource;
      });
    });

    return unsubscribe;
  }, [availableSources, resolveBackendForSource, youtubeSourceLock]);

  const usingUvc =
    viewModel.webcamType === WebcamType.camera &&
    selectedSource === 'external' &&
    !externalDevice &&
    stableHasUvcWebcam;

  const device = useMemo(() => {
    if (usingUvc) return null;

    if (selectedSource === 'external') {
      return externalDevice ?? backDevice ?? frontDevice ?? null;
    }

    if (selectedSource === 'front') {
      return frontDevice ?? backDevice ?? externalDevice ?? null;
    }

    return backDevice ?? frontDevice ?? externalDevice ?? null;
  }, [usingUvc, selectedSource, externalDevice, backDevice, frontDevice]);

  const minZoom = useMemo(() => device?.minZoom ?? 1, [device?.id]);
  const maxZoom = useMemo(() => {
    const nativeMax = device?.maxZoom ?? 1;
    return Math.max(minZoom, Math.min(nativeMax, 10));
  }, [device?.id, minZoom]);
  const neutralZoom = useMemo(() => {
    const neutral = device?.neutralZoom ?? minZoom;
    return clamp(neutral, minZoom, maxZoom);
  }, [device?.id, minZoom, maxZoom]);

  useEffect(() => {
    selectedSourceRef.current = selectedSource;
    usingUvcRef.current = usingUvc;
    deviceRef.current = device;
    setCurrentCameraSourceSnapshot(selectedSource);
  }, [selectedSource, usingUvc, device]);

  useEffect(() => {
    zoomSnapshotRef.current = {
      supported: !!device,
      minZoom,
      maxZoom,
      zoom,
      source: selectedSource,
    };
  }, [device, minZoom, maxZoom, zoom, selectedSource]);

  const refreshUvcZoomInfo = useCallback(
    async (reason: string = 'manual') => {
      try {
        const info = await getUvcZoomInfo();
        const normalized: UvcZoomInfo = {
          ...DEFAULT_UVC_ZOOM,
          ...info,
          source: 'external',
        };
        uvcZoomInfoRef.current = normalized;
        setUvcZoomInfoState(normalized);
        setZoom(normalized.zoom ?? 1);
        console.log('[UVC] getZoomInfo:', {reason, info: normalized});
        return normalized;
      } catch (error) {
        console.log('[UVC] getZoomInfo error:', {reason, error});
        const fallback = uvcZoomInfoRef.current || DEFAULT_UVC_ZOOM;

        if (fallback.supported || selectedSourceRef.current === 'external') {
          setUvcZoomInfoState(fallback);
          setZoom(fallback.zoom ?? 1);
          return fallback;
        }

        uvcZoomInfoRef.current = DEFAULT_UVC_ZOOM;
        setUvcZoomInfoState(DEFAULT_UVC_ZOOM);
        setZoom(1);
        return DEFAULT_UVC_ZOOM;
      }
    },
    [],
  );

  const refreshYouTubeNativeZoomInfo = useCallback(
    async (reason: string = 'manual') => {
      try {
        const info = await getYouTubeNativeZoomInfo();
        const normalized: YouTubeNativeZoomInfo = {
          ...DEFAULT_YOUTUBE_NATIVE_ZOOM,
          ...info,
          source: info?.source || 'youtube-native',
        };
        youtubeNativeZoomInfoRef.current = normalized;
        setYoutubeNativeZoomInfoState(normalized);
        setZoom(normalized.zoom ?? 1);
        console.log('[YT Native] getZoomInfo:', {reason, info: normalized});
        return normalized;
      } catch (error) {
        console.log('[YT Native] getZoomInfo error:', {reason, error});
        const fallback =
          youtubeNativeZoomInfoRef.current || DEFAULT_YOUTUBE_NATIVE_ZOOM;
        setYoutubeNativeZoomInfoState(fallback);
        setZoom(fallback.zoom ?? 1);
        return fallback;
      }
    },
    [],
  );

  useEffect(() => {
    if (!usingUvc) {
      setZoom(neutralZoom);
      return;
    }

    refreshUvcZoomInfo('enter-uvc');

    const interval = setInterval(() => {
      if (appState === 'active' && isFocused) {
        refreshUvcZoomInfo('interval');
      }
    }, UVC_ZOOM_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [usingUvc, selectedSource, neutralZoom, appState, isFocused, refreshUvcZoomInfo]);

  useEffect(() => {
    console.log('[Video] selected source:', selectedSource);
    if (!device) return;
    console.log('[Video] selected device:', {
      id: device.id,
      name: device.name,
      physicalDevices: device.physicalDevices,
      position: device.position,
      previewViewType: 'texture-view',
    });
  }, [selectedSource, device?.id]);

  const refreshCameraPermission = useCallback(async () => {
    if (viewModel.webcamType !== WebcamType.camera || usingUvc) {
      setPermissionState('granted');
      return;
    }

    try {
      const current = await Camera.getCameraPermissionStatus();
      console.log('[Video] camera permission status:', current);
      if (current === 'granted') {
        setPermissionState('granted');
        return;
      }

      if (current === 'not-determined') {
        const next = await Camera.requestCameraPermission();
        console.log('[Video] camera permission request result:', next);
        setPermissionState(next === 'granted' ? 'granted' : 'denied');
        return;
      }

      setPermissionState('denied');
    } catch (error) {
      console.log('[Video] camera permission error:', error);
      setPermissionState('denied');
    }
  }, [viewModel.webcamType, usingUvc]);

  useEffect(() => {
    refreshCameraPermission();
  }, [refreshCameraPermission]);

  useEffect(() => {
    if (appState === 'active' && isFocused) {
      refreshCameraPermission();
    }
  }, [appState, isFocused, refreshCameraPermission]);

  useEffect(() => {
    setCameraErrorMessage(null);
    props.setIsCameraReady(false);
  }, [selectedSource, props.setIsCameraReady]);

  useEffect(() => {
    if (!usingUvc) return;
    props.setIsCameraReady(true);
  }, [usingUvc, props.setIsCameraReady]);

  if (!controllerRef.current) {
    controllerRef.current = {
      __videoController: true,
      startRecording: async (options: any) => {
        const currentUsingUvc = usingUvcRef.current;

        if (recordingStateRef.current === 'recording') {
          console.log('[Video] startRecording skipped: already recording');
          return;
        }

        if (recordingStateRef.current === 'stopping') {
          console.log('[Video] startRecording skipped: stop in progress');
          return;
        }

        if (
          Platform.OS === 'android' &&
          !currentUsingUvc &&
          viewModel.webcamType === WebcamType.camera &&
          isYouTubeNativeCameraEnabled()
        ) {
          try {
            recordingStateRef.current = 'starting';
            activeRecordingBackendRef.current = 'youtube-native';
            nativeRecordingCallbacksRef.current = {
              onRecordingFinished: options?.onRecordingFinished,
              onRecordingError: options?.onRecordingError,
            };
            await startYouTubeNativeRecord(options?.path ?? '');
            recordingStateRef.current = 'recording';
          } catch (error) {
            console.log('[YT Native] startRecording error:', error);
            recordingStateRef.current = 'idle';
            activeRecordingBackendRef.current = null;
            nativeRecordingCallbacksRef.current?.onRecordingError?.(error);
            nativeRecordingCallbacksRef.current = null;
          }
          return;
        }

        if (currentUsingUvc) {
          try {
            recordingStateRef.current = 'starting';
            activeRecordingBackendRef.current = 'uvc';

            const tempPath = `${RNFS.CachesDirectoryPath}/uvc_${Date.now()}.mp4`;
            uvcCallbacksRef.current = {
              onRecordingFinished: options?.onRecordingFinished,
              onRecordingError: options?.onRecordingError,
            };
            lastUvcRecordingPathRef.current = tempPath;

            await startUvcRecording(tempPath);
            console.log('[UVC] startRecording requested:', tempPath);
            recordingStateRef.current = 'recording';
          } catch (error) {
            console.log('[UVC] startRecording error:', error);
            recordingStateRef.current = 'idle';
            activeRecordingBackendRef.current = null;
            uvcCallbacksRef.current?.onRecordingError?.(error);
          }
          return;
        }

        const camera = visionCameraRef.current;
        if (!camera?.startRecording) {
          const err = new Error('Vision camera unavailable');
          console.log('[Video] startRecording error:', err.message);
          options?.onRecordingError?.(err);
          return;
        }

        recordingStateRef.current = 'starting';
        activeRecordingBackendRef.current = 'vision';

        camera.startRecording({
          ...options,
          onRecordingFinished: (video: any) => {
            recordingStateRef.current = 'idle';
            activeRecordingBackendRef.current = null;
            options?.onRecordingFinished?.(video);
          },
          onRecordingError: (error: any) => {
            recordingStateRef.current = 'idle';
            activeRecordingBackendRef.current = null;
            options?.onRecordingError?.(error);
          },
        });

        recordingStateRef.current = 'recording';
      },
      stopRecording: async () => {
        const activeBackend = activeRecordingBackendRef.current;

        if (!activeBackend) {
          console.log('[Video] stopRecording skipped: no active backend');
          return null;
        }

        if (recordingStateRef.current === 'stopping') {
          console.log('[Video] stopRecording skipped: already stopping');
          return null;
        }

        recordingStateRef.current = 'stopping';

        if (activeBackend === 'youtube-native') {
          try {
            const recordedPath = await stopYouTubeNativeRecord();
            if (recordedPath) {
              nativeRecordingCallbacksRef.current?.onRecordingFinished?.({
                path: recordedPath,
              });
            } else {
              const err: any = new Error('YouTube native video unavailable');
              err.message = 'YouTube native video unavailable';
              nativeRecordingCallbacksRef.current?.onRecordingError?.(err);
            }
            return recordedPath ? {path: recordedPath} : null;
          } catch (error) {
            nativeRecordingCallbacksRef.current?.onRecordingError?.(error);
            throw error;
          } finally {
            nativeRecordingCallbacksRef.current = null;
            activeRecordingBackendRef.current = null;
            recordingStateRef.current = 'idle';
          }
        }

        if (activeBackend === 'uvc') {
          try {
            const savedPath = await stopUvcRecording();
            const finalPath = savedPath || lastUvcRecordingPathRef.current;
            console.log('[UVC] stopRecording resolved path:', finalPath);

            if (finalPath) {
              uvcCallbacksRef.current?.onRecordingFinished?.({path: finalPath});
            } else {
              const err: any = new Error('UVC video unavailable');
              err.message = 'UVC video unavailable';
              uvcCallbacksRef.current?.onRecordingError?.(err);
            }

            return finalPath;
          } catch (error) {
            console.log('[UVC] stopRecording error:', error);
            uvcCallbacksRef.current?.onRecordingError?.(error);
            throw error;
          } finally {
            uvcCallbacksRef.current = null;
            activeRecordingBackendRef.current = null;
            recordingStateRef.current = 'idle';
          }
        }

        try {
          return await visionCameraRef.current?.stopRecording?.();
        } finally {
          activeRecordingBackendRef.current = null;
          recordingStateRef.current = 'idle';
        }
      },
      setZoom: (value: number) => {
        if (
          Platform.OS === 'android' &&
          !usingUvcRef.current &&
          isYouTubeNativeCameraEnabled()
        ) {
          const currentInfo =
            youtubeNativeZoomInfoRef.current || DEFAULT_YOUTUBE_NATIVE_ZOOM;
          const nextZoom = clamp(
            value,
            currentInfo.minZoom ?? 1,
            currentInfo.maxZoom ?? 8,
          );

          setZoom(nextZoom);
          const optimisticInfo: YouTubeNativeZoomInfo = {
            ...currentInfo,
            zoom: nextZoom,
            source: currentInfo.source || 'youtube-native',
          };
          youtubeNativeZoomInfoRef.current = optimisticInfo;
          setYoutubeNativeZoomInfoState(optimisticInfo);

          setYouTubeNativeZoom(nextZoom)
            .then(() => refreshYouTubeNativeZoomInfo('set-zoom'))
            .catch(error => {
              console.log('[YT Native] setZoom error:', error);
            });

          return nextZoom;
        }

        if (usingUvcRef.current) {
          const currentInfo = uvcZoomInfoRef.current || DEFAULT_UVC_ZOOM;
          if (!currentInfo.supported) {
            return currentInfo.zoom ?? 1;
          }

          const nextZoom = clamp(
            value,
            currentInfo.minZoom ?? 1,
            currentInfo.maxZoom ?? 1,
          );

          setZoom(nextZoom);
          const optimisticInfo = {
            ...currentInfo,
            zoom: nextZoom,
            source: 'external' as const,
          };
          uvcZoomInfoRef.current = optimisticInfo;
          setUvcZoomInfoState(optimisticInfo);

          setUvcZoom(nextZoom)
            .then(async resolvedZoom => {
              const refreshed = await getUvcZoomInfo().catch(() => ({
                ...optimisticInfo,
                zoom: resolvedZoom,
              }));
              uvcZoomInfoRef.current = refreshed;
              setUvcZoomInfoState(refreshed);
              setZoom(refreshed.zoom ?? resolvedZoom ?? nextZoom);
            })
            .catch(error => {
              console.log('[UVC] setZoom error:', error);
            });

          return nextZoom;
        }

        const snapshot = zoomSnapshotRef.current;
        const nextZoom = clamp(value, snapshot.minZoom, snapshot.maxZoom);
        setZoom(nextZoom);
        zoomSnapshotRef.current = {...snapshot, zoom: nextZoom};
        return nextZoom;
      },
      getZoomInfo: () => {
        if (
          Platform.OS === 'android' &&
          !usingUvcRef.current &&
          isYouTubeNativeCameraEnabled()
        ) {
          const info =
            youtubeNativeZoomInfoRef.current || DEFAULT_YOUTUBE_NATIVE_ZOOM;
          return {
            supported: true,
            minZoom: info.minZoom ?? 1,
            maxZoom: info.maxZoom ?? 8,
            zoom: info.zoom ?? 1,
            source: info.source || 'youtube-native',
          };
        }

        if (usingUvcRef.current) {
          const info = uvcZoomInfoRef.current || DEFAULT_UVC_ZOOM;
          return {
            supported: !!info.supported,
            minZoom: info.minZoom ?? 1,
            maxZoom: info.maxZoom ?? 1,
            zoom: info.zoom ?? 1,
            source: 'external',
          };
        }

        const snapshot = zoomSnapshotRef.current;
        return {
          supported: snapshot.supported,
          minZoom: snapshot.minZoom,
          maxZoom: snapshot.maxZoom,
          zoom: snapshot.zoom,
          source: snapshot.source,
        };
      },
    };
  }

  useEffect(() => {
    assignRef(resolvedRef, controllerRef.current);
    return () => {
      assignRef(resolvedRef, null);
    };
  }, [resolvedRef]);

  const youtubeNativeCameraLocked =
    Platform.OS === 'android' && isYouTubeNativeCameraLocked();
  const externalLiveLocked = youtubeSourceLock === 'external';

  const shouldUsePhoneCamera =
    viewModel.webcamType === WebcamType.camera &&
    !usingUvc &&
    !youtubeNativeCameraLocked &&
    !externalLiveLocked;
  const shouldActivatePhoneCamera =
    shouldUsePhoneCamera &&
    permissionState === 'granted' &&
    !!device &&
    isFocused &&
    appState === 'active';

  const isYouTubeNativeActive =
    Platform.OS === 'android' &&
    shouldUsePhoneCamera &&
    isYouTubeNativeCameraEnabled();

  useEffect(() => {
    if (!youtubeNativeCameraLocked) {
      return;
    }

    setCameraErrorMessage(null);
    props.setIsCameraReady(false);
  }, [props, youtubeNativeCameraLocked]);

  const renderFallback = (message?: string) => {
    return (
      <View style={[styles.container, localStyles.fallbackContainer]}> 
        {images?.logoclb ? (
          <Image source={images.logoclb} style={localStyles.logo} resizeMode="contain" />
        ) : (
          <Text style={localStyles.title}>APLUS BILLIARDS</Text>
        )}
        {!!message && <Text style={localStyles.message}>{message}</Text>}
      </View>
    );
  };

  useEffect(() => {
    if (!isYouTubeNativeActive) {
      nativeRecordingCallbacksRef.current = null;
      return;
    }

    refreshYouTubeNativeZoomInfo('enter-youtube-native');

    const readySub = addYouTubeCameraStreamListener('preview_ready', () => {
      setCameraErrorMessage(null);
      props.setIsCameraReady(true);
      void refreshYouTubeNativeZoomInfo('preview-ready');
    });

    const errorSub = addYouTubeCameraStreamListener('preview_error', payload => {
      const message = String(payload?.message ?? 'Native preview lỗi');
      setCameraErrorMessage(message);
      props.setIsCameraReady(false);
    });

    const disabledSub = addYouTubeCameraStreamListener('preview_disabled', () => {
      props.setIsCameraReady(false);
    });

    const streamErrorSub = addYouTubeCameraStreamListener('stream_error', payload => {
      const message = String(payload?.message ?? 'Native stream lỗi');
      setCameraErrorMessage(message);
    });

    const zoomChangedSub = addYouTubeCameraStreamListener('zoom_changed', payload => {
      const normalized: YouTubeNativeZoomInfo = {
        ...DEFAULT_YOUTUBE_NATIVE_ZOOM,
        zoom: Number(payload?.zoom ?? youtubeNativeZoomInfoRef.current.zoom ?? 1),
        minZoom: Number(payload?.minZoom ?? youtubeNativeZoomInfoRef.current.minZoom ?? 1),
        maxZoom: Number(payload?.maxZoom ?? youtubeNativeZoomInfoRef.current.maxZoom ?? 8),
        source: String(payload?.source ?? 'youtube-native'),
      };
      youtubeNativeZoomInfoRef.current = normalized;
      setYoutubeNativeZoomInfoState(normalized);
      setZoom(normalized.zoom ?? 1);
    });

    return () => {
      readySub.remove();
      errorSub.remove();
      disabledSub.remove();
      streamErrorSub.remove();
      zoomChangedSub.remove();
    };
  }, [
    isYouTubeNativeActive,
    props,
    refreshYouTubeNativeZoomInfo,
    setCameraErrorMessage,
  ]);

  if (youtubeNativeCameraLocked && !externalLiveLocked) {
    return renderFallback();
  }

  if (viewModel.webcamType !== WebcamType.camera) {
    if (viewModel.source?.uri) {
      return (
        <RNVideo
          source={viewModel.source}
          style={styles.container}
          resizeMode="contain"
          onError={e => {
            console.log('[Video] stream/video error:', e);
          }}
        />
      );
    }

    return renderFallback('Không có nguồn webcam.');
  }

  if (usingUvc) {
    console.log('[Video] using UVC backend');
    return <UvcCameraView style={localStyles.uvcFill} />;
  }

  if (permissionState === 'loading') {
    return renderFallback('Đang kiểm tra quyền camera...');
  }

  if (permissionState === 'denied') {
    return renderFallback('Bạn chưa cấp quyền camera cho ứng dụng.');
  }

  if (isYouTubeNativeActive) {
    if (cameraErrorMessage) {
      return renderFallback(cameraErrorMessage);
    }

    return (
      <YouTubeAndroidNativePreview
        style={localStyles.uvcFill}
        active={appState === 'active' && isFocused}
        onReady={() => {
          setCameraErrorMessage(null);
          props.setIsCameraReady(true);
          void refreshYouTubeNativeZoomInfo('on-ready-prop');
        }}
        onError={message => {
          setCameraErrorMessage(message);
          props.setIsCameraReady(false);
        }}
      />
    );
  }

  if (!device) {
    return renderFallback('Không tìm thấy camera dùng được.');
  }

  if (cameraErrorMessage) {
    return renderFallback(cameraErrorMessage);
  }

  return (
    <Camera
      key={`${selectedSource}-${device.id}`}
      ref={visionCameraRef}
      style={localStyles.cameraRoot}
      device={device}
      isActive={shouldActivatePhoneCamera}
      video={true}
      audio={false}
      zoom={zoom}
      outputOrientation="device"
      pixelFormat="yuv"
      onInitialized={() => {
        console.log('[Video] camera initialized');
      }}
      onStarted={() => {
        console.log('[Video] camera started');
      }}
      onStopped={() => {
        console.log('[Video] camera stopped');
        props.setIsCameraReady(false);
      }}
      onPreviewStarted={() => {
        console.log('[Video] preview started');
        setCameraErrorMessage(null);
        props.setIsCameraReady(true);
      }}
      onPreviewStopped={() => {
        console.log('[Video] preview stopped');
        props.setIsCameraReady(false);
      }}
      onError={error => {
        console.log('[Video] VisionCamera error:', error);
        props.setIsCameraReady(false);
        setCameraErrorMessage(
          error?.message || 'Không mở được camera trên thiết bị này.',
        );
      }}
    />
  );
};

const localStyles = StyleSheet.create({
  uvcFill: {
    flex: 1,
    width: '100%',
  },
  cameraRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  fallbackContainer: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '72%',
    height: '72%',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  message: {
    color: '#bbb',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default memo(forwardRef(AplusVideo));
