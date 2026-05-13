import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  View as RNView,
} from 'react-native';

import images from 'assets';
import Image from 'components/Image';
import View from 'components/View';
import {screens} from 'scenes/screens';
import {
  getRestaurantAdminSession,
  loginRestaurantAdmin,
  registerRestaurantAdminAccount,
} from '../../services/restaurantAdminAuthService';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {Navigation} from 'types/navigation';

import createStyles from './styles';

type AuthMode = 'login' | 'register';
type AuthField = 'username' | 'password' | 'confirmPassword';
type AuthFormValues = Record<AuthField, string>;

type Props = Navigation & {
  initialMode?: AuthMode;
  resetAuthDraft?: boolean;
  skipAutoSessionCheck?: boolean;
  logoutAt?: number;
};

const EMPTY_FORM_VALUES: AuthFormValues = {
  username: '',
  password: '',
  confirmPassword: '',
};

/**
 * Keep the auth draft outside React state on purpose.
 *
 * The restaurant cart inputs already work because their typed values are stored
 * in a module-level session before the fullscreen/keyboard/native-dialog flow
 * causes any React refresh. The Admin auth screen must behave the same way:
 * native dialog -> commit into session immediately -> mirror session into UI.
 */
let adminAuthDraftSession: AuthFormValues = {...EMPTY_FORM_VALUES};
let adminAuthModeSession: AuthMode = 'login';
let adminAuthDraftVersion = 0;

const AuthInputModule =
  Platform.OS === 'android' ? NativeModules.CartImmersiveModule : undefined;


const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
};

const AUTH_SESSION_CHECK_TIMEOUT_MS = 2500;

