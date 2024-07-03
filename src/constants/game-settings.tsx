import {
  GameCountDownTime,
  GameExtraTimeTurns,
  GameMode,
  GameWarmUpTime,
} from 'types/settings';

type GAME_MODE_TYPE = 'FAST' | 'TIME' | 'ELIMINATE' | 'PRO';
type GAME_EXTRA_TIME_TURN_TYPE = 't0' | 't1' | 't2' | 'infinity';
type GAME_COUNT_DOWN_TIME_TYPE =
  | 's30'
  | 's35'
  | 's40'
  | 's45'
  | 's50'
  | 's55'
  | 's60';
type GAME_WARM_UP_TIME_TYPE =
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p5'
  | 'p10'
  | 'p15'
  | 'undefined';

const GAME_MODE: {[key in GAME_MODE_TYPE]: GameMode} = {
  FAST: 'fast',
  TIME: 'time',
  ELIMINATE: 'eliminate',
  PRO: 'pro',
};

const GAME_EXTRA_TIME_TURN: {
  [key in GAME_EXTRA_TIME_TURN_TYPE]: GameExtraTimeTurns;
} = {
  t0: 0,
  t1: 1,
  t2: 2,
  infinity: 'infinity',
};

const GAME_COUNT_DOWN_TIME: {
  [key in GAME_COUNT_DOWN_TIME_TYPE]: GameCountDownTime;
} = {
  s30: 30,
  s35: 35,
  s40: 40,
  s45: 45,
  s50: 50,
  s55: 55,
  s60: 60,
};

const GAME_WARM_UP_TIME: {[key in GAME_WARM_UP_TIME_TYPE]: GameWarmUpTime} = {
  p1: 60,
  p2: 120,
  p3: 180,
  p5: 300,
  p10: 600,
  p15: 900,
  undefined: undefined,
};

export {
  GAME_MODE,
  GAME_EXTRA_TIME_TURN,
  GAME_COUNT_DOWN_TIME,
  GAME_WARM_UP_TIME,
};
