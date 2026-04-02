import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import React, {memo, useCallback, useMemo, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import images from 'assets';
import AppImage from 'components/Image';
import Container from 'components/Container';
import Text from 'components/Text';
import {Navigation} from 'types/navigation';
import {screens} from 'scenes/screens';

import {CURRENT_PLATFORM_KEY} from '../live-platform';

export interface Props extends Navigation {
  route?: {
    params?: {
      livestreamPlatform?: 'facebook' | 'youtube' | 'tiktok';
      saveToDeviceWhileStreaming?: boolean;
      setupToken?: string;
    };
  };
}

type Platform = 'facebook' | 'youtube' | 'tiktok';
type Visibility = 'public' | 'private' | 'unlisted';

type StoredSetup = {
  accountName?: string;
  visibility?: Visibility;
};

type StorageShape = {
  facebook?: StoredSetup;
  youtube?: StoredSetup;
  tiktok?: StoredSetup;
};

const STORAGE_KEY = '@livestream_platform_setup';

const normalizePlatform = (value?: string | null): Platform | null => {
  if (value === 'facebook' || value === 'youtube' || value === 'tiktok') {
    return value;
  }
  return null;
};

const LivePlatformSetup = (props: Props) => {
  const {width, height} = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 768;

  const saveToDeviceWhileStreaming =
    props.route?.params?.saveToDeviceWhileStreaming || false;

  const [platform, setPlatform] = useState<Platform>('youtube');
  const [isLoading, setIsLoading] = useState(true);
  const [accountName, setAccountName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');

  const ui = useMemo(() => {
    return {
      horizontalPadding: isTablet ? 28 : 18,
      sectionGap: isTablet ? 22 : 16,
      titleSize: isTablet ? 19 : 15,
      bodySize: isTablet ? 17 : 13,
      subSize: isTablet ? 14 : 11,
      buttonSize: isTablet ? 17 : 14,
      buttonHeight: isTablet ? 56 : 48,
      radioSize: isTablet ? 28 : 22,
      optionGap: isTablet ? 18 : 12,
      boxRadius: isTablet ? 18 : 14,
      outlineWidth: 2,
    };
  }, [isTablet]);

  const readStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {} as StorageShape;
      }
      return JSON.parse(raw) as StorageShape;
    } catch (error) {
      return {} as StorageShape;
    }
  }, []);

  const writeStorage = useCallback(async (nextValue: StorageShape) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const bootstrap = async () => {
        try {
          setIsLoading(true);

          const fromRoute = normalizePlatform(
            props.route?.params?.livestreamPlatform,
          );
          const fromStorage = normalizePlatform(
            await AsyncStorage.getItem(CURRENT_PLATFORM_KEY),
          );
          const resolvedPlatform = fromRoute || fromStorage || 'youtube';

          if (!active) {
            return;
          }

          setPlatform(resolvedPlatform);

          const stored = await readStorage();
          const current = stored[resolvedPlatform];

          if (!active) {
            return;
          }

          setAccountName(current?.accountName || '');
          setVisibility(current?.visibility || 'public');
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };

      bootstrap();

      return () => {
        active = false;
      };
    }, [props.route?.params?.livestreamPlatform, props.route?.params?.setupToken, readStorage]),
  );

  const platformName = useMemo(() => {
    switch (platform) {
      case 'facebook':
        return 'Facebook';
      case 'youtube':
        return 'YouTube';
      case 'tiktok':
        return 'TikTok';
      default:
        return 'Livestream';
    }
  }, [platform]);

  const accountSectionTitle = useMemo(() => {
    switch (platform) {
      case 'facebook':
        return 'Đổi tài khoản Facebook';
      case 'youtube':
        return 'Đổi kênh YouTube';
      case 'tiktok':
        return 'Đổi tài khoản TikTok';
      default:
        return 'Đổi tài khoản livestream';
    }
  }, [platform]);

  const accountOptionTitle = useMemo(() => {
    switch (platform) {
      case 'facebook':
        return 'Phát lên trang hoặc hồ sơ Facebook';
      case 'youtube':
        return 'Phát lên một kênh YouTube';
      case 'tiktok':
        return 'Phát lên tài khoản TikTok';
      default:
        return 'Phát lên tài khoản đã chọn';
    }
  }, [platform]);

  const emptyAccountText = useMemo(() => {
    switch (platform) {
      case 'facebook':
        return 'Chưa đăng nhập Facebook';
      case 'youtube':
        return 'Chưa đăng nhập YouTube';
      case 'tiktok':
        return 'Chưa đăng nhập TikTok';
      default:
        return 'Chưa đăng nhập';
    }
  }, [platform]);

  const continueButtonText = useMemo(() => {
    switch (platform) {
      case 'facebook':
        return 'TIẾP TỤC VỚI FACEBOOK';
      case 'youtube':
        return 'TIẾP TỤC VỚI YOUTUBE';
      case 'tiktok':
        return 'TIẾP TỤC VỚI TIKTOK';
      default:
        return 'TIẾP TỤC';
    }
  }, [platform]);

  const headerTitle = useMemo(() => 'Thiết lập livestream', []);

  const onBack = useCallback(() => {
    if (typeof props?.goBack === 'function') {
      props.goBack();
      return;
    }

    if (typeof props?.navigation?.goBack === 'function') {
      props.navigation.goBack();
    }
  }, [props]);

  const onLogout = useCallback(async () => {
    try {
      const stored = await readStorage();
      const nextValue: StorageShape = {
        ...stored,
        [platform]: {
          ...stored[platform],
          accountName: '',
          visibility,
        },
      };

      await writeStorage(nextValue);
      setAccountName('');

      Alert.alert('Đã đăng xuất', `Đã gỡ ${platformName} khỏi giao diện này.`);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đăng xuất lúc này.');
    }
  }, [platform, platformName, readStorage, visibility, writeStorage]);

  const onContinue = useCallback(async () => {
    try {
      const stored = await readStorage();
      const nextValue: StorageShape = {
        ...stored,
        [platform]: {
          ...stored[platform],
          accountName,
          visibility,
        },
      };

      await writeStorage(nextValue);

      props.navigate(screens.gameSettings, {
        livestreamPlatform: platform,
        saveToDeviceWhileStreaming,
        liveVisibility: visibility,
        liveAccountName: accountName,
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thiết lập livestream.');
    }
  }, [
    accountName,
    platform,
    props,
    readStorage,
    saveToDeviceWhileStreaming,
    visibility,
    writeStorage,
  ]);

  const renderRadio = useCallback(
    (selected: boolean) => {
      return (
        <View
          style={[
            styles.radioOuter,
            {
              width: ui.radioSize,
              height: ui.radioSize,
              borderRadius: ui.radioSize / 2,
            },
          ]}>
          {selected ? (
            <View
              style={[
                styles.radioInner,
                {
                  width: ui.radioSize * 0.5,
                  height: ui.radioSize * 0.5,
                  borderRadius: ui.radioSize * 0.25,
                },
              ]}
            />
          ) : null}
        </View>
      );
    },
    [ui.radioSize],
  );

  if (isLoading) {
    return (
      <Container style={styles.screen} isLoading={true}>
        <View />
      </Container>
    );
  }

  return (
    <Container style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={false}
      />

      <View style={styles.headerGlow}>
        <Pressable
          onPress={onBack}
          style={styles.headerBackButton}
          android_ripple={{color: 'rgba(255,255,255,0.08)', borderless: false}}>
          <View style={styles.headerBackFrame}>
            <View style={styles.headerBackInner}>
              <Text color={'#FFFFFF'} style={styles.headerBackArrow}>←</Text>
              <AppImage
                source={images.logoSmall || images.logo}
                resizeMode="contain"
                style={styles.headerBackLogoImage}
              />
            </View>
          </View>
        </Pressable>

        <View pointerEvents="none" style={styles.headerTitleWrap}>
          <Text color={'#FFFFFF'} style={styles.headerTitle}>
            {headerTitle}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: ui.horizontalPadding,
          paddingTop: 18,
          paddingBottom: 24,
        }}>
        <Text fontSize={ui.titleSize} style={styles.sectionLabel}>
          {accountSectionTitle}
        </Text>

        <View style={styles.accountRow}>
          {renderRadio(true)}

          <View style={styles.accountTextWrap}>
            <Text fontSize={ui.bodySize} fontWeight={'bold'}>
              {accountOptionTitle}
            </Text>

            <Text fontSize={ui.subSize} style={styles.mutedText}>
              Đang chọn:{' '}
              {accountName && accountName.trim().length > 0
                ? accountName
                : emptyAccountText}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLogout}
          style={[
            styles.logoutButton,
            {
              height: ui.buttonHeight,
              borderRadius: ui.boxRadius,
              marginTop: ui.sectionGap,
              borderWidth: ui.outlineWidth,
            },
          ]}>
          <Text fontSize={ui.buttonSize} fontWeight={'bold'}>
            ĐĂNG XUẤT
          </Text>
        </TouchableOpacity>

        <View style={{marginTop: ui.sectionGap * 1.5}}>
          <Text fontSize={ui.titleSize} style={styles.sectionLabel}>
            Quyền riêng tư
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.optionRow, {marginTop: ui.optionGap}]}
            onPress={() => setVisibility('public')}>
            {renderRadio(visibility === 'public')}
            <Text fontSize={ui.bodySize} style={styles.optionLabel}>
              Công khai
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.optionRow, {marginTop: ui.optionGap}]}
            onPress={() => setVisibility('private')}>
            {renderRadio(visibility === 'private')}
            <Text fontSize={ui.bodySize} style={styles.optionLabel}>
              Riêng tư
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.optionRow, {marginTop: ui.optionGap}]}
            onPress={() => setVisibility('unlisted')}>
            {renderRadio(visibility === 'unlisted')}
            <Text fontSize={ui.bodySize} style={styles.optionLabel}>
              Không công khai
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onContinue}
          style={[
            styles.continueButton,
            {
              height: ui.buttonHeight,
              borderRadius: ui.boxRadius,
              marginTop: ui.sectionGap * 2,
            },
          ]}>
          <Text fontSize={ui.buttonSize} fontWeight={'bold'} style={styles.continueText}>
            {continueButtonText}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 22,
  },
  headerGlow: {
    minHeight: 70,
    borderRadius: 24,
    borderWidth: 1.25,
    borderColor: 'rgba(255, 52, 52, 0.28)',
    backgroundColor: '#050505',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    position: 'relative',
    shadowColor: '#FF1414',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 8},
    elevation: 12,
  },
  headerBackButton: {
    position: 'absolute',
    left: 18,
    top: 9,
    bottom: 9,
    justifyContent: 'center',
    zIndex: 2,
  },
  headerBackFrame: {
    height: 52,
    minWidth: 116,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.25,
    borderColor: 'rgba(255, 52, 52, 0.28)',
    backgroundColor: '#070707',
    justifyContent: 'center',
    shadowColor: '#FF1414',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
    transform: [{skewX: '-16deg'}],
  },
  headerBackInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{skewX: '16deg'}],
  },
  headerBackArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginRight: 10,
  },
  headerBackLogoImage: {
    width: 72,
    height: 28,
  },
  headerTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 146,
    pointerEvents: 'none',
  },
  headerTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#8A8A8A',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  accountTextWrap: {
    marginLeft: 16,
    flex: 1,
  },
  mutedText: {
    color: '#8A8A8A',
    marginTop: 4,
  },
  radioOuter: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioInner: {
    backgroundColor: '#000000',
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    marginLeft: 16,
  },
  continueButton: {
    backgroundColor: '#FF174F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default memo(LivePlatformSetup);