import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';

import {
  bootstrapRestaurantMenuRepository,
  clearCurrentCart,
  loadCurrentBillSession,
  resolveRestaurantMenuQrToken,
  setActiveRestaurantContext,
} from '../services/restaurantMenuRepository';
import type {
  RestaurantBillSessionDetail,
  RestaurantBillSessionStatus,
  RestaurantMenuContext,
  RestaurantOrder,
} from '../services/restaurantMenuRepository';
import {devWarn} from '../utils/devLogger';
import {resetRestaurantCartStore} from './RestaurantCartStore';
import {resetRestaurantMenuStore} from './RestaurantMenuStore';

const CUSTOMER_SESSION_STORAGE_KEY = 'scoremenu_customer_menu_session_v1';
const CUSTOMER_GUEST_SESSION_STORAGE_KEY = 'scoremenu_customer_guest_session_id_v1';

const ACTIVE_CUSTOMER_BILL_STATUSES: RestaurantBillSessionStatus[] = [
  'OPEN',
  'PAYMENT_REQUESTED',
];

const FINAL_CUSTOMER_BILL_STATUSES: RestaurantBillSessionStatus[] = [
  'PAID',
  'CLOSED',
  'CANCELLED',
];

let activeEnterQrRequest:
  | {token: string; promise: Promise<CustomerMenuSessionSnapshot>}
  | null = null;

type CustomerBillSessionFields = {
  guestSessionId?: string;
  billSessionId?: string;
  lockedTableId?: string;
  lockedTableNumber?: string;
  billStatus?: RestaurantBillSessionStatus;
  billTotal?: number;
  billUpdatedAt?: string;
};

type CustomerMenuSessionSnapshot = CustomerBillSessionFields & {
  context: RestaurantMenuContext | null;
  loading: boolean;
  hydrated: boolean;
  errorMessage: string;
  noticeMessage: string;
  sessionVersion: number;
};

type PersistedCustomerMenuSession = CustomerBillSessionFields & {
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
  noticeMessage: '',
  sessionVersion: 0,
  requestId: 0,
};

