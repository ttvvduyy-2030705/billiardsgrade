export const MATCH_OVERLAY_COMPETITION_MODE = 'pro';

const toPositiveFiniteNumber = (value: any): number | undefined => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

export const resolveMatchOverlayMode = (gameSettings?: any): string => {
  const rawMode =
    gameSettings?.mode?.mode ??
    gameSettings?.mode ??
    gameSettings?.gameMode ??
    gameSettings?.playMode ??
    gameSettings?.selectedMode;

  return typeof rawMode === 'string' ? rawMode.trim().toLowerCase() : '';
};

export const resolveMatchOverlayPlayerCount = (
  gameSettings?: any,
  playerSettings?: any,
): number | undefined => {
  const candidateValues = [
    playerSettings?.playerNumber,
    gameSettings?.players?.playerNumber,
    gameSettings?.playerNumber,
    Array.isArray(playerSettings?.playingPlayers)
      ? playerSettings.playingPlayers.length
      : undefined,
    Array.isArray(gameSettings?.players?.playingPlayers)
      ? gameSettings.players.playingPlayers.length
      : undefined,
  ];

  for (const candidate of candidateValues) {
    const resolved = toPositiveFiniteNumber(candidate);
    if (resolved !== undefined) {
      return resolved;
    }
  }

  return undefined;
};

export const shouldShowMatchOverlay = (
  gameSettings?: any,
  playerSettings?: any,
): boolean => {
  return (
    resolveMatchOverlayMode(gameSettings) === MATCH_OVERLAY_COMPETITION_MODE &&
    resolveMatchOverlayPlayerCount(gameSettings, playerSettings) === 2
  );
};
