import 'react-native-get-random-values';
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RealmProvider} from '@realm/react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer} from '@react-navigation/native';

import {StackScreens} from 'scenes';
import {LanguageContext} from 'context/language';
import {loadLanguage, setLanguage} from 'i18n';
import {navigationRef} from 'utils/navigation';
import Container from 'components/Container';
import View from 'components/View';
import Loading from 'components/Loading';
import storage, {persistor} from 'data/redux';
import {GameSchema, GameSettingsModeSchema} from 'data/realm/models/game';
import {PoolBallSchema} from 'data/realm/models/ball';
import {
  PlayerSchema,
  PlayerProModeSchema,
  PlayerSettingsSchema,
  PlayerGoalSchema,
} from 'data/realm/models/player';

const App = (): React.JSX.Element => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('vi');

  const _init = useCallback(async () => {
    try {
      const _currentLanguage = await loadLanguage();
      setCurrentLanguage(_currentLanguage || 'vi');
    } catch (error) {
      console.log('Init error:', error);
      setCurrentLanguage('vi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    _init();
  }, [_init]);

  const onChangeCurrentLanguage = useCallback((language: string) => {
    setCurrentLanguage(language);
    setLanguage(language);
  }, []);

  return (
    <RealmProvider
      deleteRealmIfMigrationNeeded
      schema={[
        GameSchema,
        GameSettingsModeSchema,
        PlayerSettingsSchema,
        PlayerSchema,
        PlayerProModeSchema,
        PlayerGoalSchema,
        PoolBallSchema,
      ]}>
      <Provider store={storage}>
        <PersistGate loading={null} persistor={persistor}>
          <NavigationContainer ref={navigationRef}>
            <LanguageContext.Provider
              value={{language: currentLanguage, onChangeCurrentLanguage}}>
              {isLoading ? (
                <Container>
                  <View flex={'1'} alignItems={'center'} justify={'center'}>
                    <Loading isLoading />
                  </View>
                </Container>
              ) : (
                <GestureHandlerRootView style={styles.container}>
                  <StackScreens />
                </GestureHandlerRootView>
              )}
            </LanguageContext.Provider>
          </NavigationContainer>
        </PersistGate>
      </Provider>
    </RealmProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;