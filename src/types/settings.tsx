import {BilliardCategory} from './category';
import {PlayerSettings} from './player';

export type GameMode = 'fast' | 'time' | 'eliminate' | 'pro';
export type GameModePool = 'fast' | 'time';
export type GameExtraTimeTurns = 1 | 2 | 3 | 4 | 'infinity';
export type GameCountDownTime = 30 | 35 | 40 | 45 | 50 | 55 | 60;
export type GameWarmUpTime = 60 | 120 | 180 | 300 | 600 | 900 | undefined;

export type GameSettingsMode = {
  mode: GameMode;
  extraTimeTurns?: GameExtraTimeTurns;
  countdownTime?: GameCountDownTime;
  warmUpTime?: GameWarmUpTime;
};

export type GameSettings = {
  category: BilliardCategory;
  mode: GameSettingsMode;
  players: PlayerSettings;
};
