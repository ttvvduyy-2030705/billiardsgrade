export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export interface GameplayScreenProfile {
  width: number;
  height: number;
  shortestSide: number;
  longestSide: number;
  isLandscape: boolean;
  isLargeDisplay: boolean;
  isMediumDisplay: boolean;
  isHandheldLandscape: boolean;
  isUltraCompactLandscape: boolean;
  scale: number;
  headerScale: number;
  playerScale: number;
  consoleScale: number;
  shotClockScale: number;
}

export const getGameplayScreenProfile = (
  width: number,
  height: number,
  fontScale = 1,
): GameplayScreenProfile => {
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const isLandscape = width > height;
  const designScale = clamp(
    Math.min(width / 1920, height / 1080) / Math.min(fontScale || 1, 1.08),
    0.6,
    1,
  );

  const isLargeDisplay = longestSide >= 1600 || shortestSide >= 900;
  const isHandheldLandscape =
    isLandscape && (!isLargeDisplay || designScale < 0.88) && designScale <= 0.82;
  const isUltraCompactLandscape =
    isHandheldLandscape && (height <= 820 || designScale <= 0.72);
  const isMediumDisplay = !isLargeDisplay && !isHandheldLandscape;

  return {
    width,
    height,
    shortestSide,
    longestSide,
    isLandscape,
    isLargeDisplay,
    isMediumDisplay,
    isHandheldLandscape,
    isUltraCompactLandscape,
    scale: designScale,
    headerScale: isHandheldLandscape ? clamp(designScale * 0.92, 0.58, 0.8) : 1,
    playerScale: isHandheldLandscape ? clamp(designScale * 0.94, 0.6, 0.82) : 1,
    consoleScale: isHandheldLandscape ? clamp(designScale * 0.9, 0.58, 0.78) : 1,
    shotClockScale: isHandheldLandscape ? clamp(designScale * 0.8, 0.5, 0.72) : 1,
  };
};
