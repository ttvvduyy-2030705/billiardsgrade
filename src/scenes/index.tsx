import React from 'react';
import {
  NativeStackNavigationOptions,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import Text from 'components/Text';
import {withWrapper} from 'components/HOC';
import colors from 'configuration/colors';
import {sceneKeys, scenes} from './screens';
import i18n from 'i18n';
import Button from 'components/Button';
import Image from 'components/Image';
import images from 'assets';
import {goBack} from 'utils/navigation';
import {Platform, StyleSheet} from 'react-native';
import {getHeaderHeight, getStatusBarHeight} from 'configuration';

const Stack = createNativeStackNavigator();

const screenOptions: NativeStackNavigationOptions = {
  // animation: Platform.OS === 'ios' ? 'default' : 'fade',
  headerTitleAlign: 'center',
  headerTintColor: colors.white,
  headerBackTitle: '',
  headerBackVisible: false,
};

const noHeader: NativeStackNavigationOptions = {
  // animation: Platform.OS === 'ios' ? 'default' : 'fade',
  headerShown: false,
};

const styles = StyleSheet.create({
  backButton: {
    marginLeft: -15,
    padding: 10,
    height:
      Platform.OS === 'android'
        ? '100%'
        : getHeaderHeight() - getStatusBarHeight() - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
});

const _renderBackButton = () => {
  return (
    <Button onPress={goBack} style={styles.backButton}>
      <Image
        source={images.back}
        style={styles.backIcon}
        resizeMode={'contain'}
      />
    </Button>
  );
};

//Create array of screens
const Scenes = sceneKeys.map((name, index) => {
  const Scene = withWrapper(name, scenes[name]);
  let _options: NativeStackNavigationOptions = {
    headerTitle: () => (
      <Text fontWeight={'bold'} letterSpacing={1.2}>
        {i18n.t(name)}
      </Text>
    ),
    headerLeft: _renderBackButton,
  };

  switch (name) {
    case 'home':
      _options = noHeader;
      break;
  }

  return (
    <Stack.Screen
      key={index}
      name={name}
      component={Scene}
      options={_options}
    />
  );
});

//Create navigator for screens
const StackScreens = () => {
  return (
    <Stack.Navigator
      initialRouteName={'gameSettings'}
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: colors.primary,
        },
      }}>
      {Scenes}
    </Stack.Navigator>
  );
};

export {StackScreens};
