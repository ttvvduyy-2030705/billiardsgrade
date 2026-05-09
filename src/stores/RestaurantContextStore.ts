import {useCallback, useEffect, useRef, useState} from 'react';

import {
  bootstrapRestaurantMenuRepository,
  clearCurrentCart,
  getActiveRestaurantContext,
  loadRestaurantBranches,
  loadRestaurantTables,
  loadRestaurantWorkspaces,
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

  if (session.role === 'OWNER') {
    // Local batch-11 demo treats OWNER as workspace owner so the admin can
    // switch restaurants to prove isolation. API mode should return exact
    // access rules from backend in session.restaurantIds later.
    return restaurants.map(restaurant => restaurant.id);
  }

  const ids = normaliseIdList([
    ...(session.restaurantIds || []),
    session.activeRestaurantId,
  ]);
  return ids.length > 0 ? ids : restaurants.map(restaurant => restaurant.id);
};

const applySnapshot = ({
  context,
  restaurants,
  branches,
  tables,
  allowedRestaurantIds,
  permissionMessage = '',
  errorMessage = '',
}: {
  context: RestaurantMenuContext;
  restaurants: RestaurantWorkspace[];
  branches: RestaurantBranch[];
  tables: RestaurantTable[];
  allowedRestaurantIds: string[];
  permissionMessage?: string;
  errorMessage?: string;
}) => {
  storeState.context = context;
  storeState.restaurants = restaurants;
  storeState.branches = branches;
  storeState.tables = tables;
  storeState.allowedRestaurantIds = allowedRestaurantIds;
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

    const [branches, tables] = await Promise.all([
      loadRestaurantBranches(context.restaurantId),
      loadRestaurantTables(context.restaurantId),
    ]);

    if (requestId !== storeState.requestId) {
      return getSnapshot();
    }

    applySnapshot({
      context,
      restaurants,
      branches,
      tables,
      allowedRestaurantIds,
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

  resetScopedStores();
  const context = await setActiveRestaurantContext({
    restaurantId: cleanRestaurantId,
    branchId: undefined,
    tableId: undefined,
    tableNumber: undefined,
    qrCodeToken: undefined,
    source: 'admin',
    role: session?.role,
    allowedRestaurantIds,
  });

  try {
    await clearCurrentCart();
  } catch (error) {
    devWarn('[RestaurantContext] clear new cart after restaurant switch failed', error);
  }

  const [branches, tables] = await Promise.all([
    loadRestaurantBranches(context.restaurantId),
    loadRestaurantTables(context.restaurantId),
  ]);
  await updateRestaurantAdminSessionContext({
    restaurantId: context.restaurantId,
    restaurantName: context.restaurantName,
  });

  applySnapshot({
    context,
    restaurants,
    branches,
    tables,
    allowedRestaurantIds,
  });

  return getSnapshot();
};

const switchBranchContext = async (branchId: string) => {
  const cleanBranchId = String(branchId || '').trim();
  const currentContext = storeState.context || (await getActiveRestaurantContext());

  if (!currentContext.restaurantId) {
    throw new Error('Thiếu restaurantId trước khi chuyển chi nhánh.');
  }

  const branches = await loadRestaurantBranches(currentContext.restaurantId);
  const targetBranch = branches.find(branch => branch.id === cleanBranchId);

  if (!targetBranch) {
    const message = 'Chi nhánh không thuộc nhà hàng hiện tại.';
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
    source: currentContext.source || 'admin',
    role: currentContext.role,
    allowedRestaurantIds: currentContext.allowedRestaurantIds,
  });
  const tables = await loadRestaurantTables(context.restaurantId);

  applySnapshot({
    context,
    restaurants: storeState.restaurants,
    branches,
    tables,
    allowedRestaurantIds: storeState.allowedRestaurantIds,
  });

  return getSnapshot();
};

export const resetRestaurantContextStore = () => {
  storeState.context = null;
  storeState.restaurants = [];
  storeState.branches = [];
  storeState.tables = [];
  storeState.allowedRestaurantIds = [];
  storeState.loading = false;
  storeState.hydrated = false;
  storeState.errorMessage = '';
  storeState.permissionMessage = '';
  storeState.contextVersion += 1;
  storeState.requestId += 1;
  resetScopedStores();
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

  return {
    context: snapshot.context,
    restaurants: snapshot.restaurants,
    branches: snapshot.branches,
    tables: snapshot.tables,
    allowedRestaurantIds: snapshot.allowedRestaurantIds,
    loading: snapshot.loading,
    hydrated: snapshot.hydrated,
    errorMessage: snapshot.errorMessage,
    permissionMessage: snapshot.permissionMessage,
    contextVersion: snapshot.contextVersion,
    hydrateRestaurantContext,
    switchRestaurant,
    switchBranch,
  };
};
