import {Carom, Libre, Pool} from 'types/category';

type CUSHION_TYPE = 'ONE_CUSHION' | 'THREE_CUSHION';
type LIBRE_TYPE = 'LIBRE';
type POOL_TYPE = 'NINE_BALL' | 'FIFTEEN_BALL';

const CUSHION: {[key in CUSHION_TYPE]: Carom} = {
  ONE_CUSHION: 'one-cushion',
  THREE_CUSHION: 'three-cusion',
};
const LIBRE: {[key in LIBRE_TYPE]: Libre} = {
  LIBRE: 'libre',
};
const POOL: {[key in POOL_TYPE]: Pool} = {
  NINE_BALL: '9-ball',
  FIFTEEN_BALL: '15-ball',
};

export {CUSHION, LIBRE, POOL};
