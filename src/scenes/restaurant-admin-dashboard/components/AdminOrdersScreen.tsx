import React, {memo, useMemo} from 'react';
import {Pressable, Text as RNText, View as RNView} from 'react-native';

import {
  ADMIN_ORDER_FILTERS,
  ADMIN_ORDER_STATUS_LABELS,
  AdminOrder,
  AdminOrderStatus,
  AdminPaymentStatus,
} from 'services/restaurantAdminStore';

import OrderCard from './OrderCard';

type OrderFilter = AdminOrderStatus | 'ALL' | 'PAID';

type Props = {
  orders: AdminOrder[];
  filter: OrderFilter;
  onChangeFilter: (filter: OrderFilter) => void;
  styles: any;
  onChangeStatus: (orderId: string, status: AdminOrderStatus) => void;
  onChangePaymentStatus: (orderId: string, status: AdminPaymentStatus) => void;
};

const filterLabels: Record<OrderFilter, string> = {
  ALL: 'Tất cả',
  NEW: 'Đơn mới',
  ACCEPTED: 'Đã nhận',
  PREPARING: 'Đang làm',
  COMPLETED: 'Hoàn thành',
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
}: Props) => {
  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') {
      return orders;
    }

    if (filter === 'PAID') {
      return orders.filter(order => order.paymentStatus === 'PAID');
    }

    return orders.filter(order => order.status === filter);
  }, [filter, orders]);

  const newCount = orders.filter(order => order.status === 'NEW').length;
  const preparingCount = orders.filter(order => order.status === 'PREPARING').length;
  const unpaidCount = orders.filter(order => order.paymentStatus === 'UNPAID').length;

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
        <RNView>
          <RNText style={styles.sectionTitle}>Tiếp nhận đơn hàng</RNText>
          <RNText style={styles.sectionHint}>Lọc nhanh, đổi trạng thái bếp và thanh toán.</RNText>
        </RNView>
      </RNView>

      <RNView style={styles.filterWrap}>
        {ADMIN_ORDER_FILTERS.map(item => {
          const active = item === filter;
          return (
            <Pressable
              key={item}
              onPress={() => onChangeFilter(item)}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}>
              <RNText style={[styles.filterText, active ? styles.filterTextActive : null]}>
                {filterLabels[item] || ADMIN_ORDER_STATUS_LABELS[item as AdminOrderStatus]}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>

      {filteredOrders.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🧾</RNText>
          <RNText style={styles.emptyText}>Chưa có đơn trong bộ lọc này</RNText>
          <RNText style={styles.emptySubText}>Khi khách gửi giỏ hàng, đơn sẽ xuất hiện tại đây.</RNText>
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
