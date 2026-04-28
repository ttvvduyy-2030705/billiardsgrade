import {
  getMenuItemImageValue,
  loadMenuCategories,
  loadMenuItems,
  loadOrders,
  saveOrders,
  upsertMenuItem,
} from './restaurantMenuStorage';

import type {
  MenuCategory,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
  RestaurantOrder,
  RestaurantOrderStatus,
} from './restaurantMenuStorage';

export type AdminOrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'COMPLETED'
  | 'CANCELLED';

export type AdminPaymentStatus = 'UNPAID' | 'PAID';

export type AdminOrder = Omit<RestaurantOrder, 'status'> & {
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
};

export type AdminMenuItemForm = {
  id?: string;
  createdAt?: string;
  name: string;
  price: number;
  categoryId: string;
  description: string;
  imageUrl?: string;
  status: RestaurantMenuItemStatus;
  available?: boolean;
};

export const ADMIN_ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  NEW: 'Đơn mới',
  ACCEPTED: 'Đã nhận đơn',
  PREPARING: 'Đang làm',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
};

export const ADMIN_PAYMENT_STATUS_LABELS: Record<AdminPaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
};

export const ADMIN_ORDER_STATUS_FLOW: AdminOrderStatus[] = [
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'COMPLETED',
  'CANCELLED',
];

export const ADMIN_ORDER_FILTERS: Array<AdminOrderStatus | 'ALL' | 'PAID'> = [
  'ALL',
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'COMPLETED',
  'PAID',
  'CANCELLED',
];

const toAdminStatus = (status?: RestaurantOrderStatus): AdminOrderStatus => {
  switch (status) {
    case 'accepted':
      return 'ACCEPTED';
    case 'preparing':
      return 'PREPARING';
    case 'served':
    case 'completed':
    case 'paid':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    case 'new':
    default:
      return 'NEW';
  }
};

const toStorageStatus = (status: AdminOrderStatus): RestaurantOrderStatus => {
  switch (status) {
    case 'ACCEPTED':
      return 'accepted';
    case 'PREPARING':
      return 'preparing';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'NEW':
    default:
      return 'new';
  }
};

const toPaymentStatus = (order: RestaurantOrder): AdminPaymentStatus => {
  if (order.paymentStatus === 'PAID' || order.status === 'paid') {
    return 'PAID';
  }

  return 'UNPAID';
};

const toAdminOrder = (order: RestaurantOrder): AdminOrder => ({
  ...order,
  status: toAdminStatus(order.status),
  paymentStatus: toPaymentStatus(order),
});

export const loadRestaurantAdminData = async () => {
  const [categories, menuItems, orders] = await Promise.all([
    loadMenuCategories(),
    loadMenuItems(),
    loadOrders(),
  ]);

  return {
    categories,
    menuItems,
    orders: orders.map(toAdminOrder),
  };
};

export const saveAdminMenuItem = async (input: AdminMenuItemForm) => {
  const cleanImageUrl = getMenuItemImageValue(input);

  console.log(
    `[AdminMenuForm] submit image=${cleanImageUrl || 'none'}`,
  );

  const nextItems = await upsertMenuItem({
    id: input.id,
    createdAt: input.createdAt,
    name: input.name,
    price: input.price,
    categoryId: input.categoryId,
    description: input.description,
    imageUrl: cleanImageUrl,
    status: input.status,
    available: input.status === 'SELLING',
  });

  const savedItem = input.id
    ? nextItems.find(item => item.id === input.id)
    : nextItems[0];

  console.log('[Admin Food Image Save] food object =', savedItem);
  console.log(
    `[AdminMenuStore] after update item image=${getMenuItemImageValue(savedItem) || 'none'}`,
  );

  return nextItems;
};

export const updateAdminOrderStatus = async (
  orderId: string,
  status: AdminOrderStatus,
) => {
  const current = await loadOrders();
  const timestamp = new Date().toISOString();
  const nextOrders = current.map(order =>
    order.id === orderId
      ? {
          ...order,
          status: toStorageStatus(status),
          paymentStatus: order.paymentStatus || 'UNPAID',
          updatedAt: timestamp,
        }
      : order,
  );

  await saveOrders(nextOrders);
  return nextOrders.map(toAdminOrder);
};

export const updateAdminOrderPaymentStatus = async (
  orderId: string,
  paymentStatus: AdminPaymentStatus,
) => {
  const current = await loadOrders();
  const timestamp = new Date().toISOString();
  const nextOrders = current.map(order =>
    order.id === orderId
      ? {
          ...order,
          paymentStatus,
          status:
            paymentStatus === 'PAID' && order.status === 'new'
              ? 'completed'
              : order.status,
          updatedAt: timestamp,
        }
      : order,
  );

  await saveOrders(nextOrders);
  return nextOrders.map(toAdminOrder);
};

export const getCategoryLabel = (
  categoryId: string,
  categories: MenuCategory[],
) => {
  return categories.find(category => category.id === categoryId)?.name || 'Chưa phân loại';
};

export const getMenuItemStatusLabel = (item: RestaurantMenuItem) => {
  switch (item.status) {
    case 'HIDDEN':
      return 'Tạm ẩn';
    case 'OUT_OF_STOCK':
      return 'Hết hàng';
    case 'SELLING':
    default:
      return item.available === false ? 'Tạm ẩn' : 'Đang bán';
  }
};
