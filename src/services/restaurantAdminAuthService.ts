import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createRestaurantWorkspace,
  getActiveRestaurantContext,
  loadRestaurantBranches,
  registerRestaurantAdminCredentials,
  setActiveRestaurantContext,
  verifyRestaurantAdminCredentials,
} from './restaurantMenuRepository';
import {devWarn} from 'utils/devLogger';
import {translateApp} from 'utils/appI18n';

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
  restaurantIds?: string[];
  branchIds?: string[];
  activeBranchId?: string;
  menuQrToken?: string;
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

const LEGACY_DEMO_RESTAURANT_IDS = new Set([
  'aplus_billiards_hanoi',
  'aplus_hanoi',
  'haidilao_demo',
  'haidilao_local_demo',
  'local_restaurant',
  'legacy_removed_restaurant',
]);

const LEGACY_DEMO_BRANCH_IDS = new Set([
  'aplus_hanoi_main',
  'aplus_hanoi_vip',
  'haidilao_demo_main',
  'haidilao_demo_2',
  'haidilao_local_main_branch',
  'local_main_branch',
  'legacy_removed_branch',
]);

const isLegacyDemoRestaurantId = (restaurantId?: string | null) => {
  const id = String(restaurantId || '').trim();
  return Boolean(id) && (LEGACY_DEMO_RESTAURANT_IDS.has(id) || /^aplus_|^haidilao_|^seed_|^sample_/i.test(id));
};

const isLegacyDemoBranchId = (branchId?: string | null) => {
  const id = String(branchId || '').trim();
  return Boolean(id) && (LEGACY_DEMO_BRANCH_IDS.has(id) || /^aplus_|^haidilao_|^seed_|^sample_/i.test(id));
};

const sanitizeRestaurantIds = (ids?: string[], fallbackId?: string) => {
  const next = [
    ...(ids || []),
    fallbackId,
  ]
    .map(id => String(id || '').trim())
    .filter(Boolean)
    .filter(id => !isLegacyDemoRestaurantId(id));
  return Array.from(new Set(next));
};

const sanitizeBranchIds = (ids?: string[], fallbackId?: string) => {
  const next = [
    ...(ids || []),
    fallbackId,
  ]
    .map(id => String(id || '').trim())
    .filter(Boolean)
    .filter(id => !isLegacyDemoBranchId(id));
  return Array.from(new Set(next));
};

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

const getRawErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === 'object') {
    const message = (error as {message?: unknown}).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return '';
};

export const getRestaurantAdminAuthErrorMessage = (
  error: unknown,
  fallback = translateApp('restaurantAdminAuth.loginFallbackError'),
) => {
  const status =
    error && typeof error === 'object'
      ? Number((error as {status?: unknown}).status || 0)
      : 0;

  if (status === 409) {
    return translateApp('restaurantAdminAuth.accountExists');
  }

  if (status === 404) {
    return translateApp('restaurantAdminAuth.accountNotFoundRegister');
  }

  if (status === 401) {
    return translateApp('restaurantAdminAuth.loginIncorrect');
  }

  const raw = getRawErrorMessage(error);
  const normalized = raw.toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (
    /already\s+exists|duplicate|conflict|account\s+exists|user\s+exists/.test(normalized) ||
    /đã\s+tồn\s+tại|tồn\s+tại|bị\s+trùng|trùng/.test(normalized)
  ) {
    return translateApp('restaurantAdminAuth.accountExists');
  }

  if (
    /not\s+found|not\s+exist|does\s+not\s+exist|no\s+account|unknown\s+account/.test(normalized) ||
    /không\s+tìm\s+thấy|không\s+tồn\s+tại|chưa\s+có\s+tài\s+khoản/.test(normalized)
  ) {
    return translateApp('restaurantAdminAuth.accountNotFoundRegister');
  }

  if (
    /wrong\s+password|incorrect\s+password|invalid\s+password|password\s+incorrect/.test(normalized) ||
    /mật\s+khẩu.*(sai|chưa\s+đúng|không\s+đúng)|sai\s+mật\s+khẩu/.test(normalized)
  ) {
    return translateApp('restaurantAdminAuth.wrongPassword');
  }

  if (
    /invalid\s+credential|invalid\s+login|unauthorized|401|account\s+or\s+password|username\s+or\s+password/.test(normalized) ||
    /tài\s+khoản\s+hoặc\s+mật\s+khẩu|đăng\s+nhập.*(sai|không\s+đúng|thất\s+bại)/.test(normalized)
  ) {
    return translateApp('restaurantAdminAuth.loginIncorrect');
  }

  if (
    /required|missing|empty/.test(normalized) ||
    /vui\s+lòng\s+nhập|bắt\s+buộc|không\s+được\s+trống/.test(normalized)
  ) {
    return translateApp('restaurantAdminAuth.usernamePasswordRequired');
  }

  if (
    /too\s+short|at\s+least\s+6|minimum\s+6/.test(normalized) ||
    /tối\s+thiểu\s+6|ít\s+nhất\s+6|quá\s+ngắn/.test(normalized)
  ) {
    return translateApp('restaurantAdminAuth.passwordTooShort');
  }

  if (/network|fetch|timeout|timed\s+out|kết\s+nối|mạng/.test(normalized)) {
    return fallback;
  }

  return raw;
};

