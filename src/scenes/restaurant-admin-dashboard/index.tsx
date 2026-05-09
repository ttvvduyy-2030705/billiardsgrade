import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text as RNText,
  View as RNView,
} from "react-native";

import images from "assets";
import Image from "components/Image";
import View from "components/View";
import { screens } from "scenes/screens";
import { devWarn } from "utils/devLogger";
import {
  AdminOrder,
  AdminOrderFilter,
  AdminOrderStatus,
  AdminPaymentStatus,
  deleteAdminMenuCategory,
  deleteAdminMenuItem,
  loadRestaurantAdminData,
  saveAdminMenuCategory,
  saveAdminMenuItem,
  updateAdminOrderPaymentStatus,
  updateAdminOrderStatus,
} from "services/restaurantAdminStore";
import {
  clearRestaurantAdminSession,
  getRestaurantAdminSession,
} from "../../services/restaurantAdminAuthService";
import type {
  MenuCategory,
  RestaurantMenuItem,
} from "services/restaurantMenuRepository";
import useScreenSystemUI from "theme/systemUI";
import useDesignSystem from "theme/useDesignSystem";
import { Navigation } from "types/navigation";

import AdminMenuManagementScreen from "./components/AdminMenuManagementScreen";
import AdminOrdersScreen from "./components/AdminOrdersScreen";
import AdminSidebar, { AdminDashboardTab } from "./components/AdminSidebar";
import createStyles from "./styles";

type Props = Navigation & {
  adminUsername?: string;
};

type OrderFilter = AdminOrderFilter;

let adminDashboardActiveTabSession: AdminDashboardTab = "orders";

const ADMIN_SESSION_CHECK_TIMEOUT_MS = 2500;

