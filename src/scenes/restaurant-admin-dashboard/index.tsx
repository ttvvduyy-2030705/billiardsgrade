import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  NativeModules,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View as RNView,
} from 'react-native';

import images from 'assets';
import Image from 'components/Image';
import {screens} from 'scenes/screens';
import {devWarn} from 'utils/devLogger';
import {
  getScoreMenuErrorMessage,
  isAuthExpiredError,
  logScoreMenuError,
} from 'utils/scoremenuErrors';
import {
  AdminBillSession,
  AdminBillSessionStatus,
  AdminOrder,
  AdminOrderFilter,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
  AdminRestaurantTable,
  closeAdminBillSession,
  deleteAdminMenuCategory,
  deleteAdminMenuItem,
  deleteAdminTable,
  loadAdminBillSessions,
  loadAdminOrderDashboard,
  loadAdminTables,
  loadRestaurantAdminData,
  loadRestaurantAdminMenuData,
  saveAdminMenuCategory,
  saveAdminMenuItem,
  uploadAdminMenuImage,
  saveAdminBranchQr,
  saveAdminRestaurantName,
  saveAdminTable,
  syncAdminTableCount,
  transferAdminBillSessionTable,
  updateAdminBillSessionPayment,
  updateAdminOrderPaymentStatus,
  updateAdminOrderStatus,
} from 'services/restaurantAdminStore';
import {
  clearRestaurantAdminSession,
  getRestaurantAdminSession,
} from '../../services/restaurantAdminAuthService';
import {
  resetRestaurantContextStore,
  useRestaurantContextStore,
} from '../../stores/RestaurantContextStore';
import type {
  MenuCategory,
  RestaurantBranch,
  RestaurantMenuItem,
} from 'services/restaurantMenuRepository';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {Navigation} from 'types/navigation';
import type {AppTranslate} from 'utils/appI18n';
import {useAppTranslation} from 'utils/appI18n';

import RNText from './components/AdminText';
import AdminMenuManagementScreen from './components/AdminMenuManagementScreen';
import AdminOrdersScreen from './components/AdminOrdersScreen';
import AdminTablesScreen from './components/AdminTablesScreen';
import {AdminDashboardTab} from './components/AdminSidebar';
import createStyles from './styles';

type Props = Navigation & {
  adminUsername?: string;
  initialAdminTab?: AdminDashboardTab;
  adminPageMode?: 'home' | 'single';
  adminPageTitle?: string;
};

type OrderFilter = AdminOrderFilter;
type OrderSyncStatus = 'idle' | 'syncing' | 'online' | 'error' | 'paused';

let adminDashboardActiveTabSession: AdminDashboardTab = 'orders';

type AdminSettingsDraftSession = {
  restaurantId: string;
  restaurantNameDraft: string;
  tableCountDraft: string;
  restaurantNameDirty: boolean;
  tableCountDirty: boolean;
};

let adminSettingsDraftSession: AdminSettingsDraftSession = {
  restaurantId: '',
  restaurantNameDraft: '',
  tableCountDraft: '',
  restaurantNameDirty: false,
  tableCountDirty: false,
};

type AdminDashboardMenuSnapshot = {
  categories: MenuCategory[];
  menuItems: RestaurantMenuItem[];
  updatedAt: number;
};

let adminDashboardMenuSnapshot: AdminDashboardMenuSnapshot = {
  categories: [],
  menuItems: [],
  updatedAt: 0,
};

const ADMIN_SESSION_CHECK_TIMEOUT_MS = 2500;
const ADMIN_ORDER_POLL_INTERVAL_MS = 3000;

const AdminSettingsInputModule =
  Platform.OS === 'android' ? NativeModules.CartImmersiveModule : undefined;

const getAdminTabLabel = (tab: AdminDashboardTab, t: AppTranslate) => {
  switch (tab) {
    case 'orders':
      return t('restaurantAdmin.orders');
    case 'menu':
      return t('restaurantAdmin.menuManagement');
    case 'tables':
      return t('restaurantAdmin.qr');
    default:
      return t('restaurantAdmin.orders');
  }
};

const getAdminTabDescription = (tab: AdminDashboardTab, t: AppTranslate) => {
  switch (tab) {
    case 'orders':
      return t('restaurantAdmin.ordersDescription');
    case 'menu':
      return t('restaurantAdmin.menuDescription');
    case 'tables':
      return t('restaurantAdmin.qrDescription');
    default:
      return '';
  }
};

const getAdminTabIcon = (tab: AdminDashboardTab, t: AppTranslate) => {
  switch (tab) {
    case 'orders':
      return t('restaurantAdmin.ordersIcon');
    case 'menu':
      return t('restaurantAdmin.menuIcon');
    case 'tables':
      return t('restaurantAdmin.qrIcon');
    default:
      return t('restaurantAdmin.ordersIcon');
  }
};

const getVisibleAdminTablesForBranch = (
  tables: AdminRestaurantTable[],
  branchId?: string,
) => {
  return tables.filter(table => {
    const sameBranch = branchId
      ? !table.branchId || table.branchId === branchId
      : true;
    return sameBranch && table.status !== 'HIDDEN';
  });
};