const getAuthErrorMessage = getRestaurantAdminAuthErrorMessage;

const createAdminSession = async ({
  username,
  provider,
  token,
  userId,
  role,
  restaurantId,
  restaurantIds,
  branchIds,
  activeBranchId,
  menuQrToken,
  restaurantName,
}: {
  username: string;
  provider: RestaurantAdminAuthProvider;
  token?: string;
  userId?: string;
  role?: string;
  restaurantId?: string;
  restaurantIds?: string[];
  branchIds?: string[];
  activeBranchId?: string;
  menuQrToken?: string;
  restaurantName?: string;
}): Promise<RestaurantAdminSession> => {
  const now = Date.now();
  const signedInAt = new Date(now).toISOString();
  const cleanUsername = normaliseUsername(username);
  const context =
    provider === 'local' && !restaurantId
      ? await getActiveRestaurantContext().catch(() => null)
      : null;
  const safeRestaurantId = isLegacyDemoRestaurantId(restaurantId)
    ? undefined
    : restaurantId || (context && !isLegacyDemoRestaurantId(context.restaurantId) ? context.restaurantId : undefined);
  const safeRestaurantIds = sanitizeRestaurantIds(restaurantIds, safeRestaurantId);
  const safeBranchId = isLegacyDemoBranchId(activeBranchId) ? undefined : activeBranchId;
  const safeBranchIds = sanitizeBranchIds(branchIds, safeBranchId);
  const safeMenuQrToken = String(menuQrToken || '').trim() || undefined;

  return {
    version: 1,
    userId: userId || createLocalUserId(cleanUsername),
    username: cleanUsername,
    role: normalizeRole(role),
    provider,
    token:
      token ||
      (provider === 'api'
        ? undefined
        : createLocalSessionToken(cleanUsername, signedInAt)),
    activeRestaurantId: safeRestaurantId,
    activeRestaurantName: restaurantName || context?.restaurantName,
    restaurantIds: safeRestaurantIds.length > 0 ? safeRestaurantIds : undefined,
    branchIds: safeBranchIds.length > 0 ? safeBranchIds : undefined,
    activeBranchId: safeBranchId,
    menuQrToken: safeMenuQrToken,
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
    activeRestaurantId: isLegacyDemoRestaurantId(session.activeRestaurantId)
      ? undefined
      : session.activeRestaurantId,
    activeRestaurantName: session.activeRestaurantName,
    restaurantIds: sanitizeRestaurantIds(
      Array.isArray(session.restaurantIds) ? session.restaurantIds : undefined,
      session.activeRestaurantId,
    ),
    branchIds: sanitizeBranchIds(
      Array.isArray(session.branchIds) ? session.branchIds : undefined,
      session.activeBranchId,
    ),
    activeBranchId: isLegacyDemoBranchId(session.activeBranchId)
      ? undefined
      : session.activeBranchId,
    menuQrToken: String(session.menuQrToken || '').trim() || undefined,
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
    devWarn('[AUTH] read admin session failed', error);
    await clearRestaurantAdminSession();
    return null;
  }
};


