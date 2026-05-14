import {
  closeRestaurantBillSession,
  deleteMenuCategory,
  deleteMenuItem,
  deleteRestaurantTable,
  getActiveRestaurantContext,
  updateRestaurantBranch,
  updateRestaurantWorkspace,
  loadMenuCategories,
  loadMenuItems,
  loadOrders,
  loadBillSessions,
  loadRestaurantBranches,
  loadRestaurantTables,
  updateRestaurantBillSessionPayment,
  updateRestaurantBillSessionTable,
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
import {sanitizeRestaurantScopedRuntimeData} from './restaurantMenuStorage';

import type {
  MenuCategory,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
  RestaurantOrder,
  RestaurantBillSessionDetail,
  RestaurantBillSessionStatus,
  RestaurantBranch,
  RestaurantOrderStatus,
  RestaurantPaymentMethod,
  RestaurantTable,
  RestaurantTablePayload,
} from './restaurantMenuRepository';
import type {RestaurantAdminSession} from './restaurantAdminAuthService';

export type AdminOrderStatus = RestaurantOrderStatus;
export type AdminBillSessionStatus = RestaurantBillSessionStatus;
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

export type AdminBillTableTransferForm = {
  billSessionId: string;
  tableId: string;
  reason?: string;
};

export type AdminBillPaymentForm = {
  billSessionId: string;
  status: 'PAYMENT_REQUESTED' | 'PAID';
  paymentMethod?: AdminPaymentMethod;
  discountTotal?: number;
  serviceFeeTotal?: number;
  note?: string;
};

export type AdminBillCloseForm = {
  billSessionId: string;
  note?: string;
};

export type AdminPaymentStatus = 'UNPAID' | 'PAID';
export type AdminPaymentMethod = RestaurantPaymentMethod;
export type AdminOrderFilter = AdminOrderStatus | 'ALL' | AdminPaymentStatus;

export type AdminOrder = RestaurantOrder & {
  /** UI alias only. Canonical processing state is orderStatus. */
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
};

export type AdminBillSession = Omit<
  RestaurantBillSessionDetail,
  'orders' | 'status'
> & {
  status: AdminBillSessionStatus;
  orders: AdminOrder[];
  latestOrderStatus?: AdminOrderStatus;
  latestOrderId?: string;
  latestOrderUpdatedAt?: string;
};

export type AdminMenuItemForm = {
  id?: string;
  createdAt?: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName?: string;
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

export const ADMIN_ORDER_STATUS_SHORT_LABELS: Record<AdminOrderStatus, string> =
  {
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
  MOCK: 'Khác',
};

export const ADMIN_BILL_SESSION_STATUS_LABELS: Record<
  AdminBillSessionStatus,
  string
> = {
  OPEN: 'Đang mở',
  PAYMENT_REQUESTED: 'Yêu cầu thanh toán',
  PAID: 'Đã thanh toán',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã huỷ',
};

export const ADMIN_PAYMENT_METHODS: AdminPaymentMethod[] = [
  'CASH',
  'BANK_TRANSFER',
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


const LEGACY_DEMO_RESTAURANT_IDS = new Set([
  'aplus_billiards_hanoi',
  'aplus_hanoi',
  'haidilao_demo',
  'haidilao_local_demo',
  'local_restaurant',
  'legacy_removed_restaurant',
]);

const LEGACY_DEMO_BRANCH_IDS = new Set([
  'aplus_hanoi_main',
  'aplus_hanoi_vip',
  'haidilao_demo_main',
  'haidilao_demo_2',
  'haidilao_local_main_branch',
  'local_main_branch',
  'legacy_removed_branch',
]);

const isLegacyDemoRestaurantId = (restaurantId?: string | null) => {
  const id = String(restaurantId || '').trim();
  return Boolean(id) && (LEGACY_DEMO_RESTAURANT_IDS.has(id) || /^aplus_|^haidilao_|^seed_|^sample_/i.test(id));
};

const isLegacyDemoBranchId = (branchId?: string | null) => {
  const id = String(branchId || '').trim();
  return Boolean(id) && (LEGACY_DEMO_BRANCH_IDS.has(id) || /^aplus_|^haidilao_|^seed_|^sample_/i.test(id));
};

const normaliseIdList = (ids?: Array<string | undefined>) =>
  (ids || []).map(id => String(id || '').trim()).filter(Boolean);

type AdminScope = {
  session: RestaurantAdminSession;
  restaurantId: string;
  branchId?: string;
  menuQrToken?: string;
  allowedRestaurantIds: string[];
  allowedBranchIds: string[];
};

const getSessionRestaurantIds = (session: RestaurantAdminSession) =>
  normaliseIdList([
    ...(session.restaurantIds || []),
    session.activeRestaurantId,
  ]).filter(id => !isLegacyDemoRestaurantId(id));

const getSessionBranchIds = (session: RestaurantAdminSession) =>
  normaliseIdList([...(session.branchIds || []), session.activeBranchId]).filter(
    id => !isLegacyDemoBranchId(id),
  );

const getPrimaryBranchForScope = (
  branches: RestaurantBranch[],
  scope: Pick<AdminScope, 'restaurantId' | 'branchId' | 'allowedBranchIds'>,
) => {
  return (
    (scope.branchId
      ? branches.find(
          branch =>
            branch.id === scope.branchId &&
            branch.restaurantId === scope.restaurantId,
        )
      : undefined) ||
    (scope.allowedBranchIds.length > 0
      ? branches.find(
          branch =>
            branch.restaurantId === scope.restaurantId &&
            scope.allowedBranchIds.includes(branch.id),
        )
      : undefined) ||
    branches.find(branch => branch.restaurantId === scope.restaurantId)
  );
};

const getBranchMenuQrToken = (branches: RestaurantBranch[], branchId?: string) => {
  const branch = branchId
    ? branches.find(item => item.id === branchId)
    : branches[0];
  return String(branch?.menuQrToken || '').trim() || undefined;
};

const ensureAdminScope = async (): Promise<AdminScope> => {
  const session = await getRestaurantAdminSession();

  if (!isRestaurantAdminSessionValid(session)) {
    throw new Error('Phiên Admin đã hết hạn. Vui lòng đăng nhập lại.');
  }

  let currentContext = await getActiveRestaurantContext().catch(() => null);
  const allowedRestaurantIds = getSessionRestaurantIds(
    session as RestaurantAdminSession,
  );
  const sessionRestaurantId =
    session?.activeRestaurantId &&
    allowedRestaurantIds.includes(session.activeRestaurantId)
      ? session.activeRestaurantId
      : undefined;
  let restaurantId =
    sessionRestaurantId ||
    (currentContext?.restaurantId &&
    !isLegacyDemoRestaurantId(currentContext.restaurantId) &&
    allowedRestaurantIds.includes(currentContext.restaurantId)
      ? currentContext.restaurantId
      : undefined) ||
    allowedRestaurantIds[0];

  if (!restaurantId || isLegacyDemoRestaurantId(restaurantId)) {
    throw new Error('Tài khoản Admin chưa có quán riêng sạch. Vui lòng đăng xuất rồi đăng nhập/đăng ký lại.');
  }

  if (!currentContext || currentContext.restaurantId !== restaurantId) {
    currentContext = await setActiveRestaurantContext({
      restaurantId,
      branchId: session?.activeBranchId,
      tableId: undefined,
      tableNumber: undefined,
      qrCodeToken: undefined,
      menuQrToken: session?.menuQrToken,
      qrTokenScope: session?.menuQrToken ? 'BRANCH_MENU' : undefined,
      source: 'admin',
      role: session?.role,
      allowedRestaurantIds,
    });
  }

  const branches = await loadRestaurantBranches(restaurantId);
  const branchIdsInRestaurant = new Set(branches.map(branch => branch.id));
  const allowedBranchIds = getSessionBranchIds(
    session as RestaurantAdminSession,
  ).filter(branchId => branchIdsInRestaurant.has(branchId));
  let branchId =
    currentContext.restaurantId === restaurantId
      ? currentContext.branchId
      : undefined;

  if (
    allowedBranchIds.length > 0 &&
    (!branchId || !allowedBranchIds.includes(branchId))
  ) {
    branchId =
      session?.activeBranchId &&
      allowedBranchIds.includes(session.activeBranchId)
        ? session.activeBranchId
        : allowedBranchIds[0];
  }

  const branchMenuQrToken = getBranchMenuQrToken(branches, branchId) || session?.menuQrToken;
  const contextChanged =
    currentContext.restaurantId !== restaurantId ||
    currentContext.branchId !== branchId ||
    currentContext.source !== 'admin' ||
    currentContext.menuQrToken !== branchMenuQrToken;

  if (contextChanged) {
    await setActiveRestaurantContext({
      restaurantId,
      branchId,
      tableId: undefined,
      tableNumber: undefined,
      qrCodeToken: undefined,
      menuQrToken: branchMenuQrToken,
      qrTokenScope: branchMenuQrToken ? 'BRANCH_MENU' : undefined,
      source: 'admin',
      role: session?.role,
      allowedRestaurantIds,
    });
  }

  if (getRestaurantMenuRepositoryMode() !== 'api') {
    await sanitizeRestaurantScopedRuntimeData(restaurantId);
  }

  await updateRestaurantAdminSessionContext({
    restaurantId,
    branchId,
    menuQrToken: branchMenuQrToken,
  });

  return {
    session: session as RestaurantAdminSession,
    restaurantId,
    branchId,
    menuQrToken: branchMenuQrToken,
    allowedRestaurantIds,
    allowedBranchIds,
  };
};

const belongsToRestaurant = (
  record: {restaurantId?: string},
  scope: AdminScope,
) => String(record.restaurantId || '') === scope.restaurantId;

const filterCategoriesByScope = (categories: MenuCategory[], scope: AdminScope) =>
  categories.filter(category => belongsToRestaurant(category, scope));

const filterMenuItemsByScope = (items: RestaurantMenuItem[], scope: AdminScope) =>
  items.filter(item => belongsToRestaurant(item, scope));

const filterOrdersByScope = (orders: RestaurantOrder[], scope: AdminScope) => {
  const scopedOrders = orders.filter(order => belongsToRestaurant(order, scope));

  if (scope.allowedBranchIds.length > 0) {
    return scopedOrders.filter(order =>
      order.branchId ? scope.allowedBranchIds.includes(order.branchId) : false,
    );
  }

  return scope.branchId
    ? scopedOrders.filter(order => order.branchId === scope.branchId)
    : scopedOrders;
};

const filterBillSessionsByScope = (
  billSessions: RestaurantBillSessionDetail[],
  scope: AdminScope,
) => {
  const scopedBillSessions = billSessions.filter(billSession =>
    belongsToRestaurant(billSession, scope),
  );

  if (scope.allowedBranchIds.length > 0) {
    return scopedBillSessions.filter(billSession =>
      billSession.branchId
        ? scope.allowedBranchIds.includes(billSession.branchId)
        : false,
    );
  }

  return scope.branchId
    ? scopedBillSessions.filter(
        billSession => billSession.branchId === scope.branchId,
      )
    : scopedBillSessions;
};

const filterTablesByScope = (tables: RestaurantTable[], scope: AdminScope) => {
  const scopedTables = tables.filter(table => belongsToRestaurant(table, scope));

  if (scope.allowedBranchIds.length > 0) {
    return scopedTables.filter(table =>
      table.branchId ? scope.allowedBranchIds.includes(table.branchId) : true,
    );
  }

  return scope.branchId
    ? scopedTables.filter(table => table.branchId === scope.branchId)
    : scopedTables;
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
    throw new Error(
      'Tài khoản hiện tại không có quyền thao tác chi nhánh này.',
    );
  }
};

const assertManagerPermission = (scope: AdminScope) => {
  if (scope.session.role === 'STAFF') {
    throw new Error(
      'Tài khoản nhân viên chỉ được xem và xử lý đơn trong phạm vi được cấp, không được sửa menu/QR.',
    );
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

export const getAdminOrderSummary = (
  orders: AdminOrder[],
): AdminOrderSummary => {
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
    paymentMethod:
      order.paymentMethod === 'MOCK' ? 'CASH' : order.paymentMethod || 'CASH',
  };
};

const sortAdminOrders = (orders: AdminOrder[]) =>
  [...orders].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  );

export const mapToAdminOrders = (orders: RestaurantOrder[]) =>
  sortAdminOrders(orders.map(toAdminOrder));

const sortBillChildOrders = (orders: AdminOrder[]) =>
  [...orders].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
  );

const toAdminBillSession = (
  billSession: RestaurantBillSessionDetail,
): AdminBillSession => {
  const childOrders = sortBillChildOrders(
    (billSession.orders || []).map(toAdminOrder),
  );
  const latestOrder = [...childOrders].sort((a, b) =>
    String(b.createdAt || b.updatedAt || '').localeCompare(
      String(a.createdAt || a.updatedAt || ''),
    ),
  )[0];

  return {
    ...billSession,
    status: billSession.status || 'OPEN',
    orders: childOrders,
    orderCount: Number(billSession.orderCount || childOrders.length),
    latestOrderStatus: latestOrder?.status,
    latestOrderId: latestOrder?.id,
    latestOrderUpdatedAt: latestOrder?.updatedAt || latestOrder?.createdAt,
  };
};

const sortAdminBillSessions = (billSessions: AdminBillSession[]) =>
  [...billSessions].sort((a, b) =>
    String(b.updatedAt || b.openedAt || b.createdAt || '').localeCompare(
      String(a.updatedAt || a.openedAt || a.createdAt || ''),
    ),
  );

export const mapToAdminBillSessions = (
  billSessions: RestaurantBillSessionDetail[],
) => sortAdminBillSessions(billSessions.map(toAdminBillSession));

export const loadAdminOrders = async () => {
  const scope = await ensureAdminScope();
  const orders = await loadOrders(scope.restaurantId);
  return mapToAdminOrders(filterOrdersByScope(orders, scope));
};

export const loadAdminBillSessions = async () => {
  const scope = await ensureAdminScope();
  const billSessions = await loadBillSessions(scope.restaurantId);
  return mapToAdminBillSessions(filterBillSessionsByScope(billSessions, scope));
};

export const loadAdminOrderDashboard = async () => {
  const scope = await ensureAdminScope();
  const [orders, billSessions] = await Promise.all([
    loadOrders(scope.restaurantId),
    loadBillSessions(scope.restaurantId),
  ]);

  return {
    orders: mapToAdminOrders(filterOrdersByScope(orders, scope)),
    billSessions: mapToAdminBillSessions(
      filterBillSessionsByScope(billSessions, scope),
    ),
  };
};

export const loadRestaurantAdminData = async () => {
  const scope = await ensureAdminScope();
  const [categories, menuItems, orders, billSessions, tables] =
    await Promise.all([
      loadMenuCategories(scope.restaurantId),
      loadMenuItems(scope.restaurantId),
      loadOrders(scope.restaurantId),
      loadBillSessions(scope.restaurantId),
      loadRestaurantTables(scope.restaurantId),
    ]);

  return {
    categories: filterCategoriesByScope(categories, scope),
    menuItems: filterMenuItemsByScope(menuItems, scope),
    orders: mapToAdminOrders(filterOrdersByScope(orders, scope)),
    billSessions: mapToAdminBillSessions(
      filterBillSessionsByScope(billSessions, scope),
    ),
    tables: filterTablesByScope(tables, scope),
  };
};

export const loadAdminTables = async () => {
  const scope = await ensureAdminScope();
  const tables = await loadRestaurantTables(scope.restaurantId);
  return filterTablesByScope(tables, scope);
};


export const saveAdminRestaurantName = async (input: {
  restaurantId: string;
  name: string;
}) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  assertRestaurantScope(scope, input.restaurantId);

  const name = input.name.trim();
  if (!name) {
    throw new Error('Vui lòng nhập tên quán.');
  }

  const restaurant = await updateRestaurantWorkspace(scope.restaurantId, {name});

  if (scope.branchId) {
    try {
      await updateRestaurantBranch(scope.branchId, {
        restaurantId: scope.restaurantId,
        name,
      });
    } catch (_error) {
      // Branch name is an implementation detail now; restaurant name remains the source of truth.
    }
  }

  await setActiveRestaurantContext({
    restaurantId: scope.restaurantId,
    restaurantName: restaurant.name,
    branchId: scope.branchId,
    menuQrToken: scope.menuQrToken,
    qrTokenScope: scope.menuQrToken ? 'BRANCH_MENU' : undefined,
    source: 'admin',
    role: scope.session.role,
    allowedRestaurantIds: scope.allowedRestaurantIds,
  });
  await updateRestaurantAdminSessionContext({
    restaurantId: scope.restaurantId,
    restaurantName: restaurant.name,
    branchId: scope.branchId,
    menuQrToken: scope.menuQrToken,
  });

  return restaurant;
};

