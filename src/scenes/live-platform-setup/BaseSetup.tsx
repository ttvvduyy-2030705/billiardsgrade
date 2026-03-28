import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import Container from 'components/Container';
import Text from 'components/Text';

import {Navigation} from 'types/navigation';
import {screens} from 'scenes/screens';
import {LIVESTREAM_ACCOUNT_STORAGE_KEY} from 'config/livestreamAuth';
import {
  LivestreamPlatform,
  openPlatformOAuth,
  parseOAuthCallback,
} from 'services/livestreamAuth';

export type SetupPlatform = LivestreamPlatform;
type Visibility = 'public' | 'private' | 'unlisted';

type StoredSetup = {
  accountName?: string;
  visibility?: Visibility;
  accountId?: string;
};

type StorageShape = {
  facebook?: StoredSetup;
  youtube?: StoredSetup;
  tiktok?: StoredSetup;
};

export interface BaseSetupProps extends Navigation {
  route?: {
    params?: {
      saveToDeviceWhileStreaming?: boolean;
    };
  };
  platform: SetupPlatform;
}

const BaseSetup = ({platform, route, navigate}: BaseSetupProps) => {
  const {width, height} = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 768;
  const saveToDeviceWhileStreaming =
    route?.params?.saveToDeviceWhileStreaming || false;

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const autoAuthTriggeredRef = useRef(false);

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
    if (isAuthorizing) {
      return `Đang mở ${platformName} để đăng nhập...`;
    }

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
  }, [isAuthorizing, platform, platformName]);

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
      const raw = await AsyncStorage.getItem(LIVESTREAM_ACCOUNT_STORAGE_KEY);
      if (!raw) {
        return {} as StorageShape;
      }
      return JSON.parse(raw) as StorageShape;
    } catch (error) {
      return {} as StorageShape;
    }
  }, []);

  const writeStorage = useCallback(async (nextValue: StorageShape) => {
    await AsyncStorage.setItem(
      LIVESTREAM_ACCOUNT_STORAGE_KEY,
      JSON.stringify(nextValue),
    );
  }, []);

  const persistLocalState = useCallback(
    async (nextAccountName: string, nextAccountId: string, nextVisibility: Visibility) => {
      const stored = await readStorage();
      const nextValue: StorageShape = {
        ...stored,
        [platform]: {
          ...stored[platform],
          accountName: nextAccountName,
          accountId: nextAccountId,
          visibility: nextVisibility,
        },
      };
      await writeStorage(nextValue);
    },
    [platform, readStorage, writeStorage],
  );

  const startBrowserAuth = useCallback(async () => {
    try {
      setIsAuthorizing(true);
      await openPlatformOAuth(platform);
    } catch (error) {
      setIsAuthorizing(false);
      Alert.alert('Lỗi', 'Không thể mở trình duyệt để đăng nhập nền tảng này.');
    }
  }, [platform]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const stored = await readStorage();
        const current = stored[platform];

        setAccountName(current?.accountName || '');
        setAccountId(current?.accountId || '');
        setVisibility(current?.visibility || 'public');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [platform, readStorage]);

  useEffect(() => {
    const handleUrl = async ({url}: {url: string}) => {
      const payload = parseOAuthCallback(url);
      if (!payload || payload.platform !== platform) {
        return;
      }

      setIsAuthorizing(false);

      if (payload.status !== 'success') {
        Alert.alert(
          'Đăng nhập thất bại',
          payload.errorMessage || 'Không thể kết nối tài khoản lúc này.',
        );
        return;
      }

      const nextAccountName = payload.accountName || `${platformName} Account`;
      const nextAccountId = payload.accountId || '';

      setAccountName(nextAccountName);
      setAccountId(nextAccountId);
      await persistLocalState(nextAccountName, nextAccountId, visibility);

      Alert.alert('Kết nối thành công', `Đã kết nối với ${platformName}.`);
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then(url => {
      if (url) {
        handleUrl({url});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [persistLocalState, platform, platformName, visibility]);

  useEffect(() => {
    if (isLoading || accountName || autoAuthTriggeredRef.current) {
      return;
    }

    autoAuthTriggeredRef.current = true;
    startBrowserAuth();
  }, [accountName, isLoading, startBrowserAuth]);

  const onLogout = useCallback(async () => {
    try {
      await persistLocalState('', '', visibility);
      setAccountName('');
      setAccountId('');
      autoAuthTriggeredRef.current = true;
      await startBrowserAuth();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đăng xuất lúc này.');
    }
  }, [persistLocalState, startBrowserAuth, visibility]);

  const onContinue = useCallback(async () => {
    if (!accountName) {
      Alert.alert(
        'Chưa kết nối',
        `Bạn cần đăng nhập ${platformName} trước khi tiếp tục.`,
      );
      return;
    }

    try {
      await persistLocalState(accountName, accountId, visibility);

      navigate(screens.gameSettings, {
        livestreamPlatform: platform,
        saveToDeviceWhileStreaming,
        liveVisibility: visibility,
        liveAccountName: accountName,
        liveAccountId: accountId,
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thiết lập livestream.');
    }
  }, [
    accountId,
    accountName,
    navigate,
    persistLocalState,
    platform,
    platformName,
    saveToDeviceWhileStreaming,
    visibility,
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
                  borderRadius: (ui.radioSize * 0.5) / 2,
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
      <Container isLoading={true}>
        <View />
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: ui.horizontalPadding,
            paddingTop: ui.sectionGap,
            paddingBottom: ui.sectionGap,
          }}>
          <Text fontSize={ui.titleSize} fontWeight={'bold'}>
            {accountSectionTitle}
          </Text>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.accountCard, {borderRadius: ui.boxRadius}]}
            onPress={startBrowserAuth}>
            <View style={styles.accountInfoWrap}>
              <Text fontSize={ui.bodySize} fontWeight={'bold'}>
                {accountOptionTitle}
              </Text>

              <Text fontSize={ui.subSize} style={styles.accountSubText}>
                {accountName || emptyAccountText}
              </Text>

              <Text fontSize={ui.subSize} style={styles.accountHintText}>
                Chạm để mở trang đăng nhập bằng trình duyệt và quay lại app.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onLogout}
              style={[styles.logoutButton, {borderRadius: ui.boxRadius / 1.4}]}
              disabled={isAuthorizing}>
              <Text fontSize={ui.subSize} fontWeight={'bold'} style={styles.logoutText}>
                ĐĂNG XUẤT
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <View style={{marginTop: ui.sectionGap}}>
            <Text fontSize={ui.titleSize} fontWeight={'bold'}>
              Quyền riêng tư cho phiên live
            </Text>

            <View style={{marginTop: ui.optionGap}}>
              {[
                {key: 'public', label: 'Công khai'},
                {key: 'private', label: 'Riêng tư'},
                {key: 'unlisted', label: 'Không công khai'},
              ].map(item => {
                const selected = visibility === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.85}
                    onPress={() => setVisibility(item.key as Visibility)}
                    style={[
                      styles.visibilityRow,
                      {
                        borderRadius: ui.boxRadius,
                        marginBottom: ui.optionGap,
                        borderWidth: ui.outlineWidth,
                      },
                      selected ? styles.visibilityRowSelected : styles.visibilityRowIdle,
                    ]}>
                    <View style={styles.visibilityTextWrap}>
                      <Text fontSize={ui.bodySize} fontWeight={'bold'}>
                        {item.label}
                      </Text>
                    </View>

                    {renderRadio(selected)}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onContinue}
            style={[
              styles.continueButton,
              {
                height: ui.buttonHeight,
                borderRadius: ui.boxRadius,
                marginTop: ui.sectionGap,
              },
            ]}>
            <Text fontSize={ui.buttonSize} fontWeight={'bold'} style={styles.continueText}>
              {continueButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfoWrap: {
    flex: 1,
    paddingRight: 12,
  },
  accountSubText: {
    color: '#5D5D5D',
    marginTop: 6,
  },
  accountHintText: {
    color: '#7B7B7B',
    marginTop: 6,
  },
  logoutButton: {
    backgroundColor: '#F1F1F1',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logoutText: {
    color: '#111111',
  },
  visibilityRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visibilityRowIdle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E3E3',
  },
  visibilityRowSelected: {
    backgroundColor: '#FFFBE8',
    borderColor: '#F3E61A',
  },
  visibilityTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  radioOuter: {
    borderWidth: 2,
    borderColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    backgroundColor: '#111111',
  },
  continueButton: {
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});

export default memo(BaseSetup);
