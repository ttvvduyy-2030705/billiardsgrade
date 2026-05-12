import {
  deleteMenuCategory,
  deleteMenuItem,
  deleteRestaurantTable,
  getActiveRestaurantContext,
  updateRestaurantBranch,
  loadMenuCategories,
  loadMenuItems,
  loadOrders,
  loadRestaurantBranches,
  loadRestaurantTables,
  updateRestaurantOrderPaymentStatus,
  updateRestaurantOrderStatus,
  uploadRestaurantMenuImage,
  getRestaurantMenuRepositoryMode,
  setActiveRestaurantContext,
  upsertMenuCategory,
  updateRestaurantTable,
  upsertMenuItem,
  createRestaurantTable,
} from './restaurantMenuRepository';
import {
  getRestaurantAdminSession,
  isRestaurantAdminSessionValid,
  updateRestaurantAdminSessionContext,
} from './restaurantAdminAuthService';
import {getMenuItemImageValue} from './restaurantMenuImage';

import type {
  MenuCategory,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
  RestaurantOrder,
  RestaurantBranch,
  RestaurantOrderStatus,
  RestaurantPaymentMethod,
  RestaurantTable,
  RestaurantTablePayload,
} from './restaurantMenuRepository';
import type {RestaurantAdminSession} from './restaurantAdminAuthService';

export type AdminOrderStatus = RestaurantOrderStatus;
export type AdminRestaurantTable = RestaurantTable;
export type AdminRestaurantBranch = RestaurantBranch;
export type AdminRestaurantTableForm = RestaurantTablePayload & {id?: string};
export type AdminBranchQrForm = {
  id: string;
  restaurantId: string;
  name: string;
  address?: string;
  menuQrToken?: string;
  status?: RestaurantBranch['status'];
};

export type AdminPaymentStatus = 'UNPAID' | 'PAID';
export type AdminPaymentMethod = RestaurantPaymentMethod;
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

export type AdminMenuImageUploadForm = {
  itemId?: string;
  dishId?: string;
  uri?: string;
  base64?: string;
  dataUri?: string;
  fileName?: string;
  mimeType?: string;
};


export const ADMIN_ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  NEW: 'Đơn mới',
  ACCEPTED: 'Đã nhận đơn',
  PREPARING: 'Đang làm',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
};

export const ADMIN_ORDER_STATUS_SHORT_LABELS: Record<AdminOrderStatus, string> = {
  NEW: 'Mới',
  ACCEPTED: 'Đã nhận',
  PREPARING: 'Đang làm',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Huỷ',
};

export const ADMIN_ORDER_PRIMARY_ACTION_LABELS: Partial<
  Record<AdminOrderStatus, string>
> = {
  NEW: 'Nhận đơn',
  ACCEPTED: 'Bắt đầu làm',
  PREPARING: 'Hoàn thành',
};

export const ADMIN_PAYMENT_STATUS_LABELS: Record<AdminPaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
};

export const ADMIN_PAYMENT_METHOD_LABELS: Record<AdminPaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  MOCK: 'Test/mock',
};

export const ADMIN_PAYMENT_METHODS: AdminPaymentMethod[] = [
  'CASH',
  'BANK_TRANSFER',
  'MOCK',
];

export const ADMIN_ORDER_STATUS_FLOW: AdminOrderStatus[] = [
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'COMPLETED',
  'CANCELLED',
];

const ADMIN_ORDER_STATUS_TRANSITIONS: Record<
  AdminOrderStatus,
  AdminOrderStatus[]