const getManagedTableNumber = (index: number) => `Bàn ${index}`;

const getManagedTableIndex = (tableNumber?: string) => {
  const normalized = String(tableNumber || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const match = normalized.match(/^ban\s*0*(\d+)$/);
  if (!match?.[1]) {
    return 0;
  }
  const index = Number(match[1]);
  return Number.isInteger(index) && index > 0 ? index : 0;
};

const createManagedTableToken = (
  restaurantId: string,
  branchId: string | undefined,
  index: number,
) => {
  const scopeKey = `${restaurantId}_${branchId || 'main'}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'restaurant';
  return `qr_${scopeKey}_ban_${index}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
};

export const syncAdminTableCount = async (tableCount: number) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);

  const targetCount = Math.floor(Number(tableCount));
  if (!Number.isFinite(targetCount) || targetCount < 1 || targetCount > 200) {
    throw new Error('Số bàn chỉ được nhập số từ 1 đến 200.');
  }

  const branches = await loadRestaurantBranches(scope.restaurantId);
  const targetBranch = getPrimaryBranchForScope(branches, scope);
  const targetBranchId = targetBranch?.id || scope.branchId;

  if (!targetBranchId) {
    throw new Error('Chưa có chi nhánh để gắn danh sách bàn. Vui lòng đăng xuất rồi đăng nhập lại.');
  }

  const tableScope: AdminScope = {
    ...scope,
    branchId: targetBranchId,
    allowedBranchIds:
      scope.allowedBranchIds.length > 0
        ? scope.allowedBranchIds
        : [targetBranchId],
    menuQrToken: targetBranch?.menuQrToken || scope.menuQrToken,
  };

  await updateRestaurantAdminSessionContext({
    restaurantId: scope.restaurantId,
    branchId: targetBranchId,
    menuQrToken: tableScope.menuQrToken,
  });
  await setActiveRestaurantContext({
    restaurantId: scope.restaurantId,
    branchId: targetBranchId,
    tableId: undefined,
    tableNumber: undefined,
    qrCodeToken: undefined,
    menuQrToken: tableScope.menuQrToken,
    qrTokenScope: tableScope.menuQrToken ? 'BRANCH_MENU' : undefined,
    source: 'admin',
    role: scope.session.role,
    allowedRestaurantIds: scope.allowedRestaurantIds,
  });

  const allTables = await loadRestaurantTables(scope.restaurantId);
  const scopedTables = filterTablesByScope(allTables, tableScope).filter(
    table => !table.branchId || table.branchId === targetBranchId,
  );
  const tableByIndex = new Map<number, RestaurantTable>();

  scopedTables.forEach(table => {
    const index = getManagedTableIndex(table.tableNumber);
    if (index > 0 && !tableByIndex.has(index)) {
      tableByIndex.set(index, table);
    }
  });

  for (let index = 1; index <= targetCount; index += 1) {
    const expectedTableNumber = getManagedTableNumber(index);
    const existingTable = tableByIndex.get(index);

    if (existingTable) {
      const mustUpdate =
        existingTable.tableNumber !== expectedTableNumber ||
        existingTable.branchId !== targetBranchId ||
        existingTable.status !== 'AVAILABLE';
      if (mustUpdate) {
        await updateRestaurantTable(existingTable.id, {
          restaurantId: scope.restaurantId,
          branchId: targetBranchId,
          tableNumber: expectedTableNumber,
          qrCodeToken:
            existingTable.qrCodeToken ||
            createManagedTableToken(scope.restaurantId, targetBranchId, index),
          status: 'AVAILABLE',
        });
      }
      continue;
    }

    await createRestaurantTable({
      restaurantId: scope.restaurantId,
      branchId: targetBranchId,
      tableNumber: expectedTableNumber,
      qrCodeToken: createManagedTableToken(scope.restaurantId, targetBranchId, index),
      status: 'AVAILABLE',
    });
  }

  for (const table of scopedTables) {
    const index = getManagedTableIndex(table.tableNumber);
    const keepVisible =
      index >= 1 &&
      index <= targetCount &&
      tableByIndex.get(index)?.id === table.id;
    if (!keepVisible && table.status !== 'HIDDEN') {
      await updateRestaurantTable(table.id, {
        restaurantId: scope.restaurantId,
        branchId: table.branchId || targetBranchId,
        tableNumber: table.tableNumber,
        qrCodeToken: table.qrCodeToken,
        status: 'HIDDEN',
      });
    }
  }

  const nextTables = await loadRestaurantTables(scope.restaurantId);
  return filterTablesByScope(nextTables, tableScope);
};

