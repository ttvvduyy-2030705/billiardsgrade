import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  registerRestaurantAdmin,
  verifyRestaurantAdmin,
} from './restaurantMenuStorage';

export type RestaurantAdminAuthProvider = 'local' | 'api';

export type RestaurantAdminSession = {
  username: string;
  provider: RestaurantAdminAuthProvider;
  signedInAt: string;
  expiresAt: string;
};

export type RestaurantAdminAuthResult = {
  ok: boolean;
  message: string;
  session?: RestaurantAdminSession;
};

const ADMIN_SESSION_STORAGE_KEY = 'restaurant_admin_session_v1';
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const nowIso = () => new Date().toISOString();

const normaliseUsername = (value: string) => value.trim();

const createLocalSession = (username: string): RestaurantAdminSession => {
  const now = Date.now();

  return {
    username: normaliseUsername(username),
    provider: 'local',
    signedInAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ADMIN_SESSION_TTL_MS).toISOString(),
  };
};

const isValidSession = (session?: Partial<RestaurantAdminSession> | null) => {
  if (!session?.username || !session?.signedInAt || !session?.expiresAt) {
    return false;
  }

  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
};

const saveAdminSession = async (session: RestaurantAdminSession) => {
  await AsyncStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearRestaurantAdminSession = async () => {
  await AsyncStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
};

export const getRestaurantAdminSession = async () => {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<RestaurantAdminSession>;

    if (!isValidSession(parsed)) {
      await clearRestaurantAdminSession();
      return null;
    }

    const session: RestaurantAdminSession = {
      username: normaliseUsername(parsed.username || ''),
      provider: parsed.provider === 'api' ? 'api' : 'local',
      signedInAt: parsed.signedInAt || nowIso(),
      expiresAt: parsed.expiresAt || nowIso(),
    };

    return session;
  } catch (error) {
    console.warn('[RestaurantAdminAuth] read session failed', error);
    await clearRestaurantAdminSession();
    return null;
  }
};

export const loginRestaurantAdmin = async (
  username: string,
  password: string,
): Promise<RestaurantAdminAuthResult> => {
  const cleanUsername = normaliseUsername(username);
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return {ok: false, message: 'Vui lòng nhập tài khoản và mật khẩu Admin'};
  }

  // Local-first demo implementation. Replace this block with API login later.
  const result = await verifyRestaurantAdmin(cleanUsername, cleanPassword);

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.message ||
        'Tài khoản hoặc mật khẩu chưa đúng. Nếu chưa có tài khoản, hãy đăng ký Admin local trước.',
    };
  }

  const session = createLocalSession(cleanUsername);
  await saveAdminSession(session);

  return {ok: true, message: 'Đăng nhập Admin thành công', session};
};

export const registerRestaurantAdminAccount = async (
  username: string,
  password: string,
): Promise<RestaurantAdminAuthResult> => {
  const cleanUsername = normaliseUsername(username);
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return {ok: false, message: 'Vui lòng nhập tài khoản và mật khẩu Admin'};
  }

  if (cleanPassword.length < 6) {
    return {ok: false, message: 'Mật khẩu Admin nên có tối thiểu 6 ký tự'};
  }

  const result = await registerRestaurantAdmin(cleanUsername, cleanPassword);

  if (!result.ok) {
    return {ok: false, message: result.message};
  }

  return {
    ok: true,
    message: 'Đăng ký Admin local thành công. Bạn có thể đăng nhập ngay.',
  };
};

export const refreshRestaurantAdminSession = async () => {
  const current = await getRestaurantAdminSession();

  if (!current) {
    return null;
  }

  const next = createLocalSession(current.username);
  await saveAdminSession(next);
  return next;
};
