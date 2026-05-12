import React, {memo} from 'react';
import {Pressable, View as RNView} from 'react-native';
import RNText from './AdminText';

import {
  ADMIN_ORDER_PRIMARY_ACTION_LABELS,
  ADMIN_ORDER_STATUS_FLOW,
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_PAYMENT_METHOD_LABELS,
  ADMIN_PAYMENT_METHODS,
  ADMIN_PAYMENT_STATUS_LABELS,
  AdminOrder,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
  getAdminOrderNextStatus,
  isAdminOrderStatusTransitionAllowed,
} from 'services/restaurantAdminStore';

import OrderStatusBadge from './OrderStatusBadge';

type Props = {
  order: AdminOrder;
  styles: any;
  onChangeStatus: (orderId: string, status: AdminOrderStatus) => void;
  onChangePaymentStatus: (
    orderId: string,
    status: AdminPaymentStatus,
    method?: AdminPaymentMethod,
  ) => void;
};

const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

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

const OrderCard = ({
  order,
  styles,
  onChangeStatus,
  onChangePaymentStatus,
}: Props) => {
  const nextStatus = getAdminOrderNextStatus(order);
  const canMarkPaid = order.status !== 'CANCELLED';
  const sourceLabel = order.orderSource === 'customer' ? 'Khách QR' : order.orderSource || 'Admin';

  return (
    <RNView style={styles.orderCard}>
      <RNView style={styles.orderHeader}>
        <RNView style={styles.orderTitleBlock}>
          <RNText style={styles.orderCode} numberOfLines={1}>
            {order.id}
          </RNText>
          <RNText style={styles.orderTable}>
            Bàn {order.tableNumber || 'chưa nhập'}
          </RNText>
          <RNText style={styles.orderTime}>
            {formatDateTime(order.createdAt)}
          </RNText>
          <RNText style={styles.orderMetaLine} numberOfLines={1}>
            {sourceLabel}
            {order.branchId ? ` · ${order.branchId}` : ''}
          </RNText>
        </RNView>
        <RNView style={styles.orderBadgeColumn}>
          <OrderStatusBadge status={order.status} styles={styles} />
          <OrderStatusBadge
            paymentStatus={order.paymentStatus}
            styles={styles}
          />
        </RNView>
      </RNView>

      {order.note ? (
        <RNText style={styles.orderNote} numberOfLines={2}>
          Ghi chú: {order.note}
        </RNText>
      ) : null}

      <RNView style={styles.orderItems}>
        {order.items.map(item => (
          <RNView
            key={`${order.id}_${item.itemId}`}
            style={styles.orderItemRow}>
            <RNText style={styles.orderItemName} numberOfLines={1}>
              {item.quantity} × {item.name}
            </RNText>
            <RNText style={styles.orderItemPrice}>
              {formatCurrency(item.price * item.quantity)}
            </RNText>
          </RNView>
        ))}
      </RNView>

      <RNView style={styles.totalRow}>
        <RNText style={styles.totalLabel}>Tổng tiền</RNText>
        <RNText style={styles.totalValue}>{formatCurrency(order.total)}</RNText>
      </RNView>

      {nextStatus ? (
        <Pressable
          onPress={() => onChangeStatus(order.id, nextStatus)}
          style={styles.primaryOrderActionButton}
          accessibilityRole="button">
          <RNText style={styles.primaryOrderActionText}>
            {ADMIN_ORDER_PRIMARY_ACTION_LABELS[order.status] ||
              ADMIN_ORDER_STATUS_LABELS[nextStatus]}
          </RNText>
        </Pressable>
      ) : (
        <RNView style={styles.orderTerminalNotice}>
          <RNText style={styles.orderTerminalNoticeText}>
            {order.status === 'COMPLETED'
              ? 'Đơn đã hoàn thành, không thể chuyển ngược.'
              : 'Đơn đã huỷ, chỉ còn xem lại thông tin.'}
          </RNText>
        </RNView>
      )}

      <RNText style={styles.actionLabel}>Trạng thái đơn</RNText>
      <RNView style={styles.actionChipWrap}>
        {ADMIN_ORDER_STATUS_FLOW.map(status => {
          const active = order.status === status;
          const enabled = isAdminOrderStatusTransitionAllowed(
            order.status,
            status,
          );
          return (
            <Pressable
              key={status}
              disabled={!enabled}
              onPress={() => onChangeStatus(order.id, status)}
              style={[
                styles.actionChip,
                active ? styles.actionChipActive : null,
                !enabled ? styles.actionChipDisabled : null,
              ]}>
              <RNText
                style={[
                  styles.actionChipText,
                  active ? styles.actionChipTextActive : null,
                  !enabled ? styles.actionChipTextDisabled : null,
                ]}>
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
              disabled={status === 'PAID' && !canMarkPaid}
              onPress={() =>
                onChangePaymentStatus(
                  order.id,
                  status,
                  order.paymentMethod || 'MOCK',
                )
              }
              style={[
                styles.actionChip,
                active ? styles.paymentChipActive : null,
                status === 'PAID' && !canMarkPaid
                  ? styles.actionChipDisabled
                  : null,
              ]}>
              <RNText
                style={[
                  styles.actionChipText,
                  active ? styles.actionChipTextActive : null,
                  status === 'PAID' && !canMarkPaid
                    ? styles.actionChipTextDisabled
                    : null,
                ]}>
                {ADMIN_PAYMENT_STATUS_LABELS[status]}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>

      <RNText style={styles.actionLabel}>Phương thức</RNText>
      <RNView style={styles.actionChipWrap}>
        {ADMIN_PAYMENT_METHODS.map(method => {
          const active = (order.paymentMethod || 'MOCK') === method;
          return (
            <Pressable
              key={method}
              onPress={() =>
                onChangePaymentStatus(order.id, order.paymentStatus, method)
              }
              style={[
                styles.actionChip,
                active ? styles.paymentMethodChipActive : null,
              ]}>
              <RNText
                style={[
                  styles.actionChipText,
                  active ? styles.actionChipTextActive : null,
                ]}>
                {ADMIN_PAYMENT_METHOD_LABELS[method]}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>
    </RNView>
  );
};

export default memo(OrderCard);
