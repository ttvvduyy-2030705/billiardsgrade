/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useCallback, useEffect, useState} from 'react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer} from '@react-navigation/native';
import {LanguageContext} from 'context/language';
import {StackScreens} from 'scenes';
import {navigationRef} from 'utils/navigation';
import storage, {persistor} from 'data/redux';
import {loadLanguage} from 'i18n';
// import {BLEService} from 'utils/bluetooth';

const App = (): React.JSX.Element => {
  const [currentLanguage, setCurrentLanguage] = useState('vi');

  useEffect(() => {
    _init();

    // BLEService.requestBluetoothPermissions();
    // const [
    //   discoverUnsubscribe,
    //   connectUnsubscribe,
    //   didUpdateUnsubscribe,
    //   stopScanUnsubscribe,
    //   disconnectUnsubscribe,
    // ] = BLEService.registerListeners();

    // return () => {
    //   discoverUnsubscribe.remove();
    //   connectUnsubscribe.remove();
    //   didUpdateUnsubscribe.remove();
    //   stopScanUnsubscribe.remove();
    //   disconnectUnsubscribe.remove();
    // };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _init = useCallback(async () => {
    const _currentLanguage = await loadLanguage();
    setCurrentLanguage(_currentLanguage);
  }, []);

  const onChangeCurrentLanguage = useCallback((language: string) => {
    setCurrentLanguage(language);
  }, []);

  return (
    <Provider store={storage}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer ref={navigationRef}>
          <LanguageContext.Provider
            value={{language: currentLanguage, onChangeCurrentLanguage}}>
            <StackScreens />
          </LanguageContext.Provider>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
};

export default App;
