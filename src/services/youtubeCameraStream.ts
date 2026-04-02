import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

export type YouTubeNativeCameraConfig = {
  enabled: boolean;
  streamUrl: string;
  width?: number;
  height?: number;
  fps?: number;
  videoBitrate?: number;
  audioBitrate?: number;
  sampleRate?: number;
  isStereo?: boolean;
  useFrontCamera?: boolean;
  audioEnabled?: boolean;
};

export type YouTubeNativeZoomInfo = {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  source: string;
};

const nativeModule = NativeModules.YouTubeCameraStreamModule as {
  configure?: (config: YouTubeNativeCameraConfig) => Promise<boolean>;
  clearConfig?: () => Promise<boolean>;
  startStream?: () => Promise<boolean>;
  stopStream?: () => Promise<boolean>;
  startRecord?: (path: string) => Promise<boolean>;
  stopRecord?: () => Promise<string | null>;
  setZoom?: (zoom: number) => Promise<boolean>;
  getZoomInfo?: () => Promise<YouTubeNativeZoomInfo>;
};

const emitter =
  Platform.OS === 'android' && nativeModule
    ? new NativeEventEmitter(nativeModule as never)
    : null;

let currentConfig: YouTubeNativeCameraConfig | null = null;

const ensureNative = () => {
  if (Platform.OS !== 'android' || !nativeModule) {
    throw new Error('YouTube native camera chỉ hỗ trợ Android.');
  }
};

export const configureYouTubeNativeCamera = async (
  config: YouTubeNativeCameraConfig,
) => {
  ensureNative();
  currentConfig = config;
  await nativeModule.configure?.(config);
};

export const clearYouTubeNativeCamera = async () => {
  currentConfig = null;
  if (Platform.OS !== 'android') return;
  await nativeModule.clearConfig?.();
};

export const startYouTubeNativeStream = async () => {
  ensureNative();
  await nativeModule.startStream?.();
};

export const stopYouTubeNativeStream = async () => {
  if (Platform.OS !== 'android') return;
  await nativeModule.stopStream?.();
};

export const startYouTubeNativeRecord = async (path: string) => {
  ensureNative();
  await nativeModule.startRecord?.(path);
};

export const stopYouTubeNativeRecord = async () => {
  if (Platform.OS !== 'android') return null;
  return nativeModule.stopRecord?.();
};

export const setYouTubeNativeZoom = async (zoom: number) => {
  if (Platform.OS !== 'android') return;
  await nativeModule.setZoom?.(zoom);
};

export const getYouTubeNativeZoomInfo = async (): Promise<YouTubeNativeZoomInfo> => {
  if (Platform.OS !== 'android') {
    return {
      zoom: 1,
      minZoom: 1,
      maxZoom: 1,
      source: 'unsupported',
    };
  }

  return (
    (await nativeModule.getZoomInfo?.()) ?? {
      zoom: 1,
      minZoom: 1,
      maxZoom: 8,
      source: 'youtube-native',
    }
  );
};

export const isYouTubeNativeCameraEnabled = () => {
  return Platform.OS === 'android' && !!currentConfig?.enabled && !!currentConfig?.streamUrl;
};

export const getYouTubeNativeCameraConfig = () => currentConfig;

export const addYouTubeCameraStreamListener = (
  event:
    | 'preview_ready'
    | 'preview_error'
    | 'preview_disabled'
    | 'stream_connecting'
    | 'stream_started'
    | 'stream_stopped'
    | 'stream_error'
    | 'stream_auth_success'
    | 'stream_bitrate'
    | 'record_started'
    | 'record_stopped'
    | 'zoom_changed',
  listener: (payload?: Record<string, unknown> | null) => void,
) => {
  if (!emitter) {
    return {remove: () => undefined};
  }

  return emitter.addListener(`YouTubeCameraStream:${event}`, listener);
};
