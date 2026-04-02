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


const DEBUG_VIDEO = false;
const debugVideoLog = (...args: any[]) => {
  if (__DEV__ && DEBUG_VIDEO) {
    console.log(...args);
  }
};

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

const USB_RESCAN_INTERVAL_MS = 4000;
const UVC_PRESENCE_GRACE_MS = 3000;
const UVC_ZOOM_REFRESH_INTERVAL_MS = 2500;

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


const areUsbDevicesEqual = (prev: any[] = [], next: any[] = []) => {
  if (prev === next) {
    return true;
  }

  if (prev.length !== next.length) {
    return false;
  }

  for (let index = 0; index < prev.length; index += 1) {
    const left = prev[index] ?? {};
    const right = next[index] ?? {};

    if (
      left.deviceId !== right.deviceId ||
      left.vendorId !== right.vendorId ||
      left.productId !== right.productId ||
      left.looksLikeVideo !== right.looksLikeVideo ||
      left.deviceName !== right.deviceName
    ) {
      return false;
    }
  }

  return true;
};

const isSameZoomInfo = (left: any, right: any) => {
  return (
    left?.supported === right?.supported &&
    Number(left?.minZoom ?? 1) === Number(right?.minZoom ?? 1) &&
    Number(left?.maxZoom ?? 1) === Number(right?.maxZoom ?? 1) &&
    Number(left?.zoom ?? 1) === Number(right?.zoom ?? 1) &&
    String(left?.source ?? '') === String(right?.source ?? '')
  );
};

const setUvcPresenceSnapshot = (present: boolean) => {
  (globalThis as any).__APLUS_UVC_PRESENT__ = present;
};

const setAvailableCameraSourcesSnapshot = (sources: CameraSource[]) => {
  (globalThis as any).__APLUS_AVAILABLE_CAMERA_SOURCES__ = [...sources];
};

const getSelectedSourceSnapshot = (): CameraSource => {
  const value = (globalThis as any).__APLUS_CURRENT_CAMERA_SOURCE__;
  return value === 'front' || value === 'external' ? value : 'back';
};

