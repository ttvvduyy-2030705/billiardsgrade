import {all} from 'redux-saga/effects';

import game from './game';

const rootSaga = function* () {
  yield all([game]);
};

export type SagaResponse<T> = {
  success: boolean;
  data: T;
  code: number;
  message: string;
  status: number;
};

export default rootSaga;