const getSnapshot = (): CustomerMenuSessionSnapshot => ({
  context: storeState.context,
  loading: storeState.loading,
  hydrated: storeState.hydrated,
  errorMessage: storeState.errorMessage,
  noticeMessage: storeState.noticeMessage,
  sessionVersion: storeState.sessionVersion,
  guestSessionId: storeState.guestSessionId,
  billSessionId: storeState.billSessionId,
  lockedTableId: storeState.lockedTableId,
  lockedTableNumber: storeState.lockedTableNumber,
  billStatus: storeState.billStatus,
  billTotal: storeState.billTotal,
  billUpdatedAt: storeState.billUpdatedAt,
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

const normaliseBillStatus = (
  status?: RestaurantBillSessionStatus | string,
): RestaurantBillSessionStatus | undefined => {
  const value = String(status || '').trim().toUpperCase();
  if (
    value === 'OPEN' ||
    value === 'PAYMENT_REQUESTED' ||
    value === 'PAID' ||
    value === 'CLOSED' ||
    value === 'CANCELLED'
  ) {
    return value as RestaurantBillSessionStatus;
  }

  return undefined;
};

const isActiveCustomerBillStatus = (
  status?: RestaurantBillSessionStatus | string,
) => {
  const normalised = normaliseBillStatus(status);
  return normalised ? ACTIVE_CUSTOMER_BILL_STATUSES.includes(normalised) : false;
};

const isFinalCustomerBillStatus = (
  status?: RestaurantBillSessionStatus | string,
) => {
  const normalised = normaliseBillStatus(status);
  return normalised ? FINAL_CUSTOMER_BILL_STATUSES.includes(normalised) : false;
};

const getBillFieldsFromState = (): CustomerBillSessionFields => ({
  guestSessionId: storeState.guestSessionId,
  billSessionId: storeState.billSessionId,
  lockedTableId: storeState.lockedTableId,
  lockedTableNumber: storeState.lockedTableNumber,
  billStatus: storeState.billStatus,
  billTotal: storeState.billTotal,
  billUpdatedAt: storeState.billUpdatedAt,
});

const hasOpenBillInState = () =>
  Boolean(storeState.billSessionId && isActiveCustomerBillStatus(storeState.billStatus));

const sameRestaurantBranch = (
  left?: RestaurantMenuContext | null,
  right?: RestaurantMenuContext | null,
) => {
  return Boolean(
    left?.restaurantId &&
      right?.restaurantId &&
      left.restaurantId === right.restaurantId &&
      (left.branchId || '') === (right.branchId || ''),
  );
};

const normalizeGuestSessionId = (value?: string | null) => {
  const normalized = normalizeQrToken(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80);
  return normalized.startsWith('guest_') ? normalized : '';
};

const createGuestSessionId = () => {
  const timePart = Date.now().toString(36);
  const randomPart = `${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  return `guest_${timePart}_${randomPart}`;
};

export const ensureCustomerGuestSessionId = async () => {
  if (storeState.guestSessionId) {
    return storeState.guestSessionId;
  }

  try {
    const stored = normalizeGuestSessionId(
      await AsyncStorage.getItem(CUSTOMER_GUEST_SESSION_STORAGE_KEY),
    );
    if (stored) {
      storeState.guestSessionId = stored;
      return stored;
    }
  } catch (error) {
    devWarn('[CustomerMenuSession] read guest session failed', error);
  }

  const guestSessionId = createGuestSessionId();
  storeState.guestSessionId = guestSessionId;
  try {
    await AsyncStorage.setItem(CUSTOMER_GUEST_SESSION_STORAGE_KEY, guestSessionId);
  } catch (error) {
    devWarn('[CustomerMenuSession] persist guest session failed', error);
  }
  return guestSessionId;
};

const persistCustomerSession = async (
  context: RestaurantMenuContext,
  fields: CustomerBillSessionFields = getBillFieldsFromState(),
) => {
  const payload: PersistedCustomerMenuSession = {
    context,
    guestSessionId: fields.guestSessionId,
    billSessionId: fields.billSessionId,
    lockedTableId: fields.lockedTableId,
    lockedTableNumber: fields.lockedTableNumber,
    billStatus: normaliseBillStatus(fields.billStatus),
    billTotal: fields.billTotal,
    billUpdatedAt: fields.billUpdatedAt,
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

    return {
      ...parsed,
      context: parsed.context,
      billStatus: normaliseBillStatus(parsed.billStatus),
    } as PersistedCustomerMenuSession;
  } catch (error) {
    devWarn('[CustomerMenuSession] read persisted failed', error);
    await AsyncStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY).catch(() => undefined);
    return null;
  }
};

const applyBillFieldsToState = (
  fields: CustomerBillSessionFields = {},
  options: {clearMissing?: boolean} = {},
) => {
  if (options.clearMissing || fields.guestSessionId !== undefined) {
    storeState.guestSessionId = fields.guestSessionId;
  }
  if (options.clearMissing || fields.billSessionId !== undefined) {
    storeState.billSessionId = fields.billSessionId;
  }
  if (options.clearMissing || fields.lockedTableId !== undefined) {
    storeState.lockedTableId = fields.lockedTableId;
  }
  if (options.clearMissing || fields.lockedTableNumber !== undefined) {
    storeState.lockedTableNumber = fields.lockedTableNumber;
  }
  if (options.clearMissing || fields.billStatus !== undefined) {
    storeState.billStatus = normaliseBillStatus(fields.billStatus);
  }
  if (options.clearMissing || fields.billTotal !== undefined) {
    storeState.billTotal = fields.billTotal;
  }
  if (options.clearMissing || fields.billUpdatedAt !== undefined) {
    storeState.billUpdatedAt = fields.billUpdatedAt;
  }
};

const clearBillFieldsFromState = (options: {keepGuestSession?: boolean} = {}) => {
  const guestSessionId = options.keepGuestSession ? storeState.guestSessionId : undefined;
  applyBillFieldsToState(
    {
      guestSessionId,
      billSessionId: undefined,
      lockedTableId: undefined,
      lockedTableNumber: undefined,
      billStatus: undefined,
      billTotal: undefined,
      billUpdatedAt: undefined,
    },
    {clearMissing: true},
  );
};

const billFieldsFromBillSession = (
  billSession: RestaurantBillSessionDetail,
): CustomerBillSessionFields => ({
  guestSessionId: billSession.guestSessionId || storeState.guestSessionId,
  billSessionId: billSession.billSessionId || billSession.id,
  lockedTableId: billSession.tableId,
  lockedTableNumber: billSession.tableNumber,
  billStatus: billSession.status,
  billTotal: billSession.billTotal ?? billSession.total,
  billUpdatedAt: billSession.updatedAt,
});

const applyCustomerSessionContext = async (
  context: RestaurantMenuContext,
  options: {
    persist?: boolean;
    resetScopedStores?: boolean;
    billFields?: CustomerBillSessionFields;
    clearBillFields?: boolean;
    noticeMessage?: string;
  } = {},
) => {
  const nextContext = await setActiveRestaurantContext({
    ...context,
    source: 'customer',
  });

  storeState.context = nextContext;
  storeState.hydrated = true;
  storeState.errorMessage = '';
  storeState.noticeMessage = options.noticeMessage || '';
  storeState.sessionVersion += 1;

  if (options.clearBillFields) {
    clearBillFieldsFromState({keepGuestSession: true});
  } else if (options.billFields) {
    applyBillFieldsToState(options.billFields);
  }

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

const refreshActiveBillSessionForCurrentContext = async () => {
  if (!storeState.context?.restaurantId) {
    return getSnapshot();
  }

  const guestSessionId = await ensureCustomerGuestSessionId();
  const billSession = await loadCurrentBillSession({
    billSessionId: storeState.billSessionId,
    guestSessionId,
  });

  if (!billSession) {
    if (storeState.billSessionId) {
      clearBillFieldsFromState({keepGuestSession: true});
      storeState.noticeMessage = 'Không tìm thấy hóa đơn mở trước đó, phiên gọi món đã được làm mới.';
      storeState.sessionVersion += 1;
      await persistCustomerSession(storeState.context);
      emitChange();
    }
    return getSnapshot();
  }

  const billMatchesContext =
    billSession.restaurantId === storeState.context.restaurantId &&
    (!storeState.context.branchId || billSession.branchId === storeState.context.branchId);

  if (!billMatchesContext) {
    clearBillFieldsFromState({keepGuestSession: true});
    storeState.noticeMessage = 'Hóa đơn cũ thuộc chi nhánh khác nên không được dùng cho QR hiện tại.';
    storeState.sessionVersion += 1;
    await persistCustomerSession(storeState.context);
    emitChange();
    return getSnapshot();
  }

  applyBillFieldsToState(billFieldsFromBillSession(billSession));
  storeState.noticeMessage = isFinalCustomerBillStatus(billSession.status)
    ? 'Hóa đơn trước đã đóng/thanh toán, app sẽ không gọi thêm vào bill cũ.'
    : '';
  storeState.sessionVersion += 1;
  await persistCustomerSession(storeState.context);
  emitChange();
  return getSnapshot();
};

const restoreCustomerMenuSessionSnapshot = async () => {
  const requestId = storeState.requestId + 1;
  storeState.requestId = requestId;
  setLoading(true);

  try {
    await bootstrapRestaurantMenuRepository();
    const persisted = storeState.context
      ? null
      : await readPersistedCustomerSession();
    const persistedContext = storeState.context || persisted?.context;

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

    const snapshot = await applyCustomerSessionContext(persistedContext, {
      persist: true,
      resetScopedStores: false,
      billFields: persisted ? persisted : getBillFieldsFromState(),
    });

    if (requestId === storeState.requestId) {
      await refreshActiveBillSessionForCurrentContext().catch(error => {
        devWarn('[CustomerMenuSession] restore active bill failed', error);
      });
    }

    return getSnapshot();
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

const enterCustomerMenuQrSessionInternal = async (qrToken: string) => {
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
    const persisted = storeState.context
      ? null
      : await readPersistedCustomerSession();
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
    const nextContext: RestaurantMenuContext = {
      ...resolvedContext,
      qrCodeToken: resolvedContext.qrCodeToken || cleanToken,
      menuQrToken: nextMenuQrToken,
      qrTokenScope:
        resolvedContext.qrTokenScope ||
        (resolvedContext.tableId ? 'TABLE' : 'BRANCH_MENU'),
      source: 'customer',
    };
    const persistedBillBelongsToNextContext =
      Boolean(
        persisted?.billSessionId &&
          sameRestaurantBranch(persisted.context, nextContext),
      );

    if (persistedBillBelongsToNextContext && !storeState.billSessionId) {
      applyBillFieldsToState(persisted || {});
    }

    const contextChanged =
      !currentContext ||
      currentContext.restaurantId !== resolvedContext.restaurantId ||
      currentContext.branchId !== resolvedContext.branchId ||
      getContextQrToken(currentContext) !== nextMenuQrToken;
    const qrMovedToAnotherRestaurantOrBranch =
      Boolean(currentContext) && !sameRestaurantBranch(currentContext, nextContext);
    const shouldResetOpenBill =
      contextChanged && qrMovedToAnotherRestaurantOrBranch && hasOpenBillInState();
    const noticeMessage = shouldResetOpenBill
      ? 'Bạn vừa quét QR chi nhánh khác. Hóa đơn đang mở trước đó đã được tách khỏi phiên khách này để tránh lẫn bàn/bill.'
      : '';

    const snapshot = await applyCustomerSessionContext(nextContext, {
      persist: true,
      resetScopedStores: contextChanged,
      clearBillFields: shouldResetOpenBill,
      noticeMessage,
    });

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

    if (
      !shouldResetOpenBill &&
      (sameRestaurantBranch(currentContext, nextContext) || persistedBillBelongsToNextContext)
    ) {
      await refreshActiveBillSessionForCurrentContext().catch(error => {
        devWarn('[CustomerMenuSession] refresh bill after QR failed', error);
      });
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

export const getCustomerMenuSessionSnapshot = () => getSnapshot();

export const getCustomerMenuSessionContext = async () => {
  if (storeState.context?.restaurantId) {
    return storeState.context;
  }

  const persisted = await readPersistedCustomerSession();
  return persisted?.context || null;
};

export const restoreActiveBillSession = async () => {
  if (!storeState.context?.restaurantId) {
    await restoreCustomerMenuSessionSnapshot();
  }
  return refreshActiveBillSessionForCurrentContext();
};

export const setCustomerBillSession = async (
  fields: CustomerBillSessionFields,
) => {
  await ensureCustomerGuestSessionId();
  applyBillFieldsToState({
    ...fields,
    guestSessionId: fields.guestSessionId || storeState.guestSessionId,
  });
  storeState.sessionVersion += 1;
  if (storeState.context) {
    await persistCustomerSession(storeState.context);
  }
  emitChange();
  return getSnapshot();
};

export const syncCustomerBillSessionFromOrder = async (
  order: Pick<RestaurantOrder, 'billSessionId' | 'guestSessionId' | 'tableId' | 'tableNumber' | 'restaurantId' | 'branchId'> | null | undefined,
) => {
  const guestSessionId = order?.guestSessionId || (await ensureCustomerGuestSessionId());

  if (!order?.billSessionId) {
    applyBillFieldsToState({guestSessionId});
    if (storeState.context) {
      await persistCustomerSession(storeState.context);
    }
    emitChange();
    return getSnapshot();
  }

  if (
    storeState.context?.restaurantId &&
    order.restaurantId === storeState.context.restaurantId &&
    (!storeState.context.branchId || order.branchId === storeState.context.branchId)
  ) {
    const billSession = await loadCurrentBillSession({
      billSessionId: order.billSessionId,
      guestSessionId,
    }).catch(error => {
      devWarn('[CustomerMenuSession] fetch bill after order failed', error);
      return null;
    });

    if (billSession) {
      return setCustomerBillSession(billFieldsFromBillSession(billSession));
    }
  }

  return setCustomerBillSession({
    guestSessionId,
    billSessionId: order.billSessionId,
    lockedTableId: order.tableId,
    lockedTableNumber: order.tableNumber,
    billStatus: 'OPEN',
    billUpdatedAt: new Date().toISOString(),
  });
};

export const clearCustomerBillSession = async () => {
  clearBillFieldsFromState({keepGuestSession: true});
  storeState.noticeMessage = '';
  storeState.sessionVersion += 1;
  if (storeState.context) {
    await persistCustomerSession(storeState.context);
  }
  emitChange();
  return getSnapshot();
};

const enterCustomerMenuQrSession = async (qrToken: string) => {
  const cleanToken = normalizeQrToken(qrToken);

  if (activeEnterQrRequest?.token === cleanToken) {
    return activeEnterQrRequest.promise;
  }

  const promise = enterCustomerMenuQrSessionInternal(qrToken);
  activeEnterQrRequest = {token: cleanToken, promise};

  try {
    return await promise;
  } finally {
    if (activeEnterQrRequest?.promise === promise) {
      activeEnterQrRequest = null;
    }
  }
};

export const restoreCustomerMenuSession = restoreCustomerMenuSessionSnapshot;
export const enterCustomerMenuQr = enterCustomerMenuQrSession;

export const clearCustomerMenuSession = async () => {
  storeState.context = null;
  storeState.loading = false;
  storeState.hydrated = false;
  storeState.errorMessage = '';
  storeState.noticeMessage = '';
  clearBillFieldsFromState({keepGuestSession: false});
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

  const restoreBillSession = useCallback(
    () => restoreActiveBillSession(),
    [],
  );

  const enterMenuQr = useCallback(
    (qrToken: string) => enterCustomerMenuQrSession(qrToken),
    [],
  );

  const clearSession = useCallback(() => clearCustomerMenuSession(), []);
  const clearBillSession = useCallback(() => clearCustomerBillSession(), []);

  return {
    context: snapshot.context,
    loading: snapshot.loading,
    hydrated: snapshot.hydrated,
    errorMessage: snapshot.errorMessage,
    noticeMessage: snapshot.noticeMessage,
    sessionVersion: snapshot.sessionVersion,
    guestSessionId: snapshot.guestSessionId,
    billSessionId: snapshot.billSessionId,
    lockedTableId: snapshot.lockedTableId,
    lockedTableNumber: snapshot.lockedTableNumber,
    billStatus: snapshot.billStatus,
    billTotal: snapshot.billTotal,
    billUpdatedAt: snapshot.billUpdatedAt,
    hasOpenBillSession: Boolean(
      snapshot.billSessionId && isActiveCustomerBillStatus(snapshot.billStatus),
    ),
    restoreCustomerMenuSession: restoreSession,
    restoreActiveBillSession: restoreBillSession,
    enterCustomerMenuQr: enterMenuQr,
    clearCustomerMenuSession: clearSession,
    clearCustomerBillSession: clearBillSession,
  };
};