const createPrivateWorkspaceFromAdminToken = async (
  username: string,
) => {
  const baseName = translateApp('restaurantAdminAuth.privateRestaurantName', {username: normaliseUsername(username) || 'Admin'});
  try {
    return await createRestaurantWorkspace({name: baseName});
  } catch (error) {
    if (!/tồn tại|exist|duplicate/i.test(String((error as Error)?.message || ''))) {
      throw error;
    }
    return createRestaurantWorkspace({
      name: `${baseName} ${Date.now().toString().slice(-5)}`,
    });
  }
};

const repairCredentialResultScope = async (
  username: string,
  credential: Awaited<ReturnType<typeof verifyRestaurantAdminCredentials>>,
) => {
  const safeRestaurantIds = sanitizeRestaurantIds(
    credential.restaurantIds,
    credential.restaurantId,
  );
  const safeRestaurantId = safeRestaurantIds[0];
  const safeBranchIds = sanitizeBranchIds(
    credential.branchIds,
    credential.activeBranchId,
  );

  if (safeRestaurantId && credential.restaurantId === safeRestaurantId) {
    return {
      ...credential,
      restaurantIds: safeRestaurantIds,
      branchIds: safeBranchIds,
      activeBranchId: safeBranchIds[0] || credential.activeBranchId,
    };
  }

  if (credential.token) {
    const provisionalSession = await createAdminSession({
      username,
      provider: 'api',
      token: credential.token,
      userId: credential.userId,
      role: credential.role,
      restaurantId: safeRestaurantId,
      restaurantIds: safeRestaurantIds,
      branchIds: safeBranchIds,
      activeBranchId: safeBranchIds[0],
      menuQrToken: credential.menuQrToken,
      restaurantName: credential.restaurantName,
    });
    await saveAdminSession(provisionalSession);

    const workspace = await createPrivateWorkspaceFromAdminToken(username);
    const branches = await loadRestaurantBranches(workspace.id).catch(() => []);
    const branch = branches.find(item => !isLegacyDemoBranchId(item.id)) || branches[0];

    return {
      ...credential,
      restaurantId: workspace.id,
      restaurantName: workspace.name,
      restaurantIds: [workspace.id],
      branchIds: branch?.id ? [branch.id] : [],
      activeBranchId: branch?.id,
      activeBranchName: branch?.name,
      menuQrToken: branch?.menuQrToken,
    };
  }

  if (safeRestaurantId) {
    return {
      ...credential,
      restaurantId: safeRestaurantId,
      restaurantIds: safeRestaurantIds,
      branchIds: safeBranchIds,
      activeBranchId: safeBranchIds[0] || credential.activeBranchId,
    };
  }

  return {
    ...credential,
    ok: false,
    message:
      translateApp('restaurantAdminAuth.backendDemoError'),
  };
};

export const loginRestaurantAdmin = async (
  username: string,
  password: string,
): Promise<RestaurantAdminAuthResult> => {
  const cleanUsername = normaliseUsername(username);
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return {ok: false, message: translateApp('restaurantAdminAuth.usernamePasswordRequired')};
  }

  let result: any;

  try {
    const rawResult = await verifyRestaurantAdminCredentials(
      cleanUsername,
      cleanPassword,
    );
    result = await repairCredentialResultScope(cleanUsername, rawResult);
  } catch (error) {
    return {
      ok: false,
      message: getAuthErrorMessage(
        error,
        translateApp('restaurantAdminAuth.loginFallbackError'),
      ),
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      message: getAuthErrorMessage(
        result.message,
        translateApp('restaurantAdminAuth.loginIncorrect'),
      ),
    };
  }

  if (result.restaurantId) {
    await setActiveRestaurantContext({
      restaurantId: result.restaurantId,
      branchId: result.activeBranchId,
      restaurantName: result.restaurantName,
      branchName: result.activeBranchName,
      menuQrToken: result.menuQrToken,
      source: 'admin',
      role: result.role,
      allowedRestaurantIds: result.restaurantIds,
    });
  }

  const session = await createAdminSession({
    username: cleanUsername,
    provider: result.token ? 'api' : 'local',
    token: result.token,
    userId: result.userId,
    role: result.role,
    restaurantId: result.restaurantId,
    restaurantIds: result.restaurantIds,
    branchIds: result.branchIds,
    activeBranchId: result.activeBranchId,
    menuQrToken: result.menuQrToken,
    restaurantName: result.restaurantName,
  });
  await saveAdminSession(session);

  return {ok: true, message: translateApp('restaurantAdminAuth.loginSuccess'), session};
};

