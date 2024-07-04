import {createStore, applyMiddleware, compose, Action} from 'redux';
import {persistStore, persistReducer} from 'redux-persist';
import createSagaMiddleware from 'redux-saga';
import AsyncStorage from '@react-native-community/async-storage';
import rootReducer from './reducers';
import rootSaga from './sagas';
// import Reactotron, { reactotronConfig } from 'configuration/reactotron';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: ['game'],
};

//Redux saga
// const reactotronEnable = reactotronConfig.enable;

// const sagaMiddleWare = reactotronEnable
//   ? createSagaMiddleware({ sagaMonitor: Reactotron.createSagaMonitor() })
//   : createSagaMiddleware();

const sagaMiddleWare = createSagaMiddleware();

const middlewares = [sagaMiddleWare];

// const enhancers = reactotronEnable
//   ? [applyMiddleware(...middlewares), Reactotron.createEnhancer()]
//   : [applyMiddleware(...middlewares)];

const enhancers = [applyMiddleware(...middlewares)];

//Redux
const store = createStore(
  persistReducer<unknown, Action<string>>(persistConfig, rootReducer as any),
  compose(...enhancers) as any,
);
const persistor = persistStore(store);

sagaMiddleWare.run(rootSaga);

export {persistor};
export default store;
