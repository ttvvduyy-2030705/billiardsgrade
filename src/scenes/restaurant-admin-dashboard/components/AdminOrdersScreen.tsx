import React, {memo, useMemo, useState} from 'react';
import {Pressable, View as RNView} from 'react-native';
import RNText from './AdminText';

import {
  ADMIN_BILL_SESSION_STATUS_LABELS,
  ADMIN_ORDER_FILTERS,
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_ORDER_STATUS_SHORT_LABELS,
  ADMIN_PAYMENT_METHOD_LABELS,
  ADMIN_PAYMENT_METHODS,
  AdminBillSession,
  AdminOrder,
  AdminOrderFilter,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
  AdminRestaurantTable,
  getAdminOrderSummary,
} from 'services/restaurantAdminStore';

import OrderCard from './OrderCard';

type OrderFilter = AdminOrderFilter;
type OrderSyncStatus = 'idle' | 'syncing' | 'online' | 'error' | 'paused';

type Props = {
  orders: AdminOrder[];
  billSessions: AdminBillSession[];
  tables: AdminRestaurantTable[];
  filter: OrderFilter;
  onChangeFilter: (filter: OrderFilter) => void;
  styles: any;
  onChangeStatus: (orderId: string, status: AdminOrderStatus) => void;
  onChangePaymentStatus: (
    orderId: string,
    status: AdminPaymentStatus,
    method?: AdminPaymentMethod,
  ) => void;
  onUpdateBillPayment: (
    billSessionId: string,
    status: AdminBillSession["status"],
    method?: AdminPaymentMethod,
  ) => void;
  onCloseBill: (billSessionId: string) => void;
  onTransferBillTable: (billSessionId: string, tableId: string) => void;
  onRefreshOrders: () => void;
  orderSyncStatus: OrderSyncStatus;
  lastOrderSyncAt?: string;
  newOrderNotice?: string;
};

