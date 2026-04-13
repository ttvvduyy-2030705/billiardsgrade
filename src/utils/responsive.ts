import {Dimensions, PixelRatio} from 'react-native';

export const BASE_WIDTH = 1280;
export const BASE_HEIGHT = 800;
const BASE_ASPECT = BASE_WIDTH / BASE_HEIGHT;

export type ResponsiveWidthClass = 'compact' | 'medium' | 'expanded';
export type ResponsivePreset = 'phone' | 'tablet' | 'wideTablet' | 'tv';

export type ResponsiveMetrics = {
  width: number;
  height: number;
  shortSide: number;
  longSide: number;
  aspectRatio: number;
  isLandscape: boolean;
  smallestDp: number;
  widthClass: ResponsiveWidthClass;
  layoutPreset: ResponsivePreset;
  scaleX: number;
  scaleY: number;
  scale: number;
  textScale: number;
  sizeScale: number;
  moderateScale: number;
  isShortLandscape: boolean;
  isVeryShortLandscape: boolean;
  isUltraShortLandscape: boolean;
  isConstrainedLandscape: boolean;
};

export type ResponsiveHelperOptions = {
  minFactor?: number;
  maxFactor?: number;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const round = (value: number) => {
  const next = PixelRatio.roundToNearestPixel(value);
  return Number.isFinite(next) ? next : value;
};

const getSafeWindow = (widthArg?: number, heightArg?: number) => {
  const window = Dimensions.get('window');
  const width = Number.isFinite(widthArg) && (widthArg || 0) > 0 ? Number(widthArg) : window.width;
  const height = Number.isFinite(heightArg) && (heightArg || 0) > 0 ? Number(heightArg) : window.height;

  return {
    width: width > 0 ? width : 1,
    height: height > 0 ? height : 1,
  };
};

export const getResponsiveMetrics = (params?: {
  width?: number;
  height?: number;
  fontScale?: number;
  smallestDp?: number;
}): ResponsiveMetrics => {
  const {width, height} = getSafeWindow(params?.width, params?.height);
  const fontScale = Number.isFinite(params?.fontScale) && (params?.fontScale || 0) > 0
    ? Number(params?.fontScale)
    : PixelRatio.getFontScale();

  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const aspectRatio = longSide / Math.max(shortSide, 1);
  const isLandscape = width >= height;
  const smallestDp = Number.isFinite(params?.smallestDp) && (params?.smallestDp || 0) > 0
    ? Number(params?.smallestDp)
    : shortSide;

  const widthClass: ResponsiveWidthClass =
    width < 600 ? 'compact' : width < 960 ? 'medium' : 'expanded';

  const isTablet = smallestDp >= 600;
  const isTv = smallestDp >= 960 || width >= 1440;
  const isConstrainedLandscape =
    isLandscape && (smallestDp < 600 || height <= 700 || aspectRatio >= 1.72);

  let layoutPreset: ResponsivePreset = 'phone';
  if (isTv) {
    layoutPreset = 'tv';
  } else if (isTablet && isLandscape && !isConstrainedLandscape && aspectRatio >= 1.42) {
    layoutPreset = 'wideTablet';
  } else if (isTablet && !isConstrainedLandscape) {
    layoutPreset = 'tablet';
  }

  const isShortLandscape = isLandscape && height <= (isConstrainedLandscape ? 640 : 760);
  const isVeryShortLandscape = isLandscape && height <= (isConstrainedLandscape ? 560 : 680);
  const isUltraShortLandscape = isLandscape && height <= (isConstrainedLandscape ? 500 : 560);

  const widthFactor = width / BASE_WIDTH;
  const heightFactor = height / BASE_HEIGHT;

  const landscapePrimary = heightFactor * 0.74 + widthFactor * 0.26;
  const portraitPrimary = heightFactor * 0.62 + widthFactor * 0.38;
  const baseScale = isLandscape ? landscapePrimary : portraitPrimary;

  const aspectPenalty = isLandscape
    ? clamp((aspectRatio - BASE_ASPECT) * (isConstrainedLandscape ? 0.18 : 0.08), 0, isConstrainedLandscape ? 0.26 : 0.12)
    : 0;

  const shortPenalty = isUltraShortLandscape
    ? (isConstrainedLandscape ? 0.18 : 0.12)
    : isVeryShortLandscape
      ? (isConstrainedLandscape ? 0.12 : 0.08)
      : isShortLandscape
        ? (isConstrainedLandscape ? 0.08 : 0.04)
        : 0;

  const minScale = layoutPreset === 'tv' ? 0.92 : isConstrainedLandscape ? 0.56 : layoutPreset === 'phone' ? 0.72 : 0.82;
  const maxScale = layoutPreset === 'tv' ? 1.16 : isConstrainedLandscape ? 0.96 : 1.04;
  const scale = clamp(baseScale - aspectPenalty - shortPenalty, minScale, maxScale);

  const normalizedFontScale = clamp(fontScale, 1, 1.15);
  const textScale = clamp(
    scale / normalizedFontScale,
    isConstrainedLandscape ? 0.68 : layoutPreset === 'phone' ? 0.78 : 0.84,
    layoutPreset === 'tv' ? 1.08 : 1.02,
  );

  return {
    width,
    height,
    shortSide,
    longSide,
    aspectRatio,
    isLandscape,
    smallestDp,
    widthClass,
    layoutPreset,
    scaleX: clamp(widthFactor, 0.72, 1.16),
    scaleY: clamp(heightFactor, 0.72, 1.12),
    scale,
    textScale,
    sizeScale: scale,
    moderateScale: clamp(scale, 0.72, 1.08),
    isShortLandscape,
    isVeryShortLandscape,
    isUltraShortLandscape,
    isConstrainedLandscape,
  };
};

export const scaleX = (value: number, width?: number, height?: number, options?: ResponsiveHelperOptions) => {
  const metrics = getResponsiveMetrics({width, height});
  const minFactor = options?.minFactor ?? 0.78;
  const maxFactor = options?.maxFactor ?? 1.12;
  return round(clamp(value * metrics.scaleX, value * minFactor, value * maxFactor));
};

export const scaleY = (value: number, width?: number, height?: number, options?: ResponsiveHelperOptions) => {
  const metrics = getResponsiveMetrics({width, height});
  const minFactor = options?.minFactor ?? 0.78;
  const maxFactor = options?.maxFactor ?? 1.1;
  return round(clamp(value * metrics.scaleY, value * minFactor, value * maxFactor));
};

export const scale = (value: number, width?: number, height?: number, options?: ResponsiveHelperOptions) => {
  const metrics = getResponsiveMetrics({width, height});
  const minFactor = options?.minFactor ?? 0.78;
  const maxFactor = options?.maxFactor ?? 1.08;
  return round(clamp(value * metrics.scale, value * minFactor, value * maxFactor));
};

export const moderateScale = (
  value: number,
  factor = 0.5,
  width?: number,
  height?: number,
  options?: ResponsiveHelperOptions,
) => {
  const metrics = getResponsiveMetrics({width, height});
  const scaled = value + (value * metrics.moderateScale - value) * factor;
  const minFactor = options?.minFactor ?? 0.8;
  const maxFactor = options?.maxFactor ?? 1.08;
  return round(clamp(scaled, value * minFactor, value * maxFactor));
};

export const fontScale = (
  value: number,
  width?: number,
  height?: number,
  options?: ResponsiveHelperOptions,
) => {
  const metrics = getResponsiveMetrics({width, height});
  const minFactor = options?.minFactor ?? 0.82;
  const maxFactor = options?.maxFactor ?? 1.04;
  return round(clamp(value * metrics.textScale, value * minFactor, value * maxFactor));
};

export default getResponsiveMetrics;