const withTimeout = async <T,>(
  promise: Promise<T>,
  fallback: T,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
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
  useScreenSystemUI({ variant: "fullscreen", barStyle: "light-content" });

  const { adaptive, design } = useDesignSystem();
  const isWide = adaptive.width >= 900;
  const styles = useMemo(
    () => createStyles({ design, isWide }),
    [design, isWide],
  );
  const navigate = props.navigate;
  const replace = props.replace;

  const [activeTab, setActiveTabState] = useState<AdminDashboardTab>(
    () => adminDashboardActiveTabSession,
  );
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("ALL");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authErrorMessage, setAuthErrorMessage] = useState("");
  const [sessionUsername, setSessionUsername] = useState(
    props.adminUsername || "",
  );

  const setActiveTab = useCallback((nextTab: AdminDashboardTab) => {
    adminDashboardActiveTabSession = nextTab;
    setActiveTabState(nextTab);
  }, []);

  useEffect(() => {
    adminDashboardActiveTabSession = activeTab;
  }, [activeTab]);

  const resetSensitiveData = useCallback(() => {
    setOrders([]);
    setMenuItems([]);
    setCategories([]);
    setOrderFilter("ALL");
    setSessionUsername("");
    adminDashboardActiveTabSession = "orders";
    setActiveTabState("orders");
  }, []);

  const redirectToLogin = useCallback(() => {
    const params = {
      initialMode: "login",
      resetAuthDraft: true,
    };

    if (typeof replace === "function") {
      replace({
        name: screens.restaurantAdminLogin,
        params,
      });
      return;
    }

    navigate(screens.restaurantAdminLogin, params);
  }, [navigate, replace]);

  const loadData = useCallback(async () => {
    setAuthErrorMessage("");

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

      const next = await loadRestaurantAdminData();
      setOrders(next.orders);
      setMenuItems(next.menuItems);
      setCategories(next.categories);
    } catch (error) {
      devWarn("[RestaurantAdminDashboard] load data failed", error);
      setAuthErrorMessage("Không thể tải dữ liệu quản trị. Vui lòng thử lại.");
    } finally {
      setRefreshing(false);
    }
  }, [redirectToLogin, resetSensitiveData]);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
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
        setAuthChecking(false);
      } catch (error) {
        devWarn("[RestaurantAdminDashboard] session check failed", error);

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
  }, [redirectToLogin, resetSensitiveData]);

  useEffect(() => {
    if (!authChecking && sessionUsername) {
      void loadData();
    }
  }, [authChecking, loadData, sessionUsername]);

  const logout = async () => {
    setRefreshing(false);
    setAuthChecking(false);

    try {
      await clearRestaurantAdminSession();
    } catch (error) {
      devWarn("[RestaurantAdminDashboard] logout failed", error);
    } finally {
      resetSensitiveData();
      redirectToLogin();
    }
  };

  const onSaveMenuItem = async (
    input: Parameters<typeof saveAdminMenuItem>[0],
  ) => {
    const nextItems = await saveAdminMenuItem(input);
    setMenuItems(nextItems);
    adminDashboardActiveTabSession = "menu";
    setActiveTabState("menu");
    return nextItems;
  };

  const onDeleteMenuItem = async (itemId: string) => {
    const nextItems = await deleteAdminMenuItem(itemId);
    setMenuItems(nextItems);
    adminDashboardActiveTabSession = "menu";
    setActiveTabState("menu");
    return nextItems;
  };

  const onSaveMenuCategory = async (
    input: Parameters<typeof saveAdminMenuCategory>[0],
  ) => {
    const result = await saveAdminMenuCategory(input);
    setCategories(result.categories);
    adminDashboardActiveTabSession = "menu";
    setActiveTabState("menu");
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
    adminDashboardActiveTabSession = "menu";
    setActiveTabState("menu");
    return result;
  };

  const onChangeOrderStatus = async (
    orderId: string,
    status: AdminOrderStatus,
  ) => {
    const nextOrders = await updateAdminOrderStatus(orderId, status);
    setOrders(nextOrders);
  };

  const onChangePaymentStatus = async (
    orderId: string,
    status: AdminPaymentStatus,
  ) => {
    const nextOrders = await updateAdminOrderPaymentStatus(orderId, status);
    setOrders(nextOrders);
  };

  if (authChecking) {
    return (
      <View style={styles.screen}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        <RNView style={styles.authGuardCard}>
          <ActivityIndicator color="#FFFFFF" />
          <RNText style={styles.authGuardTitle}>
            Đang kiểm tra phiên Admin...
          </RNText>
          <RNText style={styles.authGuardHint}>
            Vui lòng đăng nhập nếu phiên quản trị đã hết hạn.
          </RNText>
        </RNView>
      </View>
    );
  }

  if (!sessionUsername) {
    return (
      <View style={styles.screen}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        <RNView style={styles.authGuardCard}>
          <RNText style={styles.authGuardTitle}>Cần đăng nhập Admin</RNText>
          <RNText style={styles.authGuardHint}>
            Bạn cần đăng nhập trước khi vào khu quản trị nhà hàng.
          </RNText>
          <Pressable onPress={redirectToLogin} style={styles.logoutButton}>
            <RNText style={styles.logoutText}>Đi tới đăng nhập</RNText>
          </Pressable>
        </RNView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <RNView style={styles.header}>
        <RNView style={styles.headerLeft}>
          <Image
            source={images.logoSmall}
            style={styles.logo}
            resizeMode="contain"
          />
          <RNView>
            <RNText style={styles.eyebrow}>APlus Restaurant POS</RNText>
            <RNText style={styles.headerTitle}>Admin Dashboard</RNText>
            <RNText style={styles.headerMeta}>
              Xin chào {sessionUsername} · Phiên quản trị đang hoạt động
            </RNText>
          </RNView>
        </RNView>
        <Pressable onPress={() => void logout()} style={styles.logoutButton}>
          <RNText style={styles.logoutText}>Đăng xuất</RNText>
        </Pressable>
      </RNView>

      {authErrorMessage ? (
        <RNView style={styles.inlineErrorBox}>
          <RNText style={styles.inlineErrorText}>{authErrorMessage}</RNText>
        </RNView>
      ) : null}

      <RNView style={styles.body}>
        <AdminSidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          styles={styles}
        />

        <RNView style={styles.contentPanel}>
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollBody}
            refreshControl={
              activeTab === "orders" ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={loadData}
                  tintColor="#FFFFFF"
                />
              ) : undefined
            }
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "orders" ? (
              <AdminOrdersScreen
                orders={orders}
                filter={orderFilter}
                onChangeFilter={setOrderFilter}
                styles={styles}
                onChangeStatus={onChangeOrderStatus}
                onChangePaymentStatus={onChangePaymentStatus}
              />
            ) : (
              <AdminMenuManagementScreen
                menuItems={menuItems}
                categories={categories}
                styles={styles}
                onSaveItem={onSaveMenuItem}
                onSaveCategory={onSaveMenuCategory}
                onDeleteItem={onDeleteMenuItem}
                onDeleteCategory={onDeleteMenuCategory}
              />
            )}
          </ScrollView>
        </RNView>
      </RNView>
    </View>
  );
};

export default memo(RestaurantAdminDashboardScreen);
