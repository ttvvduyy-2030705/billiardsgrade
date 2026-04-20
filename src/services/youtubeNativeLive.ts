import {DeviceEventEmitter, NativeModules, Platform, UIManager} from 'react-native';

type SourceType = 'phone' | 'webcam';

export type YouTubeNativeOverlayPlayer = {
  name?: string;
  flag?: string;
  score?: number;
  currentPoint?: number;
};

export type YouTubeNativeOverlayThumbnails = {
  enabled?: boolean;
  topLeft?: string[];
  topRight?: string[];
  bottomLeft?: string[];
  bottomRight?: string[];
};

export type YouTubeNativeOverlayPayload = {
  visible?: boolean;
  variant?: 'pool' | 'carom';
  source?: 'gameplay-shared-overlay-snapshot' | string;
  snapshotUri?: string;
  snapshotWidth?: number;
  snapshotHeight?: number;
  updatedAt?: number;
  currentPlayerIndex?: number;
  countdownTime?: number;
  baseCountdown?: number;
  goal?: number;
  totalTurns?: number;
  players?: YouTubeNativeOverlayPlayer[];
  thumbnails?: YouTubeNativeOverlayThumbnails;
};

type StartOptions = {
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
  audioBitrate?: number;
  sampleRate?: number;
  isStereo?: boolean;
  cameraFacing?: 'front' | 'back';
  sourceType?: SourceType;
  rotationDegrees?: number;
};

type ZoomInfo = {
  supported?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoom?: number;
  source?: string;
};

const moduleRef = NativeModules.YouTubeLiveModule;

export const isYouTubeNativeLiveEngineMounted = () =>
  Platform.OS === 'android' && Boolean(moduleRef);

export const isYouTubeNativePreviewViewAvailable = () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return Boolean(UIManager.getViewManagerConfig?.('YouTubeLivePreviewView'));
  } catch (error) {
    console.log('[YouTube Live] native preview view check failed:', error);
    return false;
  }
};

export const isYouTubeNativeLiveReady = () =>
  isYouTubeNativeLiveEngineMounted() && isYouTubeNativePreviewViewAvailable();

const assertAndroid = () => {
  if (Platform.OS !== 'android' || !moduleRef) {
    throw new Error('YouTube native live chỉ hỗ trợ Android.');
  }
};

export const prepareYouTubeNativePreview = async (
  cameraFacing: 'front' | 'back' = 'back',
  sourceType: SourceType = 'phone',
) => {
  assertAndroid();
  return moduleRef.preparePreview(cameraFacing, sourceType);
};

