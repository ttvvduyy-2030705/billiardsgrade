import React, {memo} from 'react';
import {Pressable, View as RNView} from 'react-native';
import RNText from './AdminText';
import {formatVnd, getAppLocale, useAppTranslation} from 'utils/appI18n';

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

const formatCurrency = formatVnd;

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const locale = getAppLocale().startsWith('en') ? 'en-US' : 'vi-VN';

  return date.toLocaleString(locale, {
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
  const t = useAppTranslation();
  const nextStatus = getAdminOrderNextStatus(order);
  const canMarkPaid = order.status !== 'CANCELLED';
  const sourceLabel =
    order.orderSource === 'customer'
      ? t('restaurantAdmin.orderCard.customerQr')
      : order.orderSource || t('restaurantAdmin.orderCard.adminSource');

  return (
    <RNView style={styles.orderCard}>
      <RNView style={styles.orderHeader}>
        <RNView style={styles.orderTitleBlock}>
          <RNText style={styles.orderCode} numberOfLines={1}>
            {order.id}
          </RNText>
          <RNText style={styles.orderTable}>
            {t('restaurantAdmin.tablePrefix')} {order.tableNumber || t('restaurantAdmin.tableNotEntered')}
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
          {t('restaurantAdmin.orderCard.note', {note: order.note})}
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
        <RNText style={styles.totalLabel}>{t('restaurantAdmin.orderCard.total')}</RNText>
        <RNText style={styles.totalValue}>{formatCurrency(order.total)}</RNText>
      </RNView>

      {nextStatus ? (
        <Pressable
          onPress={() => onChangeStatus(order.id, nextStatus)}
          style={styles.primaryOrderActionButton}
          accessibilityRole="button">
          <RNText style={styles.primaryOrderActionText}>
            {t(`restaurantAdmin.orderNextAction.${order.status}`) ||
              t(`restaurantAdmin.orderStatus.${nextStatus}`)}
          </RNText>
        </Pressable>
      ) : (
        <RNView style={styles.orderTerminalNotice}>
          <RNText style={styles.orderTerminalNoticeText}>
            {order.status === 'COMPLETED'
              ? t('restaurantAdmin.orderCard.completedLocked')
              : t('restaurantAdmin.orderCard.cancelledLocked')}
          </RNText>
        </RNView>
      )}

      <RNText style={styles.actionLabel}>{t('restaurantAdmin.orderCard.orderStatus')}</RNText>
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
                {t(`restaurantAdmin.orderStatus.${status}`)}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>

      <RNText style={styles.actionLabel}>{t('restaurantAdmin.orderCard.payment')}</RNText>
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
                  order.paymentMethod === 'MOCK'
                    ? 'CASH'
                    : order.paymentMethod || 'CASH',
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
                {t(`restaurantAdmin.paymentStatus.${status}`)}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>

      <RNText style={styles.actionLabel}>{t('restaurantAdmin.orderCard.method')}</RNText>
      <RNView style={styles.actionChipWrap}>
        {ADMIN_PAYMENT_METHODS.map(method => {
          const active =
            (order.paymentMethod === 'MOCK'
              ? 'CASH'
              : order.paymentMethod || 'CASH') === method;
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
                {t(`restaurantAdmin.paymentMethod.${method}`)}
              </RNText>
            </Pressable>
          );
        })}
      </RNView>
    </RNView>
  );
};

export default memo(OrderCard);
