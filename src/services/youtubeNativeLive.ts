import {DeviceEventEmitter, NativeModules, Platform, UIManager} from 'react-native';

type SourceType = 'phone' | 'webcam';

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
  console.log('[YouTube Live] startStream call', {
    hasUrl: Boolean(url),
    sourceType: options.sourceType || 'phone',
    cameraFacing: options.cameraFacing || 'back',
  });
  return moduleRef.startStream(url, {
    width: options.width ?? 1280,
    height: options.height ?? 720,
    fps: options.fps ?? 30,
    bitrate: options.bitrate ?? 4500 * 1024,
    audioBitrate: options.audioBitrate ?? 128 * 1024,
    sampleRate: options.sampleRate ?? 44100,
    isStereo: options.isStereo ?? true,
    cameraFacing: options.cameraFacing ?? 'back',
    sourceType: options.sourceType ?? 'phone',
  });
};

export const stopYouTubeNativeLive = async () => {
  if (Platform.OS !== 'android' || !moduleRef) {
    return false;
  }
  return moduleRef.stopStream();
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
