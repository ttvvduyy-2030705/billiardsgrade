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
import {verifyLocalAdminAccount} from 'constants/admin';
import {screens} from 'scenes/screens';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {Navigation} from 'types/navigation';

import createStyles from './styles';

type Props = Navigation;

const RestaurantAdminLoginScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {design} = useDesignSystem();
  const styles = useMemo(() => createStyles({design}), [design]);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onLogin = () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    const result = verifyLocalAdminAccount(username, password);

    if (!result.ok) {
      setErrorMessage(result.message);
      setSubmitting(false);
      return;
    }

    setErrorMessage('');
    setSubmitting(false);
    props.navigate(screens.restaurantAdminDashboard, {adminUsername: username.trim()});
  };

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
          <RNText style={styles.title}>Đăng nhập quản trị</RNText>
          <RNText style={styles.hint}>
            Khu vực quản lý món, đơn hàng và trạng thái thanh toán. Bản hiện tại
            dùng tài khoản local để dễ thay bằng API thật sau này.
          </RNText>

          <RNView style={styles.fieldBlock}>
            <RNText style={styles.label}>Tài khoản</RNText>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
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
              placeholder="123456"
              placeholderTextColor="rgba(255,255,255,0.38)"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={onLogin}
              style={styles.input}
            />
          </RNView>

          {errorMessage ? (
            <RNView style={styles.errorBox}>
              <RNText style={styles.errorText}>{errorMessage}</RNText>
            </RNView>
          ) : null}

          <Pressable
            onPress={onLogin}
            style={[styles.loginButton, submitting ? styles.loginButtonDisabled : null]}>
            <RNText style={styles.loginText}>Đăng nhập Admin</RNText>
          </Pressable>

          <RNText style={styles.testHint}>
            Tài khoản test: admin / 123456. Chỉ dùng local trong giai đoạn demo.
          </RNText>
        </RNView>
      </RNView>
    </KeyboardAvoidingView>
  );
};

export default memo(RestaurantAdminLoginScreen);
