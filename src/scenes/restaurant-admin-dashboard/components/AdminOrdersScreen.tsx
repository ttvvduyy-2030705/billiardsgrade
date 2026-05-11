import React, {memo, useMemo} from 'react';
import {Pressable, View as RNView} from 'react-native';
import RNText from './AdminText';

import {
  ADMIN_ORDER_FILTERS,
  ADMIN_ORDER_STATUS_LABELS,
  AdminOrder,
  AdminOrderFilter,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
} from 'services/restaurantAdminStore';

import OrderCard from './OrderCard';

type OrderFilter = AdminOrderFilter;
type OrderSyncStatus = 'idle' | 'syncing' | 'online' | 'error' | 'paused';

type Props = {
  orders: AdminOrder[];
  filter: OrderFilter;
  onChangeFilter: (filter: OrderFilter) => void;
  styles: any;
  onChangeStatus: (orderId: string, status: AdminOrderStatus) => void;
  onChangePaymentStatus: (
    orderId: string,
    status: AdminPaymentStatus,
    method?: AdminPaymentMethod,
  ) => void;
  onRefreshOrders: () => void;
  orderSyncStatus: OrderSyncStatus;
  lastOrderSyncAt?: string;
  newOrderNotice?: string;
};

const filterLabels: Record<OrderFilter, string> = {
  ALL: 'Tất cả',
  NEW: 'Đơn mới',
  ACCEPTED: 'Đã nhận',
  PREPARING: 'Đang làm',
  COMPLETED: 'Hoàn thành',
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã huỷ',
};

const AdminOrdersScreen = ({
  orders,
  filter,
  onChangeFilter,
  styles,
  onChangeStatus,
  onChangePaymentStatus,
  onRefreshOrders,
  orderSyncStatus,
  lastOrderSyncAt,
  newOrderNotice,
}: Props) => {
  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') {
      return orders;
    }

    if (filter === 'PAID' || filter === 'UNPAID') {
      return orders.filter(order => order.paymentStatus === filter);
    }

    return orders.filter(order => order.status === filter);
  }, [filter, orders]);

  const newCount = orders.filter(order => order.status === 'NEW').length;
  const preparingCount = orders.filter(
    order => order.status === 'PREPARING',
  ).length;
  const unpaidCount = orders.filter(
    order => order.paymentStatus === 'UNPAID',
  ).length;

  const syncLabel = (() => {
    switch (orderSyncStatus) {
      case 'syncing':
        return 'Đang đồng bộ đơn...';
      case 'online':
        return 'Tự cập nhật mỗi 3 giây';
      case 'error':
        return 'Mất kết nối đơn hàng';
      case 'paused':
        return 'Tạm dừng khi rời tab đơn';
      case 'idle':
      default:
        return 'Sẵn sàng đồng bộ';
    }
  })();

  return (
    <RNView>
      <RNView style={styles.kpiRow}>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue}>{orders.length}</RNText>
          <RNText style={styles.kpiLabel}>Tổng đơn</RNText>
        </RNView>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue}>{newCount}</RNText>
          <RNText style={styles.kpiLabel}>Đơn mới</RNText>
        </RNView>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue}>{preparingCount}</RNText>
          <RNText style={styles.kpiLabel}>Đang làm</RNText>
        </RNView>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue}>{unpaidCount}</RNText>
          <RNText style={styles.kpiLabel}>Chưa thanh toán</RNText>
        </RNView>
      </RNView>

      <RNView style={styles.sectionHeader}>
        <RNView style={styles.sectionTitleBlock}>
          <RNText style={styles.sectionTitle}>Tiếp nhận đơn hàng</RNText>
          <RNText style={styles.sectionHint}>
            Lọc nhanh, đổi trạng thái bếp và thanh toán.
          </RNText>
        </RNView>

        <RNView style={styles.orderSyncPanel}>
          {newOrderNotice ? (
            <RNText style={styles.orderSyncNotice}>{newOrderNotice}</RNText>
          ) : null}
          <RNText style={styles.orderSyncStatus}>{syncLabel}</RNText>
          {lastOrderSyncAt ? (
            <RNText style={styles.orderSyncTime}>
              Lần cuối: {lastOrderSyncAt}
            </RNText>
          ) : null}
          <Pressable onPress={onRefreshOrders} style={styles.orderRefreshButton}>
            <RNText style={styles.orderRefreshButtonText}>Làm mới đơn</RNText>
          </Pressable>
        </RNView>
      </RNView>

      <RNView style={styles.filterWrap}>
        {ADMIN_ORDER_FILTERS.map(item => {
          const active = item === filter;
          return (
            <Pressable
              key={item}
              onPress={() => onChangeFilter(item)}
              style={[
                styles.filterChip,
                active ? styles.filterChipActive : null,
              ]}>
              <RNText
                style={[
                  styles.filterText,
                  active ? styles.filterTextActive : null,
                ]}>
                {filterLabels[item] ||
                  ADMIN_ORDER_STATUS_LABELS[item as AdminOrderStatus]}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>

      {filteredOrders.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🧾</RNText>
          <RNText style={styles.emptyText}>Chưa có đơn trong bộ lọc này</RNText>
          <RNText style={styles.emptySubText}>
            Khi khách gửi giỏ hàng, đơn sẽ xuất hiện tại đây.
          </RNText>
        </RNView>
      ) : (
        <RNView style={styles.orderGrid}>
          {filteredOrders.map((order: AdminOrder) => (
            <OrderCard
              key={order.id}
              order={order}
              styles={styles}
              onChangeStatus={onChangeStatus}
              onChangePaymentStatus={onChangePaymentStatus}
            />
          ))}
        </RNView>
      )}
    </RNView>
  );
};

export default memo(AdminOrdersScreen);
