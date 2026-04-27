import React, {memo} from 'react';
import {Text as RNText, View as RNView} from 'react-native';

import {
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_PAYMENT_STATUS_LABELS,
  AdminOrderStatus,
  AdminPaymentStatus,
} from 'services/restaurantAdminStore';

type Props = {
  status?: AdminOrderStatus;
  paymentStatus?: AdminPaymentStatus;
  styles: any;
};

const statusColors: Record<AdminOrderStatus, {bg: string; border: string}> = {
  NEW: {bg: 'rgba(217,32,39,0.22)', border: 'rgba(255,82,82,0.36)'},
  ACCEPTED: {bg: 'rgba(43,140,255,0.20)', border: 'rgba(80,160,255,0.36)'},
  PREPARING: {bg: 'rgba(242,165,26,0.20)', border: 'rgba(255,190,70,0.36)'},
  COMPLETED: {bg: 'rgba(9,168,107,0.20)', border: 'rgba(60,210,150,0.36)'},
  CANCELLED: {bg: 'rgba(130,130,140,0.18)', border: 'rgba(180,180,190,0.22)'},
};

const paymentColors: Record<AdminPaymentStatus, {bg: string; border: string}> = {
  UNPAID: {bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.14)'},
  PAID: {bg: 'rgba(9,168,107,0.22)', border: 'rgba(60,210,150,0.36)'},
};

const OrderStatusBadge = ({status, paymentStatus, styles}: Props) => {
  if (paymentStatus) {
    const color = paymentColors[paymentStatus];
    return (
      <RNView style={[styles.badge, {backgroundColor: color.bg, borderColor: color.border}]}>
        <RNText style={styles.badgeText}>{ADMIN_PAYMENT_STATUS_LABELS[paymentStatus]}</RNText>
      </RNView>
    );
  }

  if (!status) {
    return null;
  }

  const color = statusColors[status];
  return (
    <RNView style={[styles.badge, {backgroundColor: color.bg, borderColor: color.border}]}>
      <RNText style={styles.badgeText}>{ADMIN_ORDER_STATUS_LABELS[status]}</RNText>
    </RNView>
  );
};

export default memo(OrderStatusBadge);
