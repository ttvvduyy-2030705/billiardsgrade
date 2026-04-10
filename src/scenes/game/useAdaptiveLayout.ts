import {useEffect, useMemo, useState} from 'react';
import {PixelRatio, useWindowDimensions} from 'react-native';
import {
  getScreenProfile,
  hydrateScreenProfile,
  ScreenProfile,
  subscribeScreenProfile,
} from './screenProfileStore';

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
  widthClass: WidthClass;
  layoutPreset: LayoutPreset;
  scale: number;
  sizeScale: number;
  textScale: number;
  profile: ScreenProfile;
  styleKey: string;
  s: (value: number) => number;
  fs: (value: number, minFactor?: number, maxFactor?: number) => number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const round = (value: number) => PixelRatio.roundToNearestPixel(value);

export const useAdaptiveLayout = (): AdaptiveLayout => {
  const {width, height, fontScale} = useWindowDimensions();
  const [profile, setProfile] = useState<ScreenProfile>(getScreenProfile());

  useEffect(() => {
    const unsubscribe = subscribeScreenProfile(setProfile);
    void hydrateScreenProfile().then(setProfile).catch(() => {});
    return unsubscribe;
  }, []);

  return useMemo(() => {
    const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
    const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
    const shortSide = Math.min(safeWidth, safeHeight);
    const longSide = Math.max(safeWidth, safeHeight);
    const aspectRatio = longSide / Math.max(shortSide, 1);
    const isLandscape = safeWidth >= safeHeight;

    const detectedWidthClass: WidthClass =
      safeWidth < 600 ? 'compact' : safeWidth < 900 ? 'medium' : 'expanded';

    const detectedIsShortLandscape = isLandscape && safeHeight <= 760;
    const detectedIsVeryShortLandscape = isLandscape && safeHeight <= 680;

    let detectedPreset: LayoutPreset = 'phone';

    if (detectedWidthClass === 'expanded' && (safeWidth >= 1366 || shortSide >= 900)) {
      detectedPreset = 'tv';
    } else if (
      isLandscape &&
      ((detectedWidthClass === 'expanded' && aspectRatio >= 1.45) ||
        (detectedWidthClass === 'medium' && aspectRatio >= 1.5))
    ) {
      detectedPreset = 'wideTablet';
    } else if (detectedWidthClass === 'medium' || detectedWidthClass === 'expanded') {
      detectedPreset = 'tablet';
    }

    const widthBase =
      detectedPreset === 'tv'
        ? 1366
        : detectedPreset === 'wideTablet'
          ? 1180
          : detectedPreset === 'tablet'
            ? 1024
            : 420;

    const heightBase =
      detectedPreset === 'tv'
        ? 768
        : detectedPreset === 'wideTablet'
          ? 720
          : detectedPreset === 'tablet'
            ? 760
            : 800;

    const widthFactor = safeWidth / widthBase;
    const heightFactor = safeHeight / heightBase;
    const aspectBias = isLandscape
      ? clamp((aspectRatio - 1.35) * 0.08, -0.03, 0.05)
      : clamp((1.7 - aspectRatio) * 0.03, -0.02, 0.04);

    const targetBase = widthFactor * 0.68 + heightFactor * 0.32 + aspectBias;

    const compactPenalty =
      detectedIsVeryShortLandscape ? 0.12 : detectedIsShortLandscape ? 0.08 : 0;

    let scale = clamp(
      targetBase - compactPenalty,
      detectedPreset === 'phone' ? 0.78 : 0.8,
      detectedPreset === 'tv' ? 1.2 : 1.08,
    );

    let textScale = clamp(
      scale / Math.min(fontScale || 1, 1.15),
      detectedPreset === 'phone' ? 0.76 : 0.78,
      detectedPreset === 'tv' ? 1.12 : 1.03,
    );

    let widthClass = detectedWidthClass;
    let layoutPreset = detectedPreset;
    let isShortLandscape = detectedIsShortLandscape;
    let isVeryShortLandscape = detectedIsVeryShortLandscape;

    if (profile === 'compact7') {
      widthClass = 'compact';
      layoutPreset = 'phone';
      isShortLandscape = isLandscape || detectedIsShortLandscape;
      isVeryShortLandscape = isLandscape || detectedIsVeryShortLandscape;
      scale = clamp(scale * (isLandscape ? 0.76 : 0.84), 0.64, 0.95);
      textScale = clamp(textScale * (isLandscape ? 0.8 : 0.9), 0.68, 0.98);
    } else if (profile === 'tablet12') {
      widthClass = 'medium';
      layoutPreset = isLandscape && aspectRatio >= 1.45 ? 'wideTablet' : 'tablet';
      scale = clamp(scale * 0.94, 0.8, 1.02);
      textScale = clamp(textScale * 0.96, 0.78, 1.02);
    } else if (profile === 'display24') {
      widthClass = 'expanded';
      layoutPreset = 'tv';
      scale = clamp(scale * 1.04, 0.92, 1.18);
      textScale = clamp(textScale * 1.02, 0.86, 1.08);
    }

    const s = (value: number) => {
      const next = round(value * scale);
      return Number.isFinite(next) ? next : value;
    };

    const fs = (value: number, minFactor = 0.84, maxFactor = 1.08) => {
      const next = round(clamp(value * textScale, value * minFactor, value * maxFactor));
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
      widthClass,
      layoutPreset,
      scale,
      sizeScale: scale,
      textScale,
      profile,
      styleKey: `${Math.round(safeWidth)}x${Math.round(safeHeight)}-${layoutPreset}-${widthClass}-${profile}`,
      s,
      fs,
    };
  }, [fontScale, height, profile, width]);
};

export default useAdaptiveLayout;