const resolvePositiveInteger = (value: string) => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue) {
    return undefined;
  }

  const parsed = Number(cleanValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  fallback: T,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>(resolve => {
        timeoutId = setTimeout(
          () => resolve(fallback),
          ADMIN_SESSION_CHECK_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const RestaurantAdminDashboardScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {adaptive, design} = useDesignSystem();
  const isWide = adaptive.width >= 900;
  const styles = useMemo(
    () => createStyles({design, isWide}),
    [design, isWide],
  );
  const t = useAppTranslation();
  const navigate = props.navigate;
  const replace = props.replace;
  const reset = props.reset;
  const isFocused = props.isFocused;
  const addListener = props.addListener;
  const routeAdminUsername = String(props.adminUsername || '').trim();
  const singlePageMode = props.adminPageMode === 'single';
  const initialAdminTab = props.initialAdminTab || 'orders';
  const headerTitle = singlePageMode
    ? props.adminPageTitle || getAdminTabLabel(initialAdminTab, t)
    : t('restaurantAdmin.dashboardTitle');

  const [activeTab, setActiveTabState] = useState<AdminDashboardTab>(() =>
    singlePageMode ? initialAdminTab : adminDashboardActiveTabSession,
  );
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const latestOrderIdsRef = useRef<Set<string>>(new Set());
  const orderPollingInFlightRef = useRef(false);
  const loggingOutRef = useRef(false);
  const isMountedRef = useRef(false);
  const screenFocusedRef = useRef(true);
  const sessionUsernameRef = useRef('');
  const [screenFocused, setScreenFocused] = useState(() =>
    typeof isFocused === 'function' ? isFocused() : true,
  );
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [billSessions, setBillSessions] = useState<AdminBillSession[]>([]);
  const [menuItems, setMenuItemsState] = useState<RestaurantMenuItem[]>(
    () => adminDashboardMenuSnapshot.menuItems,
  );
  const [categories, setCategoriesState] = useState<MenuCategory[]>(
    () => adminDashboardMenuSnapshot.categories,
  );
  const [tables, setTables] = useState<AdminRestaurantTable[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecking, setAuthChecking] = useState(() => !routeAdminUsername);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [sessionUsername, setSessionUsername] = useState(routeAdminUsername);
  const setMenuItems = useCallback((nextItems: RestaurantMenuItem[]) => {
    adminDashboardMenuSnapshot = {
      ...adminDashboardMenuSnapshot,
      menuItems: nextItems,
      updatedAt: Date.now(),
    };
    setMenuItemsState(nextItems);
  }, []);
  const setCategories = useCallback((nextCategories: MenuCategory[]) => {
    adminDashboardMenuSnapshot = {
      ...adminDashboardMenuSnapshot,
      categories: nextCategories,
      updatedAt: Date.now(),
    };
    setCategoriesState(nextCategories);
  }, []);
  const applyMenuSnapshot = useCallback(
    (
      nextCategories: MenuCategory[],
      nextMenuItems: RestaurantMenuItem[],
      options: {preserveExistingOnEmpty?: boolean} = {},
    ) => {
      const preserveExistingOnEmpty = Boolean(options.preserveExistingOnEmpty);
      const cachedCategories = adminDashboardMenuSnapshot.categories;
      const cachedMenuItems = adminDashboardMenuSnapshot.menuItems;
      const categoriesSnapshot =
        nextCategories.length > 0 ||
        !preserveExistingOnEmpty ||
        cachedCategories.length === 0
          ? nextCategories
          : cachedCategories;
      const menuItemsSnapshot =
        nextMenuItems.length > 0 ||
        !preserveExistingOnEmpty ||
        cachedMenuItems.length === 0
          ? nextMenuItems
          : cachedMenuItems;

      adminDashboardMenuSnapshot = {
        categories: categoriesSnapshot,
        menuItems: menuItemsSnapshot,
        updatedAt: Date.now(),
      };
      setCategoriesState(categoriesSnapshot);
      setMenuItemsState(menuItemsSnapshot);

      return {
        categories: categoriesSnapshot,
        menuItems: menuItemsSnapshot,
      };
    },
    [],
  );
  const contextSwitching = false;
  const [restaurantNameDraft, setRestaurantNameDraftState] = useState(
    adminSettingsDraftSession.restaurantNameDraft,
  );
  const [tableCountDraft, setTableCountDraftState] = useState(
    adminSettingsDraftSession.tableCountDraft,
  );
  const [restaurantNameMessage, setRestaurantNameMessage] = useState('');
  const [savingRestaurantName, setSavingRestaurantName] = useState(false);
  const settingsInputFocusedRef = useRef(false);
  const restaurantNameDraftRef = useRef(
    adminSettingsDraftSession.restaurantNameDraft,
  );
  const tableCountDraftRef = useRef(adminSettingsDraftSession.tableCountDraft);
  const restaurantNameDirtyRef = useRef(
    adminSettingsDraftSession.restaurantNameDirty,
  );
  const tableCountDirtyRef = useRef(adminSettingsDraftSession.tableCountDirty);
  const dashboardInitialLoadKeyRef = useRef('');
  const [orderSyncStatus, setOrderSyncStatus] =
    useState<OrderSyncStatus>('idle');
  const [lastOrderSyncAt, setLastOrderSyncAt] = useState('');
  const [newOrderNotice, setNewOrderNotice] = useState('');
  const {
    context,
    branches,
    loading: contextLoading,
    errorMessage: contextErrorMessage,
    permissionMessage,
    hydrateRestaurantContext,
  } = useRestaurantContextStore();

  const configuredTableCount = useMemo(
    () => getVisibleAdminTablesForBranch(tables, context?.branchId).length,
    [context?.branchId, tables],
  );
  const pendingTableCount = useMemo(() => {
    if (!tableCountDirtyRef.current) {
      return undefined;
    }

    return resolvePositiveInteger(tableCountDraft);
  }, [tableCountDraft]);

  const persistAdminSettingsDraft = useCallback(
    (patch: Partial<AdminSettingsDraftSession> = {}) => {
      const restaurantId =
        patch.restaurantId ??
        context?.restaurantId ??
        adminSettingsDraftSession.restaurantId ??
        '';

      adminSettingsDraftSession = {
        restaurantNameDraft: restaurantNameDraftRef.current,
        tableCountDraft: tableCountDraftRef.current,
        restaurantNameDirty: restaurantNameDirtyRef.current,
        tableCountDirty: tableCountDirtyRef.current,
        ...patch,
        restaurantId,
      };
    },
    [context?.restaurantId],
  );

  const setRestaurantNameDraft = useCallback(
    (
      nextValue: string,
      options: {dirty?: boolean; restaurantId?: string} = {},
    ) => {
      restaurantNameDraftRef.current = nextValue;
      if (typeof options.dirty === 'boolean') {
        restaurantNameDirtyRef.current = options.dirty;
      }
      setRestaurantNameDraftState(nextValue);
      persistAdminSettingsDraft({
        restaurantId: options.restaurantId,
        restaurantNameDraft: nextValue,
        restaurantNameDirty: restaurantNameDirtyRef.current,
      });
    },
    [persistAdminSettingsDraft],
  );

  const setTableCountDraft = useCallback(
    (
      nextValue: string,
      options: {dirty?: boolean; restaurantId?: string} = {},
    ) => {
      tableCountDraftRef.current = nextValue;
      if (typeof options.dirty === 'boolean') {
        tableCountDirtyRef.current = options.dirty;
      }
      setTableCountDraftState(nextValue);
      persistAdminSettingsDraft({
        restaurantId: options.restaurantId,
        tableCountDraft: nextValue,
        tableCountDirty: tableCountDirtyRef.current,
      });
    },
    [persistAdminSettingsDraft],
  );

  useEffect(() => {
    if (settingsInputFocusedRef.current || savingRestaurantName) {
      return;
    }

    const restaurantId = context?.restaurantId || '';

    if (
      !restaurantId &&
      adminSettingsDraftSession.restaurantId &&
      restaurantNameDirtyRef.current
    ) {
      return;
    }

    const cachedForCurrentRestaurant =
      Boolean(restaurantId) &&
      adminSettingsDraftSession.restaurantId === restaurantId;

    if (cachedForCurrentRestaurant && restaurantNameDirtyRef.current) {
      if (
        restaurantNameDraft !== adminSettingsDraftSession.restaurantNameDraft
      ) {
        setRestaurantNameDraftState(
          adminSettingsDraftSession.restaurantNameDraft,
        );
        restaurantNameDraftRef.current =
          adminSettingsDraftSession.restaurantNameDraft;
      }
      return;
    }

    restaurantNameDirtyRef.current = false;
    setRestaurantNameDraft(context?.restaurantName || '', {
      dirty: false,
      restaurantId,
    });
    setRestaurantNameMessage('');
  }, [
    context?.restaurantId,
    context?.restaurantName,
    restaurantNameDraft,
    savingRestaurantName,
    setRestaurantNameDraft,
  ]);

  useEffect(() => {
    if (settingsInputFocusedRef.current || savingRestaurantName) {
      return;
    }

    const restaurantId = context?.restaurantId || '';

    if (
      !restaurantId &&
      adminSettingsDraftSession.restaurantId &&
      tableCountDirtyRef.current
    ) {
      return;
    }

    const cachedForCurrentRestaurant =
      Boolean(restaurantId) &&
      adminSettingsDraftSession.restaurantId === restaurantId;

    if (cachedForCurrentRestaurant && tableCountDirtyRef.current) {
      if (tableCountDraft !== adminSettingsDraftSession.tableCountDraft) {
        setTableCountDraftState(adminSettingsDraftSession.tableCountDraft);
        tableCountDraftRef.current = adminSettingsDraftSession.tableCountDraft;
      }
      return;
    }

    const activeTables = tables.filter(table => {
      const sameBranch = context?.branchId
        ? !table.branchId || table.branchId === context.branchId
        : true;
      return sameBranch && table.status !== 'HIDDEN';
    });
    tableCountDirtyRef.current = false;
    setTableCountDraft(
      activeTables.length > 0 ? String(activeTables.length) : '',
      {
        dirty: false,
        restaurantId,
      },
    );
  }, [
    context?.branchId,
    context?.restaurantId,
    savingRestaurantName,
    setTableCountDraft,
    tableCountDraft,
    tables,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    screenFocusedRef.current =
      typeof isFocused === 'function' ? isFocused() : true;

    return () => {
      isMountedRef.current = false;
      screenFocusedRef.current = false;
      orderPollingInFlightRef.current = false;
    };
  }, [isFocused]);

  useEffect(() => {
    sessionUsernameRef.current = sessionUsername;
  }, [sessionUsername]);

  useEffect(() => {
    const setFocusedState = (focused: boolean) => {
      screenFocusedRef.current = focused;
      setScreenFocused(focused);

      if (!focused) {
        setOrderSyncStatus('paused');
      }
    };

    setFocusedState(typeof isFocused === 'function' ? isFocused() : true);

    if (typeof addListener !== 'function') {
      return undefined;
    }

    const unsubscribeFocus = addListener('focus', () => setFocusedState(true));
    const unsubscribeBlur = addListener('blur', () => setFocusedState(false));

    return () => {
      if (typeof unsubscribeFocus === 'function') {
        unsubscribeFocus();
      }
      if (typeof unsubscribeBlur === 'function') {
        unsubscribeBlur();
      }
    };
  }, [addListener, isFocused]);

  const setActiveTab = useCallback((nextTab: AdminDashboardTab) => {
    adminDashboardActiveTabSession = nextTab;
    setActiveTabState(nextTab);
  }, []);

  useEffect(() => {
    if (singlePageMode) {
      setActiveTabState(initialAdminTab);
      adminDashboardActiveTabSession = initialAdminTab;
    }
  }, [initialAdminTab, singlePageMode]);

  useEffect(() => {
    adminDashboardActiveTabSession = activeTab;
  }, [activeTab]);

  const formatSyncTime = useCallback(() => {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  const applyOrdersSnapshot = useCallback(
    (nextOrders: AdminOrder[], options: {announceNew?: boolean} = {}) => {
      if (!isMountedRef.current || loggingOutRef.current) {
        return;
      }

      const uniqueOrders = Array.from(
        nextOrders.reduce((map, order) => {
          if (order?.id) {
            map.set(order.id, order);
          }
          return map;
        }, new Map<string, AdminOrder>()),
      )
        .map(([, order]) => order)
        .sort((a, b) =>
          String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
        );
      const previousIds = latestOrderIdsRef.current;
      const nextIds = new Set(uniqueOrders.map(order => order.id));

      if (options.announceNew && previousIds.size > 0) {
        const newOrders = uniqueOrders.filter(
          order => !previousIds.has(order.id),
        );
        if (newOrders.length > 0) {
          setNewOrderNotice(t('restaurantAdmin.newOrdersNotice', {count: newOrders.length}));
        }
      }

      latestOrderIdsRef.current = nextIds;
      setOrders(uniqueOrders);
      setLastOrderSyncAt(formatSyncTime());
    },
    [formatSyncTime, t],
  );

  useEffect(() => {
    if (!newOrderNotice) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setNewOrderNotice('');
    }, 6500);

    return () => clearTimeout(timer);
  }, [newOrderNotice]);

  const resetSensitiveData = useCallback(() => {
    setOrders([]);
    setBillSessions([]);
    adminDashboardMenuSnapshot = {categories: [], menuItems: [], updatedAt: 0};
    setMenuItems([]);
    setCategories([]);
    setTables([]);
    setOrderFilter('ALL');
    setSessionUsername('');
    latestOrderIdsRef.current = new Set();
    orderPollingInFlightRef.current = false;
    dashboardInitialLoadKeyRef.current = '';
    setOrderSyncStatus('idle');
    setLastOrderSyncAt('');
    setNewOrderNotice('');
    adminDashboardActiveTabSession = 'orders';
    setActiveTabState('orders');
  }, []);

  const redirectToLogin = useCallback(() => {
    const params = {
      initialMode: 'login',
      resetAuthDraft: true,
      skipAutoSessionCheck: true,
      logoutAt: Date.now(),
    };

    if (typeof reset === 'function') {
      reset(0, [
        {
          name: screens.restaurantAdminLogin,
          params,
        },
      ]);
      return;
    }

    if (typeof replace === 'function') {
      replace({
        name: screens.restaurantAdminLogin,
        params,
      });
      return;
    }

    navigate(screens.restaurantAdminLogin, params);
  }, [navigate, replace, reset]);

  const keepAdminScreenOnAuthRefreshError = useCallback(
    (error: unknown, options: {silent?: boolean} = {}) => {
      if (!isAuthExpiredError(error)) {
        return false;
      }

      // Render/free backend may occasionally reject one of many parallel admin
      // refresh requests with 401 while the app is still holding a usable admin
      // session. Never clear the local session or reset menu/category/table state
      // from a background refresh failure. Let the user keep the current screen
      // and re-login only when they explicitly choose to.
      if (!options.silent) {
        setAuthErrorMessage(
          t('restaurantAdmin.backgroundSessionRejected'),
        );
      }
      setAuthChecking(false);
      setRefreshing(false);
      return true;
    },
    [t],
  );

  const refreshOrdersOnly = useCallback(
    async (options: {silent?: boolean; announceNew?: boolean} = {}) => {
      if (
        orderPollingInFlightRef.current ||
        loggingOutRef.current ||
        !isMountedRef.current ||
        !sessionUsernameRef.current
      ) {
        return;
      }

      orderPollingInFlightRef.current = true;
      setOrderSyncStatus('syncing');

      if (!options.silent) {
        setRefreshing(true);
      }

      try {
        const next = await loadAdminOrderDashboard();

        if (!isMountedRef.current || loggingOutRef.current) {
          return;
        }

        applyOrdersSnapshot(next.orders, {
          announceNew: options.announceNew ?? true,
        });
        setBillSessions(next.billSessions);
        setOrderSyncStatus('online');
        if (!options.silent) {
          setAuthErrorMessage('');
        }
      } catch (error) {
        if (!isMountedRef.current || loggingOutRef.current) {
          return;
        }

        logScoreMenuError(
          {
            module: 'ADMIN',
            action: 'refresh orders failed',
            restaurantId: context?.restaurantId,
            branchId: context?.branchId,
          },
          error,
        );
        setOrderSyncStatus('error');
        if (keepAdminScreenOnAuthRefreshError(error, {silent: Boolean(options.silent)})) {
          return;
        }
        if (!options.silent) {
          setAuthErrorMessage(
            getScoreMenuErrorMessage(
              error,
              t('restaurantAdmin.loadOrdersError'),
            ),
          );
        }
      } finally {
        if (!loggingOutRef.current) {
          orderPollingInFlightRef.current = false;
        }
        if (!options.silent && isMountedRef.current && !loggingOutRef.current) {
          setRefreshing(false);
        }
      }
    },
    [applyOrdersSnapshot, keepAdminScreenOnAuthRefreshError, t],
  );

  const loadData = useCallback(async () => {
    if (loggingOutRef.current) {
      return;
    }

    setAuthErrorMessage('');

    try {
      const session = await withTimeout(getRestaurantAdminSession(), null);

      if (!session) {
        resetSensitiveData();
        setAuthChecking(false);
        redirectToLogin();
        return;
      }

      setSessionUsername(session.username);
      setRefreshing(true);
      const snapshot = await hydrateRestaurantContext({
        session,
        source: 'admin',
      });

      if (!snapshot.context?.restaurantId) {
        throw new Error(
          t('restaurantAdmin.noRestaurantForAdmin'),
        );
      }

      const next = await loadRestaurantAdminData();
      applyOrdersSnapshot(next.orders, {announceNew: false});
      setOrderSyncStatus('online');
      applyMenuSnapshot(next.categories, next.menuItems, {
        preserveExistingOnEmpty:
          Date.now() - adminDashboardMenuSnapshot.updatedAt < 1000 * 60 * 2,
      });
      setTables(next.tables || []);
      setBillSessions(next.billSessions || []);
    } catch (error) {
      logScoreMenuError(
        {
          module: 'ADMIN',
          action: 'load admin dashboard data failed',
          restaurantId: context?.restaurantId,
          branchId: context?.branchId,
        },
        error,
      );
      if (keepAdminScreenOnAuthRefreshError(error)) {
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          t('restaurantAdmin.loadAdminDataError'),
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [
    applyMenuSnapshot,
    applyOrdersSnapshot,
    hydrateRestaurantContext,
    keepAdminScreenOnAuthRefreshError,
    redirectToLogin,
    resetSensitiveData,
    t,
  ]);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      if (loggingOutRef.current) {
        return;
      }

      try {
        const session = await withTimeout(getRestaurantAdminSession(), null);

        if (!isMounted) {
          return;
        }

        if (!session) {
          resetSensitiveData();
          setAuthChecking(false);
          redirectToLogin();
          return;
        }

        setSessionUsername(session.username);

        if (routeAdminUsername) {
          setAuthChecking(false);
          return;
        }

        const snapshot = await hydrateRestaurantContext({
          session,
          source: 'admin',
        });
        if (!snapshot.context?.restaurantId) {
          throw new Error(
            t('restaurantAdmin.noRestaurantForAdmin'),
          );
        }
        setAuthChecking(false);
      } catch (error) {
        devWarn('[RestaurantAdminDashboard] session check failed', error);

        if (!isMounted) {
          return;
        }

        if (keepAdminScreenOnAuthRefreshError(error)) {
          return;
        }
        setAuthChecking(false);
        setAuthErrorMessage(
          getScoreMenuErrorMessage(
            error,
            t('restaurantAdmin.checkAdminSessionError'),
          ),
        );
      }
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [
    applyOrdersSnapshot,
    hydrateRestaurantContext,
    keepAdminScreenOnAuthRefreshError,
    redirectToLogin,
    resetSensitiveData,
    routeAdminUsername,
  ]);

  useEffect(() => {
    if (authChecking || !sessionUsername) {
      return;
    }

    const loadKey = `${sessionUsername}:${context?.restaurantId || ''}`;
    if (dashboardInitialLoadKeyRef.current === loadKey) {
      return;
    }

    dashboardInitialLoadKeyRef.current = loadKey;
    void loadData();
  }, [authChecking, context?.restaurantId, loadData, sessionUsername]);

  useEffect(() => {
    if (
      authChecking ||
      !sessionUsername ||
      !screenFocused ||
      activeTab !== 'menu' ||
      loggingOutRef.current
    ) {
      return;
    }

    void reloadMenuData({
      categories,
      menuItems,
      preserveExistingOnEmpty: true,
    }).catch(error => {
      devWarn('[RestaurantAdminDashboard] reload menu data failed', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authChecking, screenFocused, sessionUsername]);

  useEffect(() => {
    const shouldPollOrders =
      singlePageMode &&
      activeTab === 'orders' &&
      screenFocused &&
      !authChecking &&
      Boolean(sessionUsername) &&
      !contextSwitching &&
      !loggingOutRef.current;

    if (!shouldPollOrders) {
      if (!authChecking && sessionUsername) {
        setOrderSyncStatus('paused');
      }
      return undefined;
    }

    let cancelled = false;
    const pollOrders = () => {
      if (
        cancelled ||
        loggingOutRef.current ||
        !screenFocusedRef.current ||
        !sessionUsernameRef.current
      ) {
        return;
      }

      void refreshOrdersOnly({silent: true, announceNew: true});
    };

    pollOrders();
    const interval = setInterval(pollOrders, ADMIN_ORDER_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (isMountedRef.current && !loggingOutRef.current) {
        setOrderSyncStatus(current =>
          current === 'syncing' || current === 'online' ? 'paused' : current,
        );
      }
    };
  }, [
    activeTab,
    authChecking,
    contextSwitching,
    refreshOrdersOnly,
    screenFocused,
    sessionUsername,
    singlePageMode,
  ]);

  const logout = async () => {
    if (loggingOutRef.current) {
      return;
    }

    loggingOutRef.current = true;
    orderPollingInFlightRef.current = true;
    setRefreshing(false);
    setAuthChecking(false);
    setAuthErrorMessage('');

    try {
      await clearRestaurantAdminSession();
    } catch (error) {
      devWarn('[RestaurantAdminDashboard] logout failed', error);
    } finally {
      resetSensitiveData();
      resetRestaurantContextStore({resetScopedStores: true});
      requestAnimationFrame(redirectToLogin);
    }
  };

  const reloadMenuData = async (fallback?: {
    categories?: MenuCategory[];
    menuItems?: RestaurantMenuItem[];
    preserveExistingOnEmpty?: boolean;
  }) => {
    const fallbackCategories =
      fallback?.categories ??
      (fallback?.preserveExistingOnEmpty ? categories : undefined);
    const fallbackMenuItems =
      fallback?.menuItems ??
      (fallback?.preserveExistingOnEmpty ? menuItems : undefined);

    try {
      const next = await loadRestaurantAdminMenuData();

      // Regular reloads still use the server as source of truth. For mutation
      // flows (save category/item), preserve the mutation response if the
      // immediate follow-up GET returns empty because Render is still waking up.
      return applyMenuSnapshot(next.categories, next.menuItems, {
        preserveExistingOnEmpty: Boolean(fallback?.preserveExistingOnEmpty),
      });
    } catch (error) {
      if (fallbackCategories || fallbackMenuItems) {
        applyMenuSnapshot(
          fallbackCategories || categories,
          fallbackMenuItems || menuItems,
        );
      }
      throw error;
    }
  };

  const onSaveMenuItem = async (
    input: Parameters<typeof saveAdminMenuItem>[0],
  ) => {
    const savedItems = await saveAdminMenuItem(input);
    setMenuItems(savedItems);
    const next = await reloadMenuData({
      menuItems: savedItems,
      categories,
      preserveExistingOnEmpty: true,
    });
    adminDashboardActiveTabSession = 'menu';
    setActiveTabState('menu');
    return next.menuItems;
  };

  const onDeleteMenuItem = async (itemId: string) => {
    const deletedItems = await deleteAdminMenuItem(itemId);
    setMenuItems(deletedItems);
    const next = await reloadMenuData({
      categories,
      menuItems: deletedItems,
      preserveExistingOnEmpty: false,
    });
    adminDashboardActiveTabSession = 'menu';
    setActiveTabState('menu');
    return next.menuItems;
  };

  const onUploadMenuImage = async (
    input: Parameters<typeof uploadAdminMenuImage>[0],
  ) => {
    return uploadAdminMenuImage(input);
  };

  const onSaveMenuCategory = async (
    input: Parameters<typeof saveAdminMenuCategory>[0],
  ) => {
    const result = await saveAdminMenuCategory(input);
    setCategories(result.categories);
    const next = await reloadMenuData({
      categories: result.categories,
      menuItems,
      preserveExistingOnEmpty: true,
    });
    const categoriesSnapshot =
      next.categories.length > 0 ? next.categories : result.categories;
    setCategories(categoriesSnapshot);
    adminDashboardActiveTabSession = 'menu';
    setActiveTabState('menu');
    return {...result, categories: categoriesSnapshot};
  };

  const onDeleteMenuCategory = async (
    categoryId: string,
    moveItemsToCategoryId?: string,
  ) => {
    const result = await deleteAdminMenuCategory(
      categoryId,
      moveItemsToCategoryId,
    );
    setCategories(result.categories);
    setMenuItems(result.menuItems);
    const next = await reloadMenuData({
      categories: result.categories,
      menuItems: result.menuItems,
    });
    const categoriesSnapshot = next.categories;
    const menuItemsSnapshot = next.menuItems;
    setCategories(categoriesSnapshot);
    setMenuItems(menuItemsSnapshot);
    adminDashboardActiveTabSession = 'menu';
    setActiveTabState('menu');
    return {
      ...result,
      categories: categoriesSnapshot,
      menuItems: menuItemsSnapshot,
    };
  };

  const reloadTables = async () => {
    const next = await loadRestaurantAdminData();
    setTables(next.tables || []);
    applyMenuSnapshot(next.categories, next.menuItems, {
      preserveExistingOnEmpty: true,
    });
    setBillSessions(next.billSessions || []);
    applyOrdersSnapshot(next.orders, {announceNew: false});
  };

  const onSaveTable = async (input: Parameters<typeof saveAdminTable>[0]) => {
    const nextTable = await saveAdminTable(input);
    setTables(current => {
      const existed = current.some(table => table.id === nextTable.id);
      if (existed) {
        return current.map(table =>
          table.id === nextTable.id ? nextTable : table,
        );
      }
      return [nextTable, ...current];
    });
    adminDashboardActiveTabSession = 'tables';
    setActiveTabState('tables');
    return nextTable;
  };

  const onDeleteTable = async (tableId: string) => {
    const nextTables = await deleteAdminTable(tableId);
    setTables(nextTables);
    adminDashboardActiveTabSession = 'tables';
    setActiveTabState('tables');
    return nextTables;
  };

  const onSaveBranchQr = async (
    input: Parameters<typeof saveAdminBranchQr>[0],
  ) => {
    const nextBranch = await saveAdminBranchQr(input);
    await hydrateRestaurantContext({source: 'admin'});
    adminDashboardActiveTabSession = 'tables';
    setActiveTabState('tables');
    return nextBranch;
  };

  const onChangeOrderStatus = async (
    orderId: string,
    status: AdminOrderStatus,
  ) => {
    setAuthErrorMessage('');
    try {
      const nextOrders = await updateAdminOrderStatus(orderId, status);
      const nextBillSessions = await loadAdminBillSessions();
      setBillSessions(nextBillSessions);
      applyOrdersSnapshot(nextOrders, {announceNew: false});
    } catch (error) {
      logScoreMenuError(
        {
          module: 'ORDER',
          action: 'admin update order status failed',
          restaurantId: context?.restaurantId,
          branchId: context?.branchId,
          orderId,
          extra: {status},
        },
        error,
      );
      if (keepAdminScreenOnAuthRefreshError(error)) {
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          t('restaurantAdmin.changeOrderStatusError'),
        ),
      );
    }
  };

  const onChangePaymentStatus = async (
    orderId: string,
    status: AdminPaymentStatus,
    method?: AdminPaymentMethod,
  ) => {
    setAuthErrorMessage('');
    try {
      const nextOrders = await updateAdminOrderPaymentStatus(
        orderId,
        status,
        method,
      );
      const nextBillSessions = await loadAdminBillSessions();
      setBillSessions(nextBillSessions);
      applyOrdersSnapshot(nextOrders, {announceNew: false});
    } catch (error) {
      logScoreMenuError(
        {
          module: 'ORDER',
          action: 'admin update order payment failed',
          restaurantId: context?.restaurantId,
          branchId: context?.branchId,
          orderId,
          extra: {status, method},
        },
        error,
      );
      if (keepAdminScreenOnAuthRefreshError(error)) {
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          t('restaurantAdmin.updatePaymentError'),
        ),
      );
    }
  };

  const reloadBillDashboardAfterBillMutation = async () => {
    const [nextDashboard, nextTables] = await Promise.all([
      loadAdminOrderDashboard(),
      loadAdminTables(),
    ]);
    setTables(nextTables);
    setBillSessions(nextDashboard.billSessions);
    applyOrdersSnapshot(nextDashboard.orders, {announceNew: false});
  };

  const onUpdateBillPayment = async (
    billSessionId: string,
    status: AdminBillSessionStatus,
    paymentMethod?: AdminPaymentMethod,
  ) => {
    setAuthErrorMessage('');
    try {
      await updateAdminBillSessionPayment({
        billSessionId,
        status: status === 'PAID' ? 'PAID' : 'PAYMENT_REQUESTED',
        paymentMethod,
      });
      await reloadBillDashboardAfterBillMutation();
    } catch (error) {
      logScoreMenuError(
        {
          module: 'BILL',
          action: 'admin update bill payment failed',
          restaurantId: context?.restaurantId,
          branchId: context?.branchId,
          extra: {billSessionId, status, paymentMethod},
        },
        error,
      );
      if (keepAdminScreenOnAuthRefreshError(error)) {
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          t('restaurantAdmin.updateBillPaymentError'),
        ),
      );
    }
  };

  const onCloseBill = async (billSessionId: string) => {
    setAuthErrorMessage('');
    try {
      await closeAdminBillSession({
        billSessionId,
        note: t('restaurantAdmin.closeBillNote'),
      });
      await reloadBillDashboardAfterBillMutation();
    } catch (error) {
      logScoreMenuError(
        {
          module: 'BILL',
          action: 'admin close bill failed',
          restaurantId: context?.restaurantId,
          branchId: context?.branchId,
          extra: {billSessionId},
        },
        error,
      );
      if (keepAdminScreenOnAuthRefreshError(error)) {
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          t('restaurantAdmin.closeBillError'),
        ),
      );
    }
  };

  const onTransferBillTable = async (
    billSessionId: string,
    tableId: string,
  ) => {
    setAuthErrorMessage('');
    try {
      await transferAdminBillSessionTable({
        billSessionId,
        tableId,
        reason: t('restaurantAdmin.transferBillReason'),
      });
      const [nextDashboard, nextTables] = await Promise.all([
        loadAdminOrderDashboard(),
        loadAdminTables(),
      ]);
      setTables(nextTables);
      setBillSessions(nextDashboard.billSessions);
      applyOrdersSnapshot(nextDashboard.orders, {announceNew: false});
    } catch (error) {
      logScoreMenuError(
        {
          module: 'BILL',
          action: 'admin transfer bill table failed',
          restaurantId: context?.restaurantId,
          branchId: context?.branchId,
          extra: {billSessionId, tableId},
        },
        error,
      );
      if (keepAdminScreenOnAuthRefreshError(error)) {
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          t('restaurantAdmin.transferBillError'),
        ),
      );
    }
  };

  const getPageScreenName = useCallback((tab: AdminDashboardTab) => {
    switch (tab) {
      case 'menu':
        return screens.restaurantAdminMenuManagement;
      case 'tables':
        return screens.restaurantAdminTables;
      case 'orders':
      default:
        return screens.restaurantAdminOrders;
    }
  }, []);

  const openAdminPage = useCallback(
    (tab: AdminDashboardTab) => {
      adminDashboardActiveTabSession = tab;
      navigate(getPageScreenName(tab), {
        adminUsername: sessionUsername,
      });
    },
    [getPageScreenName, navigate, sessionUsername],
  );

  const goToAdminHome = useCallback(() => {
    const params = {adminUsername: sessionUsername};

    if (typeof replace === 'function') {
      replace({
        name: screens.restaurantAdminDashboard,
        params,
      });
      return;
    }

    navigate(screens.restaurantAdminDashboard, params);
  }, [navigate, replace, sessionUsername]);

  const showNativeSettingsInput = useCallback(
    async ({
      title,
      placeholder,
      initialValue,
      keyboardType,
      source,
    }: {
      title: string;
      placeholder: string;
      initialValue: string;
      keyboardType: 'text' | 'number';
      source: string;
    }) => {
      if (Platform.OS !== 'android') {
        setRestaurantNameMessage(
          t('restaurantAdmin.nativeConfigUnsupported'),
        );
        return null;
      }

      const nativeDialog = (AdminSettingsInputModule as any)
        ?.showCartTextInputDialog;
      if (typeof nativeDialog !== 'function') {
        setRestaurantNameMessage(t('restaurantAdmin.inputOpenError'));
        return null;
      }

      settingsInputFocusedRef.current = true;
      try {
        return await nativeDialog(
          title,
          placeholder,
          initialValue,
          keyboardType,
          source,
        );
      } finally {
        requestAnimationFrame(() => {
          settingsInputFocusedRef.current = false;
        });
      }
    },
    [],
  );

  const saveRestaurantNameValue = useCallback(
    async (rawName: string) => {
      if (savingRestaurantName || contextSwitching) {
        return;
      }

      const name = String(rawName || '').trim();
      if (!name) {
        setRestaurantNameMessage(t('restaurantAdmin.enterRestaurantName'));
        return;
      }

      if (!context?.restaurantId) {
        setRestaurantNameMessage(t('restaurantAdmin.noRestaurantToSaveName'));
        return;
      }

      setSavingRestaurantName(true);
      setAuthErrorMessage('');

      try {
        const restaurant = await saveAdminRestaurantName({
          restaurantId: context.restaurantId,
          name,
        });
        setRestaurantNameDraft(restaurant.name, {
          dirty: false,
          restaurantId: context.restaurantId,
        });
        setRestaurantNameMessage(t('restaurantAdmin.restaurantNameSaved'));
        hydrateRestaurantContext({source: 'admin'}).catch(error => {
          logScoreMenuError(
            {
              module: 'ADMIN',
              action: 'soft refresh context after restaurant name save failed',
              restaurantId: context.restaurantId,
              branchId: context.branchId,
            },
            error,
          );
        });
      } catch (error) {
        logScoreMenuError(
          {
            module: 'ADMIN',
            action: 'save restaurant name from input failed',
            restaurantId: context.restaurantId,
            branchId: context.branchId,
          },
          error,
        );
        setRestaurantNameMessage(
          getScoreMenuErrorMessage(
            error,
            t('restaurantAdmin.saveRestaurantNameError'),
          ),
        );
      } finally {
        setSavingRestaurantName(false);
      }
    },
    [
      context?.branchId,
      context?.restaurantId,
      contextSwitching,
      hydrateRestaurantContext,
      savingRestaurantName,
      setRestaurantNameDraft,
    ],
  );

  const applyTableCountValue = useCallback(
    async (rawTableCount: string) => {
      if (savingRestaurantName || contextSwitching) {
        return;
      }

      const cleanTableCount = String(rawTableCount || '').replace(
        /[^0-9]/g,
        '',
      );
      const tableCount = resolvePositiveInteger(cleanTableCount);

      if (!cleanTableCount) {
        setRestaurantNameMessage(t('restaurantAdmin.clearedDraftTableCount'));
        return;
      }

      if (!tableCount || tableCount > 200) {
        setRestaurantNameMessage(t('restaurantAdmin.tableCountInvalid'));
        return;
      }

      if (!context?.restaurantId) {
        setRestaurantNameMessage(t('restaurantAdmin.noRestaurantToCreateTables'));
        return;
      }

      setSavingRestaurantName(true);
      setAuthErrorMessage('');

      try {
        const nextTables = await syncAdminTableCount(tableCount);
        setTables(nextTables);
        setTableCountDraft(String(tableCount), {
          dirty: false,
          restaurantId: context.restaurantId,
        });
        setRestaurantNameMessage(
          t('restaurantAdmin.createdTableChoices', {count: tableCount}),
        );
        hydrateRestaurantContext({source: 'admin'}).catch(error => {
          logScoreMenuError(
            {
              module: 'ADMIN',
              action: 'soft refresh context after table count save failed',
              restaurantId: context.restaurantId,
              branchId: context.branchId,
            },
            error,
          );
        });
      } catch (error) {
        logScoreMenuError(
          {
            module: 'ADMIN',
            action: 'apply table count from input failed',
            restaurantId: context.restaurantId,
            branchId: context.branchId,
          },
          error,
        );
        setRestaurantNameMessage(
          getScoreMenuErrorMessage(
            error,
            t('restaurantAdmin.createTablesError'),
          ),
        );
      } finally {
        setSavingRestaurantName(false);
      }
    },
    [
      context?.branchId,
      context?.restaurantId,
      contextSwitching,
      hydrateRestaurantContext,
      savingRestaurantName,
      setTableCountDraft,
    ],
  );

  const openRestaurantNameInput = useCallback(async () => {
    setRestaurantNameMessage('');
    const nextValue = await showNativeSettingsInput({
      title: t('restaurantAdmin.restaurantName'),
      placeholder: t('restaurantAdmin.restaurantNamePlaceholder'),
      initialValue: restaurantNameDraft,
      keyboardType: 'text',
      source: 'admin-restaurant-name',
    });

    if (typeof nextValue === 'string') {
      setRestaurantNameDraft(nextValue, {
        dirty: true,
        restaurantId: context?.restaurantId || '',
      });
      await saveRestaurantNameValue(nextValue);
    }
  }, [
    context?.restaurantId,
    restaurantNameDraft,
    saveRestaurantNameValue,
    setRestaurantNameDraft,
    showNativeSettingsInput,
  ]);

  const openTableCountInput = useCallback(async () => {
    setRestaurantNameMessage('');
    const nextValue = await showNativeSettingsInput({
      title: t('restaurantAdmin.tableCount'),
      placeholder: t('restaurantAdmin.tableCountPlaceholder'),
      initialValue: tableCountDraft,
      keyboardType: 'number',
      source: 'admin-table-count',
    });

    if (typeof nextValue === 'string') {
      const cleanValue = nextValue.replace(/[^0-9]/g, '');
      setTableCountDraft(cleanValue, {
        dirty: true,
        restaurantId: context?.restaurantId || '',
      });
      await applyTableCountValue(cleanValue);
    }
  }, [
    applyTableCountValue,
    context?.restaurantId,
    setTableCountDraft,
    showNativeSettingsInput,
    tableCountDraft,
  ]);

  const handleSettingsInputFocus = useCallback(() => {
    settingsInputFocusedRef.current = true;
  }, []);

  const handleSettingsInputBlur = useCallback(() => {
    requestAnimationFrame(() => {
      settingsInputFocusedRef.current = false;
    });
  }, []);

  const renderPageContextBar = () => {
    return (
      <RNView style={styles.pageContextBar}>
        <RNText style={styles.pageContextText}>
          {context?.restaurantName || t('restaurantAdmin.unnamedRestaurant')}
        </RNText>
      </RNView>
    );
  };

  const handleSaveRestaurantName = async () => {
    if (savingRestaurantName || contextSwitching) {
      return;
    }

    const name = restaurantNameDraftRef.current.trim();
    const cleanTableCount = tableCountDraftRef.current.trim();
    const tableCount = cleanTableCount ? Number(cleanTableCount) : undefined;

    if (!name) {
      setRestaurantNameMessage(t('restaurantAdmin.enterRestaurantName'));
      return;
    }

    if (
      cleanTableCount &&
      (!Number.isInteger(tableCount) ||
        Number(tableCount) < 1 ||
        Number(tableCount) > 200)
    ) {
      setRestaurantNameMessage(t('restaurantAdmin.tableCountInvalid'));
      return;
    }

    if (!context?.restaurantId) {
      setRestaurantNameMessage(t('restaurantAdmin.noRestaurantToSaveConfig'));
      return;
    }

    setSavingRestaurantName(true);
    setRestaurantNameMessage('');
    setAuthErrorMessage('');

    try {
      const restaurant = await saveAdminRestaurantName({
        restaurantId: context.restaurantId,
        name,
      });
      if (tableCount !== undefined) {
        const nextTables = await syncAdminTableCount(tableCount);
        setTables(nextTables);
      }
      setRestaurantNameDraft(restaurant.name, {
        dirty: false,
        restaurantId: context.restaurantId,
      });
      setTableCountDraft(
        tableCount !== undefined
          ? String(tableCount)
          : tableCountDraftRef.current,
        {
          dirty: false,
          restaurantId: context.restaurantId,
        },
      );
      setRestaurantNameMessage(
        tableCount !== undefined
          ? t('restaurantAdmin.savedNameAndTables', {count: tableCount})
          : t('restaurantAdmin.restaurantNameSaved'),
      );
      hydrateRestaurantContext({source: 'admin'}).catch(error => {
        logScoreMenuError(
          {
            module: 'ADMIN',
            action: 'soft refresh context after settings save failed',
            restaurantId: context.restaurantId,
            branchId: context.branchId,
          },
          error,
        );
      });
    } catch (error) {
      logScoreMenuError(
        {
          module: 'ADMIN',
          action: 'save restaurant settings failed',
          restaurantId: context.restaurantId,
          branchId: context.branchId,
        },
        error,
      );
      setRestaurantNameMessage(
        getScoreMenuErrorMessage(
          error,
          t('restaurantAdmin.saveConfigError'),
        ),
      );
    } finally {
      setSavingRestaurantName(false);
    }
  };

  const renderAdminHome = () => {
    const pageCards: Array<{
      tab: AdminDashboardTab;
      count: number;
      meta: string;
    }> = [
      {
        tab: 'orders',
        count: orders.length,
        meta: t('restaurantAdmin.ordersMeta', {count: orders.length}),
      },
      {
        tab: 'menu',
        count: menuItems.length,
        meta: t('restaurantAdmin.menuMeta', {itemCount: menuItems.length, categoryCount: categories.length}),
      },
      {
        tab: 'tables',
        count: configuredTableCount,
        meta:
          configuredTableCount > 0
            ? t('restaurantAdmin.qrMetaConfigured', {count: configuredTableCount})
            : pendingTableCount
              ? t('restaurantAdmin.qrMetaPending', {count: pendingTableCount})
              : t('restaurantAdmin.qrMetaMissing'),
      },
    ];

    return (
      <ScrollView
        style={styles.homeScroll}
        contentContainerStyle={styles.homeScrollBody}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor="#FFFFFF"
          />
        }
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}>
        <RNView style={styles.homeIntroCard}>
          <RNText style={styles.homeIntroEyebrow}>{t('restaurantAdmin.adminArea')}</RNText>
          <RNText style={styles.homeIntroTitle}>
            {t('restaurantAdmin.chooseArea')}
          </RNText>
          <RNText style={styles.homeIntroHint}>
            {t('restaurantAdmin.adminAreaHint')}
          </RNText>
        </RNView>

        <RNView style={styles.adminPageGrid}>
          {pageCards.map(card => (
            <Pressable
              key={card.tab}
              accessibilityRole="button"
              hitSlop={8}
              android_ripple={{color: 'rgba(255,255,255,0.08)'}}
              onPress={() => openAdminPage(card.tab)}
              style={({pressed}) => [
                styles.adminPageCard,
                pressed ? styles.sidebarItemPressed : null,
              ]}>
              <RNText style={styles.adminPageIcon}>
                {getAdminTabIcon(card.tab, t)}
              </RNText>
              <RNView style={styles.adminPageContent}>
                <RNText style={styles.adminPageTitle}>
                  {getAdminTabLabel(card.tab, t)}
                </RNText>
                <RNText style={styles.adminPageHint}>
                  {getAdminTabDescription(card.tab, t)}
                </RNText>
                <RNText style={styles.adminPageMeta}>{card.meta}</RNText>
              </RNView>
              <RNText style={styles.adminPageArrow}>{t('restaurantAdmin.openArrow')}</RNText>
            </Pressable>
          ))}
        </RNView>

        {renderWorkspaceSwitcher()}
      </ScrollView>
    );
  };

  const renderWorkspaceSwitcher = () => {
    const currentBranch =
      branches.find(branch => branch.id === context?.branchId) || branches[0];
    const currentQrToken = context?.menuQrToken || currentBranch?.menuQrToken;

    return (
      <RNView style={styles.workspacePanel}>
        <RNView style={styles.workspaceHeaderRow}>
          <RNView style={styles.workspaceTitleBlock}>
            <RNText style={styles.workspaceEyebrow}>{t('restaurantAdmin.operationContext')}</RNText>
            <RNText style={styles.workspaceTitle}>
              {context?.restaurantName || t('restaurantAdmin.restaurantNamePlaceholder')}
            </RNText>
            <RNText style={styles.workspaceHint}>
              {currentQrToken
                ? t('restaurantAdmin.privateQrPrefix', {token: currentQrToken})
                : t('restaurantAdmin.privateQrWillBeCreated')}
            </RNText>
          </RNView>
          <RNText style={styles.workspaceStatusPill}>
            {contextLoading || contextSwitching || savingRestaurantName
              ? t('restaurantAdmin.syncing')
              : t('restaurantAdmin.isolatedData')}
          </RNText>
        </RNView>

        {contextErrorMessage || permissionMessage ? (
          <RNView style={styles.workspaceWarningBox}>
            <RNText style={styles.workspaceWarningText}>
              {contextErrorMessage || permissionMessage}
            </RNText>
          </RNView>
        ) : null}

        <RNView style={styles.workspaceControlsGrid}>
          <RNView style={styles.workspaceSection}>
            <RNText style={styles.workspaceSectionLabel}>{t('restaurantAdmin.restaurantName')}</RNText>
            <Pressable
              disabled={savingRestaurantName || contextLoading}
              onPress={() => void openRestaurantNameInput()}
              style={[
                styles.adminInput,
                styles.adminInputButton,
                savingRestaurantName || contextLoading ? {opacity: 0.62} : null,
              ]}>
              <RNText
                numberOfLines={1}
                style={
                  restaurantNameDraft
                    ? styles.adminInputValueText
                    : styles.adminInputPlaceholderText
                }>
                {restaurantNameDraft || t('restaurantAdmin.restaurantNamePlaceholder')}
              </RNText>
            </Pressable>
            <RNText style={styles.workspaceSectionLabel}>{t('restaurantAdmin.tableCount')}</RNText>
            <Pressable
              disabled={savingRestaurantName || contextLoading}
              onPress={() => void openTableCountInput()}
              style={[
                styles.adminInput,
                styles.adminInputButton,
                savingRestaurantName || contextLoading ? {opacity: 0.62} : null,
              ]}>
              <RNText
                numberOfLines={1}
                style={
                  tableCountDraft
                    ? styles.adminInputValueText
                    : styles.adminInputPlaceholderText
                }>
                {tableCountDraft || t('restaurantAdmin.tableCountPlaceholder')}
              </RNText>
            </Pressable>
            <RNText style={styles.workspaceHint}>
              {t('restaurantAdmin.tableCountHelp')}
            </RNText>
            {restaurantNameMessage ? (
              <RNText
                style={
                  restaurantNameMessage === t('restaurantAdmin.restaurantNameSaved') || restaurantNameMessage === t('restaurantAdmin.clearedDraftTableCount') || restaurantNameMessage.includes(t('restaurantAdmin.createdTableChoices', {count: ''}).replace('{{count}}', '').trim())
                    ? styles.workspaceEmptyText
                    : styles.formError
                }>
                {restaurantNameMessage}
              </RNText>
            ) : null}
          </RNView>

          <RNView style={styles.workspaceSection}>
            <RNText style={styles.workspaceSectionLabel}>{t('restaurantAdmin.saveConfig')}</RNText>
            <Pressable
              disabled={savingRestaurantName || contextLoading}
              onPress={() => void handleSaveRestaurantName()}
              style={[
                styles.saveButton,
                savingRestaurantName || contextLoading ? {opacity: 0.62} : null,
              ]}>
              <RNText style={styles.saveButtonText}>
                {savingRestaurantName ? t('restaurantAdmin.saving') : t('restaurantAdmin.saveConfig')}
              </RNText>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    );
  };

  if (authChecking) {
    return (
      <RNView style={styles.screen}>
        <RNView pointerEvents="none" style={styles.glowTop} />
        <RNView pointerEvents="none" style={styles.glowBottom} />
        <RNView style={styles.authGuardCard}>
          <ActivityIndicator color="#FFFFFF" />
          <RNText style={styles.authGuardTitle}>
            {t('restaurantAdmin.checkingAdminSession')}
          </RNText>
          <RNText style={styles.authGuardHint}>
            {t('restaurantAdmin.loginIfExpired')}
          </RNText>
        </RNView>
      </RNView>
    );
  }

  if (!sessionUsername) {
    return (
      <RNView style={styles.screen}>
        <RNView pointerEvents="none" style={styles.glowTop} />
        <RNView pointerEvents="none" style={styles.glowBottom} />
        <RNView style={styles.authGuardCard}>
          <RNText style={styles.authGuardTitle}>{t('restaurantAdmin.authRequiredTitle')}</RNText>
          <RNText style={styles.authGuardHint}>
            {t('restaurantAdmin.authRequiredHint')}
          </RNText>
          <Pressable onPress={redirectToLogin} style={styles.logoutButton}>
            <RNText style={styles.logoutText}>{t('restaurantAdmin.goToLogin')}</RNText>
          </Pressable>
        </RNView>
      </RNView>
    );
  }

  return (
    <RNView style={styles.screen}>
      <RNView pointerEvents="none" style={styles.glowTop} />
      <RNView pointerEvents="none" style={styles.glowBottom} />

      <RNView style={styles.header}>
        <RNView style={styles.headerLeft}>
          <Image
            source={images.logoSmall}
            style={styles.logo}
            resizeMode="contain"
          />
          <RNView>
            <RNText style={styles.eyebrow}>APlus Restaurant POS</RNText>
            <RNText style={styles.headerTitle}>{headerTitle}</RNText>
            <RNText style={styles.headerMeta}>
              {t('restaurantAdmin.helloAdmin', {username: sessionUsername})}
            </RNText>
          </RNView>
        </RNView>
        <RNView style={styles.headerActions}>
          {singlePageMode ? (
            <Pressable onPress={goToAdminHome} style={styles.backToAdminButton}>
              <RNText style={styles.backToAdminText}>← Admin</RNText>
            </Pressable>
          ) : null}
          <Pressable onPress={() => void logout()} style={styles.logoutButton}>
            <RNText style={styles.logoutText}>{t('restaurantAdmin.logout')}</RNText>
          </Pressable>
        </RNView>
      </RNView>

      {authErrorMessage ? (
        <RNView style={styles.inlineErrorBox}>
          <RNText style={styles.inlineErrorText}>{authErrorMessage}</RNText>
        </RNView>
      ) : null}

      <RNView pointerEvents="box-none" style={styles.body}>
        {singlePageMode ? (
          <RNView pointerEvents="auto" style={styles.contentPanel}>
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollBody}
              refreshControl={
                activeTab === 'orders' ? (
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={loadData}
                    tintColor="#FFFFFF"
                  />
                ) : undefined
              }
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}>
              {renderPageContextBar()}

              {activeTab === 'orders' ? (
                <AdminOrdersScreen
                  orders={orders}
                  billSessions={billSessions}
                  tables={tables}
                  filter={orderFilter}
                  onChangeFilter={setOrderFilter}
                  styles={styles}
                  onChangeStatus={onChangeOrderStatus}
                  onChangePaymentStatus={onChangePaymentStatus}
                  onUpdateBillPayment={onUpdateBillPayment}
                  onCloseBill={onCloseBill}
                  onTransferBillTable={onTransferBillTable}
                  onRefreshOrders={() =>
                    void refreshOrdersOnly({silent: false, announceNew: false})
                  }
                  orderSyncStatus={orderSyncStatus}
                  lastOrderSyncAt={lastOrderSyncAt}
                  newOrderNotice={newOrderNotice}
                />
              ) : activeTab === 'tables' ? (
                <AdminTablesScreen
                  tables={tables}
                  branches={branches as RestaurantBranch[]}
                  activeBranchId={context?.branchId}
                  activeRestaurantId={context?.restaurantId}
                  pendingTableCount={pendingTableCount}
                  styles={styles}
                  onSaveTable={onSaveTable}
                  onDeleteTable={onDeleteTable}
                  onSaveBranchQr={onSaveBranchQr}
                  onReloadTables={reloadTables}
                />
              ) : (
                <AdminMenuManagementScreen
                  menuItems={menuItems}
                  categories={categories}
                  styles={styles}
                  onSaveItem={onSaveMenuItem}
                  onUploadImage={onUploadMenuImage}
                  onSaveCategory={onSaveMenuCategory}
                  onDeleteItem={onDeleteMenuItem}
                  onDeleteCategory={onDeleteMenuCategory}
                />
              )}
            </ScrollView>
          </RNView>
        ) : (
          renderAdminHome()
        )}
      </RNView>
    </RNView>
  );
};

export default memo(RestaurantAdminDashboardScreen);
