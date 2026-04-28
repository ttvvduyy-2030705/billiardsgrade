import React, {memo, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text as RNText,
  TextInput,
  View as RNView,
} from 'react-native';

import images from 'assets';
import Image from 'components/Image';
import View from 'components/View';
import {
  ADMIN_TEST_PASSWORD,
  ADMIN_TEST_USERNAME,
  verifyLocalAdminAccount,
} from 'constants/admin';
import {screens} from 'scenes/screens';
import {
  registerRestaurantAdmin,
  verifyRestaurantAdmin,
} from 'services/restaurantMenuStorage';
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
  const [username, setUsername] = useState(
    props.initialMode === 'register' ? '' : ADMIN_TEST_USERNAME,
  );
  const [password, setPassword] = useState(
    props.initialMode === 'register' ? '' : ADMIN_TEST_PASSWORD,
  );
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setAuthMode(nextMode);
    setErrorMessage('');
    setInfoMessage('');

    if (nextMode === 'login') {
      setUsername(username.trim() || ADMIN_TEST_USERNAME);
      setPassword('');
      setConfirmPassword('');
    } else {
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const onLogin = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setInfoMessage('');

    const localTestResult = verifyLocalAdminAccount(username, password);

    if (!localTestResult.ok) {
      const savedAccountResult = await verifyRestaurantAdmin(username, password);

      if (!savedAccountResult.ok) {
        setErrorMessage(savedAccountResult.message);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    props.navigate(screens.restaurantAdminDashboard, {
      adminUsername: username.trim() || ADMIN_TEST_USERNAME,
    });
  };

  const onRegister = async () => {
    if (submitting) {
      return;
    }

    const cleanPassword = password.trim();

    if (cleanPassword !== confirmPassword.trim()) {
      setErrorMessage('Mật khẩu nhập lại chưa khớp');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setInfoMessage('');

    const result = await registerRestaurantAdmin(username, password);

    if (!result.ok) {
      setErrorMessage(result.message);
      setSubmitting(false);
      return;
    }

    setInfoMessage('Đăng ký thành công. Bạn có thể đăng nhập bằng tài khoản vừa tạo.');
    setAuthMode('login');
    setConfirmPassword('');
    setPassword('');
    setSubmitting(false);
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

      <RNView style={styles.content}>
        <RNView style={styles.card}>
          <RNText style={styles.eyebrow}>APlus Restaurant Admin</RNText>
          <RNText style={styles.title}>
            {isLogin ? 'Đăng nhập quản trị' : 'Đăng ký quản trị'}
          </RNText>
          <RNText style={styles.hint}>
            {isLogin
              ? 'Đăng nhập xong mới vào khu quản trị để tiếp nhận đơn, đổi trạng thái thanh toán và chỉnh sửa món.'
              : 'Tạo tài khoản Admin local cho giai đoạn demo. Sau này có thể thay phần này bằng API thật.'}
          </RNText>

          <RNView style={styles.fieldBlock}>
            <RNText style={styles.label}>Tài khoản</RNText>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder={isLogin ? ADMIN_TEST_USERNAME : 'Nhập tài khoản mới'}
              placeholderTextColor="rgba(255,255,255,0.38)"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              style={styles.input}
            />
          </RNView>

          <RNView style={styles.fieldBlock}>
            <RNText style={styles.label}>Mật khẩu</RNText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={isLogin ? ADMIN_TEST_PASSWORD : 'Nhập mật khẩu'}
              placeholderTextColor="rgba(255,255,255,0.38)"
              secureTextEntry
              returnKeyType={isLogin ? 'done' : 'next'}
              onSubmitEditing={isLogin ? submit : undefined}
              style={styles.input}
            />
          </RNView>

          {!isLogin ? (
            <RNView style={styles.fieldBlock}>
              <RNText style={styles.label}>Nhập lại mật khẩu</RNText>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="rgba(255,255,255,0.38)"
                secureTextEntry
                returnKeyType="done"
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
              {isLogin ? 'Đăng nhập Admin' : 'Đăng ký Admin'}
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
            Tài khoản test: {ADMIN_TEST_USERNAME} / {ADMIN_TEST_PASSWORD}. Chỉ dùng local trong giai đoạn demo.
          </RNText>
        </RNView>
      </RNView>
    </KeyboardAvoidingView>
  );
};

export default memo(RestaurantAdminLoginScreen);
