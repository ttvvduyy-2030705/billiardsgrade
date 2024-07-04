/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useCallback, useState} from 'react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer} from '@react-navigation/native';
import {LanguageContext} from 'context/language';
import {StackScreens} from 'scenes';
import {navigationRef} from 'utils/navigation';
import storage, {persistor} from 'data/redux';

const App = (): React.JSX.Element => {
  const [currentLanguage, setCurrentLanguage] = useState('vi');

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
