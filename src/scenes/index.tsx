import React, {useEffect} from 'react';
import {
  NativeStackNavigationOptions,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {StyleSheet} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import Text from 'components/Text';
import Button from 'components/Button';
import Image from 'components/Image';

import {withWrapper} from 'components/HOC';

import colors from 'configuration/colors';

import i18n from 'i18n';
import images from 'assets';

import {goBack} from 'utils/navigation';

import {screens} from './screens';
import {configureSystemUI} from 'theme/systemUI';
import {LIVESTREAM_AUTH_BASE_URL} from 'config/livestreamAuth';
import {SubscriptionProvider} from 'features/subscription';

const Stack = createNativeStackNavigator();

const screenOptions: NativeStackNavigationOptions = {
  headerTitleAlign: 'center',
  headerTintColor: colors.white,
  headerBackTitle: '',
  headerBackVisible: false,
};

const noHeader: NativeStackNavigationOptions = {
  headerShown: false,
};

const styles = StyleSheet.create({
  backButton: {
    marginLeft: -15,
    padding: 10,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
});

const renderBackButton = () => {
  return (
    <Button onPress={goBack} style={styles.backButton}>
      <Image source={images.icBack} style={styles.backIcon} />
    </Button>
  );
};

const buildOptions = (
  name: string,
  hideHeader?: boolean,
): NativeStackNavigationOptions => {
  if (hideHeader) {
    return noHeader;
  }

  return {
    ...screenOptions,
    headerTitle: () => <Text>{i18n.t(name)}</Text>,
    headerLeft: renderBackButton,
  };
};

const buildCustomTitleOptions = (
  title: string,
  hideHeader?: boolean,
): NativeStackNavigationOptions => {
  if (hideHeader) {
    return noHeader;
  }

  return {
    ...screenOptions,
    headerTitle: () => <Text>{title}</Text>,
    headerLeft: renderBackButton,
  };
};

const getWrappedHome = () => withWrapper(screens.home, require('./home').default);
const getWrappedLivePlatform = () =>
  withWrapper(screens.livePlatform, require('./live-platform').default);
const getWrappedLivePlatformSetup = () =>
  withWrapper(
    screens.livePlatformSetup,
    require('./live-platform-setup/youtube').default,
  );
const getWrappedLivePlatformSetupFacebook = () =>
  withWrapper(
    screens.livePlatformSetupFacebook,
    require('./live-platform-setup/facebook').default,
  );
const getWrappedLivePlatformSetupYoutube = () =>
  withWrapper(
    screens.livePlatformSetupYoutube,
    require('./live-platform-setup/youtube').default,
  );
const getWrappedLivePlatformSetupTiktok = () =>
  withWrapper(
    screens.livePlatformSetupTiktok,
    require('./live-platform-setup/tiktok').default,
  );
const getWrappedGameSettings = () =>
  withWrapper(screens.gameSettings, require('./game/settings').default);
const getWrappedGamePlay = () =>
  withWrapper(screens.gamePlay, require('./game/game-play').default);
const getWrappedHistory = () =>
  withWrapper(screens.history, require('./history').default);
const getWrappedPlayback = () =>
  withWrapper(screens.playback, require('./playback').default);
const getWrappedConfigs = () =>
  withWrapper(screens.configs, require('./configs').default);
const getWrappedRestaurantMenu = () =>
  withWrapper(screens.restaurantMenu, require('./restaurant-menu').default);

const LIVE_FIX_BUILD = '20260425-restaurant-menu-haidilao-polish';

const StackScreens = () => {
  useEffect(() => {
    const buildInfoLines = [
      '[Build Info] app started',
      '[Build Info] live-fix-build=' + LIVE_FIX_BUILD,
      '[Build Info] apiBaseUrl=' + LIVESTREAM_AUTH_BASE_URL,
      '[Build Info] package=' + DeviceInfo.getBundleId(),
      '[Build Info] versionName=' + DeviceInfo.getVersion(),
      '[Build Info] versionCode=' + DeviceInfo.getBuildNumber(),
    ];

    buildInfoLines.forEach(line => {
      console.log(line);
      console.warn(line);
    });

    configureSystemUI({animated: false});
  }, []);

  return (
    <SubscriptionProvider>
      <Stack.Navigator initialRouteName={screens.home}>
      <Stack.Screen
        name={screens.home}
        getComponent={getWrappedHome}
        options={buildOptions(screens.home, true)}
      />

      <Stack.Screen
        name={screens.livePlatform}
        getComponent={getWrappedLivePlatform}
        options={buildCustomTitleOptions('Chọn nền tảng livestream', true)}
      />

      <Stack.Screen
        name={screens.livePlatformSetup}
        getComponent={getWrappedLivePlatformSetup}
        options={buildCustomTitleOptions('Thiết lập livestream', true)}
      />

      <Stack.Screen
        name={screens.livePlatformSetupFacebook}
        getComponent={getWrappedLivePlatformSetupFacebook}
        options={buildCustomTitleOptions('Thiết lập livestream', true)}
      />

      <Stack.Screen
        name={screens.livePlatformSetupYoutube}
        getComponent={getWrappedLivePlatformSetupYoutube}
        options={buildCustomTitleOptions('Thiết lập livestream', true)}
      />

      <Stack.Screen
        name={screens.livePlatformSetupTiktok}
        getComponent={getWrappedLivePlatformSetupTiktok}
        options={buildCustomTitleOptions('Thiết lập livestream', true)}
      />

      <Stack.Screen
        name={screens.gameSettings}
        getComponent={getWrappedGameSettings}
        options={buildOptions(screens.gameSettings, true)}
      />

      <Stack.Screen
        name={screens.gamePlay}
        getComponent={getWrappedGamePlay}
        options={buildOptions(screens.gamePlay, true)}
      />

      <Stack.Screen
        name={screens.history}
        getComponent={getWrappedHistory}
        options={buildOptions(screens.history, true)}
      />

      <Stack.Screen
        name={screens.playback}
        getComponent={getWrappedPlayback}
        options={buildOptions(screens.playback, true)}
      />

      <Stack.Screen
        name={screens.configs}
        getComponent={getWrappedConfigs}
        options={buildOptions(screens.configs, true)}
      />

      <Stack.Screen
        name={screens.restaurantMenu}
        getComponent={getWrappedRestaurantMenu}
        options={buildCustomTitleOptions('Menu gọi món', true)}
      />
      </Stack.Navigator>
    </SubscriptionProvider>
  );
};

export {StackScreens};