import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
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
  clearAdminSessionIfUnauthorized,
  getScoreMenuErrorMessage,
  logScoreMenuError,
} from 'utils/scoremenuErrors';
import {
  AdminOrder,
  AdminOrderFilter,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
  AdminRestaurantTable,
  deleteAdminMenuCategory,
  deleteAdminMenuItem,
  deleteAdminTable,
  loadAdminOrders,
  loadRestaurantAdminData,
  saveAdminMenuCategory,
  saveAdminMenuItem,
  uploadAdminMenuImage,
  saveAdminBranchQr,
  saveAdminTable,
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

const ADMIN_SESSION_CHECK_TIMEOUT_MS = 2500;
const ADMIN_ORDER_POLL_INTERVAL_MS = 3000;

const ADMIN_TAB_LABELS: Record<AdminDashboardTab, string> = {
  orders: 'Đơn hàng',
  menu: 'Quản lý món',
  tables: 'Bàn / QR',
};

const ADMIN_PAGE_DESCRIPTIONS: Record<AdminDashboardTab, string> = {
  orders: 'Tiếp nhận đơn mới, đổi trạng thái món và cập nhật thanh toán.',
  menu: 'Thêm/sửa món, danh mục, giá bán, trạng thái đang bán hoặc hết món.',
  tables: 'Tạo bàn, khóa/ẩn bàn, quản lý QR token cho từng bàn.',
};

const ADMIN_PAGE_ICONS: Record<AdminDashboardTab, string> = {
  orders: 'Đ',
  menu: 'M',
  tables: 'Q',
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
  const navigate = props.navigate;
  const replace = props.replace;
  const reset = props.reset;
  const isFocused = props.isFocused;
  const addListener = props.addListener;
  const singlePageMode = props.adminPageMode === 'single';
  const initialAdminTab = props.initialAdminTab || 'orders';
  const headerTitle = singlePageMode
    ? props.adminPageTitle || ADMIN_TAB_LABELS[initialAdminTab]
    : 'Admin Dashboard';

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
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<AdminRestaurantTable[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [sessionUsername, setSessionUsername] = useState(
    props.adminUsername || '',
  );
  const [contextSwitching, setContextSwitching] = useState(false);
  const [orderSyncStatus, setOrderSyncStatus] =
    useState<OrderSyncStatus>('idle');
  const [lastOrderSyncAt, setLastOrderSyncAt] = useState('');
  const [newOrderNotice, setNewOrderNotice] = useState('');
  const {
    context,
    restaurants,
    branches,
    allowedRestaurantIds,
    loading: contextLoading,
    errorMessage: contextErrorMessage,
    permissionMessage,
    hydrateRestaurantContext,
    switchRestaurant,
    switchBranch,
  } = useRestaurantContextStore();

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
    (
      nextOrders: AdminOrder[],
      options: {announceNew?: boolean} = {},
    ) => {
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
        const newOrders = uniqueOrders.filter(order => !previousIds.has(order.id));
        if (newOrders.length > 0) {
          setNewOrderNotice(
            `${newOrders.length} đơn mới vừa vào khu quản trị`,
          );
        }
      }

      latestOrderIdsRef.current = nextIds;
      setOrders(uniqueOrders);
      setLastOrderSyncAt(formatSyncTime());
    },
    [formatSyncTime],
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
    setMenuItems([]);
    setCategories([]);
    setTables([]);
    setOrderFilter('ALL');
    setSessionUsername('');
    latestOrderIdsRef.current = new Set();
    orderPollingInFlightRef.current = false;
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
        const nextOrders = await loadAdminOrders();

        if (!isMountedRef.current || loggingOutRef.current) {
          return;
        }

        applyOrdersSnapshot(nextOrders, {
          announceNew: options.announceNew ?? true,
        });
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
        if (await clearAdminSessionIfUnauthorized(error)) {
          resetSensitiveData();
          redirectToLogin();
          return;
        }
        if (!options.silent) {
          setAuthErrorMessage(
            getScoreMenuErrorMessage(
              error,
              'Không thể tải đơn hàng mới. Vui lòng thử lại.',
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
    [applyOrdersSnapshot],
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
      await hydrateRestaurantContext({session, source: 'admin'});

      const next = await loadRestaurantAdminData();
      applyOrdersSnapshot(next.orders, {announceNew: false});
      setOrderSyncStatus('online');
      setMenuItems(next.menuItems);
      setCategories(next.categories);
      setTables(next.tables || []);
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
      if (await clearAdminSessionIfUnauthorized(error)) {
        resetSensitiveData();
        redirectToLogin();
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          'Không thể tải dữ liệu quản trị. Vui lòng thử lại.',
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [
    applyOrdersSnapshot,
    hydrateRestaurantContext,
    redirectToLogin,
    resetSensitiveData,
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
        await hydrateRestaurantContext({session, source: 'admin'});
        setAuthChecking(false);
      } catch (error) {
        devWarn('[RestaurantAdminDashboard] session check failed', error);

        if (!isMounted) {
          return;
        }

        resetSensitiveData();
        setAuthChecking(false);
        redirectToLogin();
      }
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [
    applyOrdersSnapshot,
    hydrateRestaurantContext,
    redirectToLogin,
    resetSensitiveData,
  ]);

  useEffect(() => {
    if (!authChecking && sessionUsername) {
      void loadData();
    }
  }, [authChecking, loadData, sessionUsername]);

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
      resetRestaurantContextStore({resetScopedStores: false});
      requestAnimationFrame(redirectToLogin);
    }
  };

  const onSaveMenuItem = async (
    input: Parameters<typeof saveAdminMenuItem>[0],
  ) => {
    const nextItems = await saveAdminMenuItem(input);
    setMenuItems(nextItems);
    adminDashboardActiveTabSession = 'menu';
    setActiveTabState('menu');
    return nextItems;
  };

  const onDeleteMenuItem = async (itemId: string) => {
    const nextItems = await deleteAdminMenuItem(itemId);
    setMenuItems(nextItems);
    adminDashboardActiveTabSession = 'menu';
    setActiveTabState('menu');
    return nextItems;
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
    adminDashboardActiveTabSession = 'menu';
    setActiveTabState('menu');
    return result;
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
    adminDashboardActiveTabSession = 'menu';
    setActiveTabState('menu');
    return result;
  };

  const reloadTables = async () => {
    const next = await loadRestaurantAdminData();
    setTables(next.tables || []);
    setMenuItems(next.menuItems);
    setCategories(next.categories);
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

  const onSaveBranchQr = async (input: Parameters<typeof saveAdminBranchQr>[0]) => {
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
      if (await clearAdminSessionIfUnauthorized(error)) {
        resetSensitiveData();
        redirectToLogin();
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          'Không thể đổi trạng thái đơn. Vui lòng thử lại.',
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
      if (await clearAdminSessionIfUnauthorized(error)) {
        resetSensitiveData();
        redirectToLogin();
        return;
      }
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          'Không thể cập nhật thanh toán. Vui lòng thử lại.',
        ),
      );
    }
  };

  const handleSwitchRestaurant = async (restaurantId: string) => {
    if (contextSwitching || restaurantId === context?.restaurantId) {
      return;
    }

    setContextSwitching(true);
    setAuthErrorMessage('');

    try {
      await switchRestaurant(restaurantId);
      await loadData();
    } catch (error) {
      logScoreMenuError(
        {module: 'ADMIN', action: 'switch restaurant failed', restaurantId},
        error,
      );
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          'Không thể chuyển nhà hàng. Vui lòng thử lại.',
        ),
      );
    } finally {
      setContextSwitching(false);
    }
  };

  const handleSwitchBranch = async (branchId: string) => {
    if (contextSwitching || branchId === context?.branchId) {
      return;
    }

    setContextSwitching(true);
    setAuthErrorMessage('');

    try {
      await switchBranch(branchId);
      await loadData();
    } catch (error) {
      logScoreMenuError(
        {
          module: 'ADMIN',
          action: 'switch branch failed',
          restaurantId: context?.restaurantId,
          branchId,
        },
        error,
      );
      setAuthErrorMessage(
        getScoreMenuErrorMessage(
          error,
          'Không thể chuyển chi nhánh. Vui lòng thử lại.',
        ),
      );
    } finally {
      setContextSwitching(false);
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

  const renderPageContextBar = () => {
    return (
      <RNView style={styles.pageContextBar}>
        <RNText style={styles.pageContextText}>
          {context?.restaurantName || 'Chưa chọn nhà hàng'}
          {context?.branchName ? ` · ${context.branchName}` : ''}
        </RNText>
      </RNView>
    );
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
        meta: `${orders.length} đơn đang tải trong ngữ cảnh hiện tại`,
      },
      {
        tab: 'menu',
        count: menuItems.length,
        meta: `${menuItems.length} món · ${categories.length} danh mục`,
      },
      {
        tab: 'tables',
        count: tables.length,
        meta: `${tables.length} bàn/QR trong nhà hàng hoặc chi nhánh`,
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
          <RNText style={styles.homeIntroEyebrow}>Khu quản trị</RNText>
          <RNText style={styles.homeIntroTitle}>
            Chọn một khu vực để quản lý
          </RNText>
          <RNText style={styles.homeIntroHint}>
            Mỗi phần admin đã được tách thành một trang riêng để tránh vỡ layout,
            chữ đè nhau hoặc không nhìn hết nội dung trên Android.
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
                {ADMIN_PAGE_ICONS[card.tab]}
              </RNText>
              <RNView style={styles.adminPageContent}>
                <RNText style={styles.adminPageTitle}>
                  {ADMIN_TAB_LABELS[card.tab]}
                </RNText>
                <RNText style={styles.adminPageHint}>
                  {ADMIN_PAGE_DESCRIPTIONS[card.tab]}
                </RNText>
                <RNText style={styles.adminPageMeta}>{card.meta}</RNText>
              </RNView>
              <RNText style={styles.adminPageArrow}>Mở →</RNText>
            </Pressable>
          ))}
        </RNView>

        {renderWorkspaceSwitcher()}
      </ScrollView>
    );
  };

  const renderWorkspaceSwitcher = () => {
    const accessibleRestaurants = restaurants.filter(
      restaurant =>
        allowedRestaurantIds.length === 0 ||
        allowedRestaurantIds.indexOf(restaurant.id) >= 0,
    );
    const branchCount = branches.length;

    return (
      <RNView style={styles.workspacePanel}>
        <RNView style={styles.workspaceHeaderRow}>
          <RNView style={styles.workspaceTitleBlock}>
            <RNText style={styles.workspaceEyebrow}>Ngữ cảnh vận hành</RNText>
            <RNText style={styles.workspaceTitle}>
              {context?.restaurantName || 'Chưa chọn nhà hàng'}
            </RNText>
            <RNText style={styles.workspaceHint}>
              {context?.branchName
                ? `Chi nhánh: ${context.branchName}`
                : branchCount > 0
                  ? 'Chọn chi nhánh để lọc đơn/bàn'
                  : 'Nhà hàng hiện tại chưa có chi nhánh'}
            </RNText>
          </RNView>
          <RNText style={styles.workspaceStatusPill}>
            {contextLoading || contextSwitching
              ? 'Đang đồng bộ...'
              : 'Đã cô lập dữ liệu'}
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
            <RNText style={styles.workspaceSectionLabel}>Nhà hàng</RNText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workspaceChipRow}>
              {accessibleRestaurants.length > 0 ? (
                accessibleRestaurants.map(restaurant => {
                  const active = restaurant.id === context?.restaurantId;
                  return (
                    <Pressable
                      key={restaurant.id}
                      disabled={active || contextSwitching}
                      onPress={() => void handleSwitchRestaurant(restaurant.id)}
                      style={[
                        styles.workspaceChip,
                        active ? styles.workspaceChipActive : null,
                        contextSwitching ? styles.workspaceChipDisabled : null,
                      ]}>
                      <RNText
                        style={[
                          styles.workspaceChipText,
                          active ? styles.workspaceChipTextActive : null,
                        ]}>
                        {restaurant.name}
                      </RNText>
                    </Pressable>
                  );
                })
              ) : (
                <RNText style={styles.workspaceEmptyText}>
                  Tài khoản chưa được cấp quyền nhà hàng nào.
                </RNText>
              )}
            </ScrollView>
          </RNView>

          <RNView style={styles.workspaceSection}>
            <RNText style={styles.workspaceSectionLabel}>Chi nhánh</RNText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workspaceChipRow}>
              {branches.length > 0 ? (
                branches.map(branch => {
                  const active = branch.id === context?.branchId;
                  return (
                    <Pressable
                      key={branch.id}
                      disabled={active || contextSwitching}
                      onPress={() => void handleSwitchBranch(branch.id)}
                      style={[
                        styles.workspaceChip,
                        active ? styles.workspaceChipActive : null,
                        contextSwitching ? styles.workspaceChipDisabled : null,
                      ]}>
                      <RNText
                        style={[
                          styles.workspaceChipText,
                          active ? styles.workspaceChipTextActive : null,
                        ]}>
                        {branch.name}
                      </RNText>
                    </Pressable>
                  );
                })
              ) : (
                <RNText style={styles.workspaceEmptyText}>
                  Chưa có chi nhánh trong nhà hàng này.
                </RNText>
              )}
            </ScrollView>
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
            Đang kiểm tra phiên Admin...
          </RNText>
          <RNText style={styles.authGuardHint}>
            Vui lòng đăng nhập nếu phiên quản trị đã hết hạn.
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
          <RNText style={styles.authGuardTitle}>Cần đăng nhập Admin</RNText>
          <RNText style={styles.authGuardHint}>
            Bạn cần đăng nhập trước khi vào khu quản trị nhà hàng.
          </RNText>
          <Pressable onPress={redirectToLogin} style={styles.logoutButton}>
            <RNText style={styles.logoutText}>Đi tới đăng nhập</RNText>
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
              Xin chào {sessionUsername} · Phiên quản trị đang hoạt động
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
            <RNText style={styles.logoutText}>Đăng xuất</RNText>
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
                  filter={orderFilter}
                  onChangeFilter={setOrderFilter}
                  styles={styles}
                  onChangeStatus={onChangeOrderStatus}
                  onChangePaymentStatus={onChangePaymentStatus}
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
