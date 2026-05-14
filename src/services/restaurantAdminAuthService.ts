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

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallback;
};

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
  const baseName = `Quán của ${normaliseUsername(username) || 'Admin'}`;
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
      'Backend vẫn trả về quán demo/test cho tài khoản này. Vui lòng deploy backend mới rồi đăng nhập lại.',
  };
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
        'Không thể đăng nhập Admin. Vui lòng kiểm tra mạng/backend rồi thử lại.',
      ),
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      message:
        result.message ||
        'Tài khoản hoặc mật khẩu chưa đúng. Nếu chưa có tài khoản, hãy đăng ký Admin trước.',
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
        'Không thể đăng ký Admin. Vui lòng kiểm tra mạng/backend rồi thử lại.',
      ),
    };
  }

  if (!result.ok) {
    return {ok: false, message: result.message};
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
    message: 'Đăng ký Admin thành công.',
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
