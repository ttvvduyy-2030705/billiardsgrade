import React, {memo, useMemo} from 'react';
import {Pressable, View as RNView} from 'react-native';
import RNText from './AdminText';

import {
  ADMIN_ORDER_FILTERS,
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_ORDER_STATUS_SHORT_LABELS,
  AdminOrder,
  AdminOrderFilter,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
  getAdminOrderSummary,
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

  const summary = useMemo(() => getAdminOrderSummary(orders), [orders]);
  const statusCounts = useMemo(
    () => ({
      NEW: summary.newOrders,
      ACCEPTED: summary.acceptedOrders,
      PREPARING: summary.preparingOrders,
      COMPLETED: summary.completedOrders,
      CANCELLED: summary.cancelledOrders,
    }),
    [summary],
  );
  const formatCurrency = (value: number) =>
    `${Number(value || 0).toLocaleString('vi-VN')}đ`;

  const syncLabel = (() => {
    switch (orderSyncStatus) {
      case 'syncing':
        return 'Đang đồng bộ đơn...';
      case 'online':
        return 'Tự cập nhật mỗi 3 giây khi đang mở trang';
      case 'error':
        return 'Mất kết nối đơn hàng';
      case 'paused':
        return 'Tạm dừng khi rời trang đơn';
      case 'idle':
      default:
        return 'Sẵn sàng đồng bộ';
    }
  })();

  return (
    <RNView>
      <RNView style={styles.kpiRow}>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue}>{summary.totalOrders}</RNText>
          <RNText style={styles.kpiLabel}>Tổng đơn</RNText>
        </RNView>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue}>{summary.newOrders}</RNText>
          <RNText style={styles.kpiLabel}>Đơn mới</RNText>
        </RNView>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue}>{summary.preparingOrders}</RNText>
          <RNText style={styles.kpiLabel}>Đang làm</RNText>
        </RNView>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue}>{summary.unpaidOrders}</RNText>
          <RNText style={styles.kpiLabel}>Chưa thanh toán</RNText>
        </RNView>
        <RNView style={styles.kpiCard}>
          <RNText style={styles.kpiValue} numberOfLines={1}>
            {formatCurrency(summary.paidRevenue)}
          </RNText>
          <RNText style={styles.kpiLabel}>Đã thu</RNText>
        </RNView>
      </RNView>

      <RNView style={styles.orderFlowBoard}>
        {(['NEW', 'ACCEPTED', 'PREPARING', 'COMPLETED', 'CANCELLED'] as AdminOrderStatus[]).map(
          status => {
            const active = filter === status;
            return (
              <Pressable
                key={status}
                onPress={() => onChangeFilter(status)}
                style={[
                  styles.orderFlowStage,
                  active ? styles.orderFlowStageActive : null,
                ]}
                accessibilityRole="button">
                <RNText style={styles.orderFlowStageCount}>
                  {statusCounts[status] || 0}
                </RNText>
                <RNText style={styles.orderFlowStageLabel} numberOfLines={1}>
                  {ADMIN_ORDER_STATUS_SHORT_LABELS[status]}
                </RNText>
              </Pressable>
            );
          },
        )}
      </RNView>

      <RNView style={styles.paymentSummaryRow}>
        <RNText style={styles.paymentSummaryText}>
          Đã thanh toán: {summary.paidOrders} đơn · {formatCurrency(summary.paidRevenue)}
        </RNText>
        <RNText style={styles.paymentSummaryText}>
          Chưa thanh toán: {summary.unpaidOrders} đơn · {formatCurrency(summary.unpaidRevenue)}
        </RNText>
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
