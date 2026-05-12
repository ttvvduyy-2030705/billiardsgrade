import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';

import {
  bootstrapRestaurantMenuRepository,
  clearCurrentCart,
  resolveRestaurantMenuQrToken,
  setActiveRestaurantContext,
} from '../services/restaurantMenuRepository';
import type {RestaurantMenuContext} from '../services/restaurantMenuRepository';
import {devWarn} from '../utils/devLogger';
import {resetRestaurantCartStore} from './RestaurantCartStore';
import {resetRestaurantMenuStore} from './RestaurantMenuStore';

const CUSTOMER_SESSION_STORAGE_KEY = 'scoremenu_customer_menu_session_v1';

type CustomerMenuSessionSnapshot = {
  context: RestaurantMenuContext | null;
  loading: boolean;
  hydrated: boolean;
  errorMessage: string;
  sessionVersion: number;
};

type PersistedCustomerMenuSession = {
  context: RestaurantMenuContext;
  savedAt: string;
};

const listeners = new Set<() => void>();

const storeState: CustomerMenuSessionSnapshot & {
  requestId: number;
} = {
  context: null,
  loading: false,
  hydrated: false,
  errorMessage: '',
  sessionVersion: 0,
  requestId: 0,
};

const getSnapshot = (): CustomerMenuSessionSnapshot => ({
  context: storeState.context,
  loading: storeState.loading,
  hydrated: storeState.hydrated,
  errorMessage: storeState.errorMessage,
  sessionVersion: storeState.sessionVersion,
});

const emitChange = () => {
  listeners.forEach(listener => listener());
};

const setLoading = (loading: boolean) => {
  if (storeState.loading === loading) {
    return;
  }

  storeState.loading = loading;
  emitChange();
};

const normalizeQrToken = (value?: string) => String(value || '').trim();

const getContextQrToken = (context?: RestaurantMenuContext | null) => {
  if (context?.qrTokenScope === 'TABLE' && context?.qrCodeToken) {
    return normalizeQrToken(context.qrCodeToken);
  }

  return normalizeQrToken(
    context?.menuQrToken || context?.qrCodeToken || undefined,
  );
};

const persistCustomerSession = async (context: RestaurantMenuContext) => {
  const payload: PersistedCustomerMenuSession = {
    context,
    savedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(
      CUSTOMER_SESSION_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch (error) {
    devWarn('[CustomerMenuSession] persist failed', error);
  }
};

const readPersistedCustomerSession = async () => {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMER_SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedCustomerMenuSession>;

    if (!parsed?.context?.restaurantId) {
      return null;
    }

    return parsed.context;
  } catch (error) {
    devWarn('[CustomerMenuSession] read persisted failed', error);
    await AsyncStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY).catch(() => undefined);
    return null;
  }
};

const applyCustomerSessionContext = async (
  context: RestaurantMenuContext,
  options: {persist?: boolean; resetScopedStores?: boolean} = {},
) => {
  const nextContext = await setActiveRestaurantContext({
    ...context,
    source: 'customer',
  });

  storeState.context = nextContext;
  storeState.hydrated = true;
  storeState.errorMessage = '';
  storeState.sessionVersion += 1;

  if (options.resetScopedStores) {
    resetRestaurantMenuStore();
    resetRestaurantCartStore();
  }

  if (options.persist !== false) {
    void persistCustomerSession(nextContext);
  }

  emitChange();
  return getSnapshot();
};

const restoreCustomerMenuSessionSnapshot = async () => {
  const requestId = storeState.requestId + 1;
  storeState.requestId = requestId;
  setLoading(true);

  try {
    await bootstrapRestaurantMenuRepository();
    const persistedContext =
      storeState.context || (await readPersistedCustomerSession());

    if (requestId !== storeState.requestId) {
      return getSnapshot();
    }

    if (!persistedContext?.restaurantId) {
      storeState.context = null;
      storeState.errorMessage =
        'Chưa có QR menu khách. Vui lòng quét QR của quán/chi nhánh.';
      storeState.hydrated = true;
      storeState.sessionVersion += 1;
      emitChange();
      return getSnapshot();
    }

    return await applyCustomerSessionContext(persistedContext, {
      persist: true,
      resetScopedStores: false,
    });
  } catch (error) {
    devWarn('[CustomerMenuSession] restore failed', error);

    if (requestId === storeState.requestId) {
      storeState.errorMessage =
        'Không thể khôi phục menu khách. Vui lòng quét lại QR.';
      storeState.hydrated = true;
      storeState.sessionVersion += 1;
      emitChange();
    }

    return getSnapshot();
  } finally {
    if (requestId === storeState.requestId) {
      setLoading(false);
    }
  }
};

