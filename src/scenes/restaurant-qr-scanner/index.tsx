import React, {
  memo,
  useCallback,
  useContext,
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
import i18n from 'i18n';
import {LanguageContext} from 'context/language';
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
    return normalizeQrTokenForManualEntry(
      safeDecodeURIComponent(queryMatch[1]),
    );
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

  const {language} = useContext(LanguageContext);
  const t = useCallback(
    (key: string, options?: Record<string, string | number>) =>
      String(i18n.t(key, options as any)),
    [language],
  );

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
  const [statusMessage, setStatusMessage] = useState(() =>
    t('restaurantQrScanner.initialStatus'),
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
          t('restaurantQrScanner.invalidQr'),
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
      setStatusMessage(t('restaurantQrScanner.openingMenu'));
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
    [navigate, t],
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
      setManualQrError(t('restaurantQrScanner.manualInvalid'));
      return;
    }

    setManualQrError('');
    openRestaurantMenuByToken(cleanToken);
  }, [manualQrToken, openRestaurantMenuByToken, t]);

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
          : t('restaurantQrScanner.cameraInitError');
    const isRestricted = rawMessage
      .toLowerCase()
      .includes('camera functionality is not available');
    const message = isRestricted
      ? t('restaurantQrScanner.cameraRestricted')
      : rawMessage;

    logScoreMenuError(
      {module: 'QR', action: 'camera scanner native error', extra: {message}},
      error,
    );
    setScannerNativeError(message);
    setStatusMessage(
      isRestricted
        ? t('restaurantQrScanner.cameraRestrictedHint')
        : t('restaurantQrScanner.cameraNotReadyHint'),
    );
  }, [t]);

  const renderCameraContent = () => {
    if (permissionState === 'loading') {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>
            {t('restaurantQrScanner.openingCamera')}
          </Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            {t('restaurantQrScanner.waitMoment')}
          </Text>
        </View>
      );
    }

    if (permissionState !== 'granted') {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>
            {t('restaurantQrScanner.noCameraPermission')}
          </Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            {t('restaurantQrScanner.permissionHint')}
          </Text>
          <Pressable
            onPress={() => void requestCameraPermission()}
            style={styles.cameraPermissionButton}>
            <Text maxFontSizeMultiplier={1} style={styles.cameraPermissionText}>
              {t('restaurantQrScanner.grantCamera')}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (!cameraDevice) {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>
            {t('restaurantQrScanner.noBackCamera')}
          </Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            {t('restaurantQrScanner.noBackCameraHint')}
          </Text>
        </View>
      );
    }

    if (scannerNativeError) {
      return (
        <View style={styles.cameraFallbackContent}>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackTitle}>
            {t('restaurantQrScanner.cameraNotReady')}
          </Text>
          <Text maxFontSizeMultiplier={1} style={styles.cameraFallbackHint}>
            {t('restaurantQrScanner.scannerFallbackHint')}
          </Text>
          <Pressable
            onPress={() => void requestCameraPermission()}
            style={styles.cameraPermissionButton}>
            <Text maxFontSizeMultiplier={1} style={styles.cameraPermissionText}>
              {t('restaurantQrScanner.retryCamera')}
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
          ← {t('restaurantQrScanner.home')}
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
          {t('restaurantQrScanner.title')}
        </Text>
        <Text maxFontSizeMultiplier={1} style={styles.brandHint}>
          {t('restaurantQrScanner.brandHint')}
        </Text>
      </View>

      <View style={styles.centerPane}>
        <View style={styles.cameraCard}>
          <View style={styles.cameraHeaderRow}>
            <Text maxFontSizeMultiplier={1} style={styles.cameraTitle}>
              {t('restaurantQrScanner.cameraQr')}
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
              {t('restaurantQrScanner.manualTitle')}
            </Text>
            <Text maxFontSizeMultiplier={1} style={styles.manualQrHint}>
              {t('restaurantQrScanner.manualHint')}
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
              placeholder={t('restaurantQrScanner.manualPlaceholder')}
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
                {t('restaurantQrScanner.openMenu')}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => navigate(screens.restaurantAdminLogin)}
            style={styles.adminButton}>
            <Text maxFontSizeMultiplier={1} style={styles.adminButtonText}>
              {t('restaurantQrScanner.adminLogin')}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
};

export default memo(RestaurantQrScannerScreen);