type BillCardView = {
  billSession: AdminBillSession;
  visibleOrders: AdminOrder[];
  allOrders: AdminOrder[];
  updatedAt: string;
  isFallbackGroup?: boolean;
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

const formatCurrency = (value: number) =>
  `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }

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

const getLatestOrder = (orders: AdminOrder[]) =>
  [...orders].sort((a, b) =>
    String(b.createdAt || b.updatedAt || '').localeCompare(
      String(a.createdAt || a.updatedAt || ''),
    ),
  )[0];

const sortChildOrders = (orders: AdminOrder[]) =>
  [...orders].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
  );

const getBillTotalFromOrders = (orders: AdminOrder[]) =>
  orders.reduce(
    (sum, order) => order.status === 'CANCELLED' ? sum : sum + Number(order.total || 0),
    0,
  );

const createFallbackBillSession = (
  key: string,
  allOrders: AdminOrder[],
): AdminBillSession => {
  const sortedOrders = sortChildOrders(allOrders);
  const firstOrder = sortedOrders[0];
  const latestOrder = getLatestOrder(sortedOrders) || firstOrder;
  const total = getBillTotalFromOrders(sortedOrders);

  return {
    id: key,
    billSessionId: key,
    restaurantId: firstOrder?.restaurantId || '',
    branchId: firstOrder?.branchId,
    tableId: firstOrder?.tableId,
    tableNumber: firstOrder?.tableNumber || 'chưa nhập',
    guestSessionId: firstOrder?.guestSessionId,
    status: 'OPEN',
    orderIds: sortedOrders.map(order => order.id),
    orderCount: sortedOrders.length,
    subtotal: total,
    discountTotal: 0,
    serviceFeeTotal: 0,
    total,
    billTotal: total,
    paymentMethod: latestOrder?.paymentMethod,
    note: '',
    openedAt: firstOrder?.createdAt || latestOrder?.createdAt || '',
    createdAt: firstOrder?.createdAt || latestOrder?.createdAt || '',
    updatedAt: latestOrder?.updatedAt || latestOrder?.createdAt || '',
    orders: sortedOrders,
    orderSummaries: [],
    latestOrderStatus: latestOrder?.status,
    latestOrderId: latestOrder?.id,
    latestOrderUpdatedAt: latestOrder?.updatedAt || latestOrder?.createdAt,
  };
};

const buildBillCards = ({
  billSessions,
  orders,
  filteredOrders,
}: {
  billSessions: AdminBillSession[];
  orders: AdminOrder[];
  filteredOrders: AdminOrder[];
}): BillCardView[] => {
  const filteredOrderIds = new Set(filteredOrders.map(order => order.id));
  const knownBillIds = new Set(billSessions.map(billSession => billSession.id));
  const ordersByBillId = orders.reduce((map, order) => {
    if (!order.billSessionId) {
      return map;
    }
    const current = map.get(order.billSessionId) || [];
    current.push(order);
    map.set(order.billSessionId, current);
    return map;
  }, new Map<string, AdminOrder[]>());

  const billCards = billSessions
    .map<BillCardView | null>(billSession => {
      const allOrders = sortChildOrders(
        billSession.orders.length > 0
          ? billSession.orders
          : ordersByBillId.get(billSession.id) || [],
      );
      const visibleOrders = allOrders.filter(order => filteredOrderIds.has(order.id));

      if (visibleOrders.length === 0) {
        return null;
      }

      const latestOrder = getLatestOrder(allOrders);
      return {
        billSession: {
          ...billSession,
          orders: allOrders,
          latestOrderStatus: latestOrder?.status || billSession.latestOrderStatus,
          latestOrderId: latestOrder?.id || billSession.latestOrderId,
          latestOrderUpdatedAt:
            latestOrder?.updatedAt || latestOrder?.createdAt || billSession.latestOrderUpdatedAt,
        },
        visibleOrders,
        allOrders,
        updatedAt:
          latestOrder?.updatedAt ||
          latestOrder?.createdAt ||
          billSession.updatedAt ||
          billSession.openedAt ||
          '',
      };
    })
    .filter(Boolean) as BillCardView[];

  const fallbackGroups = filteredOrders.reduce((map, order) => {
    if (order.billSessionId && knownBillIds.has(order.billSessionId)) {
      return map;
    }
    const key = [
      'loose_bill',
      order.branchId || 'no_branch',
      order.tableId || order.tableNumber || 'no_table',
    ].join(':');
    const current = map.get(key) || [];
    current.push(order);
    map.set(key, current);
    return map;
  }, new Map<string, AdminOrder[]>());

  fallbackGroups.forEach((visibleOrders, key) => {
    const allOrders = sortChildOrders(
      orders.filter(order => {
        const orderKey = [
          'loose_bill',
          order.branchId || 'no_branch',
          order.tableId || order.tableNumber || 'no_table',
        ].join(':');
        return orderKey === key && (!order.billSessionId || !knownBillIds.has(order.billSessionId));
      }),
    );
    const billSession = createFallbackBillSession(key, allOrders.length ? allOrders : visibleOrders);
    billCards.push({
      billSession,
      visibleOrders: sortChildOrders(visibleOrders),
      allOrders: allOrders.length ? allOrders : visibleOrders,
      updatedAt: billSession.updatedAt,
      isFallbackGroup: true,
    });
  });

  return billCards.sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  );
};

const getTransferableTables = (
  tables: AdminRestaurantTable[],
  billSession: AdminBillSession,
) =>
  tables
    .filter(table => {
      if (table.status === 'HIDDEN') {
        return false;
      }
      if (table.id === billSession.tableId) {
        return false;
      }
      if (billSession.branchId && table.branchId !== billSession.branchId) {
        return false;
      }
      return true;
    })
    .sort((left, right) =>
      String(left.tableNumber || '').localeCompare(String(right.tableNumber || ''), 'vi'),
    );

const canTransferBillSession = (billSession: AdminBillSession, isFallbackGroup?: boolean) =>
  !isFallbackGroup && ['OPEN', 'PAYMENT_REQUESTED'].includes(billSession.status);

const canRequestBillPayment = (billSession: AdminBillSession, isFallbackGroup?: boolean) =>
  !isFallbackGroup && billSession.status === 'OPEN';

const canMarkBillPaid = (billSession: AdminBillSession, isFallbackGroup?: boolean) =>
  !isFallbackGroup && ['OPEN', 'PAYMENT_REQUESTED'].includes(billSession.status);

const canCloseBillSession = (billSession: AdminBillSession, isFallbackGroup?: boolean) =>
  !isFallbackGroup && billSession.status === 'PAID';

const hasBillPaymentActions = (billSession: AdminBillSession, isFallbackGroup?: boolean) =>
  canRequestBillPayment(billSession, isFallbackGroup) ||
  canMarkBillPaid(billSession, isFallbackGroup) ||
  canCloseBillSession(billSession, isFallbackGroup);

const AdminOrdersScreen = ({
  orders,
  billSessions,
  tables,
  filter,
  onChangeFilter,
  styles,
  onChangeStatus,
  onChangePaymentStatus,
  onUpdateBillPayment,
  onCloseBill,
  onTransferBillTable,
  onRefreshOrders,
  orderSyncStatus,
  lastOrderSyncAt,
  newOrderNotice,
}: Props) => {
  const [expandedTransferBillId, setExpandedTransferBillId] = useState('');

  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') {
      return orders;
    }

    if (filter === 'PAID' || filter === 'UNPAID') {
      return orders.filter(order => order.paymentStatus === filter);
    }

    return orders.filter(order => order.status === filter);
  }, [filter, orders]);

  const billCards = useMemo(
    () => buildBillCards({billSessions, orders, filteredOrders}),
    [billSessions, filteredOrders, orders],
  );

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

  const openBillCount = useMemo(
    () => billSessions.filter(billSession => billSession.status === 'OPEN').length,
    [billSessions],
  );

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
          <RNText style={styles.kpiValue}>{openBillCount}</RNText>
          <RNText style={styles.kpiLabel}>Bill đang mở</RNText>
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
          <RNText style={styles.sectionTitle}>Hóa đơn theo bàn</RNText>
          <RNText style={styles.sectionHint}>
            Mỗi bill gom các order con của cùng BillSession/bàn; tổng tiền tự cập nhật khi khách gọi thêm.
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
            <RNText style={styles.orderRefreshButtonText}>Làm mới bill</RNText>
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

      {billCards.length === 0 ? (
        <RNView style={styles.emptyState}>
          <RNText style={styles.emptyIcon}>🧾</RNText>
          <RNText style={styles.emptyText}>Chưa có bill trong bộ lọc này</RNText>
          <RNText style={styles.emptySubText}>
            Khi khách gửi giỏ hàng, bill của bàn và order con sẽ xuất hiện tại đây.
          </RNText>
        </RNView>
      ) : (
        <RNView style={styles.billSessionGrid}>
          {billCards.map(({billSession, visibleOrders, allOrders, isFallbackGroup}) => {
            const latestOrder = getLatestOrder(allOrders);
            const billTotal = Number(billSession.total ?? billSession.billTotal ?? 0);
            const childCountLabel =
              filter === 'ALL'
                ? `${allOrders.length} order con`
                : `${visibleOrders.length}/${allOrders.length} order con trong lọc`;

            return (
              <RNView key={billSession.id} style={styles.billSessionCard}>
                <RNView style={styles.billSessionHeader}>
                  <RNView style={styles.billSessionTitleBlock}>
                    <RNText style={styles.billSessionCode} numberOfLines={1}>
                      {isFallbackGroup ? 'Đơn lẻ chưa gắn BillSession' : billSession.id}
                    </RNText>
                    <RNText style={styles.billSessionTable}>
                      Bàn {billSession.tableNumber || 'chưa nhập'}
                    </RNText>
                    <RNText style={styles.billSessionMeta} numberOfLines={1}>
                      {billSession.branchId ? `Chi nhánh ${billSession.branchId} · ` : ''}
                      Mở lúc {formatDateTime(billSession.openedAt || billSession.createdAt)}
                    </RNText>
                  </RNView>
                  <RNView style={styles.billSessionStatusPill}>
                    <RNText style={styles.billSessionStatusText}>
                      {ADMIN_BILL_SESSION_STATUS_LABELS[billSession.status] || billSession.status}
                    </RNText>
                  </RNView>
                </RNView>

                <RNView style={styles.billSessionSummaryGrid}>
                  <RNView style={styles.billSessionSummaryItem}>
                    <RNText style={styles.billSessionSummaryValue}>{childCountLabel}</RNText>
                    <RNText style={styles.billSessionSummaryLabel}>Số order</RNText>
                  </RNView>
                  <RNView style={styles.billSessionSummaryItem}>
                    <RNText style={styles.billSessionSummaryValue} numberOfLines={1}>
                      {formatCurrency(billTotal)}
                    </RNText>
                    <RNText style={styles.billSessionSummaryLabel}>Tổng bill</RNText>
                  </RNView>
                  <RNView style={styles.billSessionSummaryItem}>
                    <RNText style={styles.billSessionSummaryValue} numberOfLines={1}>
                      {latestOrder?.status
                        ? ADMIN_ORDER_STATUS_SHORT_LABELS[latestOrder.status]
                        : '—'}
                    </RNText>
                    <RNText style={styles.billSessionSummaryLabel}>Order mới nhất</RNText>
                  </RNView>
                </RNView>

                <RNView style={styles.billPaymentSummaryBox}>
                  <RNView style={styles.billPaymentSummaryRow}>
                    <RNText style={styles.billPaymentSummaryLabel}>Tạm tính</RNText>
                    <RNText style={styles.billPaymentSummaryValue}>
                      {formatCurrency(Number(billSession.subtotal || 0))}
                    </RNText>
                  </RNView>
                  <RNView style={styles.billPaymentSummaryRow}>
                    <RNText style={styles.billPaymentSummaryLabel}>Giảm giá / phí DV</RNText>
                    <RNText style={styles.billPaymentSummaryValue}>
                      -{formatCurrency(Number(billSession.discountTotal || 0))} / +{formatCurrency(Number(billSession.serviceFeeTotal || 0))}
                    </RNText>
                  </RNView>
                  <RNView style={styles.billPaymentSummaryRow}>
                    <RNText style={styles.billPaymentSummaryLabel}>Phương thức</RNText>
                    <RNText style={styles.billPaymentSummaryValue}>
                      {billSession.paymentMethod
                        ? ADMIN_PAYMENT_METHOD_LABELS[billSession.paymentMethod]
                        : 'Chưa chọn'}
                    </RNText>
                  </RNView>
                </RNView>

                {hasBillPaymentActions(billSession, isFallbackGroup) ? (
                  <RNView style={styles.billPaymentActionBlock}>
                    <RNView style={styles.billPaymentActionHeader}>
                      <RNText style={styles.billPaymentActionTitle}>Thanh toán hóa đơn</RNText>
                      <RNText style={styles.billPaymentActionHint}>
                        Bill PAID/CLOSED sẽ khóa app khách, không gọi thêm vào phiên cũ.
                      </RNText>
                    </RNView>
                    <RNView style={styles.billPaymentActionRow}>
                      {canRequestBillPayment(billSession, isFallbackGroup) ? (
                        <Pressable
                          onPress={() => onUpdateBillPayment(billSession.id, 'PAYMENT_REQUESTED')}
                          style={styles.billPaymentSecondaryButton}
                          accessibilityRole="button">
                          <RNText style={styles.billPaymentSecondaryButtonText}>
                            Yêu cầu thanh toán
                          </RNText>
                        </Pressable>
                      ) : null}

                      {canMarkBillPaid(billSession, isFallbackGroup)
                        ? ADMIN_PAYMENT_METHODS.map(method => (
                            <Pressable
                              key={method}
                              onPress={() => onUpdateBillPayment(billSession.id, 'PAID', method)}
                              style={styles.billPaymentPrimaryButton}
                              accessibilityRole="button">
                              <RNText style={styles.billPaymentPrimaryButtonText} numberOfLines={1}>
                                Đã thanh toán · {ADMIN_PAYMENT_METHOD_LABELS[method]}
                              </RNText>
                            </Pressable>
                          ))
                        : null}

                      {canCloseBillSession(billSession, isFallbackGroup) ? (
                        <Pressable
                          onPress={() => onCloseBill(billSession.id)}
                          style={styles.billPaymentCloseButton}
                          accessibilityRole="button">
                          <RNText style={styles.billPaymentCloseButtonText}>
                            Đóng hóa đơn
                          </RNText>
                        </Pressable>
                      ) : null}
                    </RNView>
                  </RNView>
                ) : null}

                {canTransferBillSession(billSession, isFallbackGroup) ? (
                  <RNView style={styles.billTransferBlock}>
                    <Pressable
                      onPress={() =>
                        setExpandedTransferBillId(current =>
                          current === billSession.id ? '' : billSession.id,
                        )
                      }
                      style={styles.billTransferButton}
                      accessibilityRole="button">
                      <RNText style={styles.billTransferButtonText}>
                        Đổi bàn / chuyển bill
                      </RNText>
                    </Pressable>
                    {expandedTransferBillId === billSession.id ? (
                      <RNView style={styles.billTransferPanel}>
                        <RNText style={styles.billTransferHint}>
                          Chỉ nhân viên/admin được đổi bàn. Nếu bàn đích đang có bill mở,
                          app sẽ chặn để tránh gộp nhầm hóa đơn.
                        </RNText>
                        <RNView style={styles.billTransferChipWrap}>
                          {getTransferableTables(tables, billSession).length === 0 ? (
                            <RNText style={styles.billTransferEmpty}>
                              Không còn bàn phù hợp trong chi nhánh này.
                            </RNText>
                          ) : (
                            getTransferableTables(tables, billSession).map(table => (
                              <Pressable
                                key={table.id}
                                onPress={() => {
                                  setExpandedTransferBillId('');
                                  onTransferBillTable(billSession.id, table.id);
                                }}
                                style={styles.billTransferChip}
                                accessibilityRole="button">
                                <RNText style={styles.billTransferChipText} numberOfLines={1}>
                                  {table.tableNumber}
                                  {table.status === 'OCCUPIED' ? ' · đang dùng' : ''}
                                </RNText>
                              </Pressable>
                            ))
                          )}
                        </RNView>
                      </RNView>
                    ) : null}
                  </RNView>
                ) : null}

                <RNView style={styles.billSessionChildHeader}>
                  <RNText style={styles.billSessionChildTitle}>Order con</RNText>
                  <RNText style={styles.billSessionChildHint}>
                    Tổng bill vẫn tính từ toàn bộ order hợp lệ, order huỷ không cộng tiền.
                  </RNText>
                </RNView>

                <RNView style={styles.billSessionChildGrid}>
                  {visibleOrders.map((order: AdminOrder) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      styles={styles}
                      onChangeStatus={onChangeStatus}
                      onChangePaymentStatus={onChangePaymentStatus}
                    />
                  ))}
                </RNView>
              </RNView>
            );
          })}
        </RNView>
      )}
    </RNView>
  );
};

export default memo(AdminOrdersScreen);
