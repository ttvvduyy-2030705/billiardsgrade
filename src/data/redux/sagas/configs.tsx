import {call, put, takeLatest} from 'redux-saga/effects';
import {configsActions, configsTypes} from '../actions/configs';
import {
  GetTokensResponse,
  GoogleSignin,
  SignInResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {retrieveYoutubeStreamKey} from 'data/repositories/youtube';
import {YouTubeResponse} from 'types/webcam';

const retrieveStreamKey = function* ({onSuccess, onError}: ReturnType<any>) {
  try {
    const info: SignInResponse = yield call(GoogleSignin.signIn);

    if (!info.data || !info.data.idToken) {
      onError();
      yield put(configsActions.retrieveStreamKeyError());
      return;
    }

    const tokenData: GetTokensResponse = yield call(GoogleSignin.getTokens);
    const data: YouTubeResponse = yield call(
      retrieveYoutubeStreamKey,
      tokenData.accessToken,
    );

    onSuccess({user: info.data, data});
    yield put(configsActions.retrieveStreamKeySuccess());
  } catch (error: any) {
    const {code} = error;

    console.log('Google Signin error', error);

    if (code === statusCodes.SIGN_IN_CANCELLED) {
      // user cancelled the login flow
    } else if (code === statusCodes.IN_PROGRESS) {
      // operation (e.g. sign in) is in progress already
    } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      // play services not available or outdated
    } else {
      // some other error happened
    }

    onError();
    yield put(configsActions.retrieveStreamKeyError());
  }
};

const watcher = function* () {
  yield takeLatest(configsTypes.RETRIEVE_STREAM_KEY, retrieveStreamKey);
};

export default watcher();
