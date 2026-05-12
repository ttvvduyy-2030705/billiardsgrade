import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

import images from 'assets';
import {screens} from 'scenes/screens';
import {
  getDefaultCustomerMenuQrToken,
  getRestaurantMenuEnvironmentLabel,
  RESTAURANT_MENU_ENV_CONFIG,
} from 'config/restaurantMenu';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {Navigation} from 'types/navigation';

import {devModuleLog} from 'utils/devLogger';
import {logScoreMenuError} from 'utils/scoremenuErrors';

import createStyles from './styles';

type CameraPermissionState = 'loading' | 'granted' | 'denied';

type Props = Navigation & {
  demoQrToken?: string;
};

const DEMO_QR_OPTIONS = [
  {
    label: 'Demo Haidilao',
    subtitle: 'Menu Haidilao / chi nhánh chính',
    token: 'qr_haidilao_main_menu',
  },
  {
    label: 'Demo APlus',
    subtitle: 'Menu APlus / chi nhánh chính',
    token: 'qr_aplus_main_menu',
  },
];

const extractQrToken = (rawValue?: string | null) => {
  const cleanValue = String(rawValue || '').trim();

  if (!cleanValue) {
    return '';
  }

  const queryMatch = cleanValue.match(
    /[?&](?:qrToken|menuQrToken|tableQrToken|token)=([^&]+)/i,
  );

  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]).trim();
  }

  const withoutHash = cleanValue.split('#')[0];
  const lastPathSegment = withoutHash
    .split('?')[0]
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)
    .pop();

  if (cleanValue.includes('://') && lastPathSegment) {
    return lastPathSegment;
  }

  return cleanValue;
};

const RestaurantQrScannerScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {adaptive, design} = useDesignSystem();
  const styles = useMemo(
    () => createStyles(design, {width: adaptive.width, height: adaptive.height}),
    [adaptive.height, adaptive.width, design],
  );

  const navigate = props.navigate;
  const resetNavigation = props.reset;
  const isFocused = useIsFocused();
  const cameraDevice = useCameraDevice('back');
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>('loading');
  const [manualToken, setManualToken] = useState(
    props.demoQrToken || getDefaultCustomerMenuQrToken(),
  );
  const [statusMessage, setStatusMessage] = useState(
    'Đưa mã QR của quán hoặc chi nhánh vào giữa khung camera.',
  );
  const environmentLabel = useMemo(
    () => getRestaurantMenuEnvironmentLabel(RESTAURANT_MENU_ENV_CONFIG),
    [],
  );
  const lastHandledTokenRef = useRef('');
  const lastHandledAtRef = useRef(0);

  const openRestaurantMenuByToken = useCallback(
    (rawToken: string) => {
      const qrToken = extractQrToken(rawToken);

      if (!qrToken) {
        setStatusMessage('QR/token trống. Vui lòng quét lại hoặc nhập token demo.');
        logScoreMenuError(
          {module: 'QR', action: 'empty qr scan', extra: {rawValue: rawToken}},
          new Error('empty qr token'),
        );
        return;
      }

      const now = Date.now();
      const alreadyHandledRecently =
        lastHandledTokenRef.current === qrToken && now - lastHandledAtRef.current < 2200;

      if (alreadyHandledRecently) {
        return;
      }

      lastHandledTokenRef.current = qrToken;
      lastHandledAtRef.current = now;
      setStatusMessage(`Đã nhận QR: ${qrToken}`);
      devModuleLog('QR', 'qr token scanned', {qrToken});

      navigate(screens.restaurantMenu, {
        qrToken,
        menuQrToken: qrToken,
        tableToken: qrToken,
        tableQrToken: qrToken,
        source: 'qr-scanner',
        scannedAt: now,
      });
    },
    [navigate],
  );

  const goHome = useCallback(() => {
    if (resetNavigation) {
      resetNavigation(0, [{name: screens.home}]);
      return;
    }

    navigate(screens.home);
  }, [navigate, resetNavigation]);

  const requestCameraPermission = useCallback(async () => {
    try {
      const currentStatus = await Camera.getCameraPermissionStatus();

      if (currentStatus === 'granted') {
        setPermissionState('granted');
        return;
      }

      const nextStatus = await Camera.requestCameraPermission();
      setPermissionState(nextStatus === 'granted' ? 'granted' : 'denied');
    } catch (error) {
      logScoreMenuError(
        {module: 'QR', action: 'camera permission failed'},
        error,
      );
      setPermissionState('denied');
    }
  }, []);

  useEffect(() => {
    void requestCameraPermission();
  }, [requestCameraPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const value = codes?.[0]?.value;

      if (value) {
        openRestaurantMenuByToken(value);
      }
    },
  });

  const renderCameraContent = () => {
    if (permissionState === 'loading') {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>Đang mở camera...</Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>Vui lòng chờ trong giây lát.</Text>
        </View>
      );
    }

    if (permissionState !== 'granted') {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>Chưa có quyền camera</Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            Cấp quyền camera để quét QR menu của quán/chi nhánh.
          </Text>
          <Pressable
            onPress={() => void requestCameraPermission()}
            style={styles.cameraPermissionButton}>
            <Text maxFontSizeMultiplier={1} style={styles.cameraPermissionText}>Cấp quyền camera</Text>
          </Pressable>
        </View>
      );
    }

    if (!cameraDevice) {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>Không tìm thấy camera sau</Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            Bạn vẫn có thể chọn QR demo hoặc nhập token thủ công để test menu.
          </Text>
        </View>
      );
    }

    return (
      <Camera
        style={styles.cameraPreview}
        device={cameraDevice}
        isActive={isFocused}
        codeScanner={codeScanner}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <Pressable
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        onPress={goHome}
        style={styles.homeButton}>
        <Text maxFontSizeMultiplier={1} style={styles.homeButtonText}>← Home</Text>
      </Pressable>

      <View style={styles.leftRail}>
        <Image source={images.logoSmall} resizeMode="contain" style={styles.logo} />
        <Text maxFontSizeMultiplier={1} style={styles.brandEyebrow}>APLUS MENU</Text>
        <Text maxFontSizeMultiplier={1} style={styles.brandTitle}>Quét QR để xem menu</Text>
        <Text maxFontSizeMultiplier={1} style={styles.brandHint}>
          QR xác định quán hoặc chi nhánh. Số bàn sẽ nhập/chọn trong giỏ hàng.
        </Text>
        <View style={styles.envBadge}>
          <Text maxFontSizeMultiplier={1} style={styles.envBadgeText}>
            {environmentLabel}
          </Text>
        </View>
      </View>

      <View style={styles.centerPane}>
        <View style={styles.cameraCard}>
          <View style={styles.cameraHeaderRow}>
            <Text maxFontSizeMultiplier={1} style={styles.cameraTitle}>Camera QR</Text>
            <Text maxFontSizeMultiplier={1} style={styles.cameraBadge}>BATCH 4</Text>
          </View>

          <View style={styles.cameraFrame}>
            {renderCameraContent()}
            <View pointerEvents="none" style={styles.scanCornerTopLeft} />
            <View pointerEvents="none" style={styles.scanCornerTopRight} />
            <View pointerEvents="none" style={styles.scanCornerBottomLeft} />
            <View pointerEvents="none" style={styles.scanCornerBottomRight} />
          </View>

          <Text maxFontSizeMultiplier={1} style={styles.statusText}>{statusMessage}</Text>
        </View>
      </View>

      <View style={styles.rightRail}>
        <ScrollView
          style={styles.rightRailScroller}
          contentContainerStyle={styles.rightRailContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => navigate(screens.restaurantAdminLogin)}
            style={styles.adminButton}>
            <Text maxFontSizeMultiplier={1} style={styles.adminButtonText}>Đăng nhập Admin</Text>
          </Pressable>

          <View style={styles.demoCard}>
            <Text maxFontSizeMultiplier={1} style={styles.demoTitle}>QR demo</Text>
            <Text maxFontSizeMultiplier={1} style={styles.demoHint}>
              Dùng khi chưa có ảnh QR thật hoặc camera chưa quét được.
            </Text>

            {DEMO_QR_OPTIONS.map(option => (
              <Pressable
                key={option.token}
                onPress={() => openRestaurantMenuByToken(option.token)}
                style={styles.demoButton}>
                <Text maxFontSizeMultiplier={1} style={styles.demoButtonText}>{option.label}</Text>
                <Text maxFontSizeMultiplier={1} style={styles.demoButtonSubText}>{option.subtitle}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.manualCard}>
            <Text maxFontSizeMultiplier={1} style={styles.manualTitle}>Nhập QR token</Text>
            <TextInput
              allowFontScaling={false}
              value={manualToken}
              onChangeText={setManualToken}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="qr_haidilao_main_menu"
              placeholderTextColor="rgba(255,255,255,0.38)"
              style={styles.manualInput}
            />
            <Pressable
              onPress={() => openRestaurantMenuByToken(manualToken)}
              style={styles.manualSubmitButton}>
              <Text maxFontSizeMultiplier={1} style={styles.manualSubmitText}>Mở menu</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default memo(RestaurantQrScannerScreen);
