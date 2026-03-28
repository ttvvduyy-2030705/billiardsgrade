import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import createSagaMiddleware from 'redux-saga';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rootReducer from './reducers';
import rootSaga from './sagas';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: ['game'], // State slices to exclude from persistence
};

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer as any);

// Create saga middleware
const sagaMiddleware = createSagaMiddleware();

// Configure the store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable checks for redux-persist's non-serializable values
    }).concat(sagaMiddleware), // Add saga middleware
  devTools: process.env.NODE_ENV !== 'production', // Enable Redux DevTools in development
});

// Run the saga
sagaMiddleware.run(rootSaga);

// Create persistor
const persistor = persistStore(store);

export { persistor };
export default store;
