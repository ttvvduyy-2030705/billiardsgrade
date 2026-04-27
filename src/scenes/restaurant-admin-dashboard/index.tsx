import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text as RNText,
  View as RNView,
} from 'react-native';

import images from 'assets';
import Image from 'components/Image';
import View from 'components/View';
import {screens} from 'scenes/screens';
import {
  AdminOrder,
  AdminOrderStatus,
  AdminPaymentStatus,
  loadRestaurantAdminData,
  saveAdminMenuItem,
  updateAdminOrderPaymentStatus,
  updateAdminOrderStatus,
} from 'services/restaurantAdminStore';
import type {MenuCategory, RestaurantMenuItem} from 'services/restaurantMenuStorage';
import useScreenSystemUI from 'theme/systemUI';
import useDesignSystem from 'theme/useDesignSystem';
import {Navigation} from 'types/navigation';

import AdminMenuManagementScreen from './components/AdminMenuManagementScreen';
import AdminOrdersScreen from './components/AdminOrdersScreen';
import AdminSidebar, {AdminDashboardTab} from './components/AdminSidebar';
import createStyles from './styles';

type Props = Navigation & {
  adminUsername?: string;
};

type OrderFilter = AdminOrderStatus | 'ALL' | 'PAID';

const RestaurantAdminDashboardScreen = (props: Props) => {
  useScreenSystemUI({variant: 'fullscreen', barStyle: 'light-content'});

  const {adaptive, design} = useDesignSystem();
  const isWide = adaptive.width >= 900;
  const styles = useMemo(() => createStyles({design, isWide}), [design, isWide]);

  const [activeTab, setActiveTab] = useState<AdminDashboardTab>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await loadRestaurantAdminData();
      setOrders(next.orders);
      setMenuItems(next.menuItems);
      setCategories(next.categories);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const logout = () => {
    props.navigate(screens.restaurantMenu);
  };

  const onSaveMenuItem = async (input: Parameters<typeof saveAdminMenuItem>[0]) => {
    const nextItems = await saveAdminMenuItem(input);
    setMenuItems(nextItems);
  };

  const onChangeOrderStatus = async (orderId: string, status: AdminOrderStatus) => {
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

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <RNView style={styles.header}>
        <RNView style={styles.headerLeft}>
          <Image source={images.logoSmall} style={styles.logo} resizeMode="contain" />
          <RNView>
            <RNText style={styles.eyebrow}>APlus Restaurant POS</RNText>
            <RNText style={styles.headerTitle}>Admin Dashboard</RNText>
            <RNText style={styles.headerMeta}>
              Xin chào {props.adminUsername || 'admin'} · Local-first management
            </RNText>
          </RNView>
        </RNView>
        <Pressable onPress={logout} style={styles.logoutButton}>
          <RNText style={styles.logoutText}>Đăng xuất</RNText>
        </Pressable>
      </RNView>

      <RNView style={styles.body}>
        <AdminSidebar activeTab={activeTab} onChangeTab={setActiveTab} styles={styles} />

        <RNView style={styles.contentPanel}>
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollBody}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#FFFFFF" />
            }
            showsVerticalScrollIndicator={false}>
            {activeTab === 'orders' ? (
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
              />
            )}
          </ScrollView>
        </RNView>
      </RNView>
    </View>
  );
};

export default memo(RestaurantAdminDashboardScreen);
