import React, {memo} from 'react';
import {Pressable, Text as RNText, View as RNView} from 'react-native';

import {
  ADMIN_ORDER_STATUS_FLOW,
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_PAYMENT_STATUS_LABELS,
  AdminOrder,
  AdminOrderStatus,
  AdminPaymentStatus,
} from 'services/restaurantAdminStore';

import OrderStatusBadge from './OrderStatusBadge';

type Props = {
  order: AdminOrder;
  styles: any;
  onChangeStatus: (orderId: string, status: AdminOrderStatus) => void;
  onChangePaymentStatus: (orderId: string, status: AdminPaymentStatus) => void;
};

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const OrderCard = ({order, styles, onChangeStatus, onChangePaymentStatus}: Props) => {
  return (
    <RNView style={styles.orderCard}>
      <RNView style={styles.orderHeader}>
        <RNView style={styles.orderTitleBlock}>
          <RNText style={styles.orderCode} numberOfLines={1}>{order.id}</RNText>
          <RNText style={styles.orderTable}>Bàn {order.tableNumber || 'chưa nhập'}</RNText>
          <RNText style={styles.orderTime}>{formatDateTime(order.createdAt)}</RNText>
        </RNView>
        <RNView style={styles.orderBadgeColumn}>
          <OrderStatusBadge status={order.status} styles={styles} />
          <OrderStatusBadge paymentStatus={order.paymentStatus} styles={styles} />
        </RNView>
      </RNView>

      {order.note ? (
        <RNText style={styles.orderNote} numberOfLines={2}>Ghi chú: {order.note}</RNText>
      ) : null}

      <RNView style={styles.orderItems}>
        {order.items.map(item => (
          <RNView key={`${order.id}_${item.itemId}`} style={styles.orderItemRow}>
            <RNText style={styles.orderItemName} numberOfLines={1}>
              {item.quantity} × {item.name}
            </RNText>
            <RNText style={styles.orderItemPrice}>{formatCurrency(item.price * item.quantity)}</RNText>
          </RNView>
        ))}
      </RNView>

      <RNView style={styles.totalRow}>
        <RNText style={styles.totalLabel}>Tổng tiền</RNText>
        <RNText style={styles.totalValue}>{formatCurrency(order.total)}</RNText>
      </RNView>

      <RNText style={styles.actionLabel}>Trạng thái đơn</RNText>
      <RNView style={styles.actionChipWrap}>
        {ADMIN_ORDER_STATUS_FLOW.map(status => {
          const active = order.status === status;
          return (
            <Pressable
              key={status}
              onPress={() => onChangeStatus(order.id, status)}
              style={[styles.actionChip, active ? styles.actionChipActive : null]}>
              <RNText style={[styles.actionChipText, active ? styles.actionChipTextActive : null]}>
                {ADMIN_ORDER_STATUS_LABELS[status]}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>

      <RNText style={styles.actionLabel}>Thanh toán</RNText>
      <RNView style={styles.actionChipWrap}>
        {(['UNPAID', 'PAID'] as AdminPaymentStatus[]).map(status => {
          const active = order.paymentStatus === status;
          return (
            <Pressable
              key={status}
              onPress={() => onChangePaymentStatus(order.id, status)}
              style={[styles.actionChip, active ? styles.paymentChipActive : null]}>
              <RNText style={[styles.actionChipText, active ? styles.actionChipTextActive : null]}>
                {ADMIN_PAYMENT_STATUS_LABELS[status]}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>
    </RNView>
  );
};

export default memo(OrderCard);
