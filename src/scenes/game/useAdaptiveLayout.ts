import {useEffect, useMemo, useState} from 'react';
import {PixelRatio, useWindowDimensions} from 'react-native';

import {
  buildFallbackSystemScreenMetrics,
  getSystemScreenMetrics,
  SystemScreenMetrics,
} from './systemScreenMetrics';

export type WidthClass = 'compact' | 'medium' | 'expanded';
export type LayoutPreset = 'phone' | 'tablet' | 'wideTablet' | 'tv';

export type AdaptiveLayout = {
  width: number;
  height: number;
  shortSide: number;
  longSide: number;
  aspectRatio: number;
  isLandscape: boolean;
  isShortLandscape: boolean;
  isVeryShortLandscape: boolean;
  isUltraShortLandscape: boolean;
  widthClass: WidthClass;
  layoutPreset: LayoutPreset;
  scale: number;
  sizeScale: number;
  textScale: number;
  styleKey: string;
  systemMetrics: SystemScreenMetrics;
  s: (value: number) => number;
  fs: (value: number, minFactor?: number, maxFactor?: number) => number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const round = (value: number) => PixelRatio.roundToNearestPixel(value);

export const useAdaptiveLayout = (): AdaptiveLayout => {
  const {width, height, fontScale} = useWindowDimensions();
  const [systemMetrics, setSystemMetrics] = useState<SystemScreenMetrics>(() =>
    buildFallbackSystemScreenMetrics(width, height, fontScale || 1),
  );

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      const next = await getSystemScreenMetrics(width, height, fontScale || 1);
      if (mounted) {
        setSystemMetrics(next);
      }
    };

    void sync();

    return () => {
      mounted = false;
    };
  }, [width, height, fontScale]);

  return useMemo(() => {
    const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
    const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
    const shortSide = Math.min(safeWidth, safeHeight);
    const longSide = Math.max(safeWidth, safeHeight);
    const aspectRatio = longSide / Math.max(shortSide, 1);
    const isLandscape = safeWidth >= safeHeight;
    const smallestScreenWidthDp = systemMetrics.smallestScreenWidthDp || shortSide;

    const widthClass: WidthClass =
      safeWidth < 600 ? 'compact' : safeWidth < 900 ? 'medium' : 'expanded';

    const isTabletSystem = smallestScreenWidthDp >= 600;
    const isTvSystem = smallestScreenWidthDp >= 960 || safeWidth >= 1440;

    let layoutPreset: LayoutPreset = 'phone';
    if (isTvSystem) {
      layoutPreset = 'tv';
    } else if (isTabletSystem && isLandscape && aspectRatio >= 1.45) {
      layoutPreset = 'wideTablet';
    } else if (isTabletSystem) {
      layoutPreset = 'tablet';
    }

    const isHandheldLandscape = isLandscape && smallestScreenWidthDp < 600;
    const isShortLandscape = isLandscape && safeHeight <= (isHandheldLandscape ? 500 : layoutPreset === 'phone' ? 760 : 720);
    const isVeryShortLandscape = isLandscape && safeHeight <= (isHandheldLandscape ? 430 : layoutPreset === 'phone' ? 680 : 640);
    const isUltraShortLandscape = isLandscape && safeHeight <= (isHandheldLandscape ? 380 : 560);

    const widthBase =
      layoutPreset === 'tv'
        ? 1366
        : layoutPreset === 'wideTablet'
          ? 1180
          : layoutPreset === 'tablet'
            ? 1024
            : isHandheldLandscape
              ? 900
              : 420;

    const heightBase =
      layoutPreset === 'tv'
        ? 768
        : layoutPreset === 'wideTablet'
          ? 720
          : layoutPreset === 'tablet'
            ? 760
            : isHandheldLandscape
              ? 520
              : 800;

    const widthFactor = safeWidth / widthBase;
    const heightFactor = safeHeight / heightBase;
    const heightFirstBase = isHandheldLandscape
      ? heightFactor * 0.92 + widthFactor * 0.08
      : isLandscape
        ? heightFactor * 0.82 + widthFactor * 0.18
        : heightFactor * 0.62 + widthFactor * 0.38;

    const aspectPenalty = isHandheldLandscape
      ? clamp((aspectRatio - 1.45) * 0.14, 0, 0.24)
      : isLandscape
        ? clamp((aspectRatio - 1.6) * 0.08, 0, layoutPreset === 'phone' ? 0.18 : 0.08)
        : 0;

    const shortPenalty = isUltraShortLandscape
      ? (isHandheldLandscape ? 0.24 : 0.18)
      : isVeryShortLandscape
        ? (isHandheldLandscape ? 0.16 : 0.12)
        : isShortLandscape
          ? (isHandheldLandscape ? 0.09 : 0.06)
          : 0;

    const floor =
      layoutPreset === 'tv'
        ? 0.9
        : layoutPreset === 'phone'
          ? isHandheldLandscape
            ? 0.48
            : 0.62
          : layoutPreset === 'tablet'
            ? 0.8
            : 0.84;

    const ceiling = isHandheldLandscape ? 0.96 : layoutPreset === 'tv' ? 1.16 : 1.04;

    const scale = clamp(heightFirstBase - aspectPenalty - shortPenalty, floor, ceiling);
    const textScale = clamp(
      scale / Math.min(systemMetrics.fontScale || fontScale || 1, 1.15),
      layoutPreset === 'phone' ? (isHandheldLandscape ? 0.5 : 0.62) : 0.78,
      isHandheldLandscape ? 0.98 : layoutPreset === 'tv' ? 1.1 : 1.04,
    );

    const s = (value: number) => {
      const next = round(value * scale);
      return Number.isFinite(next) ? next : value;
    };

    const fs = (value: number, minFactor = 0.82, maxFactor = 1.08) => {
      const next = round(
        clamp(value * textScale, value * minFactor, value * maxFactor),
      );
      return Number.isFinite(next) ? next : value;
    };

    return {
      width: safeWidth,
      height: safeHeight,
      shortSide,
      longSide,
      aspectRatio,
      isLandscape,
      isShortLandscape,
      isVeryShortLandscape,
      isUltraShortLandscape,
      widthClass,
      layoutPreset,
      scale,
      sizeScale: scale,
      textScale,
      styleKey: `${Math.round(safeWidth)}x${Math.round(safeHeight)}-${layoutPreset}-${widthClass}-${Math.round(scale * 1000)}`,
      systemMetrics,
      s,
      fs,
    };
  }, [fontScale, height, systemMetrics, width]);
};

export default useAdaptiveLayout;