> = {
  NEW: ['NEW', 'ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['ACCEPTED', 'PREPARING', 'CANCELLED'],
  PREPARING: ['PREPARING', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED'],
};

const normaliseIdList = (ids?: Array<string | undefined>) =>
  (ids || []).map(id => String(id || '').trim()).filter(Boolean);

type AdminScope = {
  session: RestaurantAdminSession;
  restaurantId: string;
  branchId?: string;
  allowedRestaurantIds: string[];
  allowedBranchIds: string[];
};

const getSessionRestaurantIds = (session: RestaurantAdminSession) =>
  normaliseIdList([...(session.restaurantIds || []), session.activeRestaurantId]);

const getSessionBranchIds = (session: RestaurantAdminSession) =>
  normaliseIdList([...(session.branchIds || []), session.activeBranchId]);

const ensureAdminScope = async (): Promise<AdminScope> => {
  const session = await getRestaurantAdminSession();

  if (!isRestaurantAdminSessionValid(session)) {
    throw new Error('Phiên Admin đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const currentContext = await getActiveRestaurantContext();
  const allowedRestaurantIds = getSessionRestaurantIds(session as RestaurantAdminSession);
  let restaurantId = currentContext.restaurantId;

  if (allowedRestaurantIds.length > 0 && !allowedRestaurantIds.includes(restaurantId)) {
    restaurantId =
      session?.activeRestaurantId && allowedRestaurantIds.includes(session.activeRestaurantId)
        ? session.activeRestaurantId
        : allowedRestaurantIds[0];
  }

  const branches = await loadRestaurantBranches(restaurantId);
  const branchIdsInRestaurant = new Set(branches.map(branch => branch.id));
  const allowedBranchIds = getSessionBranchIds(session as RestaurantAdminSession).filter(branchId =>
    branchIdsInRestaurant.has(branchId),
  );
  let branchId = currentContext.restaurantId === restaurantId ? currentContext.branchId : undefined;

  if (allowedBranchIds.length > 0 && (!branchId || !allowedBranchIds.includes(branchId))) {
    branchId =
      session?.activeBranchId && allowedBranchIds.includes(session.activeBranchId)
        ? session.activeBranchId
        : allowedBranchIds[0];
  }

  const contextChanged =
    currentContext.restaurantId !== restaurantId ||
    currentContext.branchId !== branchId ||
    currentContext.source !== 'admin';

  if (contextChanged) {
    await setActiveRestaurantContext({
      restaurantId,
      branchId,
      tableId: undefined,
      tableNumber: undefined,
      qrCodeToken: undefined,
      menuQrToken: undefined,
      source: 'admin',
      role: session?.role,
      allowedRestaurantIds,
    });
  }

  await updateRestaurantAdminSessionContext({
    restaurantId,
    branchId,
  });

  return {
    session: session as RestaurantAdminSession,
    restaurantId,
    branchId,
    allowedRestaurantIds,
    allowedBranchIds,
  };
};

const filterOrdersByScope = (orders: RestaurantOrder[], scope: AdminScope) => {
  if (scope.allowedBranchIds.length > 0) {
    return orders.filter(order =>
      order.branchId ? scope.allowedBranchIds.includes(order.branchId) : false,
    );
  }

  return scope.branchId
    ? orders.filter(order => order.branchId === scope.branchId)
    : orders;
};

const filterTablesByScope = (tables: RestaurantTable[], scope: AdminScope) => {
  if (scope.allowedBranchIds.length > 0) {
    return tables.filter(table =>
      table.branchId ? scope.allowedBranchIds.includes(table.branchId) : false,
    );
  }

  return scope.branchId
    ? tables.filter(table => table.branchId === scope.branchId)
    : tables;
};

const assertRestaurantScope = (scope: AdminScope, restaurantId?: string) => {
  if (restaurantId && restaurantId !== scope.restaurantId) {
    throw new Error('Tài khoản hiện tại không có quyền thao tác nhà hàng này.');
  }
};

const assertBranchScope = (scope: AdminScope, branchId?: string) => {
  if (!branchId || scope.allowedBranchIds.length === 0) {
    return;
  }

  if (!scope.allowedBranchIds.includes(branchId)) {
    throw new Error('Tài khoản hiện tại không có quyền thao tác chi nhánh này.');
  }
};

const assertManagerPermission = (scope: AdminScope) => {
  if (scope.session.role === 'STAFF') {
    throw new Error('Tài khoản nhân viên chỉ được xem và xử lý đơn trong phạm vi được cấp, không được sửa menu/bàn/QR.');
  }
};

export const isAdminOrderStatusTransitionAllowed = (
  fromStatus: AdminOrderStatus,
  toStatus: AdminOrderStatus,
) => ADMIN_ORDER_STATUS_TRANSITIONS[fromStatus].includes(toStatus);

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

export type AdminOrderSummary = {
  totalOrders: number;
  newOrders: number;
  acceptedOrders: number;
  preparingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  unpaidOrders: number;
  paidOrders: number;
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
};

export const getAdminOrderNextStatus = (
  order: Pick<AdminOrder, 'status'>,
): AdminOrderStatus | null => {
  switch (order.status) {
    case 'NEW':
      return 'ACCEPTED';
    case 'ACCEPTED':
      return 'PREPARING';
    case 'PREPARING':
      return 'COMPLETED';
    case 'COMPLETED':
    case 'CANCELLED':
    default:
      return null;
  }
};

export const getAdminOrderSummary = (orders: AdminOrder[]): AdminOrderSummary => {
  return orders.reduce<AdminOrderSummary>(
    (summary, order) => {
      summary.totalOrders += 1;
      summary.totalRevenue += Number(order.total || 0);

      switch (order.status) {
        case 'NEW':
          summary.newOrders += 1;
          break;
        case 'ACCEPTED':
          summary.acceptedOrders += 1;
          break;
        case 'PREPARING':
          summary.preparingOrders += 1;
          break;
        case 'COMPLETED':
          summary.completedOrders += 1;
          break;
        case 'CANCELLED':
          summary.cancelledOrders += 1;
          break;
        default:
          break;
      }

      if (order.paymentStatus === 'PAID') {
        summary.paidOrders += 1;
        summary.paidRevenue += Number(order.total || 0);
      } else {
        summary.unpaidOrders += 1;
        summary.unpaidRevenue += Number(order.total || 0);
      }

      return summary;
    },
    {
      totalOrders: 0,
      newOrders: 0,
      acceptedOrders: 0,
      preparingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      unpaidOrders: 0,
      paidOrders: 0,
      totalRevenue: 0,
      paidRevenue: 0,
      unpaidRevenue: 0,
    },
  );
};

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
    paymentMethod: order.paymentMethod || 'MOCK',
  };
};

const sortAdminOrders = (orders: AdminOrder[]) =>
  [...orders].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  );

export const mapToAdminOrders = (orders: RestaurantOrder[]) =>
  sortAdminOrders(orders.map(toAdminOrder));

export const loadAdminOrders = async () => {
  const scope = await ensureAdminScope();
  const orders = await loadOrders();
  return mapToAdminOrders(filterOrdersByScope(orders, scope));
};

export const loadRestaurantAdminData = async () => {
  const scope = await ensureAdminScope();
  const [categories, menuItems, orders, tables] = await Promise.all([
    loadMenuCategories(),
    loadMenuItems(),
    loadOrders(),
    loadRestaurantTables(scope.restaurantId),
  ]);

  return {
    categories,
    menuItems,
    orders: mapToAdminOrders(filterOrdersByScope(orders, scope)),
    tables: filterTablesByScope(tables, scope),
  };
};


export const loadAdminTables = async () => {
  const scope = await ensureAdminScope();
  const tables = await loadRestaurantTables(scope.restaurantId);
  return filterTablesByScope(tables, scope);
};

export const saveAdminTable = async (input: AdminRestaurantTableForm) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  assertRestaurantScope(scope, input.restaurantId);
  const branchId = input.branchId || scope.branchId;
  assertBranchScope(scope, branchId);

  const payload: RestaurantTablePayload = {
    restaurantId: scope.restaurantId,
    branchId,
    tableNumber: input.tableNumber,
    qrCodeToken: input.qrCodeToken,
    status: input.status,
  };

  if (input.id) {
    return updateRestaurantTable(input.id, payload);
  }

  return createRestaurantTable(payload);
};

