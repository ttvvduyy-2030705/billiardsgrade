import {PlayerNumber, PlayerPointStep} from 'types/player';

type PLAYER_NUMBER_TYPE = 'pn2' | 'pn3' | 'pn4' | 'pn5';
type PLAYER_POINT_STEPS_TYPE =
  | 'ps-50'
  | 'ps-10'
  | 'ps-5'
  | 'ps-1'
  | 'point'
  | 'ps1'
  | 'ps5'
  | 'ps10'
  | 'ps50';

const PLAYER_NUMBER: {[key in PLAYER_NUMBER_TYPE]: PlayerNumber} = {
  pn2: 2,
  pn3: 3,
  pn4: 4,
  pn5: 5,
};

const PLAYER_POINT_STEPS: {[key in PLAYER_POINT_STEPS_TYPE]: PlayerPointStep} =
  {
    'ps-50': -50,
    'ps-10': -10,
    'ps-5': -5,
    'ps-1': -1,
    point: 0,
    ps1: 1,
    ps5: 5,
    ps10: 10,
    ps50: 50,
  };

export {PLAYER_NUMBER, PLAYER_POINT_STEPS};
