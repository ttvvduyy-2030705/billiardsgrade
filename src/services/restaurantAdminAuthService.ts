import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  registerRestaurantAdmin,
  verifyRestaurantAdmin,
} from './restaurantMenuStorage';
import {loadActiveRestaurantContext} from './restaurantWorkspaceStorage';

export type RestaurantAdminAuthProvider = 'local' | 'api';
export type RestaurantAdminRole = 'OWNER' | 'MANAGER' | 'STAFF';

export type RestaurantAdminSession = {
  version: 1;
  userId: string;
  username: string;
  role: RestaurantAdminRole;
  provider: RestaurantAdminAuthProvider;
  token?: string;
  activeRestaurantId?: string;
  activeRestaurantName?: string;
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
const LOCAL_SESSION_TOKEN_PREFIX = 'local-admin-session';

const nowIso = () => new Date().toISOString();

const normaliseUsername = (value: string) => value.trim();

const createLocalUserId = (username: string) =>
  `local_admin_${normaliseUsername(username).toLowerCase() || 'unknown'}`;

const createLocalSessionToken = (username: string, signedInAt: string) =>
  `${LOCAL_SESSION_TOKEN_PREFIX}:${createLocalUserId(username)}:${signedInAt}`;

const normalizeRole = (role?: string): RestaurantAdminRole => {
  if (role === 'OWNER' || role === 'MANAGER' || role === 'STAFF') {
    return role;
  }

  return 'OWNER';
};

const createLocalSession = async (
  username: string,
): Promise<RestaurantAdminSession> => {
  const now = Date.now();
  const signedInAt = new Date(now).toISOString();
  const cleanUsername = normaliseUsername(username);
  const context = await loadActiveRestaurantContext();

  return {
    version: 1,
    userId: createLocalUserId(cleanUsername),
    username: cleanUsername,
    role: 'OWNER',
    provider: 'local',
    token: createLocalSessionToken(cleanUsername, signedInAt),
    activeRestaurantId: context.restaurantId,
    activeRestaurantName: context.restaurantName,
    signedInAt,
    expiresAt: new Date(now + ADMIN_SESSION_TTL_MS).toISOString(),
  };
};

export const isRestaurantAdminSessionValid = (
  session?: Partial<RestaurantAdminSession> | null,
) => {
  if (!session?.username || !session?.signedInAt || !session?.expiresAt) {
    return false;
  }

  const expiresAt = Date.parse(session.expiresAt);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  if (session.provider === 'api' && !session.token) {
    return false;
  }

  return true;
};

const normalizeSession = (
  session: Partial<RestaurantAdminSession>,
): RestaurantAdminSession | null => {
  if (!isRestaurantAdminSessionValid(session)) {
    return null;
  }

  const username = normaliseUsername(session.username || '');
  const signedInAt = session.signedInAt || nowIso();

  return {
    version: 1,
    userId: session.userId || createLocalUserId(username),
    username,
    role: normalizeRole(session.role),
    provider: session.provider === 'api' ? 'api' : 'local',
    token:
      session.token ||
      (session.provider === 'api'
        ? undefined
        : createLocalSessionToken(username, signedInAt)),
    activeRestaurantId: session.activeRestaurantId,
    activeRestaurantName: session.activeRestaurantName,
    signedInAt,
    expiresAt: session.expiresAt || nowIso(),
  };
};

const saveAdminSession = async (session: RestaurantAdminSession) => {
  await AsyncStorage.setItem(
    ADMIN_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
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
    const session = normalizeSession(parsed);

    if (!session) {
      await clearRestaurantAdminSession();
      return null;
    }

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

  const result = await verifyRestaurantAdmin(cleanUsername, cleanPassword);

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.message ||
        'Tài khoản hoặc mật khẩu chưa đúng. Nếu chưa có tài khoản, hãy đăng ký Admin trước.',
    };
  }

  const session = await createLocalSession(cleanUsername);
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
    message: 'Đăng ký Admin thành công. Bạn có thể đăng nhập ngay.',
  };
};

export const refreshRestaurantAdminSession = async () => {
  const current = await getRestaurantAdminSession();

  if (!current) {
    return null;
  }

  const next = await createLocalSession(current.username);
  await saveAdminSession(next);
  return next;
};

export const RestaurantAdminAuthService = {
  login: loginRestaurantAdmin,
  registerDemo: registerRestaurantAdminAccount,
  registerLocal: registerRestaurantAdminAccount,
  getSession: getRestaurantAdminSession,
  clearSession: clearRestaurantAdminSession,
  refreshSession: refreshRestaurantAdminSession,
  isSessionValid: isRestaurantAdminSessionValid,
};