const AplusVideo = (props: Props, ref: React.LegacyRef<any>) => {
  const viewModel = VideoViewModel(props);
  const isFocused = useIsFocused();

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [permissionState, setPermissionState] = useState<PermissionState>('loading');
  const [microphonePermissionState, setMicrophonePermissionState] =
    useState<PermissionState>('loading');
  const [usbDevices, setUsbDevices] = useState<any[]>([]);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<CameraSource>(() =>
    getSelectedSourceSnapshot(),
  );
  const [zoom, setZoom] = useState(1);
  const [uvcZoomInfoState, setUvcZoomInfoState] = useState<UvcZoomInfo>(DEFAULT_UVC_ZOOM);
  const [youtubeNativeZoomInfoState, setYoutubeNativeZoomInfoState] =
    useState<YouTubeNativeZoomInfo>(DEFAULT_YOUTUBE_NATIVE_ZOOM);
  const [stableHasUvcWebcam, setStableHasUvcWebcam] = useState(false);

  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const externalDevice = useCameraDevice('external');
  const hasBuiltInCamera = !!(backDevice || frontDevice || externalDevice);
  const hasExternalStreamSource = !!viewModel.source?.uri;
  const effectiveWebcamType =
    viewModel.webcamType !== WebcamType.camera &&
    !hasExternalStreamSource &&
    hasBuiltInCamera
      ? WebcamType.camera
      : viewModel.webcamType;

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
  const refreshMicrophonePermissionRef = useRef<
    (requestIfNeeded?: boolean) => Promise<PermissionState>
  >(async () => 'denied');
  const uvcPresenceTimeoutRef = useRef<any>(null);
  const lastRawUvcPresenceRef = useRef(false);
  const usbDevicesRef = useRef<any[]>([]);

  const updateRecordingInfoSnapshot = useCallback((
    overrides: Partial<{
      state: 'idle' | 'starting' | 'recording' | 'stopping' | string;
      backend: BackendType | string | null;
      source: CameraSource | string;
    }> = {},
  ) => {
    const state = overrides.state ?? recordingStateRef.current;
    const backend = overrides.backend ?? activeRecordingBackendRef.current;
    const source =
      overrides.source ??
      (usingUvcRef.current ? 'external' : selectedSourceRef.current || 'back');

    const snapshot = {
      state,
      backend,
      source,
      isRecording:
        state === 'starting' || state === 'recording' || state === 'stopping',
    };

    (globalThis as any).__APLUS_CAMERA_RECORDING_INFO__ = snapshot;
    return snapshot;
  }, []);

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
    debugVideoLog(
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
    debugVideoLog('[UVC] usb devices:', {reason, devices});
    setUsbDevices(prev => (areUsbDevicesEqual(prev as any[], devices as any[]) ? prev : devices));
    return devices;
  } catch (error) {
    console.warn('[UVC] usb devices error:', {reason, error});
    setUsbDevices(prev => (Array.isArray(prev) && prev.length === 0 ? prev : []));
    return [] as any[];
  }
}, []);

  useEffect(() => {
    
    ('mount');
  }, [refreshUsbDevices]);

  useEffect(() => {
  if (
    appState === 'active' &&
    isFocused &&
    effectiveWebcamType === WebcamType.camera &&
    !(recordingStateRef.current !== 'idle' && selectedSourceRef.current !== 'external')
  ) {
    refreshUsbDevices('focus-active');
  }
}, [appState, isFocused, effectiveWebcamType, refreshUsbDevices]);

  useEffect(() => {
  if (effectiveWebcamType !== WebcamType.camera) {
    return;
  }

  const interval = setInterval(() => {
    if (appState !== 'active' || !isFocused) {
      return;
    }

    if (recordingStateRef.current !== 'idle' && selectedSourceRef.current !== 'external') {
      return;
    }

    refreshUsbDevices('interval');
  }, USB_RESCAN_INTERVAL_MS);

  return () => {
    clearInterval(interval);
  };
}, [appState, isFocused, effectiveWebcamType, refreshUsbDevices]);


  const hasUvcWebcam = useMemo(() => {
    return usbDevices.some(d => d.looksLikeVideo);
  }, [usbDevices]);

  useEffect(() => {
    const hadUvcLastTime = lastRawUvcPresenceRef.current;
    lastRawUvcPresenceRef.current = hasUvcWebcam;

    if (hasUvcWebcam) {
      if (!hadUvcLastTime) {
        debugVideoLog('[UVC] video device detected again');
      }
      if (uvcPresenceTimeoutRef.current) {
        clearTimeout(uvcPresenceTimeoutRef.current);
        uvcPresenceTimeoutRef.current = null;
      }
      setStableHasUvcWebcam(true);
      return;
    }

    if (hadUvcLastTime) {
      debugVideoLog('[UVC] video device temporarily missing, keep external source during grace period');
    }

    if (uvcPresenceTimeoutRef.current) {
      clearTimeout(uvcPresenceTimeoutRef.current);
    }

    uvcPresenceTimeoutRef.current = setTimeout(() => {
      debugVideoLog('[UVC] video device grace period expired');
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

    // Chỉ cho external xuất hiện khi webcam thật sự đang có mặt.
    if (externalDevice || hasUvcWebcam) sources.push('external');

    return sources;
  }, [backDevice, frontDevice, externalDevice, hasUvcWebcam]);

  useEffect(() => {
    setUvcPresenceSnapshot(!!(externalDevice || hasUvcWebcam));
    setAvailableCameraSourcesSnapshot(availableSources);

    return () => {
      setUvcPresenceSnapshot(false);
      setAvailableCameraSourcesSnapshot([]);
    };
  }, [externalDevice, hasUvcWebcam, availableSources]);

  const youtubeSourceLock = getYouTubeNativeSourceLock();

  const preferredSource = useMemo<CameraSource>(() => {
    const snapshotSource = getSelectedSourceSnapshot();

    if (youtubeSourceLock === 'external' && availableSources.includes('external')) {
      return 'external';
    }

    if (youtubeSourceLock === 'front' && availableSources.includes('front')) {
      return 'front';
    }

    if (youtubeSourceLock === 'back' && availableSources.includes('back')) {
      return 'back';
    }

    if (availableSources.includes(snapshotSource)) {
      return snapshotSource;
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
          debugVideoLog('[Video] force source because youtube lock is active:', {
            from: current,
            to: youtubeSourceLock,
          });
        }
        return youtubeSourceLock;
      }

      const snapshotSource = getSelectedSourceSnapshot();

      if (availableSources.includes(snapshotSource) && current !== snapshotSource) {
        return snapshotSource;
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
        effectiveWebcamType === WebcamType.camera &&
        source === 'external' &&
        !externalDevice &&
        stableHasUvcWebcam;
      return sourceUsesUvc ? 'uvc' : 'vision';
    },
    [effectiveWebcamType, externalDevice, stableHasUvcWebcam],
  );

  useEffect(() => {
    const unsubscribe = subscribeCycleCameraSource(() => {
      setSelectedSource(current => {
        if (youtubeSourceLock === 'external') {
          debugVideoLog('[Video] block cycle camera source while external live lock is active');
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
          debugVideoLog('[Video] block camera source switch during cross-backend recording', {
            from: current,
            to: nextSource,
            currentBackend,
            nextBackend,
            recordingState: recordingStateRef.current,
            activeBackend: activeRecordingBackendRef.current,
          });
          return current;
        }

        debugVideoLog('[Video] cycle camera source:', {
          availableSources,
          from: current,
          to: nextSource,
        });

        setCurrentCameraSourceSnapshot(nextSource);
        return nextSource;
      });
    });

    return unsubscribe;
  }, [availableSources, resolveBackendForSource, youtubeSourceLock]);

  const resolvedSelectedSource = useMemo<CameraSource>(() => {
    if (!availableSources.length) {
      return selectedSource;
    }

    if (availableSources.includes(selectedSource)) {
      return selectedSource;
    }

    return preferredSource;
  }, [availableSources, preferredSource, selectedSource]);

  const usingUvc =
    effectiveWebcamType === WebcamType.camera &&
    resolvedSelectedSource === 'external' &&
    !externalDevice &&
    stableHasUvcWebcam;

  const device = useMemo(() => {
    if (usingUvc) return null;

    if (resolvedSelectedSource === 'external') {
      return externalDevice ?? backDevice ?? frontDevice ?? null;
    }

    if (resolvedSelectedSource === 'front') {
      return frontDevice ?? backDevice ?? externalDevice ?? null;
    }

    return backDevice ?? frontDevice ?? externalDevice ?? null;
  }, [usingUvc, resolvedSelectedSource, externalDevice, backDevice, frontDevice]);

  const minZoom = useMemo(() => device?.minZoom ?? 1, [device?.id]);
  const maxZoom = useMemo(() => {
    const nativeMax = device?.maxZoom ?? 1;
    return Math.max(minZoom, Math.min(nativeMax, 10));
  }, [device?.id, minZoom]);
  const neutralZoom = useMemo(() => {
    const neutral = device?.neutralZoom ?? minZoom;
    return clamp(neutral, minZoom, maxZoom);
  }, [device?.id, minZoom, maxZoom]);

  const safeZoom = useMemo(() => {
    return clamp(Number.isFinite(zoom) ? zoom : neutralZoom, minZoom, maxZoom);
  }, [zoom, neutralZoom, minZoom, maxZoom]);

  useEffect(() => {
    selectedSourceRef.current = resolvedSelectedSource;
    usingUvcRef.current = usingUvc;
    deviceRef.current = device;
    setCurrentCameraSourceSnapshot(resolvedSelectedSource);
    updateRecordingInfoSnapshot({source: usingUvc ? 'external' : resolvedSelectedSource});
  }, [resolvedSelectedSource, usingUvc, device, updateRecordingInfoSnapshot]);

  useEffect(() => {
    zoomSnapshotRef.current = {
      supported: !!device,
      minZoom,
      maxZoom,
      zoom: safeZoom,
      source: resolvedSelectedSource,
    };
  }, [device, minZoom, maxZoom, safeZoom, resolvedSelectedSource]);

  const refreshUvcZoomInfo = useCallback(
    async (reason: string = 'manual') => {
      try {
        const info = await getUvcZoomInfo();
        const normalized: UvcZoomInfo = {
          ...DEFAULT_UVC_ZOOM,
          ...info,
          source: 'external',
        };
        if (!isSameZoomInfo(uvcZoomInfoRef.current, normalized)) {
          uvcZoomInfoRef.current = normalized;
          setUvcZoomInfoState(normalized);
        }

        setZoom(prev => {
          const nextZoom = normalized.zoom ?? 1;
          return prev === nextZoom ? prev : nextZoom;
        });
        debugVideoLog('[UVC] getZoomInfo:', {reason, info: normalized});
        return normalized;
      } catch (error) {
        console.warn('[UVC] getZoomInfo error:', {reason, error});
        const fallback = uvcZoomInfoRef.current || DEFAULT_UVC_ZOOM;

        if (fallback.supported || selectedSourceRef.current === 'external') {
          if (!isSameZoomInfo(uvcZoomInfoRef.current, fallback)) {
            setUvcZoomInfoState(fallback);
          }
          setZoom(prev => {
            const nextZoom = fallback.zoom ?? 1;
            return prev === nextZoom ? prev : nextZoom;
          });
          return fallback;
        }

        uvcZoomInfoRef.current = DEFAULT_UVC_ZOOM;
        setUvcZoomInfoState(DEFAULT_UVC_ZOOM);
        setZoom(prev => (prev === 1 ? prev : 1));
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
        if (!isSameZoomInfo(youtubeNativeZoomInfoRef.current, normalized)) {
          youtubeNativeZoomInfoRef.current = normalized;
          setYoutubeNativeZoomInfoState(normalized);
        }
        setZoom(prev => {
          const nextZoom = normalized.zoom ?? 1;
          return prev === nextZoom ? prev : nextZoom;
        });
        debugVideoLog('[YT Native] getZoomInfo:', {reason, info: normalized});
        return normalized;
      } catch (error) {
        debugVideoLog('[YT Native] getZoomInfo error:', {reason, error});
        const fallback =
          youtubeNativeZoomInfoRef.current || DEFAULT_YOUTUBE_NATIVE_ZOOM;
        if (!isSameZoomInfo(youtubeNativeZoomInfoRef.current, fallback)) {
          setYoutubeNativeZoomInfoState(fallback);
        }
        setZoom(prev => {
          const nextZoom = fallback.zoom ?? 1;
          return prev === nextZoom ? prev : nextZoom;
        });
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
  }, [usingUvc, resolvedSelectedSource, neutralZoom, appState, isFocused, refreshUvcZoomInfo]);

  useEffect(() => {
    debugVideoLog('[Video] selected source:', resolvedSelectedSource);
    if (!device) return;
    debugVideoLog('[Video] selected device:', {
      id: device.id,
      name: device.name,
      physicalDevices: device.physicalDevices,
      position: device.position,
      previewViewType: 'texture-view',
    });
  }, [resolvedSelectedSource, device?.id]);

  const refreshCameraPermission = useCallback(async () => {
    if (effectiveWebcamType !== WebcamType.camera || usingUvc) {
      setPermissionState('granted');
      return;
    }

    try {
      const current = await Camera.getCameraPermissionStatus();
      debugVideoLog('[Video] camera permission status:', current);
      if (current === 'granted') {
        setPermissionState('granted');
        return;
      }

      if (current === 'not-determined') {
        const next = await Camera.requestCameraPermission();
        debugVideoLog('[Video] camera permission request result:', next);
        setPermissionState(next === 'granted' ? 'granted' : 'denied');
        return;
      }

      setPermissionState('denied');
    } catch (error) {
      debugVideoLog('[Video] camera permission error:', error);
      setPermissionState('denied');
    }
  }, [effectiveWebcamType, usingUvc]);

  const refreshMicrophonePermission = useCallback(
    async (requestIfNeeded: boolean = true): Promise<PermissionState> => {
      if (effectiveWebcamType !== WebcamType.camera || usingUvc) {
        setMicrophonePermissionState('granted');
        return 'granted';
      }

      try {
        const current = await Camera.getMicrophonePermissionStatus();
        debugVideoLog('[Video] microphone permission status:', current);
        if (current === 'granted') {
          setMicrophonePermissionState('granted');
          return 'granted';
        }

        if (current === 'not-determined' && requestIfNeeded) {
          const next = await Camera.requestMicrophonePermission();
          debugVideoLog('[Video] microphone permission request result:', next);
          const nextState = next === 'granted' ? 'granted' : 'denied';
          setMicrophonePermissionState(nextState);
          return nextState;
        }

        setMicrophonePermissionState('denied');
        return 'denied';
      } catch (error) {
        debugVideoLog('[Video] microphone permission error:', error);
        setMicrophonePermissionState('denied');
        return 'denied';
      }
    },
    [effectiveWebcamType, usingUvc],
  );

  useEffect(() => {
    refreshMicrophonePermissionRef.current = refreshMicrophonePermission;
  }, [refreshMicrophonePermission]);

  useEffect(() => {
    void refreshCameraPermission();
    void refreshMicrophonePermission();
  }, [refreshCameraPermission, refreshMicrophonePermission]);

  useEffect(() => {
    if (appState === 'active' && isFocused) {
      void refreshCameraPermission();
      void refreshMicrophonePermission(false);
    }
  }, [appState, isFocused, refreshCameraPermission, refreshMicrophonePermission]);

  useEffect(() => {
    setCameraErrorMessage(null);
    props.setIsCameraReady(false);
  }, [resolvedSelectedSource, props.setIsCameraReady]);

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
          debugVideoLog('[Video] startRecording skipped: already recording');
          return;
        }

        if (recordingStateRef.current === 'stopping') {
          debugVideoLog('[Video] startRecording skipped: stop in progress');
          return;
        }

        if (
          Platform.OS === 'android' &&
          !currentUsingUvc &&
          effectiveWebcamType === WebcamType.camera &&
          isYouTubeNativeCameraEnabled()
        ) {
          try {
            recordingStateRef.current = 'starting';
            activeRecordingBackendRef.current = 'youtube-native';
            updateRecordingInfoSnapshot({
              state: 'starting',
              backend: 'youtube-native',
            });
            nativeRecordingCallbacksRef.current = {
              onRecordingFinished: options?.onRecordingFinished,
              onRecordingError: options?.onRecordingError,
            };
            await startYouTubeNativeRecord(options?.path ?? '');
            recordingStateRef.current = 'recording';
            updateRecordingInfoSnapshot({
              state: 'recording',
              backend: 'youtube-native',
            });
          } catch (error) {
            debugVideoLog('[YT Native] startRecording error:', error);
            recordingStateRef.current = 'idle';
            activeRecordingBackendRef.current = null;
            updateRecordingInfoSnapshot({state: 'idle', backend: null});
            nativeRecordingCallbacksRef.current?.onRecordingError?.(error);
            nativeRecordingCallbacksRef.current = null;
          }
          return;
        }

        if (currentUsingUvc) {
          try {
            recordingStateRef.current = 'starting';
            activeRecordingBackendRef.current = 'uvc';
            updateRecordingInfoSnapshot({state: 'starting', backend: 'uvc'});

            const tempPath = `${RNFS.CachesDirectoryPath}/uvc_${Date.now()}.mp4`;
            uvcCallbacksRef.current = {
              onRecordingFinished: options?.onRecordingFinished,
              onRecordingError: options?.onRecordingError,
            };
            lastUvcRecordingPathRef.current = tempPath;

            await startUvcRecording(tempPath);
            debugVideoLog('[UVC] startRecording requested:', tempPath);
            recordingStateRef.current = 'recording';
            updateRecordingInfoSnapshot({state: 'recording', backend: 'uvc'});
          } catch (error) {
            debugVideoLog('[UVC] startRecording error:', error);
            recordingStateRef.current = 'idle';
            activeRecordingBackendRef.current = null;
            updateRecordingInfoSnapshot({state: 'idle', backend: null});
            uvcCallbacksRef.current?.onRecordingError?.(error);
          }
          return;
        }

        const camera = visionCameraRef.current;
        if (!camera?.startRecording) {
          const err = new Error('Vision camera unavailable');
          debugVideoLog('[Video] startRecording error:', err.message);
          options?.onRecordingError?.(err);
          return;
        }

        const microphoneStatus = await refreshMicrophonePermissionRef.current(true);
        if (microphoneStatus !== 'granted') {
          const err = new Error('Ứng dụng chưa được cấp quyền micro để ghi âm.');
          debugVideoLog('[Video] startRecording microphone permission denied');
          options?.onRecordingError?.(err);
          return;
        }

        recordingStateRef.current = 'starting';
        activeRecordingBackendRef.current = 'vision';
        updateRecordingInfoSnapshot({state: 'starting', backend: 'vision'});

        camera.startRecording({
          ...options,
          onRecordingFinished: (video: any) => {
            recordingStateRef.current = 'idle';
            activeRecordingBackendRef.current = null;
            updateRecordingInfoSnapshot({state: 'idle', backend: null});
            options?.onRecordingFinished?.(video);
          },
          onRecordingError: (error: any) => {
            recordingStateRef.current = 'idle';
            activeRecordingBackendRef.current = null;
            updateRecordingInfoSnapshot({state: 'idle', backend: null});
            options?.onRecordingError?.(error);
          },
        });

        recordingStateRef.current = 'recording';
        updateRecordingInfoSnapshot({state: 'recording', backend: 'vision'});
      },
      stopRecording: async () => {
        const activeBackend = activeRecordingBackendRef.current;

        if (!activeBackend) {
          debugVideoLog('[Video] stopRecording skipped: no active backend');
          return null;
        }

        if (recordingStateRef.current === 'stopping') {
          debugVideoLog('[Video] stopRecording skipped: already stopping');
          return null;
        }

        recordingStateRef.current = 'stopping';
        updateRecordingInfoSnapshot({
          state: 'stopping',
          backend: activeBackend,
        });

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
            updateRecordingInfoSnapshot({state: 'idle', backend: null});
          }
        }

        if (activeBackend === 'uvc') {
          try {
            const savedPath = await stopUvcRecording();
            const finalPath = savedPath || lastUvcRecordingPathRef.current;
            debugVideoLog('[UVC] stopRecording resolved path:', finalPath);

            if (finalPath) {
              uvcCallbacksRef.current?.onRecordingFinished?.({path: finalPath});
            } else {
              const err: any = new Error('UVC video unavailable');
              err.message = 'UVC video unavailable';
              uvcCallbacksRef.current?.onRecordingError?.(err);
            }

            return finalPath;
          } catch (error) {
            debugVideoLog('[UVC] stopRecording error:', error);
            uvcCallbacksRef.current?.onRecordingError?.(error);
            throw error;
          } finally {
            uvcCallbacksRef.current = null;
            activeRecordingBackendRef.current = null;
            recordingStateRef.current = 'idle';
            updateRecordingInfoSnapshot({state: 'idle', backend: null});
          }
        }

        try {
          return await visionCameraRef.current?.stopRecording?.();
        } finally {
          activeRecordingBackendRef.current = null;
          recordingStateRef.current = 'idle';
          updateRecordingInfoSnapshot({state: 'idle', backend: null});
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
              debugVideoLog('[YT Native] setZoom error:', error);
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
              debugVideoLog('[UVC] setZoom error:', error);
            });

          return nextZoom;
        }

        const snapshot = zoomSnapshotRef.current;
        const nextZoom = clamp(value, snapshot.minZoom, snapshot.maxZoom);
        setZoom(nextZoom);
        zoomSnapshotRef.current = {...snapshot, zoom: nextZoom};
        return nextZoom;
      },
      getRecordingInfo: () => updateRecordingInfoSnapshot(),
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
    updateRecordingInfoSnapshot();
    return () => {
      assignRef(resolvedRef, null);
      (globalThis as any).__APLUS_CAMERA_RECORDING_INFO__ = {
        state: 'idle',
        backend: null,
        source: 'back',
        isRecording: false,
      };
    };
  }, [resolvedRef, updateRecordingInfoSnapshot]);

  const youtubeNativeCameraLocked =
    Platform.OS === 'android' && isYouTubeNativeCameraLocked();
  const externalLiveLocked = youtubeSourceLock === 'external';

  const shouldUsePhoneCamera =
    effectiveWebcamType === WebcamType.camera &&
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

  useEffect(() => {
    if (
      viewModel.webcamType !== WebcamType.camera &&
      effectiveWebcamType === WebcamType.camera &&
      hasBuiltInCamera
    ) {
      debugVideoLog('[Video] external webcam source missing, fallback to phone camera');
    }
  }, [viewModel.webcamType, effectiveWebcamType, hasBuiltInCamera]);

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

  if (effectiveWebcamType !== WebcamType.camera) {
    if (viewModel.source?.uri) {
      return (
        <RNVideo
          source={viewModel.source}
          style={styles.container}
          resizeMode="contain"
          onError={e => {
            console.error('[Video] stream/video error:', e);
          }}
        />
      );
    }

    return renderFallback('Không có nguồn webcam.');
  }

  if (usingUvc) {
    debugVideoLog('[Video] using UVC backend');
    return (
      <UvcCameraView style={localStyles.uvcFill}>
        {props.overlayContent}
      </UvcCameraView>
    );
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

  if (availableSources.length > 0 && !availableSources.includes(selectedSource)) {
    return renderFallback('Đang chuẩn bị camera...');
  }

  if (!device) {
    return renderFallback('Không tìm thấy camera dùng được.');
  }

  if (cameraErrorMessage) {
    return renderFallback(cameraErrorMessage);
  }

  return (
    <Camera
      key={`vision-${device.id}`}
      ref={visionCameraRef}
      style={localStyles.cameraRoot}
      device={device}
      isActive={shouldActivatePhoneCamera}
      video={true}
      audio={microphonePermissionState === 'granted'}
      zoom={safeZoom}
      resizeMode="cover"
      androidPreviewViewType={Platform.OS === 'android' ? 'texture-view' : undefined}
      onInitialized={() => {
        debugVideoLog('[Video] camera initialized');
      }}
      onStarted={() => {
        debugVideoLog('[Video] camera started');
      }}
      onStopped={() => {
        debugVideoLog('[Video] camera stopped');
        props.setIsCameraReady(false);
      }}
      onPreviewStarted={() => {
        debugVideoLog('[Video] preview started');
        setCameraErrorMessage(null);
        props.setIsCameraReady(true);
      }}
      onPreviewStopped={() => {
        debugVideoLog('[Video] preview stopped');
        props.setIsCameraReady(false);
      }}
      onError={error => {
        props.setIsCameraReady(false);

        const code = String((error as any)?.code || '');
        const message = String((error as any)?.message || '');

        if (code === 'session/invalid-output-configuration') {
          console.warn('[Video] VisionCamera invalid output configuration:', {code, message});
          setCameraErrorMessage('Camera của thiết bị này không nhận cấu hình hiện tại. Đã chuyển sang cấu hình an toàn hơn.');
          return;
        }

        console.error('[Video] VisionCamera error:', error);
        setCameraErrorMessage(
          message || 'Không mở được camera trên thiết bị này.',
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