export const saveAdminTable = async (input: AdminRestaurantTableForm) => {
  const scope = await ensureAdminScope();
  assertManagerPermission(scope);
  assertRestaurantScope(scope, input.restaurantId);
  const branches = await loadRestaurantBranches(scope.restaurantId);
  const branchId =
    input.branchId ||
    scope.branchId ||
    getPrimaryBranchForScope(branches, scope)?.id;

  if (!branchId) {
    throw new Error('Chưa có chi nhánh để gắn bàn. Vui lòng đăng xuất rồi đăng nhập lại.');
  }

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
    categoryName: input.categoryName,
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
  const menuItems = await loadMenuItems(scope.restaurantId);

  return {...result, menuItems};
};

const getOrderInScope = async (orderId: string, scope: AdminScope) => {
  const orders = filterOrdersByScope(await loadOrders(scope.restaurantId), scope);
  const order = orders.find(item => item.id === orderId);

  if (!order) {
    throw new Error(
      'Đơn hàng không thuộc nhà hàng/chi nhánh mà tài khoản hiện tại được cấp quyền.',
    );
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
    throw new Error(
      'Không thể chuyển trạng thái đơn không đúng luồng hoặc đơn đã hoàn tất/hủy.',
    );
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

const getBillSessionInScope = async (
  billSessionId: string,
  scope: AdminScope,
) => {
  const billSessions = filterBillSessionsByScope(
    await loadBillSessions(scope.restaurantId),
    scope,
  );
  const billSession = billSessions.find(item => item.id === billSessionId);

  if (!billSession) {
    throw new Error(
      'Hóa đơn không thuộc nhà hàng/chi nhánh mà tài khoản hiện tại được cấp quyền.',
    );
  }

  return billSession;
};

export const updateAdminBillSessionPayment = async (
  input: AdminBillPaymentForm,
): Promise<AdminBillSession> => {
  const scope = await ensureAdminScope();
  const billSession = await getBillSessionInScope(input.billSessionId, scope);

  if (['CLOSED', 'CANCELLED'].includes(billSession.status)) {
    throw new Error('Hóa đơn đã đóng/hủy nên không thể cập nhật thanh toán.');
  }
  if (billSession.status === 'PAID' && input.status !== 'PAID') {
    throw new Error(
      'Hóa đơn đã thanh toán, không thể chuyển về yêu cầu thanh toán.',
    );
  }

  const updated = await updateRestaurantBillSessionPayment(billSession.id, {
    status: input.status,
    paymentMethod: input.paymentMethod,
    discountTotal: input.discountTotal,
    serviceFeeTotal: input.serviceFeeTotal,
    note: input.note,
  });

  return toAdminBillSession(updated);
};

export const closeAdminBillSession = async (
  input: AdminBillCloseForm,
): Promise<AdminBillSession> => {
  const scope = await ensureAdminScope();
  const billSession = await getBillSessionInScope(input.billSessionId, scope);

  if (billSession.status !== 'PAID' && billSession.status !== 'CLOSED') {
    throw new Error('Chỉ đóng hóa đơn sau khi đã đánh dấu thanh toán.');
  }

  const updated = await closeRestaurantBillSession(billSession.id, {
    note: input.note,
  });

  return toAdminBillSession(updated);
};

export const transferAdminBillSessionTable = async (
  input: AdminBillTableTransferForm,
): Promise<AdminBillSession> => {
  const scope = await ensureAdminScope();
  const billSession = await getBillSessionInScope(input.billSessionId, scope);
  if (['PAID', 'CLOSED', 'CANCELLED'].includes(billSession.status)) {
    throw new Error('Hóa đơn đã thanh toán/đóng/hủy nên không thể đổi bàn.');
  }

  const tables = filterTablesByScope(
    await loadRestaurantTables(scope.restaurantId),
    scope,
  );
  const targetTable = tables.find(table => table.id === input.tableId);
  if (!targetTable) {
    throw new Error('Bàn đích không thuộc phạm vi chi nhánh được cấp quyền.');
  }
  if (targetTable.status === 'HIDDEN') {
    throw new Error('Không thể chuyển bill sang bàn đang ẩn.');
  }
  if (targetTable.id === billSession.tableId) {
    throw new Error('Bill đang ở bàn này rồi.');
  }

  const updated = await updateRestaurantBillSessionTable(billSession.id, {
    tableId: targetTable.id,
    tableNumber: targetTable.tableNumber,
    branchId: targetTable.branchId,
    reason: input.reason,
    changedByUsername: scope.session.username,
    changedByRole: scope.session.role,
  });

  return toAdminBillSession(updated);
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
