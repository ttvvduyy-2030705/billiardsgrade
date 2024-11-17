import {combineReducers} from 'redux';

import game from './game';
import history from './history';
import configs from './configs';
import UI from './loading';

const rootReducer = combineReducers({
  game,
  history,
  configs,
  UI,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
