import {useCallback, useEffect, useRef, useState} from 'react';

import {
  bootstrapRestaurantMenuRepository,
  clearCurrentCart,
  getActiveRestaurantContext,
  loadRestaurantBranches,
  loadRestaurantTables,
  loadRestaurantWorkspaces,
  resolveRestaurantMenuQrToken,
  setActiveRestaurantContext,
} from '../services/restaurantMenuRepository';
import type {
  RestaurantBranch,
  RestaurantMenuContext,
  RestaurantTable,
  RestaurantWorkspace,
} from '../services/restaurantMenuRepository';
import {
  getRestaurantAdminSession,
  updateRestaurantAdminSessionContext,
} from '../services/restaurantAdminAuthService';
import type {RestaurantAdminSession} from '../services/restaurantAdminAuthService';
import {devWarn} from '../utils/devLogger';
import {resetRestaurantCartStore} from './RestaurantCartStore';
import {resetRestaurantMenuStore} from './RestaurantMenuStore';

type RestaurantContextSnapshot = {
  context: RestaurantMenuContext | null;
  restaurants: RestaurantWorkspace[];
  branches: RestaurantBranch[];
  tables: RestaurantTable[];
  allowedRestaurantIds: string[];
  allowedBranchIds: string[];
  loading: boolean;
  hydrated: boolean;
  errorMessage: string;
  permissionMessage: string;
  contextVersion: number;
};

type HydrateOptions = {
  session?: RestaurantAdminSession | null;
  source?: RestaurantMenuContext['source'];
};

const listeners = new Set<() => void>();

const storeState: RestaurantContextSnapshot & {
  requestId: number;
} = {
  context: null,
  restaurants: [],
  branches: [],
  tables: [],
  allowedRestaurantIds: [],
  allowedBranchIds: [],
  loading: false,
  hydrated: false,
  errorMessage: '',
  permissionMessage: '',
  contextVersion: 0,
  requestId: 0,
};

