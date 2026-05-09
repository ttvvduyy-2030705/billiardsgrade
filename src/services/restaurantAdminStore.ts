import {
  deleteMenuCategory,
  deleteMenuItem,
  loadMenuCategories,
  loadMenuItems,
  loadOrders,
  updateRestaurantOrderPaymentStatus,
  updateRestaurantOrderStatus,
  upsertMenuCategory,
  upsertMenuItem,
} from './restaurantMenuRepository';
import {getMenuItemImageValue} from './restaurantMenuImage';

import type {
  MenuCategory,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
  RestaurantOrder,
  RestaurantOrderStatus,
} from './restaurantMenuRepository';

export type AdminOrderStatus = RestaurantOrderStatus;

export type AdminPaymentStatus = 'UNPAID' | 'PAID';
export type AdminOrderFilter = AdminOrderStatus | 'ALL' | AdminPaymentStatus;

export type AdminOrder = RestaurantOrder & {
  /** UI alias only. Canonical processing state is orderStatus. */
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

export const ADMIN_ORDER_FILTERS: AdminOrderFilter[] = [
  'ALL',
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'COMPLETED',
  'UNPAID',
  'PAID',
  'CANCELLED',
];

const toAdminStatus = (status?: RestaurantOrderStatus): AdminOrderStatus => {
  switch (status) {
    case 'ACCEPTED':
    case 'PREPARING':
    case 'COMPLETED':
    case 'CANCELLED':
      return status;
    case 'NEW':
    default:
      return 'NEW';
  }
};

const toStorageStatus = (status: AdminOrderStatus): RestaurantOrderStatus => {
  return toAdminStatus(status);
};

const toPaymentStatus = (order: RestaurantOrder): AdminPaymentStatus => {
  return order.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID';
};

const toAdminOrder = (order: RestaurantOrder): AdminOrder => {
  const orderStatus = toAdminStatus(order.orderStatus);

  return {
    ...order,
    orderStatus,
    status: orderStatus,
    paymentStatus: toPaymentStatus(order),
  };
};

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

  return nextItems;
};

export const deleteAdminMenuItem = async (itemId: string) => {
  const nextItems = await deleteMenuItem(itemId);

  return nextItems;
};

export const saveAdminMenuCategory = async (
  input: Partial<MenuCategory> & {name: string},
) => {
  const result = await upsertMenuCategory(input);
  return result;
};

export const deleteAdminMenuCategory = async (
  categoryId: string,
  moveItemsToCategoryId?: string,
) => {
  const result = await deleteMenuCategory(categoryId, {moveItemsToCategoryId});
  const menuItems = await loadMenuItems();

  return {...result, menuItems};
};

export const updateAdminOrderStatus = async (
  orderId: string,
  status: AdminOrderStatus,
) => {
  const nextOrders = await updateRestaurantOrderStatus(
    orderId,
    toStorageStatus(status),
  );

  return nextOrders.map(toAdminOrder);
};

export const updateAdminOrderPaymentStatus = async (
  orderId: string,
  paymentStatus: AdminPaymentStatus,
) => {
  const nextOrders = await updateRestaurantOrderPaymentStatus(
    orderId,
    paymentStatus,
  );

  return nextOrders.map(toAdminOrder);
};

export const getCategoryLabel = (
  categoryId: string,
  categories: MenuCategory[],
) => {
  return (
    categories.find(category => category.id === categoryId)?.name ||
    'Chưa phân loại'
  );
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