export const startYouTubeNativeLive = async (
  url: string,
  options: StartOptions = {},
) => {
  console.log('[YouTube Live] native engine mounted=' + isYouTubeNativeLiveEngineMounted());
  assertAndroid();

  const width = Number.isFinite(options.width) && Number(options.width) > 0
    ? Math.round(Number(options.width))
    : 1920;
  const height = Number.isFinite(options.height) && Number(options.height) > 0
    ? Math.round(Number(options.height))
    : 1080;
  const fps = Number.isFinite(options.fps) && Number(options.fps) > 0
    ? Math.round(Number(options.fps))
    : 30;
  const bitrate = Number.isFinite(options.bitrate) && Number(options.bitrate) > 0
    ? Math.round(Number(options.bitrate))
    : 8000 * 1024;
  const audioBitrate = Number.isFinite(options.audioBitrate) && Number(options.audioBitrate) > 0
    ? Math.round(Number(options.audioBitrate))
    : 128 * 1024;
  const sampleRate = Number.isFinite(options.sampleRate) && Number(options.sampleRate) > 0
    ? Math.round(Number(options.sampleRate))
    : 44100;

  const hasUrl = typeof url === 'string' && url.trim().length > 0;
  const hasStreamKey = hasUrl && /rtmps?:\/\//i.test(url) && url.length > 24;
  console.log('[YouTube Live] validating params', {
    hasUrl,
    hasStreamKey,
    width,
    height,
    fps,
    bitrate,
    sourceType: options.sourceType || 'phone',
    cameraFacing: options.cameraFacing || 'back',
  });

  if (!hasUrl) {
    const error = new Error('Thiếu RTMP URL/stream key, không thể bắt đầu live YouTube.');
    console.log('[YouTube Live] start rejected, not crashing reason=' + error.message);
    throw error;
  }

  if (width <= 0 || height <= 0) {
    const error = new Error(`Kích thước encoder không hợp lệ: ${width}x${height}.`);
    console.log('[YouTube Live] start rejected, not crashing reason=' + error.message);
    throw error;
  }

  const payload = {
    width,
    height,
    fps,
    bitrate,
    audioBitrate,
    sampleRate,
    isStereo: options.isStereo ?? true,
    cameraFacing: options.cameraFacing ?? 'back',
    sourceType: options.sourceType ?? 'phone',
    rotationDegrees: options.rotationDegrees ?? 0,
  };

  try {
    console.log('[YouTube Live] calling native startStream');
    const result = await moduleRef.startStream(url.trim(), payload);
    console.log('[YouTube Live] native start resolved');
    return result;
  } catch (error: any) {
    console.log('[YouTube Live] start rejected, not crashing reason=', error?.message || error);
    throw error;
  }
};

export const stopYouTubeNativeLive = async () => {
  if (Platform.OS !== 'android' || !moduleRef) {
    return false;
  }
  return moduleRef.stopStream();
};

export const startYouTubeNativeRecord = async (path: string) => {
  assertAndroid();
  return moduleRef.startRecord?.(path);
};

export const stopYouTubeNativeRecord = async (): Promise<string | null> => {
  if (Platform.OS !== 'android' || !moduleRef) {
    return null;
  }
  return (await moduleRef.stopRecord?.()) ?? null;
};

export const updateYouTubeNativeOverlay = async (
  payload: YouTubeNativeOverlayPayload,
) => {
  if (Platform.OS !== 'android' || !moduleRef?.updateOverlay) {
    return false;
  }

  const hasSnapshot = Boolean(payload?.visible && payload?.snapshotUri);
  console.log('[Live Overlay] source=gameplay-shared-overlay', {
    visible: !!payload?.visible,
    mode: payload?.variant || 'unknown',
    hasSnapshot,
    snapshotCaptured: hasSnapshot,
    width: payload?.snapshotWidth,
    height: payload?.snapshotHeight,
  });
  console.log(
    `[Live Overlay] snapshotCaptured=${hasSnapshot} desiredSource=gameplay-shared-overlay mode=${payload?.variant || 'unknown'} size=${payload?.snapshotWidth || 0}x${payload?.snapshotHeight || 0}`,
  );

  return moduleRef.updateOverlay({
    ...payload,
    source: payload?.source || 'gameplay-shared-overlay-snapshot',
  });
};

export const switchYouTubeNativeCamera = async () => {
  assertAndroid();
  return moduleRef.switchCamera();
};

export const getYouTubeNativeZoomInfo = async (): Promise<ZoomInfo> => {
  if (Platform.OS !== 'android' || !moduleRef) {
    return {
      supported: false,
      minZoom: 1,
      maxZoom: 1,
      zoom: 1,
      source: 'unknown',
    };
  }
  return moduleRef.getZoomInfo();
};

export const setYouTubeNativeZoom = async (level: number) => {
  assertAndroid();
  return moduleRef.setZoom(level);
};

export const subscribeYouTubeNativeLiveState = (
  listener: (event: {type?: string; message?: string}) => void,
) => {
  if (Platform.OS !== 'android' || !moduleRef) {
    return () => {};
  }

  const subscription = DeviceEventEmitter.addListener(
    'youtubeLiveNativeState',
    listener,
  );

  return () => subscription.remove();
};