const enterCustomerMenuQrSession = async (qrToken: string) => {
  const cleanToken = normalizeQrToken(qrToken);
  const requestId = storeState.requestId + 1;
  storeState.requestId = requestId;
  setLoading(true);

  if (!cleanToken) {
    storeState.errorMessage =
      'Thiếu mã QR menu. Vui lòng quét lại QR của quán/chi nhánh.';
    storeState.hydrated = true;
    storeState.sessionVersion += 1;
    emitChange();
    setLoading(false);
    return getSnapshot();
  }

  try {
    await bootstrapRestaurantMenuRepository();
    const resolvedContext = await resolveRestaurantMenuQrToken(cleanToken);

    if (requestId !== storeState.requestId) {
      return getSnapshot();
    }

    if (!resolvedContext?.restaurantId) {
      storeState.errorMessage =
        'QR menu không hợp lệ, đã bị khóa hoặc không còn tồn tại.';
      storeState.hydrated = true;
      storeState.sessionVersion += 1;
      emitChange();
      return getSnapshot();
    }

    const currentContext = storeState.context;
    const nextMenuQrToken =
      resolvedContext.menuQrToken || resolvedContext.qrCodeToken || cleanToken;
    const contextChanged =
      !currentContext ||
      currentContext.restaurantId !== resolvedContext.restaurantId ||
      currentContext.branchId !== resolvedContext.branchId ||
      getContextQrToken(currentContext) !== nextMenuQrToken;

    const snapshot = await applyCustomerSessionContext(
      {
        ...resolvedContext,
        qrCodeToken: resolvedContext.qrCodeToken || cleanToken,
        menuQrToken: nextMenuQrToken,
        qrTokenScope:
          resolvedContext.qrTokenScope ||
          (resolvedContext.tableId ? 'TABLE' : 'BRANCH_MENU'),
        source: 'customer',
      },
      {
        persist: true,
        resetScopedStores: contextChanged,
      },
    );

    if (contextChanged) {
      try {
        await clearCurrentCart();
      } catch (error) {
        devWarn(
          '[CustomerMenuSession] clear customer cart after QR change failed',
          error,
        );
      }
    }

    return snapshot;
  } catch (error) {
    devWarn('[CustomerMenuSession] enter QR failed', error);

    if (requestId === storeState.requestId) {
      storeState.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể mở menu từ QR quán/chi nhánh. Vui lòng thử lại.';
      storeState.hydrated = true;
      storeState.sessionVersion += 1;
      emitChange();
    }

    return getSnapshot();
  } finally {
    if (requestId === storeState.requestId) {
      setLoading(false);
    }
  }
};

export const getCustomerMenuSessionContext = async () => {
  if (storeState.context?.restaurantId) {
    return storeState.context;
  }

  return readPersistedCustomerSession();
};

export const restoreCustomerMenuSession = restoreCustomerMenuSessionSnapshot;
export const enterCustomerMenuQr = enterCustomerMenuQrSession;

export const clearCustomerMenuSession = async () => {
  storeState.context = null;
  storeState.loading = false;
  storeState.hydrated = false;
  storeState.errorMessage = '';
  storeState.sessionVersion += 1;
  storeState.requestId += 1;
  await AsyncStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY).catch(() => undefined);
  resetRestaurantMenuStore();
  resetRestaurantCartStore();
  emitChange();
};

export const useCustomerMenuSessionStore = () => {
  const [, forceRender] = useState(0);
  const snapshotRef = useRef(getSnapshot());

  useEffect(() => {
    const listener = () => {
      snapshotRef.current = getSnapshot();
      forceRender(version => version + 1);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const snapshot = getSnapshot();
  snapshotRef.current = snapshot;

  const restoreSession = useCallback(
    () => restoreCustomerMenuSessionSnapshot(),
    [],
  );

  const enterMenuQr = useCallback(
    (qrToken: string) => enterCustomerMenuQrSession(qrToken),
    [],
  );

  const clearSession = useCallback(() => clearCustomerMenuSession(), []);

  return {
    context: snapshot.context,
    loading: snapshot.loading,
    hydrated: snapshot.hydrated,
    errorMessage: snapshot.errorMessage,
    sessionVersion: snapshot.sessionVersion,
    restoreCustomerMenuSession: restoreSession,
    enterCustomerMenuQr: enterMenuQr,
    clearCustomerMenuSession: clearSession,
  };
};
