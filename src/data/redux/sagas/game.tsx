import {put, takeLatest} from 'redux-saga/effects';
import {gameActions, gameTypes} from '../actions/game';

const updateGameSettings = function* ({payload}: ReturnType<any>) {
  yield put(gameActions.updateGameSettingsSuccess(payload));
};

const watcher = function* () {
  yield takeLatest(gameTypes.UPDATE_GAME_SETTINGS, updateGameSettings);
};

export default watcher();
