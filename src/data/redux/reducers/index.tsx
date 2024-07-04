import {combineReducers} from 'redux';

import game from './game';
import UI from './loading';

const rootReducer = combineReducers({
  game,
  UI,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
