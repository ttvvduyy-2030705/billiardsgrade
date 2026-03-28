import React, {memo, useMemo} from 'react';
import {
  Image,
  Pressable,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import images from 'assets';
import i18n from 'i18n';
import HomeViewModel, {Props} from './HomeViewModel';
import createStyles from './styles';

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const Home = (props: Props) => {
  const viewModel = HomeViewModel(props);
  const {width, height} = useWindowDimensions();

  const styles = useMemo(() => createStyles(width, height), [width, height]);

  const metrics = useMemo(() => {
    const visualButtonWidth = clamp(width * 0.31, 360, 520);
    const visualButtonHeight = clamp(height * 0.12, 84, 102);
    const logoWidth = clamp(width * 0.22, 200, 320);
    const logoHeight = logoWidth * 0.41;

    return {
      visualButtonWidth,
      visualButtonHeight,
      touchButtonWidth: visualButtonWidth + 34,
      touchButtonHeight: visualButtonHeight + 28,
      logoWidth,
      logoHeight,
    };
  }, [width, height]);

  return (
    <View style={styles.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.topRow}>
        <Text style={styles.title}>{i18n.t('msgAppName')}</Text>

        <View style={styles.rightTopWrap}>
          <Pressable
            onPress={viewModel.onPressConfigs}
            style={styles.greetingRow}
            hitSlop={18}>
            <Text style={styles.greetingText}>{viewModel.helloText}</Text>
            <Image source={images.settings} style={styles.settingsIcon} resizeMode="contain" />
          </Pressable>

          <Pressable
            onPress={viewModel.onPressHistory}
            style={styles.historyPill}
            hitSlop={14}>
            <Image source={images.history} style={styles.historyIcon} resizeMode="contain" />
            <Text style={styles.historyText}>{i18n.t('txtHistory')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.startButtonCenterLayer} pointerEvents="box-none">
        <Pressable
          onPress={viewModel.onStartNewGame}
          hitSlop={{top: 14, bottom: 14, left: 14, right: 14}}
          style={[
            styles.startButtonTouchArea,
            {
              width: metrics.touchButtonWidth,
              height: metrics.touchButtonHeight,
            },
          ]}>
          <View
            pointerEvents="none"
            style={[
              styles.startButtonWrap,
              {
                width: metrics.visualButtonWidth,
                height: metrics.visualButtonHeight,
              },
            ]}>
            <View pointerEvents="none" style={styles.startButtonGlowOuter} />
            <View pointerEvents="none" style={styles.startButtonGlowInner} />

            <LinearGradient
              pointerEvents="none"
              colors={['#650606', '#e21810', '#770707']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.startButtonCore}>
              <View pointerEvents="none" style={styles.startButtonInnerBorder}>
                <View style={styles.startButtonContent}>
                  <Image
                    source={images.startGame}
                    style={styles.startGameIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.startButtonText}>{i18n.t('txtStartNewGame')}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Pressable>
      </View>

      <View style={styles.logoBottomLayer} pointerEvents="none">
        <View style={styles.logoBlock}>
          <Image
            source={images.logoSmall}
            resizeMode="contain"
            style={{width: metrics.logoWidth, height: metrics.logoHeight}}
          />
          <Text style={styles.tagline}>{i18n.t('msgIntroDescription')}</Text>
        </View>
      </View>
    </View>
  );
};

export default memo(Home);