export const deleteAdminTable = async (tableId: string) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  const tables = await loadRestaurantTables(scope.restaurantId);
  const table = tables.find(item => item.id === tableId);
  if (!table) {
    throw new Error('Không tìm thấy bàn trong nhà hàng hiện tại.');
  }
  assertBranchScope(scope, table.branchId);
  return filterTablesByScope(await deleteRestaurantTable(tableId), scope);
};

export const saveAdminBranchQr = async (input: AdminBranchQrForm) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  assertRestaurantScope(scope, input.restaurantId);
  assertBranchScope(scope, input.id);

  return updateRestaurantBranch(input.id, {
    restaurantId: scope.restaurantId,
    name: input.name,
    address: input.address,
    menuQrToken: input.menuQrToken,
    status: input.status,
  });
};

export const uploadAdminMenuImage = async (input: AdminMenuImageUploadForm) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);

  // Local mode still uses the existing RNFS/private-file flow in the admin form.
  // Server upload is only meaningful when the repository is API-backed so
  // multiple devices can see the same image URL.
  if (getRestaurantMenuRepositoryMode() !== 'api') {
    return {ok: false, imageUrl: ''};
  }

  if (!input.base64 && !input.dataUri) {
    throw new Error('Thiếu dữ liệu ảnh để upload lên server.');
  }

  return uploadRestaurantMenuImage({
    ...input,
    itemId: input.itemId || input.dishId,
    dishId: input.dishId || input.itemId,
  });
};

