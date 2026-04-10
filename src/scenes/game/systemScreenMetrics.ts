import {NativeModules, Platform} from 'react-native';

export type SystemScreenMetrics = {
  screenWidthDp: number;
  screenHeightDp: number;
  smallestScreenWidthDp: number;
  densityDpi: number;
  density: number;
  fontScale: number;
  orientation: 'portrait' | 'landscape';
  isTablet: boolean;
  windowWidthPx: number;
  windowHeightPx: number;
  source: 'native' | 'fallback';
};

type NativeScreenMetricsModule = {
  getCurrentMetrics?: () => Promise<Partial<SystemScreenMetrics>>;
};

const ScreenMetricsModule =
  NativeModules.ScreenMetricsModule as NativeScreenMetricsModule | undefined;

const clampNumber = (value: unknown, fallback: number) => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
};

export const buildFallbackSystemScreenMetrics = (
  widthDp: number,
  heightDp: number,
  fontScale: number,
): SystemScreenMetrics => {
  const safeWidth = Number.isFinite(widthDp) && widthDp > 0 ? widthDp : 1;
  const safeHeight = Number.isFinite(heightDp) && heightDp > 0 ? heightDp : 1;
  const smallest = Math.min(safeWidth, safeHeight);
  return {
    screenWidthDp: safeWidth,
    screenHeightDp: safeHeight,
    smallestScreenWidthDp: smallest,
    densityDpi: 160,
    density: 1,
    fontScale,
    orientation: safeWidth >= safeHeight ? 'landscape' : 'portrait',
    isTablet: smallest >= 600,
    windowWidthPx: safeWidth,
    windowHeightPx: safeHeight,
    source: 'fallback',
  };
};

export const getSystemScreenMetrics = async (
  widthDp: number,
  heightDp: number,
  fontScale: number,
): Promise<SystemScreenMetrics> => {
  const fallback = buildFallbackSystemScreenMetrics(widthDp, heightDp, fontScale);

  if (Platform.OS !== 'android' || !ScreenMetricsModule?.getCurrentMetrics) {
    return fallback;
  }

  try {
    const raw = await ScreenMetricsModule.getCurrentMetrics();
    return {
      screenWidthDp: clampNumber(raw?.screenWidthDp, fallback.screenWidthDp),
      screenHeightDp: clampNumber(raw?.screenHeightDp, fallback.screenHeightDp),
      smallestScreenWidthDp: clampNumber(
        raw?.smallestScreenWidthDp,
        fallback.smallestScreenWidthDp,
      ),
      densityDpi: clampNumber(raw?.densityDpi, fallback.densityDpi),
      density: clampNumber(raw?.density, fallback.density),
      fontScale: clampNumber(raw?.fontScale, fallback.fontScale),
      orientation:
        raw?.orientation === 'landscape' || raw?.orientation === 'portrait'
          ? raw.orientation
          : fallback.orientation,
      isTablet:
        typeof raw?.isTablet === 'boolean' ? raw.isTablet : fallback.isTablet,
      windowWidthPx: clampNumber(raw?.windowWidthPx, fallback.windowWidthPx),
      windowHeightPx: clampNumber(raw?.windowHeightPx, fallback.windowHeightPx),
      source: 'native',
    };
  } catch {
    return fallback;
  }
};