export const registerRestaurantAdminAccount = async (
  username: string,
  password: string,
): Promise<RestaurantAdminAuthResult> => {
  const cleanUsername = normaliseUsername(username);
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return {ok: false, message: translateApp('restaurantAdminAuth.usernamePasswordRequired')};
  }

  if (cleanPassword.length < 6) {
    return {ok: false, message: translateApp('restaurantAdminAuth.passwordTooShort')};
  }

  let result: any;

  try {
    const rawResult = await registerRestaurantAdminCredentials(
      cleanUsername,
      cleanPassword,
    );
    result = await repairCredentialResultScope(cleanUsername, rawResult);
  } catch (error) {
    return {
      ok: false,
      message: getAuthErrorMessage(
        error,
        translateApp('restaurantAdminAuth.registerFallbackError'),
      ),
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      message: getAuthErrorMessage(
        result.message,
        translateApp('restaurantAdminAuth.registerFallbackError'),
      ),
    };
  }

  if (result.restaurantId) {
    await setActiveRestaurantContext({
      restaurantId: result.restaurantId,
      branchId: result.activeBranchId,
      restaurantName: result.restaurantName,
      branchName: result.activeBranchName,
      menuQrToken: result.menuQrToken,
      source: 'admin',
      role: result.role,
      allowedRestaurantIds: result.restaurantIds,
    });
  }

  const session = await createAdminSession({
    username: cleanUsername,
    provider: result.token ? 'api' : 'local',
    token: result.token,
    userId: result.userId,
    role: result.role,
    restaurantId: result.restaurantId,
    restaurantIds: result.restaurantIds,
    branchIds: result.branchIds,
    activeBranchId: result.activeBranchId,
    menuQrToken: result.menuQrToken,
    restaurantName: result.restaurantName,
  });
  await saveAdminSession(session);

  return {
    ok: true,
    message: translateApp('restaurantAdminAuth.registerSuccess'),
    session,
  };
};


export const updateRestaurantAdminSessionContext = async ({
  restaurantId,
  restaurantName,
  branchId,
  menuQrToken,
}: {
  restaurantId?: string;
  restaurantName?: string;
  branchId?: string;
  menuQrToken?: string;
}) => {
  const current = await getRestaurantAdminSession();

  if (!current) {
    return null;
  }

  const safeRestaurantId = isLegacyDemoRestaurantId(restaurantId)
    ? current.activeRestaurantId
    : restaurantId || current.activeRestaurantId;
  const safeBranchId = isLegacyDemoBranchId(branchId)
    ? current.activeBranchId
    : branchId || current.activeBranchId;
  const safeMenuQrToken = String(menuQrToken || '').trim() || current.menuQrToken;
  const next: RestaurantAdminSession = {
    ...current,
    activeRestaurantId: safeRestaurantId,
    activeRestaurantName: restaurantName || current.activeRestaurantName,
    restaurantIds: sanitizeRestaurantIds(current.restaurantIds, safeRestaurantId),
    branchIds: sanitizeBranchIds(current.branchIds, safeBranchId),
    activeBranchId: safeBranchId,
    menuQrToken: safeMenuQrToken,
  };
  await saveAdminSession(next);
  return next;
};

export const refreshRestaurantAdminSession = async () => {
  const current = await getRestaurantAdminSession();

  if (!current) {
    return null;
  }

  const next = await createAdminSession({
    username: current.username,
    provider: current.provider,
    token: current.token,
    userId: current.userId,
    role: current.role,
    restaurantId: current.activeRestaurantId,
    restaurantIds: current.restaurantIds,
    branchIds: current.branchIds,
    activeBranchId: current.activeBranchId,
    menuQrToken: current.menuQrToken,
    restaurantName: current.activeRestaurantName,
  });
  await saveAdminSession(next);
  return next;
};

export const RestaurantAdminAuthService = {
  login: loginRestaurantAdmin,
  registerLocal: registerRestaurantAdminAccount,
  getSession: getRestaurantAdminSession,
  clearSession: clearRestaurantAdminSession,
  refreshSession: refreshRestaurantAdminSession,
  updateSessionContext: updateRestaurantAdminSessionContext,
  isSessionValid: isRestaurantAdminSessionValid,
};
