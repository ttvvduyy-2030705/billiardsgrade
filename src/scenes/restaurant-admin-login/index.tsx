import React, {memo, useRef, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View as RNView,
} from 'react-native';

import images from 'assets';
import Image from 'components/Image';
import View from 'components/View';
import {screens} from 'scenes/screens';
import {
  loginRestaurantAdmin,
  registerRestaurantAdminAccount,
} from '../../services/restaurantAdminAuthService';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {Navigation} from 'types/navigation';

import createStyles from './styles';

type AuthMode = 'login' | 'register';

type Props = Navigation & {
  initialMode?: AuthMode;
};

const RestaurantAdminLoginScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {design} = useDesignSystem();
  const styles = useMemo(() => createStyles({design}), [design]);

  const [authMode, setAuthMode] = useState<AuthMode>(
    props.initialMode === 'register' ? 'register' : 'login',
  );
  const usernameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const usernameValueRef = useRef('');
  const passwordValueRef = useRef('');
  const confirmPasswordValueRef = useRef('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetNativeInputs = () => {
    usernameInputRef.current?.setNativeProps({text: usernameValueRef.current});
    passwordInputRef.current?.setNativeProps({text: passwordValueRef.current});
    confirmPasswordInputRef.current?.setNativeProps({text: confirmPasswordValueRef.current});
  };

  const switchMode = (nextMode: AuthMode) => {
    usernameValueRef.current = '';
    passwordValueRef.current = '';
    confirmPasswordValueRef.current = '';
    setAuthMode(nextMode);
    setErrorMessage('');
    setInfoMessage('');
    requestAnimationFrame(resetNativeInputs);
  };

  const onLogin = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const result = await loginRestaurantAdmin(
        usernameValueRef.current,
        passwordValueRef.current,
      );

      if (!result.ok || !result.session) {
        setErrorMessage(result.message);
        return;
      }

      props.navigate(screens.restaurantAdminDashboard, {
        adminUsername: result.session.username,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async () => {
    if (submitting) {
      return;
    }

    const cleanPassword = passwordValueRef.current.trim();

    if (cleanPassword !== confirmPasswordValueRef.current.trim()) {
      setErrorMessage('Mật khẩu nhập lại chưa khớp');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const result = await registerRestaurantAdminAccount(
        usernameValueRef.current,
        passwordValueRef.current,
      );

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setInfoMessage(result.message);
      setAuthMode('login');
      passwordValueRef.current = '';
      confirmPasswordValueRef.current = '';
      requestAnimationFrame(resetNativeInputs);
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (authMode === 'login') {
      void onLogin();
      return;
    }

    void onRegister();
  };

  const isLogin = authMode === 'login';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.topRow}>
        <Pressable onPress={props.goBack} style={styles.backButton}>
          <RNText style={styles.backText}>‹ Quay lại menu</RNText>
        </Pressable>
        <Image source={images.logoSmall} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
              : 'Tạo tài khoản Admin local cho giai đoạn demo. Phần này đã được tách riêng để sau này thay bằng API/backend thật.'}
          </RNText>

          <RNView style={styles.fieldBlock}>
            <RNText style={styles.label}>Tài khoản</RNText>
            <TextInput
              ref={usernameInputRef}
              key={`username-${authMode}`}
              defaultValue={usernameValueRef.current}
              onChangeText={text => {
                usernameValueRef.current = text;
              }}
              placeholder={isLogin ? 'Nhập tài khoản Admin' : 'Tạo tài khoản Admin'}
              placeholderTextColor="rgba(255,255,255,0.38)"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              style={styles.input}
            />
          </RNView>

          <RNView style={styles.fieldBlock}>
            <RNText style={styles.label}>Mật khẩu</RNText>
            <TextInput
              ref={passwordInputRef}
              key={`password-${authMode}`}
              defaultValue={passwordValueRef.current}
              onChangeText={text => {
                passwordValueRef.current = text;
              }}
              placeholder={isLogin ? 'Nhập mật khẩu Admin' : 'Tạo mật khẩu tối thiểu 6 ký tự'}
              placeholderTextColor="rgba(255,255,255,0.38)"
              secureTextEntry
              returnKeyType={isLogin ? 'done' : 'next'}
              blurOnSubmit={isLogin}
              onSubmitEditing={
                isLogin ? submit : () => confirmPasswordInputRef.current?.focus()
              }
              style={styles.input}
            />
          </RNView>

          {!isLogin ? (
            <RNView style={styles.fieldBlock}>
              <RNText style={styles.label}>Nhập lại mật khẩu</RNText>
              <TextInput
                ref={confirmPasswordInputRef}
                key={`confirm-${authMode}`}
                defaultValue={confirmPasswordValueRef.current}
                onChangeText={text => {
                  confirmPasswordValueRef.current = text;
                }}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="rgba(255,255,255,0.38)"
                secureTextEntry
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={submit}
                style={styles.input}
              />
            </RNView>
          ) : null}

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
            style={[styles.loginButton, submitting ? styles.loginButtonDisabled : null]}>
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
                {isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
              </RNText>
            </Pressable>
          </RNView>

          <RNText style={styles.testHint}>
            Demo hiện dùng tài khoản Admin local trên thiết bị. Khi có backend, service đăng nhập có thể đổi sang API mà không phải sửa màn hình.
          </RNText>
        </RNView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default memo(RestaurantAdminLoginScreen);