export const saveAdminMenuItem = async (input: AdminMenuItemForm) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  const cleanImageUrl = getMenuItemImageValue(input);

  const nextItems = await upsertMenuItem({
    id: input.id,
    createdAt: input.createdAt,
    restaurantId: scope.restaurantId,
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
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  const nextItems = await deleteMenuItem(itemId);

  return nextItems;
};

export const saveAdminMenuCategory = async (
  input: Partial<MenuCategory> & {name: string},
) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  const result = await upsertMenuCategory({
    ...input,
    restaurantId: scope.restaurantId,
  });
  return result;
};

export const deleteAdminMenuCategory = async (
  categoryId: string,
  moveItemsToCategoryId?: string,
) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  const result = await deleteMenuCategory(categoryId, {
    moveItemsToCategoryId,
    restaurantId: scope.restaurantId,
  });
  const menuItems = await loadMenuItems();

  return {...result, menuItems};
};

const getOrderInScope = async (orderId: string, scope: AdminScope) => {
  const orders = filterOrdersByScope(await loadOrders(), scope);
  const order = orders.find(item => item.id === orderId);

  if (!order) {
    throw new Error('Đơn hàng không thuộc nhà hàng/chi nhánh mà tài khoản hiện tại được cấp quyền.');
  }

  return toAdminOrder(order);
};

export const updateAdminOrderStatus = async (
  orderId: string,
  status: AdminOrderStatus,
) => {
  const scope = await ensureAdminScope();
  const order = await getOrderInScope(orderId, scope);

  if (!isAdminOrderStatusTransitionAllowed(order.status, status)) {
    throw new Error('Không thể chuyển trạng thái đơn không đúng luồng hoặc đơn đã hoàn tất/hủy.');
  }

  const nextOrders = await updateRestaurantOrderStatus(
    orderId,
    toStorageStatus(status),
  );

  return mapToAdminOrders(filterOrdersByScope(nextOrders, scope));
};

export const updateAdminOrderPaymentStatus = async (
  orderId: string,
  paymentStatus: AdminPaymentStatus,
  paymentMethod?: AdminPaymentMethod,
) => {
  const scope = await ensureAdminScope();
  const order = await getOrderInScope(orderId, scope);

  if (order.status === 'CANCELLED' && paymentStatus === 'PAID') {
    throw new Error('Đơn đã huỷ không thể đánh dấu đã thanh toán.');
  }

  const nextOrders = await updateRestaurantOrderPaymentStatus(
    orderId,
    paymentStatus,
    paymentMethod,
  );

  return mapToAdminOrders(filterOrdersByScope(nextOrders, scope));
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