const getSnapshot = (): RestaurantContextSnapshot => ({
  context: storeState.context,
  restaurants: storeState.restaurants,
  branches: storeState.branches,
  tables: storeState.tables,
  allowedRestaurantIds: storeState.allowedRestaurantIds,
  loading: storeState.loading,
  hydrated: storeState.hydrated,
  errorMessage: storeState.errorMessage,
  permissionMessage: storeState.permissionMessage,
  contextVersion: storeState.contextVersion,
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

const normaliseIdList = (ids: Array<string | undefined>) => {
  return ids.map(id => String(id || '').trim()).filter(Boolean);
};

const resolveAllowedRestaurantIds = (
  session: RestaurantAdminSession | null | undefined,
  restaurants: RestaurantWorkspace[],
) => {
  if (!session) {
    return restaurants.map(restaurant => restaurant.id);
  }

  const sessionRestaurantIds = normaliseIdList([
    ...(session.restaurantIds || []),
    session.activeRestaurantId,
  ]);

  if (sessionRestaurantIds.length > 0) {
    return sessionRestaurantIds;
  }

  if (session.provider === 'api') {
    return restaurants.map(restaurant => restaurant.id);
  }

  if (session.role === 'OWNER') {
    // Local accounts without explicit restaurantIds can still manage all
    // workspaces, but seeded accounts such as haidilao/staff stay isolated.
    return restaurants.map(restaurant => restaurant.id);
  }

  return restaurants.map(restaurant => restaurant.id);
};

const resolveAllowedBranchIds = (
  session: RestaurantAdminSession | null | undefined,
  branches: RestaurantBranch[],
) => {
  const sessionBranchIds = normaliseIdList([
    ...(session?.branchIds || []),
    session?.activeBranchId,
  ]);

  if (sessionBranchIds.length === 0) {
    return [] as string[];
  }

  const branchIdsInRestaurant = new Set(branches.map(branch => branch.id));
  return sessionBranchIds.filter(branchId => branchIdsInRestaurant.has(branchId));
};

const pickAllowedBranchId = ({
  currentBranchId,
  branches,
  allowedBranchIds,
}: {
  currentBranchId?: string;
  branches: RestaurantBranch[];
  allowedBranchIds: string[];
}) => {
  if (allowedBranchIds.length > 0) {
    if (currentBranchId && allowedBranchIds.includes(currentBranchId)) {
      return currentBranchId;
    }
    return allowedBranchIds[0];
  }

  if (currentBranchId && branches.some(branch => branch.id === currentBranchId)) {
    return currentBranchId;
  }

  return branches[0]?.id;
};

const filterBranchesByScope = (
  branches: RestaurantBranch[],
  allowedBranchIds: string[],
) => {
  if (allowedBranchIds.length === 0) {
    return branches;
  }
  return branches.filter(branch => allowedBranchIds.includes(branch.id));
};

const filterTablesByScope = (
  tables: RestaurantTable[],
  allowedBranchIds: string[],
  branchId?: string,
) => {
  if (allowedBranchIds.length > 0) {
    return tables.filter(table =>
      table.branchId ? allowedBranchIds.includes(table.branchId) : false,
    );
  }

  return branchId ? tables.filter(table => table.branchId === branchId) : tables;
};

const applySnapshot = ({
  context,
  restaurants,
  branches,
  tables,
  allowedRestaurantIds,
  allowedBranchIds = [],
  permissionMessage = '',
  errorMessage = '',
}: {
  context: RestaurantMenuContext;
  restaurants: RestaurantWorkspace[];
  branches: RestaurantBranch[];
  tables: RestaurantTable[];
  allowedRestaurantIds: string[];
  allowedBranchIds?: string[];
  permissionMessage?: string;
  errorMessage?: string;
}) => {
  storeState.context = context;
  storeState.restaurants = restaurants;
  storeState.branches = branches;
  storeState.tables = tables;
  storeState.allowedRestaurantIds = allowedRestaurantIds;
  storeState.allowedBranchIds = allowedBranchIds;
  storeState.permissionMessage = permissionMessage;
  storeState.errorMessage = errorMessage;
  storeState.hydrated = true;
  storeState.contextVersion += 1;
  emitChange();
};

const resetScopedStores = () => {
  resetRestaurantMenuStore();
  resetRestaurantCartStore();
};

const hydrateRestaurantContextSnapshot = async (
  options: HydrateOptions = {},
) => {
  const requestId = storeState.requestId + 1;
  storeState.requestId = requestId;
  setLoading(true);

  try {
    await bootstrapRestaurantMenuRepository();
    const session =
      options.session === undefined
        ? await getRestaurantAdminSession()
        : options.session;
    const restaurants = await loadRestaurantWorkspaces();
    const allowedRestaurantIds = resolveAllowedRestaurantIds(session, restaurants);
    let context = await getActiveRestaurantContext();
    let permissionMessage = '';

    if (
      session &&
      allowedRestaurantIds.length > 0 &&
      allowedRestaurantIds.indexOf(context.restaurantId) < 0
    ) {
      const fallbackRestaurantId = allowedRestaurantIds[0];
      context = await setActiveRestaurantContext({
        restaurantId: fallbackRestaurantId,
        branchId: undefined,
        tableId: undefined,
        source: options.source || 'admin',
        role: session.role,
        allowedRestaurantIds,
      });
      resetScopedStores();
      permissionMessage = 'Đã chuyển về nhà hàng mà tài khoản hiện tại có quyền.';
    } else if (session) {
      context = await setActiveRestaurantContext({
        restaurantId: context.restaurantId,
        branchId: context.branchId,
        tableId: context.tableId,
        source: options.source || 'admin',
        role: session.role,
        allowedRestaurantIds,
      });
    }

    const [allBranches, allTables] = await Promise.all([
      loadRestaurantBranches(context.restaurantId),
      loadRestaurantTables(context.restaurantId),
    ]);
    const allowedBranchIds = resolveAllowedBranchIds(session, allBranches);
    const nextBranchId = pickAllowedBranchId({
      currentBranchId: context.branchId,
      branches: allBranches,
      allowedBranchIds,
    });

    if (session && nextBranchId !== context.branchId) {
      context = await setActiveRestaurantContext({
        restaurantId: context.restaurantId,
        branchId: nextBranchId,
        tableId: undefined,
        tableNumber: undefined,
        qrCodeToken: undefined,
        menuQrToken: undefined,
        source: options.source || 'admin',
        role: session.role,
        allowedRestaurantIds,
      });
      permissionMessage = permissionMessage ||
        'Đã chuyển về chi nhánh mà tài khoản hiện tại có quyền.';
    }

    if (requestId !== storeState.requestId) {
      return getSnapshot();
    }

    const branches = filterBranchesByScope(allBranches, allowedBranchIds);
    const tables = filterTablesByScope(allTables, allowedBranchIds, context.branchId);

    applySnapshot({
      context,
      restaurants,
      branches,
      tables,
      allowedRestaurantIds,
      allowedBranchIds,
      permissionMessage,
    });

    return getSnapshot();
  } catch (error) {
    devWarn('[RestaurantContext] hydrate failed', error);

    if (requestId === storeState.requestId) {
      storeState.errorMessage =
        'Không thể tải ngữ cảnh nhà hàng/chi nhánh. Vui lòng thử lại.';
      storeState.hydrated = true;
      storeState.contextVersion += 1;
      emitChange();
    }

    return getSnapshot();
  } finally {
    if (requestId === storeState.requestId) {
      setLoading(false);
    }
  }
};

const switchRestaurantContext = async (restaurantId: string) => {
  const cleanRestaurantId = String(restaurantId || '').trim();
  if (!cleanRestaurantId) {
    throw new Error('Thiếu restaurantId để chuyển nhà hàng.');
  }

  const session = await getRestaurantAdminSession();
  const restaurants = await loadRestaurantWorkspaces();
  const allowedRestaurantIds = resolveAllowedRestaurantIds(session, restaurants);

  if (allowedRestaurantIds.indexOf(cleanRestaurantId) < 0) {
    const message = 'Tài khoản hiện tại không có quyền truy cập nhà hàng này.';
    storeState.permissionMessage = message;
    emitChange();
    throw new Error(message);
  }

  try {
    await clearCurrentCart();
  } catch (error) {
    devWarn('[RestaurantContext] clear old cart before restaurant switch failed', error);
  }

  const allBranches = await loadRestaurantBranches(cleanRestaurantId);
  const allowedBranchIds = resolveAllowedBranchIds(session, allBranches);
  const nextBranchId = pickAllowedBranchId({
    currentBranchId: session?.activeBranchId,
    branches: allBranches,
    allowedBranchIds,
  });

  resetScopedStores();
  const context = await setActiveRestaurantContext({
    restaurantId: cleanRestaurantId,
    branchId: nextBranchId,
    tableId: undefined,
    tableNumber: undefined,
    qrCodeToken: undefined,
    menuQrToken: undefined,
    source: 'admin',
    role: session?.role,
    allowedRestaurantIds,
  });

  try {
    await clearCurrentCart();
  } catch (error) {
    devWarn('[RestaurantContext] clear new cart after restaurant switch failed', error);
  }

  const allTables = await loadRestaurantTables(context.restaurantId);
  const branches = filterBranchesByScope(allBranches, allowedBranchIds);
  const tables = filterTablesByScope(allTables, allowedBranchIds, context.branchId);
  await updateRestaurantAdminSessionContext({
    restaurantId: context.restaurantId,
    restaurantName: context.restaurantName,
    branchId: context.branchId,
  });

  applySnapshot({
    context,
    restaurants,
    branches,
    tables,
    allowedRestaurantIds,
    allowedBranchIds,
  });

  return getSnapshot();
};

const switchBranchContext = async (branchId: string) => {
  const cleanBranchId = String(branchId || '').trim();
  const currentContext = storeState.context || (await getActiveRestaurantContext());

  if (!currentContext.restaurantId) {
    throw new Error('Thiếu restaurantId trước khi chuyển chi nhánh.');
  }

  const session = await getRestaurantAdminSession();
  const allBranches = await loadRestaurantBranches(currentContext.restaurantId);
  const allowedBranchIds = resolveAllowedBranchIds(session, allBranches);
  const targetBranch = allBranches.find(branch => branch.id === cleanBranchId);

  if (!targetBranch) {
    const message = 'Chi nhánh không thuộc nhà hàng hiện tại.';
    storeState.permissionMessage = message;
    emitChange();
    throw new Error(message);
  }

  if (allowedBranchIds.length > 0 && !allowedBranchIds.includes(targetBranch.id)) {
    const message = 'Tài khoản hiện tại không có quyền truy cập chi nhánh này.';
    storeState.permissionMessage = message;
    emitChange();
    throw new Error(message);
  }

  try {
    await clearCurrentCart();
  } catch (error) {
    devWarn('[RestaurantContext] clear cart before branch switch failed', error);
  }

  resetScopedStores();
  const context = await setActiveRestaurantContext({
    restaurantId: currentContext.restaurantId,
    branchId: targetBranch.id,
    tableId: undefined,
    tableNumber: undefined,
    qrCodeToken: undefined,
    menuQrToken: undefined,
    source: 'admin',
    role: currentContext.role,
    allowedRestaurantIds: currentContext.allowedRestaurantIds,
  });
  const allTables = await loadRestaurantTables(context.restaurantId);
  const branches = filterBranchesByScope(allBranches, allowedBranchIds);
  const tables = filterTablesByScope(allTables, allowedBranchIds, context.branchId);
  await updateRestaurantAdminSessionContext({
    restaurantId: context.restaurantId,
    restaurantName: context.restaurantName,
    branchId: context.branchId,
  });

  applySnapshot({
    context,
    restaurants: storeState.restaurants,
    branches,
    tables,
    allowedRestaurantIds: storeState.allowedRestaurantIds,
    allowedBranchIds,
  });

  return getSnapshot();
};

const enterCustomerMenuQrContext = async (qrToken: string) => {
  const cleanToken = String(qrToken || '').trim();
  const requestId = storeState.requestId + 1;
  storeState.requestId = requestId;
  setLoading(true);

  if (!cleanToken) {
    storeState.errorMessage = 'Thiếu mã QR menu. Vui lòng quét lại QR của quán/chi nhánh.';
    storeState.hydrated = true;
    storeState.contextVersion += 1;
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
      storeState.contextVersion += 1;
      emitChange();
      return getSnapshot();
    }

    const currentContext = storeState.context || (await getActiveRestaurantContext().catch(() => null));
    const contextChanged =
      !currentContext ||
      currentContext.restaurantId !== resolvedContext.restaurantId ||
      currentContext.branchId !== resolvedContext.branchId ||
      currentContext.tableId !== resolvedContext.tableId ||
      currentContext.menuQrToken !== (resolvedContext.menuQrToken || resolvedContext.qrCodeToken || cleanToken) ||
      currentContext.qrCodeToken !== resolvedContext.qrCodeToken;

    if (contextChanged) {
      try {
        await clearCurrentCart();
      } catch (error) {
        devWarn('[RestaurantContext] clear old cart before QR join failed', error);
      }
      resetScopedStores();
    }

    const context = await setActiveRestaurantContext({
      ...resolvedContext,
      qrCodeToken: resolvedContext.qrCodeToken || cleanToken,
      menuQrToken: resolvedContext.menuQrToken || resolvedContext.qrCodeToken || cleanToken,
      qrTokenScope: resolvedContext.qrTokenScope || (resolvedContext.tableId ? 'TABLE' : 'BRANCH_MENU'),
      source: 'customer',
    });

    applySnapshot({
      context,
      restaurants: context.restaurantId
        ? [
            {
              id: context.restaurantId,
              name: context.restaurantName || 'Nhà hàng',
              createdAt: '',
              updatedAt: '',
            },
          ]
        : [],
      branches: context.branchId
        ? [
            {
              id: context.branchId,
              restaurantId: context.restaurantId,
              name: context.branchName || 'Chi nhánh',
              createdAt: '',
              updatedAt: '',
            },
          ]
        : [],
      tables: context.tableId
        ? [
            {
              id: context.tableId,
              restaurantId: context.restaurantId,
              branchId: context.branchId,
              tableNumber: context.tableNumber || '',
              qrCodeToken: context.qrCodeToken || cleanToken,
              status: 'AVAILABLE' as const,
              createdAt: '',
              updatedAt: '',
            },
          ]
        : [],
      allowedRestaurantIds: [context.restaurantId],
      errorMessage: '',
      permissionMessage: '',
    });

    return getSnapshot();
  } catch (error) {
    devWarn('[RestaurantContext] QR customer join failed', error);

    if (requestId === storeState.requestId) {
      storeState.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể mở menu từ QR quán/chi nhánh. Vui lòng thử lại.';
      storeState.hydrated = true;
      storeState.contextVersion += 1;
      emitChange();
    }

    return getSnapshot();
  } finally {
    if (requestId === storeState.requestId) {
      setLoading(false);
    }
  }
};

export const resetRestaurantContextStore = (
  options: {resetScopedStores?: boolean} = {},
) => {
  storeState.context = null;
  storeState.restaurants = [];
  storeState.branches = [];
  storeState.tables = [];
  storeState.allowedRestaurantIds = [];
  storeState.allowedBranchIds = [];
  storeState.loading = false;
  storeState.hydrated = false;
  storeState.errorMessage = '';
  storeState.permissionMessage = '';
  storeState.contextVersion += 1;
  storeState.requestId += 1;

  if (options.resetScopedStores !== false) {
    resetScopedStores();
  }

  emitChange();
};

export const useRestaurantContextStore = () => {
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

  const hydrateRestaurantContext = useCallback(
    (options?: HydrateOptions) => hydrateRestaurantContextSnapshot(options),
    [],
  );

  const switchRestaurant = useCallback(
    (restaurantId: string) => switchRestaurantContext(restaurantId),
    [],
  );

  const switchBranch = useCallback(
    (branchId: string) => switchBranchContext(branchId),
    [],
  );

  const enterCustomerMenuQr = useCallback(
    (qrToken: string) => enterCustomerMenuQrContext(qrToken),
    [],
  );

  const enterCustomerTable = useCallback(
    (qrToken: string) => enterCustomerMenuQrContext(qrToken),
    [],
  );

  return {
    context: snapshot.context,
    restaurants: snapshot.restaurants,
    branches: snapshot.branches,
    tables: snapshot.tables,
    allowedRestaurantIds: snapshot.allowedRestaurantIds,
    allowedBranchIds: snapshot.allowedBranchIds,
    loading: snapshot.loading,
    hydrated: snapshot.hydrated,
    errorMessage: snapshot.errorMessage,
    permissionMessage: snapshot.permissionMessage,
    contextVersion: snapshot.contextVersion,
    hydrateRestaurantContext,
    enterCustomerMenuQr,
    enterCustomerTable,
    switchRestaurant,
    switchBranch,
  };
};
