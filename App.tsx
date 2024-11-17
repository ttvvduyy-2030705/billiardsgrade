/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-get-random-values';
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RealmProvider} from '@realm/react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer} from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

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
import RemoteControl from 'utils/remote';

import {logEvent, sendUserId} from 'services/firebase/analytics';
import {initRemoteConfig} from 'services/firebase/remote-config';
import analyticsKeys from 'services/firebase/analytics/keys';
// import {BLEService} from 'utils/bluetooth';

GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
  webClientId:
    '378804694906-259gm8ni9ub5q27jb9796l16djd8clva.apps.googleusercontent.com',
});

const App = (): React.JSX.Element => {
  const [isLoading, setIsLoading] = useState(true);
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

    return () => {
      RemoteControl.instance.removeAllListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _init = useCallback(async () => {
    const deviceId = await DeviceInfo.getInstanceId();

    sendUserId(deviceId);
    logEvent(analyticsKeys.deviceId, {device_id: deviceId});
    initRemoteConfig();

    const _currentLanguage = await loadLanguage();
    setCurrentLanguage(_currentLanguage);

    setIsLoading(false);
  }, []);

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
