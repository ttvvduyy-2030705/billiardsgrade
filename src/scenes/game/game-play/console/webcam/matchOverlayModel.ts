import {isCaromGame, isPool10Game, isPool15Game, isPool9Game} from 'utils/game';
import {shouldShowMatchOverlay} from 'utils/matchOverlay';

import {
  getPoolCameraScoreboardState,
  type PoolCameraScoreboardState,
} from './poolScoreboardStore';
import {
  getCaromCameraScoreboardState,
  type CaromCameraScoreboardState,
} from './caromScoreboardStore';

type ThumbnailOverlayData = {
  enabled: boolean;
  topLeft: string[];
  topRight: string[];
  bottomLeft: string[];
  bottomRight: string[];
};

export type MatchOverlayNativePlayer = {
  name: string;
  flag: string;
  score: number;
  currentPoint: number;
  color: string;
  highestRate: number;
  average: number;
};

export type MatchOverlayNativeModel = {
  visible: boolean;
  variant: 'pool' | 'carom';
  currentPlayerIndex: number;
  countdownTime: number;
  baseCountdown: number;
  goal: number;
  totalTurns: number;
  players: MatchOverlayNativePlayer[];
  thumbnails: ThumbnailOverlayData;
};

const EMPTY_THUMBNAILS: ThumbnailOverlayData = {
  enabled: false,
  topLeft: [],
  topRight: [],
  bottomLeft: [],
  bottomRight: [],
};

export const EMPTY_MATCH_OVERLAY_NATIVE_MODEL: MatchOverlayNativeModel = {
  visible: false,
  variant: 'pool',
  currentPlayerIndex: 0,
  countdownTime: 0,
  baseCountdown: 0,
  goal: 0,
  totalTurns: 1,
  players: [],
  thumbnails: EMPTY_THUMBNAILS,
};

const toNumber = (value: any, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeThumbnails = (
  thumbnails?: Partial<ThumbnailOverlayData>,
): ThumbnailOverlayData => ({
  enabled: !!thumbnails?.enabled,
  topLeft: Array.isArray(thumbnails?.topLeft) ? thumbnails!.topLeft.filter(Boolean) : [],
  topRight: Array.isArray(thumbnails?.topRight) ? thumbnails!.topRight.filter(Boolean) : [],
  bottomLeft: Array.isArray(thumbnails?.bottomLeft) ? thumbnails!.bottomLeft.filter(Boolean) : [],
  bottomRight: Array.isArray(thumbnails?.bottomRight) ? thumbnails!.bottomRight.filter(Boolean) : [],
});

const isPoolOverlayCategory = (category: any) =>
  isPool9Game(category) || isPool10Game(category) || isPool15Game(category);

const selectScoreboardSourceState = (
  poolState: PoolCameraScoreboardState,
  caromState: CaromCameraScoreboardState,
): PoolCameraScoreboardState | CaromCameraScoreboardState => {
  if (isCaromGame(caromState.gameSettings?.category)) {
    return caromState;
  }

  if (isPoolOverlayCategory(poolState.gameSettings?.category)) {
    return poolState;
  }

  return poolState;
};

export const buildMatchOverlayModelFromScoreBoardStore = ({
  activeForNativeStream,
  poolState = getPoolCameraScoreboardState(),
  caromState = getCaromCameraScoreboardState(),
  thumbnails,
}: {
  activeForNativeStream: boolean;
  poolState?: PoolCameraScoreboardState;
  caromState?: CaromCameraScoreboardState;
  thumbnails: ThumbnailOverlayData;
}): MatchOverlayNativeModel => {
  const sourceState = selectScoreboardSourceState(poolState, caromState);
  const sourceGameSettings = sourceState.gameSettings;
  const sourcePlayerSettings = sourceState.playerSettings;
  const sourceCategory = sourceGameSettings?.category;
  const isCaromOverlay = isCaromGame(sourceCategory);
  const isPoolOverlay = isPoolOverlayCategory(sourceCategory);
  const visible =
    !!activeForNativeStream &&
    shouldShowMatchOverlay(sourceGameSettings, sourcePlayerSettings) &&
    (isPoolOverlay || isCaromOverlay);
  const players = Array.isArray(sourcePlayerSettings?.playingPlayers)
    ? sourcePlayerSettings.playingPlayers.slice(0, 2)
    : [];

  if (!visible) {
    return {
      ...EMPTY_MATCH_OVERLAY_NATIVE_MODEL,
      thumbnails: normalizeThumbnails(thumbnails),
    };
  }

  return {
    visible: true,
    variant: isCaromOverlay ? 'carom' : 'pool',
    currentPlayerIndex: toNumber(sourceState.currentPlayerIndex),
    countdownTime: toNumber(sourceState.countdownTime),
    baseCountdown: toNumber(sourceGameSettings?.mode?.countdownTime),
    goal: toNumber(
      sourceGameSettings?.players?.goal?.goal ?? sourcePlayerSettings?.goal?.goal,
    ),
    totalTurns: Math.max(1, toNumber(caromState.totalTurns, 1)),
    players: players.map((player: any) => ({
      name: String(player?.name || ''),
      flag: String(player?.flag || ''),
      score: toNumber(player?.totalPoint),
      currentPoint: toNumber(player?.proMode?.currentPoint),
      color: String(player?.color || ''),
      highestRate: toNumber(player?.proMode?.highestRate),
      average: toNumber(player?.proMode?.average),
    })),
    thumbnails: normalizeThumbnails(thumbnails),
  };
};

export const buildMatchOverlayNativeModel = buildMatchOverlayModelFromScoreBoardStore;

export const createMatchOverlayModelSignature = (
  model: MatchOverlayNativeModel,
): string => JSON.stringify(model);
