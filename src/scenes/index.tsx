import React from 'react';
import {
  NativeStackNavigationOptions,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import Text from 'components/Text';
import {withWrapper} from 'components/HOC';
import colors, {COLORS} from 'configuration/colors';
import {sceneKeys, scenes} from './screens';
import i18n from 'i18n';

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

//Create array of screens
const Scenes = sceneKeys.map((name, index) => {
  const Scene = withWrapper(name, scenes[name]);
  let _options: NativeStackNavigationOptions = {
    headerTitle: () => (
      <Text color={colors.white} fontWeight={'bold'}>
        {i18n.t(name)}
      </Text>
    ),
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
      initialRouteName={'root'}
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor:
            COLORS[0] && COLORS[0].colors
              ? COLORS[0].colors.primary
              : colors.primary,
        },
      }}>
      {Scenes}
    </Stack.Navigator>
  );
};

export {StackScreens};
