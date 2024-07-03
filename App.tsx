/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useCallback, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {LanguageContext} from 'context/language';
import {StackScreens} from 'scenes';
import {navigationRef} from 'utils/navigation';

const App = (): React.JSX.Element => {
  const [currentLanguage, setCurrentLanguage] = useState('vi');

  const onChangeCurrentLanguage = useCallback((language: string) => {
    setCurrentLanguage(language);
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <LanguageContext.Provider
        value={{language: currentLanguage, onChangeCurrentLanguage}}>
        <StackScreens />
      </LanguageContext.Provider>
    </NavigationContainer>
  );
};

export default App;
