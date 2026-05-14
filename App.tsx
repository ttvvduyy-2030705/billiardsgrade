import 'react-native-get-random-values';
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text as RNText, TextInput as RNTextInput} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {RealmProvider} from '@realm/react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer, getStateFromPath} from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

import {StackScreens} from 'scenes';
import {screens} from 'scenes/screens';
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
import {SCOREMENU_RENDER_API_BASE_URL} from 'config/restaurantMenu';


const installTextScalingGuard = () => {
  // The admin/menu UI uses fixed touch targets. Large Android font scaling can
  // make button labels overlap, so keep text stable inside the restaurant app.
  [RNText, RNTextInput].forEach(Component => {
    const componentAsAny = Component as any;
    componentAsAny.defaultProps = {
      ...(componentAsAny.defaultProps || {}),
      allowFontScaling: false,
      maxFontSizeMultiplier: 1,
    };
  });
};

const installReleaseLogFilter = () => {
  if (__DEV__) {
    return;
  }

  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);

  const noisyPrefixes = [
    '[Replay]',
    '[Live]',
    '[Remote]',
    '[UVC]',
    '[Video]',
    '[Extension]',
    '[YouTube Live]',
    '[YouTubeNativeLive]',
    'Starting recording...',
    'Stopping recording...',
    'Recording finished:',
    'Free disk storae',
  ];

  const shouldDrop = (firstArg: unknown) => {
    if (typeof firstArg !== 'string') {
      return false;
    }

    return noisyPrefixes.some(prefix => firstArg.startsWith(prefix));
  };

  console.log = (...args: any[]) => {
    if (shouldDrop(args[0])) {
      return;
    }
    originalLog(...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('NativeEventEmitter')
    ) {
      return;
    }
    originalWarn(...args);
  };
};

GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
  webClientId:
    '378804694906-259gm8ni9ub5q27jb9796l16djd8clva.apps.googleusercontent.com',
});


const wakeScoreMenuApi = () => {
  const baseUrl = String(SCOREMENU_RENDER_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!baseUrl || baseUrl.startsWith('http://localhost')) {
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;

  if (controller) {
    timeoutId = setTimeout(() => controller.abort(), 90000);
  }

  fetch(`${baseUrl}/health`, {
    method: 'GET',
    ...(controller ? {signal: controller.signal} : {}),
  }).catch(error => {
    if (__DEV__) {
      console.log('[ScoreMenu] API wake skipped:', error?.message || error);
    }
  }).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};

const safeDecodeScoreMenuLinkPart = (value: string) => {
  try {
    return decodeURIComponent(String(value || '').trim());
  } catch (_error) {
    return String(value || '').trim();
  }
};

const extractScoreMenuTokenFromPath = (path: string) => {
  const cleanPath = String(path || '').trim();
  const queryMatch = cleanPath.match(
    /[?&](?:qrToken|menuQrToken|tableQrToken|token|code)=([^&#]+)/i,
  );

  if (queryMatch?.[1]) {
    return safeDecodeScoreMenuLinkPart(queryMatch[1]);
  }

  const pathOnly = cleanPath.split('#')[0].split('?')[0];
  const match = pathOnly.match(
    /(?:^|\/)(?:m|menu|public\/menu)\/([^/?#]+)/i,
  );

  if (match?.[1]) {
    return safeDecodeScoreMenuLinkPart(match[1]);
  }

  return '';
};

const scoreMenuHttpsPrefix = String(SCOREMENU_RENDER_API_BASE_URL || '')
  .trim()
  .replace(/\/$/, '');

const restaurantMenuLinking = {
  prefixes: [
    'scoremenu://',
    ...(scoreMenuHttpsPrefix ? [scoreMenuHttpsPrefix] : []),
  ],
  config: {
    screens: {
      [screens.restaurantMenu]: {
        path: 'menu',
        parse: {
          qrToken: safeDecodeScoreMenuLinkPart,
          menuQrToken: safeDecodeScoreMenuLinkPart,
          tableQrToken: safeDecodeScoreMenuLinkPart,
          token: safeDecodeScoreMenuLinkPart,
        },
      },
    },
  },
  getStateFromPath(path: string, options: any) {
    const qrToken = extractScoreMenuTokenFromPath(path);

    if (qrToken) {
      return {
        routes: [
          {
            name: screens.restaurantMenu,
            params: {
              qrToken,
              menuQrToken: qrToken,
              tableQrToken: qrToken,
              source: 'deep-link',
              openedAt: Date.now(),
            },
          },
        ],
      };
    }

    return getStateFromPath(path, options);
  },
};

const App = (): React.JSX.Element => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('vi');

  const initApp = useCallback(async () => {
    installTextScalingGuard();
    installReleaseLogFilter();
    await DeviceInfo.getInstanceId();
    const language = await loadLanguage();
    setCurrentLanguage(language);
    void wakeScoreMenuApi();
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await initApp();
      } catch (error: any) {
        console.log('App init error:', error?.message || error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      try {
        RemoteControl.instance.removeAllListeners();
      } catch (error: any) {
        console.log('Remote cleanup skipped:', error?.message || error);
      }
    };
  }, [initApp]);

  const onChangeCurrentLanguage = useCallback((language: string) => {
    setCurrentLanguage(language);
    void setLanguage(language);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
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
            <NavigationContainer ref={navigationRef} linking={restaurantMenuLinking}>
              <LanguageContext.Provider
                value={{
                  language: currentLanguage,
                  onChangeCurrentLanguage,
                }}>
                {isLoading ? (
                  <Container>
                    <View flex={'1'} alignItems={'center'} justify={'center'}>
                      <Loading isLoading />
                    </View>
                  </Container>
                ) : (
                  <StackScreens />
                )}
              </LanguageContext.Provider>
            </NavigationContainer>
          </PersistGate>
        </Provider>
      </RealmProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;