const withTimeout = async <T,>(
  promise: Promise<T>,
  fallback: T,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>(resolve => {
        timeoutId = setTimeout(
          () => resolve(fallback),
          AUTH_SESSION_CHECK_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const cloneDraftSession = (): AuthFormValues => ({...adminAuthDraftSession});

const replaceDraftSession = (nextValues: AuthFormValues) => {
  adminAuthDraftSession = {...nextValues};
  adminAuthDraftVersion += 1;
};

const updateDraftField = (field: AuthField, value: string) => {
  replaceDraftSession({
    ...adminAuthDraftSession,
    [field]: value,
  });
};

const resetDraftSession = () => {
  replaceDraftSession({...EMPTY_FORM_VALUES});
};

const maskPassword = (value: string) => {
  if (!value) {
    return '';
  }

  return '•'.repeat(Math.max(4, value.length));
};

const getFieldTitle = (field: AuthField) => {
  switch (field) {
    case 'username':
      return 'Tài khoản Admin';
    case 'password':
      return 'Mật khẩu Admin';
    case 'confirmPassword':
      return 'Nhập lại mật khẩu';
    default:
      return 'Thông tin Admin';
  }
};

const RestaurantAdminLoginScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {design} = useDesignSystem();
  const styles = useMemo(() => createStyles({design}), [design]);
  const navigate = props.navigate;
  const replace = props.replace;
  const reset = props.reset;

  const initialMode =
    props.initialMode === 'register' ? 'register' : adminAuthModeSession;
  const [authMode, setAuthModeState] = useState<AuthMode>(initialMode);
  const [formValues, setFormValues] = useState<AuthFormValues>(() =>
    cloneDraftSession(),
  );
  const [, setDraftVersion] = useState(adminAuthDraftVersion);
  const [activeField, setActiveField] = useState<AuthField | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCustomerMenu = useCallback(() => {
    // Batch 2: do not jump straight into a default restaurant menu from admin.
    // Return to the QR scanner landing so the next customer menu is always
    // selected by scanned/chosen restaurant or branch QR.
    if (typeof reset === 'function') {
      reset(0, [
        {
          name: screens.restaurantQrScanner,
        },
      ]);
      return;
    }

    if (typeof replace === 'function') {
      replace({
        name: screens.restaurantQrScanner,
      });
      return;
    }

    navigate(screens.restaurantQrScanner);
  }, [navigate, replace, reset]);

  const routeToDashboard = useCallback(
    (adminUsername: string) => {
      const params = {adminUsername};

      if (typeof replace === 'function') {
        replace({
          name: screens.restaurantAdminDashboard,
          params,
        });
        return;
      }

      navigate(screens.restaurantAdminDashboard, params);
    },
    [navigate, replace],
  );

  useEffect(() => {
    if (!props.resetAuthDraft) {
      return;
    }

    adminAuthModeSession = 'login';
    resetDraftSession();
    setAuthModeState('login');
    setActiveField(null);
    setErrorMessage('');
    setInfoMessage('');
    setSubmitting(false);
    setFormValues(cloneDraftSession());
    setDraftVersion(adminAuthDraftVersion);
  }, [props.resetAuthDraft]);

  useEffect(() => {
    let isMounted = true;

    const routeExistingSession = async () => {
      try {
        const session = await withTimeout(getRestaurantAdminSession(), null);

        if (!isMounted || !session) {
          return;
        }

        routeToDashboard(session.username);
      } catch (error) {
        console.warn('[RestaurantAdminLogin] session check failed', error);
      }
    };

    if (
      authMode === 'login' &&
      !props.resetAuthDraft &&
      !props.skipAutoSessionCheck
    ) {
      void routeExistingSession();
    }

    return () => {
      isMounted = false;
    };
  }, [
    authMode,
    props.logoutAt,
    props.resetAuthDraft,
    props.skipAutoSessionCheck,
    routeToDashboard,
  ]);

  const syncDraftToUi = useCallback(() => {
    const nextSnapshot = cloneDraftSession();
    setFormValues(nextSnapshot);
    setDraftVersion(adminAuthDraftVersion);
  }, []);

  const commitFieldValue = useCallback(
    (field: AuthField, value: string) => {
      updateDraftField(field, value);
      syncDraftToUi();

      // Android native dialog can close while fullscreen/system UI is restoring.
      // These delayed mirrors make sure the visible field updates even if the
      // screen briefly loses focus or refreshes during keyboard dismissal.
      requestAnimationFrame(syncDraftToUi);
      setTimeout(syncDraftToUi, 80);
      setTimeout(syncDraftToUi, 240);
    },
    [syncDraftToUi],
  );

  const switchMode = (nextMode: AuthMode) => {
    adminAuthModeSession = nextMode;
    resetDraftSession();
    setAuthModeState(nextMode);
    setActiveField(null);
    setErrorMessage('');
    setInfoMessage('');
    syncDraftToUi();
    requestAnimationFrame(syncDraftToUi);
  };

  const getFieldPlaceholder = (field: AuthField) => {
    if (field === 'username') {
      return authMode === 'login'
        ? 'Nhập tài khoản Admin'
        : 'Tạo tài khoản Admin';
    }

    if (field === 'password') {
      return authMode === 'login'
        ? 'Nhập mật khẩu Admin'
        : 'Tạo mật khẩu tối thiểu 6 ký tự';
    }

    return 'Nhập lại mật khẩu';
  };

  const showNativeInputDialog = useCallback(
    async (field: AuthField) => {
      if (submitting) {
        return;
      }

      setErrorMessage('');
      setInfoMessage('');
      setActiveField(field);

      const isPassword = field === 'password' || field === 'confirmPassword';

      try {
        const nativeDialog = (AuthInputModule as any)?.showCartTextInputDialog;

        if (Platform.OS !== 'android' || typeof nativeDialog !== 'function') {
          setErrorMessage('Không mở được ô nhập native trên thiết bị này.');
          return;
        }

        const nextValue = await nativeDialog(
          getFieldTitle(field),
          getFieldPlaceholder(field),
          adminAuthDraftSession[field],
          isPassword ? 'password' : 'text',
          `admin-auth-${field}`,
        );

        if (typeof nextValue === 'string') {
          commitFieldValue(field, nextValue);
        } else {
          syncDraftToUi();
        }
      } catch (error) {
        console.warn('[RestaurantAdminLogin] native input failed', error);
        setErrorMessage('Không thể mở ô nhập. Vui lòng thử lại.');
      } finally {
        setActiveField(null);
        requestAnimationFrame(syncDraftToUi);
      }
    },
    [authMode, commitFieldValue, submitting, syncDraftToUi],
  );

  const onLogin = async () => {
    if (submitting) {
      return;
    }

    const currentValues = adminAuthDraftSession;

    setSubmitting(true);
    setErrorMessage('');
    setInfoMessage('');

    let nextDashboardUsername = '';

    try {
      const result = await loginRestaurantAdmin(
        currentValues.username,
        currentValues.password,
      );

      if (!result.ok || !result.session) {
        setErrorMessage(result.message);
        return;
      }

      nextDashboardUsername = result.session.username;
      updateDraftField('password', '');
      updateDraftField('confirmPassword', '');
      syncDraftToUi();
    } catch (error) {
      console.warn('[RestaurantAdminLogin] login failed', error);
      setErrorMessage(
        getErrorMessage(error, 'Không thể đăng nhập Admin. Vui lòng thử lại.'),
      );
    } finally {
      setSubmitting(false);
    }

    if (nextDashboardUsername) {
      routeToDashboard(nextDashboardUsername);
    }
  };

  const onRegister = async () => {
    if (submitting) {
      return;
    }

    const currentValues = adminAuthDraftSession;
    const cleanPassword = currentValues.password.trim();

    if (cleanPassword !== currentValues.confirmPassword.trim()) {
      setErrorMessage('Mật khẩu nhập lại chưa khớp');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const result = await registerRestaurantAdminAccount(
        currentValues.username,
        currentValues.password,
      );

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setInfoMessage(result.message);
      adminAuthModeSession = 'login';
      setAuthModeState('login');
      replaceDraftSession({
        username: currentValues.username,
        password: '',
        confirmPassword: '',
      });
      syncDraftToUi();
      requestAnimationFrame(syncDraftToUi);
    } catch (error) {
      console.warn('[RestaurantAdminLogin] register failed', error);
      setErrorMessage(
        getErrorMessage(error, 'Không thể đăng ký Admin. Vui lòng thử lại.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    syncDraftToUi();

    if (authMode === 'login') {
      void onLogin();
      return;
    }

    void onRegister();
  };

  const isLogin = authMode === 'login';

  const renderNativeInputField = (
    field: AuthField,
    label: string,
    placeholder: string,
    secure = false,
  ) => {
    const rawValue = formValues[field] ?? adminAuthDraftSession[field] ?? '';
    const displayValue = secure ? maskPassword(rawValue) : rawValue;
    const isActive = activeField === field;

    return (
      <RNView style={styles.fieldBlock}>
        <RNText style={styles.label}>{label}</RNText>
        <Pressable
          disabled={submitting}
          onPress={() => void showNativeInputDialog(field)}
          style={[
            styles.inputButton,
            isActive ? styles.inputButtonPressed : null,
            submitting ? styles.inputButtonDisabled : null,
          ]}>
          <RNText
            numberOfLines={1}
            style={
              displayValue
                ? styles.inputButtonText
                : styles.inputButtonPlaceholder
            }>
            {displayValue || placeholder}
          </RNText>
        </Pressable>
      </RNView>
    );
  };

  return (
    <RNView style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.topRow}>
        <Pressable onPress={openCustomerMenu} style={styles.backButton}>
          <RNText style={styles.backText}>‹ Về quét QR menu</RNText>
        </Pressable>
        <Image
          source={images.logoSmall}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}>
        <RNView style={styles.card}>
          <RNText style={styles.eyebrow}>APlus Restaurant Admin</RNText>
          <RNText style={styles.title}>
            {isLogin ? 'Đăng nhập quản trị' : 'Đăng ký quản trị'}
          </RNText>
          <RNText style={styles.hint}>
            {isLogin
              ? 'Đăng nhập bằng tài khoản Admin đã tạo để tiếp nhận đơn, đổi trạng thái thanh toán và chỉnh sửa món.'
              : 'Tạo tài khoản quản trị trên thiết bị này. Dữ liệu được lưu trực tiếp trong app.'}
          </RNText>

          {renderNativeInputField(
            'username',
            'Tài khoản',
            isLogin ? 'Nhập tài khoản Admin' : 'Tạo tài khoản Admin',
          )}

          {renderNativeInputField(
            'password',
            'Mật khẩu',
            isLogin ? 'Nhập mật khẩu Admin' : 'Tạo mật khẩu tối thiểu 6 ký tự',
            true,
          )}

          {!isLogin
            ? renderNativeInputField(
                'confirmPassword',
                'Nhập lại mật khẩu',
                'Nhập lại mật khẩu',
                true,
              )
            : null}

          {errorMessage ? (
            <RNView style={styles.errorBox}>
              <RNText style={styles.errorText}>{errorMessage}</RNText>
            </RNView>
          ) : null}

          {infoMessage ? (
            <RNView style={styles.infoBox}>
              <RNText style={styles.infoText}>{infoMessage}</RNText>
            </RNView>
          ) : null}

          <Pressable
            onPress={submit}
            style={[
              styles.loginButton,
              submitting ? styles.loginButtonDisabled : null,
            ]}>
            <RNText style={styles.loginText}>
              {submitting
                ? isLogin
                  ? 'Đang đăng nhập...'
                  : 'Đang đăng ký...'
                : isLogin
                  ? 'Đăng nhập Admin'
                  : 'Đăng ký Admin'}
            </RNText>
          </Pressable>

          <RNView style={styles.switchRow}>
            <Pressable
              onPress={() => switchMode(isLogin ? 'register' : 'login')}
              style={styles.switchButton}>
              <RNText style={styles.switchText}>
                {isLogin
                  ? 'Chưa có tài khoản? Đăng ký'
                  : 'Đã có tài khoản? Đăng nhập'}
              </RNText>
            </Pressable>
          </RNView>
        </RNView>
      </ScrollView>
    </RNView>
  );
};

export default memo(RestaurantAdminLoginScreen);
