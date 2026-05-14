import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {Navigation} from 'types/navigation';

import {devModuleLog} from 'utils/devLogger';
import {logScoreMenuError} from 'utils/scoremenuErrors';

import createStyles from './styles';

type CameraPermissionState = 'loading' | 'granted' | 'denied';

type Props = Navigation & {
  /** Optional token passed by a deep link or navigation route. */
  initialQrToken?: string;
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
};

const normalizeQrTokenForManualEntry = (value: string) => {
  const token = value.trim();
  return /^qr_[a-z0-9_-]+_menu$/i.test(token) ? token.toLowerCase() : token;
};

export const extractQrToken = (rawValue?: string | null) => {
  const cleanValue = String(rawValue || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  if (!cleanValue) {
    return '';
  }

  const queryMatch = cleanValue.match(
    /[?&](?:qrToken|menuQrToken|tableQrToken|token|code)=([^&#]+)/i,
  );

  if (queryMatch?.[1]) {
    return normalizeQrTokenForManualEntry(safeDecodeURIComponent(queryMatch[1]));
  }

  const labelledTokenMatch = cleanValue.match(
    /(?:mã|ma|code|qr|token)[\s:：#-]+([a-z0-9][a-z0-9_-]{5,})/i,
  );

  if (labelledTokenMatch?.[1]) {
    return normalizeQrTokenForManualEntry(labelledTokenMatch[1]);
  }

  const menuTokenMatch = cleanValue.match(/\b(qr_[a-z0-9][a-z0-9_-]*_menu)\b/i);

  if (menuTokenMatch?.[1]) {
    return normalizeQrTokenForManualEntry(menuTokenMatch[1]);
  }

  const withoutHash = cleanValue.split('#')[0];
  const lastPathSegment = withoutHash
    .split('?')[0]
    .split('/')
    .map(segment => safeDecodeURIComponent(segment).trim())
    .filter(Boolean)
    .pop();

  if (
    (cleanValue.includes('://') || cleanValue.includes('/')) &&
    lastPathSegment
  ) {
    return normalizeQrTokenForManualEntry(lastPathSegment);
  }

  return normalizeQrTokenForManualEntry(cleanValue.replace(/\s+/g, ''));
};

const RestaurantQrScannerScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {adaptive, design} = useDesignSystem();
  const styles = useMemo(
    () =>
      createStyles(design, {width: adaptive.width, height: adaptive.height}),
    [adaptive.height, adaptive.width, design],
  );

  const navigate = props.navigate;
  const resetNavigation = props.reset;
  const isFocused = useIsFocused();
  const cameraDevice = useCameraDevice('back');
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>('loading');
  const [statusMessage, setStatusMessage] = useState(
    'Đưa mã QR của quán hoặc chi nhánh vào giữa khung camera.',
  );
  const [scannerNativeError, setScannerNativeError] = useState<string | null>(
    null,
  );
  const [manualQrToken, setManualQrToken] = useState('');
  const [manualQrError, setManualQrError] = useState('');
  const lastHandledTokenRef = useRef('');
  const lastHandledAtRef = useRef(0);

  const openRestaurantMenuByToken = useCallback(
    (rawToken: string) => {
      const qrToken = extractQrToken(rawToken);

      if (!qrToken) {
        setStatusMessage(
          'QR không hợp lệ. Vui lòng quét lại mã của quán/chi nhánh.',
        );
        logScoreMenuError(
          {module: 'QR', action: 'empty qr scan', extra: {rawValue: rawToken}},
          new Error('empty qr token'),
        );
        return;
      }

      const now = Date.now();
      const alreadyHandledRecently =
        lastHandledTokenRef.current === qrToken &&
        now - lastHandledAtRef.current < 2200;

      if (alreadyHandledRecently) {
        return;
      }

      lastHandledTokenRef.current = qrToken;
      lastHandledAtRef.current = now;
      setScannerNativeError(null);
      setStatusMessage('Đã nhận QR. Đang mở menu...');
      devModuleLog('QR', 'qr scanned');

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

  const handleSubmitManualQrToken = useCallback(() => {
    const cleanToken = extractQrToken(manualQrToken);

    if (!cleanToken) {
      setManualQrError('Vui lòng nhập mã QR hợp lệ của quán/chi nhánh.');
      return;
    }

    setManualQrError('');
    openRestaurantMenuByToken(cleanToken);
  }, [manualQrToken, openRestaurantMenuByToken]);

  useEffect(() => {
    if (props.initialQrToken) {
      openRestaurantMenuByToken(props.initialQrToken);
    }
  }, [openRestaurantMenuByToken, props.initialQrToken]);

  const requestCameraPermission = useCallback(async () => {
    try {
      setScannerNativeError(null);
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

  const handleCameraError = useCallback((error: unknown) => {
    const rawMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Camera QR chưa khởi tạo được trên thiết bị này.';
    const isRestricted = rawMessage
      .toLowerCase()
      .includes('camera functionality is not available');
    const message = isRestricted
      ? 'Camera đang bị hệ điều hành hoặc chính sách thiết bị chặn.'
      : rawMessage;

    logScoreMenuError(
      {module: 'QR', action: 'camera scanner native error', extra: {message}},
      error,
    );
    setScannerNativeError(message);
    setStatusMessage(
      isRestricted
        ? 'Camera đang bị hạn chế trên thiết bị này. Có thể nhập mã QR bên cạnh để mở menu.'
        : 'Camera QR chưa sẵn sàng. Vui lòng thử lại hoặc nhập mã QR bên cạnh.',
    );
  }, []);

  const renderCameraContent = () => {
    if (permissionState === 'loading') {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>
            Đang mở camera...
          </Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            Vui lòng chờ trong giây lát.
          </Text>
        </View>
      );
    }

    if (permissionState !== 'granted') {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>
            Chưa có quyền camera
          </Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            Cấp quyền camera để quét QR menu của quán/chi nhánh.
          </Text>
          <Pressable
            onPress={() => void requestCameraPermission()}
            style={styles.cameraPermissionButton}>
            <Text maxFontSizeMultiplier={1} style={styles.cameraPermissionText}>
              Cấp quyền camera
            </Text>
          </Pressable>
        </View>
      );
    }

    if (!cameraDevice) {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>
            Không tìm thấy camera sau
          </Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            Vui lòng thử lại trên thiết bị có camera sau hoặc liên hệ nhân viên.
          </Text>
        </View>
      );
    }

    if (scannerNativeError) {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>
            Camera QR chưa sẵn sàng
          </Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            Bộ quét QR chưa khởi tạo được trên thiết bị này. Vui lòng thử lại
            hoặc nhập mã QR ở khung bên cạnh.
          </Text>
          <Pressable
            onPress={() => void requestCameraPermission()}
            style={styles.cameraPermissionButton}>
            <Text maxFontSizeMultiplier={1} style={styles.cameraPermissionText}>
              Thử mở lại camera
            </Text>
          </Pressable>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackError}>
            {scannerNativeError}
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
        onError={handleCameraError}
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
        <Text maxFontSizeMultiplier={1} style={styles.homeButtonText}>
          ← Home
        </Text>
      </Pressable>

      <View style={styles.leftRail}>
        <Image
          source={images.logoSmall}
          resizeMode="contain"
          style={styles.logo}
        />
        <Text maxFontSizeMultiplier={1} style={styles.brandEyebrow}>
          APLUS MENU
        </Text>
        <Text maxFontSizeMultiplier={1} style={styles.brandTitle}>
          Quét QR để xem menu
        </Text>
        <Text maxFontSizeMultiplier={1} style={styles.brandHint}>
          QR xác định quán hoặc chi nhánh. Nếu camera không quét được, nhập mã QR in bên cạnh ảnh QR.
        </Text>
      </View>

      <View style={styles.centerPane}>
        <View style={styles.cameraCard}>
          <View style={styles.cameraHeaderRow}>
            <Text maxFontSizeMultiplier={1} style={styles.cameraTitle}>
              Camera QR
            </Text>
            <Text maxFontSizeMultiplier={1} style={styles.cameraBadge}>
              QR MENU
            </Text>
          </View>

          <View style={styles.cameraFrame}>
            {renderCameraContent()}
            <View pointerEvents="none" style={styles.scanCornerTopLeft} />
            <View pointerEvents="none" style={styles.scanCornerTopRight} />
            <View pointerEvents="none" style={styles.scanCornerBottomLeft} />
            <View pointerEvents="none" style={styles.scanCornerBottomRight} />
          </View>

          <Text maxFontSizeMultiplier={1} style={styles.statusText}>
            {statusMessage}
          </Text>
        </View>
      </View>

      <View style={styles.rightRail}>
        <ScrollView
          style={styles.rightRailScroller}
          contentContainerStyle={styles.rightRailContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.manualQrCard}>
            <Text maxFontSizeMultiplier={1} style={styles.manualQrTitle}>
              Không quét được QR?
            </Text>
            <Text maxFontSizeMultiplier={1} style={styles.manualQrHint}>
              Nhập mã QR menu của quán/chi nhánh. Có thể nhập mã thuần, dán link QR,
              hoặc dán cả dòng “Mã QR: ...”.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              maxFontSizeMultiplier={1}
              onChangeText={text => {
                setManualQrToken(text);
                if (manualQrError) {
                  setManualQrError('');
                }
              }}
              onSubmitEditing={handleSubmitManualQrToken}
              placeholder="Nhập mã QR menu"
              placeholderTextColor="rgba(255,255,255,0.4)"
              returnKeyType="go"
              style={styles.manualQrInput}
              value={manualQrToken}
            />
            {manualQrError ? (
              <Text maxFontSizeMultiplier={1} style={styles.manualQrError}>
                {manualQrError}
              </Text>
            ) : null}
            <Pressable
              onPress={handleSubmitManualQrToken}
              style={styles.manualQrButton}>
              <Text maxFontSizeMultiplier={1} style={styles.manualQrButtonText}>
                Mở menu
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => navigate(screens.restaurantAdminLogin)}
            style={styles.adminButton}>
            <Text maxFontSizeMultiplier={1} style={styles.adminButtonText}>
              Đăng nhập Admin
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
};

export default memo(RestaurantQrScannerScreen);
