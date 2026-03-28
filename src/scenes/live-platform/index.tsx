import React, {memo, useCallback, useMemo, useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import Container from 'components/Container';
import Text from 'components/Text';

import {screens} from 'scenes/screens';
import {Navigation} from 'types/navigation';

import facebookLogo from './facebook.png';
import youtubeLogo from './youtube.png';
import tiktokLogo from './tiktok.png';

export interface Props extends Navigation {}

type PlatformKey = 'facebook' | 'youtube' | 'tiktok' | 'device';

type PlatformItem = {
  key: PlatformKey;
  label: string;
  image?: any;
  backgroundColor: string;
  useContain?: boolean;
  textColor?: string;
};

const LivePlatform = (props: Props) => {
  const {width, height} = useWindowDimensions();
  const [saveToDeviceWhileStreaming, setSaveToDeviceWhileStreaming] =
    useState(false);

  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 768;

  const ui = useMemo(() => {
    const cardGap = isTablet ? 14 : 10;
    const horizontalPadding = isTablet ? 20 : 14;
    const availableWidth = width - horizontalPadding * 2 - cardGap * 3;
    const cardSize = Math.max(
      isTablet ? 108 : 72,
      Math.min(isTablet ? 164 : 92, availableWidth / 4),
    );

    return {
      horizontalPadding,
      cardGap,
      cardSize,
      titleSize: isTablet ? 22 : 16,
      subtitleSize: isTablet ? 15 : 11,
      descriptionSize: isTablet ? 18 : 13,
      switchTitleSize: isTablet ? 18 : 14,
      switchDescriptionSize: isTablet ? 14 : 11,
      iconPadding: isTablet ? 14 : 8,
      sectionTop: isTablet ? 18 : 10,
      switchBoxPadding: isTablet ? 16 : 10,
      switchBoxRadius: isTablet ? 18 : 12,
    };
  }, [isTablet, width]);

  const platformItems: PlatformItem[] = useMemo(
    () => [
      {
        key: 'facebook',
        label: 'Facebook',
        image: facebookLogo,
        backgroundColor: '#FFFFFF',
        useContain: true,
      },
      {
        key: 'youtube',
        label: 'YouTube',
        image: youtubeLogo,
        backgroundColor: '#FFFFFF',
        useContain: true,
      },
      {
        key: 'tiktok',
        label: 'TikTok',
        image: tiktokLogo,
        backgroundColor: '#FFFFFF',
        useContain: true,
      },
      {
        key: 'device',
        label: 'Lưu vào\nbộ nhớ máy',
        backgroundColor: '#F3E61A',
        textColor: '#111111',
      },
    ],
    [],
  );

  const onSelectPlatform = useCallback(
    (platform: PlatformKey) => {
      if (platform === 'device') {
        props.navigate(screens.gameSettings, {
          livestreamPlatform: platform,
          saveToDeviceWhileStreaming,
        });
        return;
      }

      const params = {
        livestreamPlatform: platform,
        saveToDeviceWhileStreaming,
      };

      if (platform === 'facebook') {
        props.navigate(screens.livePlatformSetupFacebook, params);
        return;
      }

      if (platform === 'tiktok') {
        props.navigate(screens.livePlatformSetupTiktok, params);
        return;
      }

      props.navigate(screens.livePlatformSetupYoutube, params);
    },
    [props, saveToDeviceWhileStreaming],
  );

  return (
    <Container>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: ui.horizontalPadding,
            paddingTop: ui.sectionTop,
          }}>
          <Text
            fontSize={ui.titleSize}
            fontWeight={'bold'}
            style={styles.titleText}>
            Chọn nền tảng livestream
          </Text>

          <Text fontSize={ui.subtitleSize} style={styles.subtitleText}>
            Chọn nơi phát trực tiếp rồi tiếp tục vào cài đặt trận đấu.
          </Text>

          <View
            style={[
              styles.platformRow,
              {
                marginTop: ui.sectionTop,
                marginBottom: ui.cardGap,
              },
            ]}>
            {platformItems.map(item => {
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.85}
                  onPress={() => onSelectPlatform(item.key)}
                  style={[
                    styles.card,
                    {
                      width: ui.cardSize,
                      height: ui.cardSize,
                      backgroundColor: item.backgroundColor,
                      borderRadius: isTablet ? 18 : 14,
                    },
                  ]}>
                  {item.image ? (
                    <Image
                      source={item.image}
                      resizeMode={item.useContain ? 'contain' : 'cover'}
                      style={styles.platformLogo}
                    />
                  ) : (
                    <Text
                      fontSize={ui.descriptionSize}
                      fontWeight={'bold'}
                      style={{color: item.textColor || '#111111', textAlign: 'center'}}>
                      {item.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.switchBox,
              {
                marginTop: 6,
                borderRadius: ui.switchBoxRadius,
                paddingHorizontal: ui.switchBoxPadding,
                paddingVertical: ui.switchBoxPadding,
              },
            ]}>
            <View style={styles.switchTextWrap}>
              <Text fontSize={ui.switchTitleSize} fontWeight={'bold'}>
                Vừa live vừa lưu video
              </Text>

              <Text
                fontSize={ui.switchDescriptionSize}
                style={styles.switchDescription}>
                Bật để livestream và đồng thời lưu video vào bộ nhớ máy.
              </Text>
            </View>

            <Switch
              value={saveToDeviceWhileStreaming}
              onValueChange={setSaveToDeviceWhileStreaming}
              trackColor={{false: '#D6D6D6', true: '#F3E61A'}}
              thumbColor={saveToDeviceWhileStreaming ? '#111111' : '#FFFFFF'}
              ios_backgroundColor="#D6D6D6"
            />
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  titleText: {
    textAlign: 'center',
  },
  subtitleText: {
    color: '#666666',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  platformLogo: {
    width: '92%',
    height: '92%',
  },
  switchBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  switchDescription: {
    color: '#666666',
    marginTop: 4,
    lineHeight: 18,
  },
});

export default memo(LivePlatform);
