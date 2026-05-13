import AsyncStorage from '@react-native-async-storage/async-storage';
import {devWarn} from 'utils/devLogger';
import {
  cleanupRestaurantMenuImageIfUnused,
  getMenuItemImageValue,
} from './restaurantMenuImage';
import {
  createRestaurantWorkspace,
  loadRestaurantBranches,
} from './restaurantWorkspaceStorage';

export {
  getMenuItemImageValue,
  normaliseMenuImageUri,
} from './restaurantMenuImage';

const DEFAULT_LOCAL_RESTAURANT_ID = 'local_restaurant';
const HAIDILAO_LOCAL_RESTAURANT_ID = 'legacy_removed_restaurant';
const DEFAULT_LOCAL_BRANCH_ID = 'local_main_branch';
const HAIDILAO_LOCAL_BRANCH_ID = 'legacy_removed_branch';
const DEFAULT_LOCAL_TABLE_ID = 'local_table_01';
const HAIDILAO_LOCAL_TABLE_ID = 'legacy_removed_table';

export const RESTAURANT_STORAGE_KEYS = {
  schemaVersion: 'restaurant_menu_schema_version',
  categories: 'menu_categories',
  menuItems: 'menu_items',
  orders: 'restaurant_orders',
  billSessions: 'restaurant_bill_sessions',
  currentCart: 'current_cart',
  adminAccounts: 'admin_accounts',
  legacyAdminAccounts: 'restaurant_admin_accounts',
};

const CURRENT_SCHEMA_VERSION = '20260513_batch26_production_cleanup_v2';

export type MenuCategory = {
  id: string;
  /** Required in Batch 10 repository/API foundation. */
  restaurantId?: string;
  name: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type RestaurantMenuItemStatus = 'SELLING' | 'HIDDEN' | 'OUT_OF_STOCK';

export type RestaurantMenuItem = {
  id: string;
  /** Required in Batch 10 repository/API foundation. */
  restaurantId?: string;
  categoryId: string;
  name: string;
  price: number;
  description: string;
  /** Source of truth for menu item image. Can be a remote URL or local picker URI. */
  imageUrl?: string;
  /** Legacy field from older builds. New code must not write this field. */
  imageUri?: string;
  available: boolean;
  status?: RestaurantMenuItemStatus;
  createdAt: string;
  updatedAt: string;
  /** Legacy field from the first local menu version. Kept only for safe migration. */
  category?: string;
};

export type RestaurantCartItem = {
  itemId: string;
  quantity: number;
};

export type RestaurantBillSessionStatus =
  | 'OPEN'
  | 'PAYMENT_REQUESTED'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED';

export const RESTAURANT_BILL_SESSION_STATUSES: RestaurantBillSessionStatus[] = [
  'OPEN',
  'PAYMENT_REQUESTED',
  'PAID',
  'CLOSED',
  'CANCELLED',
];

export const CUSTOMER_ORDERABLE_BILL_SESSION_STATUSES: RestaurantBillSessionStatus[] =
  ['OPEN', 'PAYMENT_REQUESTED'];

export const FINAL_BILL_SESSION_STATUSES: RestaurantBillSessionStatus[] = [
  'PAID',
  'CLOSED',
  'CANCELLED',
];

export type RestaurantCartState = {
  /** Required in Batch 10 repository/API foundation. */
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
  /**
   * Batch 16 rule: before the first successful order, customer can choose/input a table.
   * Once billSessionId is present, UI should show lockedTableNumber readonly instead.
   */
  tableNumber: string;
  guestSessionId?: string;
  billSessionId?: string;
  lockedTableId?: string;
  lockedTableNumber?: string;
  billStatus?: RestaurantBillSessionStatus;
  note: string;
  items: RestaurantCartItem[];
};

export type RestaurantOrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'COMPLETED'
  | 'CANCELLED';

type LegacyRestaurantOrderStatus = RestaurantOrderStatus | string;
export type RawRestaurantOrder = Omit<
  Partial<RestaurantOrder>,
  'orderStatus' | 'status' | 'paymentStatus'
> & {
  /** Canonical field from Batch 2 onward. */
  orderStatus?: LegacyRestaurantOrderStatus;
  /** Legacy field from older local/admin builds. Kept only for migration. */
  status?: LegacyRestaurantOrderStatus;
  paymentStatus?: RestaurantPaymentStatus | string;
};

export type RestaurantOrderItem = {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
};

export type RestaurantPaymentStatus = 'UNPAID' | 'PAID';
export type RestaurantPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOCK';
export type RestaurantBillPaymentStatus = 'PAYMENT_REQUESTED' | 'PAID';

export const RESTAURANT_PAYMENT_METHODS: RestaurantPaymentMethod[] = [
  'CASH',
  'BANK_TRANSFER',
  'MOCK',
];

export type RestaurantPayment = {
  id: string;
  restaurantId?: string;
  branchId?: string;
  orderId: string;
  amount: number;
  method: RestaurantPaymentMethod;
  paymentStatus: RestaurantPaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantBillPaymentPayload = {
  status?: RestaurantBillPaymentStatus;
  paymentStatus?: RestaurantPaymentStatus;
  paymentMethod?: RestaurantPaymentMethod;
  discountTotal?: number;
  serviceFeeTotal?: number;
  note?: string;
};

export type RestaurantBillClosePayload = {
  note?: string;
};

export type RestaurantBillOrderSummary = {
  orderId: string;
  orderNumber: number;
  orderStatus: RestaurantOrderStatus;
  paymentStatus: RestaurantPaymentStatus;
  itemCount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantBillSummary = {
  billSessionId: string;
  restaurantId: string;
  branchId?: string;
  tableId?: string;
  tableNumber: string;
  status: RestaurantBillSessionStatus;
  orderCount: number;
  orders: RestaurantBillOrderSummary[];
  subtotal: number;
  discountTotal: number;
  serviceFeeTotal: number;
  total: number;
  paymentMethod?: RestaurantPaymentMethod;
  openedAt: string;
  paymentRequestedAt?: string;
  paidAt?: string;
  closedAt?: string;
};

export type RestaurantBillTableChangeLog = {
  id: string;
  auditLogId?: string;
  fromBranchId?: string;
  fromTableId?: string;
  fromTableNumber?: string;
  toBranchId?: string;
  toTableId?: string;
  toTableNumber: string;
  changedByUserId?: string;
  changedByUsername?: string;
  changedByRole?: string;
  reason?: string;
  changedAt: string;
};

export type RestaurantBillSession = {
  id: string;
  restaurantId: string;
  branchId?: string;
  tableId?: string;
  tableNumber: string;
  guestSessionId?: string;
  status: RestaurantBillSessionStatus;
  orderIds: string[];
  orderCount: number;
  subtotal: number;
  discountTotal: number;
  serviceFeeTotal: number;
  total: number;
  paymentMethod?: RestaurantPaymentMethod;
  note?: string;
  tableChangeLogs?: RestaurantBillTableChangeLog[];
  summary?: RestaurantBillSummary;
  openedAt: string;
  paymentRequestedAt?: string;
  paidAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantTableBill = RestaurantBillSession;

// Unprefixed aliases are intentional: the product plan names these contracts BillSession/TableBill.
export type BillSessionStatus = RestaurantBillSessionStatus;
export type BillPaymentStatus = RestaurantBillPaymentStatus;
export type BillPaymentPayload = RestaurantBillPaymentPayload;
export type BillClosePayload = RestaurantBillClosePayload;
export type BillOrderSummary = RestaurantBillOrderSummary;
export type BillSummary = RestaurantBillSummary;
export type BillTableChangeLog = RestaurantBillTableChangeLog;
export type BillSession = RestaurantBillSession;
export type TableBill = RestaurantTableBill;

export type RestaurantOrderSource = 'admin' | 'customer' | 'local';

export type RestaurantOrder = {
  id: string;
  /** Required once ApiRepository/server mode is enabled. Optional only for old local data migration. */
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
  billSessionId?: string;
  guestSessionId?: string;
  orderSource?: RestaurantOrderSource;
  tableNumber: string;
  items: RestaurantOrderItem[];
  note: string;
  total: number;
  /** Processing status. Never store PAID here; payment is kept in paymentStatus. */
  orderStatus: RestaurantOrderStatus;
  paymentStatus: RestaurantPaymentStatus;
  paymentMethod?: RestaurantPaymentMethod;
  createdAt: string;
  updatedAt: string;
};

export type RawRestaurantBillSession = Partial<RestaurantBillSession> & {
  billSessionId?: string;
  billTotal?: number;
  summary?: RestaurantBillSummary;
  status?: RestaurantBillSessionStatus | string;
  paymentMethod?: RestaurantPaymentMethod | string;
  orders?: RawRestaurantOrder[];
  orderSummaries?: RestaurantBillOrderSummary[];
};

export type RestaurantBillSessionDetail = RestaurantBillSession & {
  billSessionId: string;
  billTotal: number;
  orders: RestaurantOrder[];
  orderSummaries: RestaurantBillOrderSummary[];
  summary: RestaurantBillSummary;
};

export type RestaurantAdminAccount = {
  username: string;
  password: string;
  restaurantIds?: string[];
  activeRestaurantId?: string;
  role?: 'OWNER' | 'MANAGER' | 'STAFF';
  createdAt: string;
};

const nowIso = () => new Date().toISOString();

const stableHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
};

const getDefaultLocalAdminAccounts = (): RestaurantAdminAccount[] => [];

const LEGACY_INTERNAL_ADMIN_USERNAMES = new Set(['admin', 'haidilao', 'staff']);

const mergeDefaultLocalAdminAccounts = (accounts: RestaurantAdminAccount[]) => {
  const cleaned = accounts.filter(
    account =>
      !LEGACY_INTERNAL_ADMIN_USERNAMES.has(normalise(account.username)),
  );

  return cleaned.length === accounts.length ? accounts : cleaned;
};

const createId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const sampleTime = nowIso();

export const DEFAULT_DRINK_CATEGORY_ID = 'drink';
export const DEFAULT_FOOD_CATEGORY_ID = 'food';

export const DEFAULT_MENU_CATEGORIES: MenuCategory[] = [];

export const defaultMenuItems: RestaurantMenuItem[] = [];

const HAIDILAO_LOCAL_CATEGORIES: MenuCategory[] = [];

const HAIDILAO_LOCAL_MENU_ITEMS: RestaurantMenuItem[] = [];

const getSeedCategoriesForRestaurant = (_restaurantId: string) => [];

const getSeedItemsForRestaurant = (_restaurantId: string) => [];

const legacySeedCategoryIds = [
  'hotpot',
  'meat',
  'seafood',
  'vegetable',
  'snack',
  'combo',
  'other',
];

const legacySeedItemIds = [
  'sample_hotpot_combo',
  'sample_beef_plate',
  'sample_seafood_plate',
  'sample_mushroom_set',
  'sample_snack_combo',
  'sample_iced_tea',
];

const builtInSeedCategoryIds = new Set([
  DEFAULT_DRINK_CATEGORY_ID,
  DEFAULT_FOOD_CATEGORY_ID,
  'haidilao_hotpot',
  'haidilao_meat',
  'haidilao_side',
]);

const builtInSeedItemIds = new Set([
  ...legacySeedItemIds,
  'sample_coca',
  'sample_fanta',
  'sample_mirinda',
  'sample_pepsi',
  'haidilao_mushroom_hotpot',
  'haidilao_spicy_hotpot',
  'haidilao_beef_plate',
  'haidilao_vegetable_set',
]);

const isBuiltInSeedCategory = (category: Partial<MenuCategory>) =>
  builtInSeedCategoryIds.has(String(category.id || '')) ||
  String(category.id || '').startsWith('seed_');

const isBuiltInSeedItem = (item: Partial<RestaurantMenuItem>) =>
  builtInSeedItemIds.has(String(item.id || '')) ||
  String(item.id || '').startsWith('seed_');

const isBuiltInSeedOrder = (order: {id?: unknown}) =>
  String(order.id || '').startsWith('seed_') ||
  String(order.id || '').startsWith('seed_local_');

const isBuiltInSeedBillSession = (billSession: {id?: unknown; billSessionId?: unknown}) =>
  String(billSession.id || billSession.billSessionId || '').startsWith('seed_') ||
  String(billSession.id || billSession.billSessionId || '').startsWith('seed_local_');


const demoRuntimeKeywords = [
  'demo',
  'sample',
  'seed',
  'test',
  'du lieu mau',
  'mau',
  'haidilao',
  'aplus',
  'a plus',
  'nha hang cu',
  'nha hang chinh',
  'coca',
  'coca cola',
  'pepsi',
  'fanta',
  'mirinda',
  'tra da',
  'tra dao',
  'nuoc ngot',
  'do uong',
  'combo lau',
  'lau hai san',
  'bo my',
];

const normalizeDemoText = (value?: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

const containsDemoRuntimeText = (value?: unknown) => {
  const text = normalizeDemoText(value);
  return demoRuntimeKeywords.some(keyword => text.includes(keyword));
};

const getRuntimeCreatedMs = (record: {createdAt?: unknown; openedAt?: unknown; orderedAt?: unknown; updatedAt?: unknown}) => {
  const candidates = [record.createdAt, record.openedAt, record.orderedAt, record.updatedAt];
  for (const candidate of candidates) {
    const ms = Date.parse(String(candidate || ''));
    if (Number.isFinite(ms)) {
      return ms;
    }
  }
  return 0;
};

const isLikelyLeakedDemoCategory = (category: Partial<MenuCategory>) =>
  isBuiltInSeedCategory(category) ||
  containsDemoRuntimeText(`${category.id || ''} ${category.name || ''} ${(category as {description?: unknown}).description || ''}`);

const isLikelyLeakedDemoItem = (item: Partial<RestaurantMenuItem> & {note?: unknown}) =>
  isBuiltInSeedItem(item) ||
  isBuiltInSeedCategory({id: item.categoryId}) ||
  containsDemoRuntimeText(`${item.id || ''} ${item.categoryId || ''} ${item.name || ''} ${item.description || ''} ${item.note || ''}`);

const isLikelyLeakedDemoOrder = (order: Partial<RestaurantOrder>) => {
  if (isBuiltInSeedOrder(order) || containsDemoRuntimeText(`${order.id || ''} ${order.note || ''} ${order.guestSessionId || ''} ${order.tableNumber || ''}`)) {
    return true;
  }
  const items = Array.isArray(order.items) ? order.items : [];
  return items.length > 0 && items.every(item =>
    containsDemoRuntimeText(`${item.itemId || ''} ${item.name || ''} ${item.note || ''}`),
  );
};

const isLikelyLeakedDemoBillSession = (billSession: Partial<RestaurantBillSessionDetail>) =>
  isBuiltInSeedBillSession(billSession) ||
  containsDemoRuntimeText(`${billSession.id || ''} ${billSession.note || ''} ${billSession.guestSessionId || ''} ${billSession.tableNumber || ''}`) ||
  (Array.isArray(billSession.orders) && billSession.orders.some(isLikelyLeakedDemoOrder));

type LocalRuntimeSnapshot = {
  categories: MenuCategory[];
  items: RestaurantMenuItem[];
  orders: RestaurantOrder[];
  billSessions: RestaurantBillSessionDetail[];
  carts: unknown[];
};

const localRuntimeCount = (snapshot: LocalRuntimeSnapshot) =>
  snapshot.categories.length +
  snapshot.items.length +
  snapshot.orders.length +
  snapshot.billSessions.length +
  snapshot.carts.length;

const hasLocalRuntimeOlderThanAdmin = (
  snapshot: LocalRuntimeSnapshot,
  account?: Pick<RestaurantAdminAccount, 'createdAt'>,
) => {
  const adminCreatedMs = Date.parse(String(account?.createdAt || ''));
  if (!Number.isFinite(adminCreatedMs) || adminCreatedMs <= 0) {
    return false;
  }
  const records = [
    ...snapshot.categories,
    ...snapshot.items,
    ...snapshot.orders,
    ...snapshot.billSessions,
    ...snapshot.carts,
  ] as Array<{createdAt?: unknown; openedAt?: unknown; orderedAt?: unknown; updatedAt?: unknown}>;
  return records.some(record => {
    const recordMs = getRuntimeCreatedMs(record);
    return recordMs > 0 && recordMs + 1000 < adminCreatedMs;
  });
};

const hasLocalBundledDemoFootprint = (snapshot: LocalRuntimeSnapshot) => {
  const itemCount = snapshot.items.length;
  const orderCount = snapshot.orders.length;
  const billCount = snapshot.billSessions.length;
  const categoryCount = snapshot.categories.length;
  const cartCount = snapshot.carts.length;
  const demoItemCount = snapshot.items.filter(isLikelyLeakedDemoItem).length;
  const demoOrderCount = snapshot.orders.filter(isLikelyLeakedDemoOrder).length;
  const demoBillCount = snapshot.billSessions.filter(isLikelyLeakedDemoBillSession).length;
  const demoCategoryCount = snapshot.categories.filter(isLikelyLeakedDemoCategory).length;
  const cartHasDemoItems = snapshot.carts.some(cart => {
    const items = Array.isArray((cart as {items?: unknown[]})?.items)
      ? ((cart as {items?: unknown[]}).items || [])
      : [];
    return items.length === 0 || items.some(item =>
      containsDemoRuntimeText(
        `${(item as {itemId?: unknown})?.itemId || ''} ${(item as {name?: unknown})?.name || ''} ${(item as {note?: unknown})?.note || ''}`,
      ),
    );
  });

  return (
    (itemCount > 0 && itemCount <= 6 && demoItemCount > 0 && orderCount <= 2 && billCount <= 2) ||
    (orderCount > 0 && orderCount <= 2 && demoOrderCount > 0 && itemCount <= 8) ||
    (billCount > 0 && billCount <= 2 && demoBillCount > 0 && itemCount <= 8) ||
    (categoryCount > 0 && categoryCount <= 4 && demoCategoryCount === categoryCount && itemCount <= 8 && orderCount <= 2) ||
    (cartCount > 0 && cartCount <= 3 && cartHasDemoItems && itemCount <= 8)
  );
};

const normalise = (value?: string) => {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const safeJsonParse = <T>(value: string | null, fallback: T) => {
  if (!value) {
    return {value: fallback, ok: true};
  }

  try {
    return {value: JSON.parse(value) as T, ok: true};
  } catch (error) {
    devWarn('[RestaurantMenuStorage] invalid JSON, reset safe fallback', error);
    return {value: fallback, ok: false};
  }
};

const resolveRestaurantScopeId = (restaurantId?: string) => {
  const cleanRestaurantId = String(restaurantId || '').trim();
  return cleanRestaurantId || '__unassigned_restaurant_scope__';
};

const shouldSeedDemoMenuForRestaurant = (_restaurantId?: string) => false;

export const getRestaurantScopedStorageKey = (
  baseKey: string,
  restaurantId?: string,
) => `${baseKey}:${resolveRestaurantScopeId(restaurantId)}`;

const getScopedKeys = (restaurantId?: string) => {
  const scopeId = resolveRestaurantScopeId(restaurantId);

  return {
    restaurantId: scopeId,
    schemaVersion: getRestaurantScopedStorageKey(
      RESTAURANT_STORAGE_KEYS.schemaVersion,
      scopeId,
    ),
    categories: getRestaurantScopedStorageKey(
      RESTAURANT_STORAGE_KEYS.categories,
      scopeId,
    ),
    menuItems: getRestaurantScopedStorageKey(
      RESTAURANT_STORAGE_KEYS.menuItems,
      scopeId,
    ),
    orders: getRestaurantScopedStorageKey(
      RESTAURANT_STORAGE_KEYS.orders,
      scopeId,
    ),
    billSessions: getRestaurantScopedStorageKey(
      RESTAURANT_STORAGE_KEYS.billSessions,
      scopeId,
    ),
    currentCart: getRestaurantScopedStorageKey(
      RESTAURANT_STORAGE_KEYS.currentCart,
      scopeId,
    ),
  };
};

const readArray = async <T>(key: string): Promise<T[]> => {
  const raw = await AsyncStorage.getItem(key);
  const parsed = safeJsonParse<T[]>(raw, []);

  if (!parsed.ok) {
    await AsyncStorage.removeItem(key);
  }

  return Array.isArray(parsed.value) ? parsed.value : [];
};

const writeArray = async <T>(key: string, value: T[]) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const withRestaurantId = <T extends {restaurantId?: string}>(
  record: T,
  restaurantId: string,
): T => ({...record, restaurantId: record.restaurantId || restaurantId});

const cleanCategory = (
  category: Partial<MenuCategory>,
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
): MenuCategory => {
  const timestamp = nowIso();
  const cleanName = (category.name || '').trim() || 'Đồ uống';

  return {
    id: category.id || createId('cat'),
    restaurantId: category.restaurantId || restaurantId,
    name: cleanName,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt || timestamp,
    updatedAt: category.updatedAt || timestamp,
  };
};

const ensureDefaultCategories = (
  categories: MenuCategory[],
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
) => {
  const cleaned = categories.map(category =>
    cleanCategory(category, restaurantId),
  );
  const withoutDuplicateNames = cleaned.filter(
    (category, index, source) =>
      source.findIndex(
        item => normalise(item.name) === normalise(category.name),
      ) === index,
  );

  // Defaults are only used when there is no category data yet. After the first
  // seed, Admin must be able to rename/delete Đồ uống and Đồ ăn like normal
  // dynamic categories. Do not force them back into AsyncStorage on every load.
  return withoutDuplicateNames;
};

const seedDefaultMenu = async (restaurantId = DEFAULT_LOCAL_RESTAURANT_ID) => {
  const scopedKeys = getScopedKeys(restaurantId);
  const categories = getSeedCategoriesForRestaurant(
    scopedKeys.restaurantId,
  ).map(category => cleanCategory(category, scopedKeys.restaurantId));
  const seededItems = getSeedItemsForRestaurant(scopedKeys.restaurantId).map(
    item => migrateMenuItem(item, categories, scopedKeys.restaurantId),
  );

  await writeArray(scopedKeys.categories, categories);
  await writeArray(scopedKeys.menuItems, seededItems);
  await AsyncStorage.setItem(scopedKeys.schemaVersion, CURRENT_SCHEMA_VERSION);
};

const resolveCategoryId = (
  value: string | undefined,
  categories: MenuCategory[],
) => {
  const raw = normalise(value);
  const drinkCategory =
    categories.find(category => category.id === DEFAULT_DRINK_CATEGORY_ID) ||
    categories.find(
      category => normalise(category.name) === normalise('Đồ uống'),
    ) ||
    categories[0];
  const foodCategory =
    categories.find(category => category.id === DEFAULT_FOOD_CATEGORY_ID) ||
    categories.find(
      category => normalise(category.name) === normalise('Đồ ăn'),
    ) ||
    drinkCategory;

  if (!raw) {
    return drinkCategory?.id || DEFAULT_DRINK_CATEGORY_ID;
  }

  const byId = categories.find(category => normalise(category.id) === raw);
  if (byId) {
    return byId.id;
  }

  const byName = categories.find(category => normalise(category.name) === raw);
  if (byName) {
    return byName.id;
  }

  if (
    raw.includes('uong') ||
    raw.includes('drink') ||
    raw.includes('coca') ||
    raw.includes('pepsi') ||
    raw.includes('fanta') ||
    raw.includes('mirinda') ||
    raw.includes('tra') ||
    raw.includes('nuoc')
  ) {
    return drinkCategory?.id || DEFAULT_DRINK_CATEGORY_ID;
  }

  return foodCategory?.id || drinkCategory?.id || DEFAULT_FOOD_CATEGORY_ID;
};

const normaliseMenuItemStatus = (
  status: RestaurantMenuItemStatus | undefined,
  available?: boolean,
): RestaurantMenuItemStatus => {
  if (
    status === 'HIDDEN' ||
    status === 'OUT_OF_STOCK' ||
    status === 'SELLING'
  ) {
    return status;
  }

  return available === false ? 'HIDDEN' : 'SELLING';
};

const migrateMenuItem = (
  item: Partial<RestaurantMenuItem>,
  categories: MenuCategory[],
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
): RestaurantMenuItem => {
  const timestamp = nowIso();
  const categoryId = resolveCategoryId(
    item.categoryId || item.category,
    categories,
  );
  const status = normaliseMenuItemStatus(item.status, item.available);
  const imageUrl = getMenuItemImageValue(item);

  return {
    id: item.id || createId('dish'),
    restaurantId: item.restaurantId || restaurantId,
    categoryId,
    name: (item.name || 'Món chưa đặt tên').trim(),
    price: Number(item.price) || 0,
    description: item.description || '',
    imageUrl,
    imageUri: undefined,
    available: status === 'SELLING',
    status,
    createdAt: item.createdAt || timestamp,
    updatedAt: item.updatedAt || timestamp,
  };
};

const ensureRestaurantSchema = async (
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
) => {
  const scopedKeys = getScopedKeys(restaurantId);
  const version = await AsyncStorage.getItem(scopedKeys.schemaVersion);
  const [scopedCategories, scopedItems, legacyCategories, legacyItems] =
    await Promise.all([
      readArray<MenuCategory>(scopedKeys.categories),
      readArray<RestaurantMenuItem>(scopedKeys.menuItems),
      readArray<MenuCategory>(RESTAURANT_STORAGE_KEYS.categories),
      readArray<RestaurantMenuItem>(RESTAURANT_STORAGE_KEYS.menuItems),
    ]);

  if (
    version === CURRENT_SCHEMA_VERSION &&
    scopedCategories.length > 0 &&
    scopedItems.length > 0
  ) {
    return;
  }

  const shouldSeedDemoMenu = shouldSeedDemoMenuForRestaurant(scopedKeys.restaurantId);
  const sourceCategories =
    scopedCategories.length > 0
      ? scopedCategories
      : shouldSeedDemoMenu
        ? legacyCategories
        : [];
  const sourceItems =
    scopedItems.length > 0
      ? scopedItems
      : shouldSeedDemoMenu
        ? legacyItems
        : [];

  if (sourceCategories.length === 0 && sourceItems.length === 0) {
    if (shouldSeedDemoMenu) {
      await seedDefaultMenu(scopedKeys.restaurantId);
    } else {
      await writeArray(scopedKeys.categories, []);
      await writeArray(scopedKeys.menuItems, []);
      await AsyncStorage.setItem(scopedKeys.schemaVersion, CURRENT_SCHEMA_VERSION);
    }
    return;
  }

  const cleanSourceCategories = sourceCategories.filter(
    category => !isBuiltInSeedCategory(category),
  );
  const nextCategories = cleanSourceCategories.length > 0
    ? ensureDefaultCategories(
        cleanSourceCategories.map(category =>
          cleanCategory(
            withRestaurantId(category, scopedKeys.restaurantId),
            scopedKeys.restaurantId,
          ),
        ),
        scopedKeys.restaurantId,
      )
    : [];
  const nextItems = sourceItems
    .filter(item => !isBuiltInSeedItem(item))
    .map(item =>
      migrateMenuItem(
        withRestaurantId(item, scopedKeys.restaurantId),
        nextCategories,
        scopedKeys.restaurantId,
      ),
    );

  await writeArray(scopedKeys.categories, nextCategories);
  await writeArray(scopedKeys.menuItems, nextItems.length > 0 ? nextItems : []);
  await AsyncStorage.setItem(scopedKeys.schemaVersion, CURRENT_SCHEMA_VERSION);
};

export const getDefaultMenuItems = () => defaultMenuItems;

/**
 * Synchronous fallback kept for old code paths only. New UI loads categories
 * from repository/storage so admin can manage them dynamically per restaurant.
 */
export const getMenuCategories = () => DEFAULT_MENU_CATEGORIES;

export const loadMenuCategories = async (
  restaurantId?: string,
): Promise<MenuCategory[]> => {
  const scopedKeys = getScopedKeys(restaurantId);
  await ensureRestaurantSchema(scopedKeys.restaurantId);
  const stored = await readArray<MenuCategory>(scopedKeys.categories);

  if (stored.length === 0) {
    if (shouldSeedDemoMenuForRestaurant(scopedKeys.restaurantId)) {
      await seedDefaultMenu(scopedKeys.restaurantId);
      return DEFAULT_MENU_CATEGORIES.map(category =>
        cleanCategory(category, scopedKeys.restaurantId),
      );
    }

    return [];
  }

  const storedWithoutSeeds = stored.filter(category => !isBuiltInSeedCategory(category));
  const migrated = storedWithoutSeeds.length > 0
    ? ensureDefaultCategories(
        storedWithoutSeeds.map(category => cleanCategory(category, scopedKeys.restaurantId)),
        scopedKeys.restaurantId,
      )
    : [];

  if (JSON.stringify(stored) !== JSON.stringify(migrated)) {
    await writeArray(scopedKeys.categories, migrated);
  }

  return migrated.sort(
    (a, b) =>
      Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
      String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
  );
};

export const saveMenuCategories = async (
  categories: MenuCategory[],
  restaurantId?: string,
) => {
  const scopedKeys = getScopedKeys(restaurantId);
  const cleaned = ensureDefaultCategories(
    categories.map(category =>
      cleanCategory(category, scopedKeys.restaurantId),
    ),
    scopedKeys.restaurantId,
  );
  await writeArray(scopedKeys.categories, cleaned);
  await AsyncStorage.setItem(scopedKeys.schemaVersion, CURRENT_SCHEMA_VERSION);
  return cleaned;
};

export const upsertMenuCategory = async (
  input: Partial<MenuCategory> & {name: string},
): Promise<{ok: boolean; message: string; categories: MenuCategory[]}> => {
  const restaurantId = resolveRestaurantScopeId(input.restaurantId);
  const cleanName = input.name.trim();

  if (!cleanName) {
    return {
      ok: false,
      message: 'Vui lòng nhập tên danh mục',
      categories: await loadMenuCategories(restaurantId),
    };
  }

  const current = await loadMenuCategories(restaurantId);
  const existedName = current.some(
    category =>
      category.id !== input.id &&
      normalise(category.name) === normalise(cleanName),
  );

  if (existedName) {
    return {
      ok: false,
      message: 'Danh mục này đã tồn tại',
      categories: current,
    };
  }

  const timestamp = nowIso();
  const nextCategory: MenuCategory = {
    id: input.id || createId('cat'),
    restaurantId,
    name: cleanName,
    sortOrder: input.sortOrder ?? current.length + 1,
    createdAt: input.createdAt || timestamp,
    updatedAt: timestamp,
  };

  const nextCategories = input.id
    ? current.map(category =>
        category.id === input.id ? nextCategory : category,
      )
    : [...current, nextCategory];

  const categories = await saveMenuCategories(nextCategories, restaurantId);

  return {
    ok: true,
    message: input.id ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục mới',
    categories,
  };
};

export const deleteMenuCategory = async (
  categoryId: string,
  options: {moveItemsToCategoryId?: string; restaurantId?: string} = {},
): Promise<{ok: boolean; message: string; categories: MenuCategory[]}> => {
  const restaurantId = resolveRestaurantScopeId(options.restaurantId);
  const [categories, items] = await Promise.all([
    loadMenuCategories(restaurantId),
    loadMenuItems(restaurantId),
  ]);
  const targetCategory = categories.find(
    category => category.id === categoryId,
  );

  if (!targetCategory) {
    return {
      ok: false,
      message: 'Không tìm thấy danh mục cần xoá',
      categories,
    };
  }

  if (categories.length <= 1) {
    return {
      ok: false,
      message: 'Menu cần ít nhất 1 danh mục.',
      categories,
    };
  }

  const nextCategories = categories.filter(
    (category: MenuCategory) => category.id !== categoryId,
  );
  const fallbackCategory =
    nextCategories.find(
      category => category.id === options.moveItemsToCategoryId,
    ) || nextCategories[0];

  if (!fallbackCategory) {
    return {
      ok: false,
      message: 'Không có danh mục thay thế để chuyển món.',
      categories,
    };
  }

  const usedItems = items.filter((item: RestaurantMenuItem) => item.categoryId === categoryId);
  const savedCategories = await saveMenuCategories(
    nextCategories,
    restaurantId,
  );

  if (usedItems.length > 0) {
    const timestamp = nowIso();
    const movedItems = items.map(item =>
      item.categoryId === categoryId
        ? {...item, categoryId: fallbackCategory.id, updatedAt: timestamp}
        : item,
    );

    await saveMenuItems(movedItems, restaurantId);
  }

  const message =
    usedItems.length > 0
      ? `Đã xoá danh mục và chuyển ${usedItems.length} món sang “${fallbackCategory.name}”`
      : 'Đã xoá danh mục';

  return {ok: true, message, categories: savedCategories};
};

export const getCategoryNameById = (
  categoryId: string,
  categories: MenuCategory[] = DEFAULT_MENU_CATEGORIES,
) => {
  return (
    categories.find(category => category.id === categoryId)?.name ||
    categories[0]?.name ||
    'Chưa phân loại'
  );
};

export const loadMenuItems = async (
  restaurantId?: string,
): Promise<RestaurantMenuItem[]> => {
  const scopedKeys = getScopedKeys(restaurantId);
  await ensureRestaurantSchema(scopedKeys.restaurantId);
  const categories = await loadMenuCategories(scopedKeys.restaurantId);
  const stored = await readArray<RestaurantMenuItem>(scopedKeys.menuItems);

  if (stored.length === 0) {
    if (shouldSeedDemoMenuForRestaurant(scopedKeys.restaurantId)) {
      const seededItems = defaultMenuItems.map(item =>
        migrateMenuItem(item, categories, scopedKeys.restaurantId),
      );
      await writeArray(scopedKeys.menuItems, seededItems);
      return seededItems;
    }

    return [];
  }

  const storedWithoutSeeds = stored.filter(item => !isBuiltInSeedItem(item));
  const migrated = storedWithoutSeeds.map(item =>
    migrateMenuItem(item, categories, scopedKeys.restaurantId),
  );
  const needsMigration = JSON.stringify(stored) !== JSON.stringify(migrated);

  if (needsMigration) {
    await writeArray(scopedKeys.menuItems, migrated);
  }

  return migrated;
};

export const saveMenuItems = async (
  items: RestaurantMenuItem[],
  restaurantId?: string,
) => {
  const scopedKeys = getScopedKeys(restaurantId);
  const categories = await loadMenuCategories(scopedKeys.restaurantId);
  await writeArray(
    scopedKeys.menuItems,
    items.map(item =>
      migrateMenuItem(item, categories, scopedKeys.restaurantId),
    ),
  );
};

export const upsertMenuItem = async (
  input: Omit<
    RestaurantMenuItem,
    'id' | 'createdAt' | 'updatedAt' | 'available'
  > & {
    id?: string;
    createdAt?: string;
    available?: boolean;
  },
): Promise<RestaurantMenuItem[]> => {
  const restaurantId = resolveRestaurantScopeId(input.restaurantId);
  const [current, categories] = await Promise.all([
    loadMenuItems(restaurantId),
    loadMenuCategories(restaurantId),
  ]);
  const timestamp = nowIso();
  const status = normaliseMenuItemStatus(input.status, input.available);
  const cleanImageUrl = getMenuItemImageValue(input);
  const itemId = input.id || createId('dish');
  const existingItem = current.find(item => item.id === itemId);
  const oldImage = getMenuItemImageValue(existingItem);

  const nextItem: RestaurantMenuItem = {
    ...(existingItem || {}),
    id: itemId,
    restaurantId,
    categoryId: resolveCategoryId(input.categoryId, categories),
    name: input.name.trim(),
    price: Number(input.price) || 0,
    description: input.description.trim(),
    imageUrl: cleanImageUrl,
    imageUri: undefined,
    available: status === 'SELLING',
    status,
    createdAt: input.createdAt || existingItem?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  const existingIndex = current.findIndex(item => item.id === nextItem.id);
  const nextItems =
    existingIndex >= 0
      ? current.map(item => (item.id === nextItem.id ? nextItem : item))
      : [nextItem, ...current];

  await saveMenuItems(nextItems, restaurantId);

  if (oldImage && oldImage !== cleanImageUrl) {
    await cleanupRestaurantMenuImageIfUnused(
      oldImage,
      nextItems.map(item => getMenuItemImageValue(item)),
    );
  }

  return nextItems;
};

export const deleteMenuItem = async (itemId: string, restaurantId?: string) => {
  const scopedRestaurantId = resolveRestaurantScopeId(restaurantId);
  const current = await loadMenuItems(scopedRestaurantId);
  const deletedItem = current.find(item => item.id === itemId);
  const deletedImage = getMenuItemImageValue(deletedItem);
  const nextItems = current.filter(item => item.id !== itemId);

  await saveMenuItems(nextItems, scopedRestaurantId);

  if (deletedImage) {
    await cleanupRestaurantMenuImageIfUnused(
      deletedImage,
      nextItems.map(item => getMenuItemImageValue(item)),
    );
  }

  return nextItems;
};

export const normaliseOrderStatus = (
  status?: LegacyRestaurantOrderStatus,
): RestaurantOrderStatus => {
  switch (
    String(status || '')
      .trim()
      .toUpperCase()
  ) {
    case 'ACCEPTED':
      return 'ACCEPTED';
    case 'PREPARING':
      return 'PREPARING';
    case 'SERVED':
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'PAID':
      // Legacy builds incorrectly used `paid` as an order processing status.
      // Do not blindly mark the kitchen/service flow as completed here; Batch 2
      // migrates payment to paymentStatus and keeps the processing state safe.
      return 'NEW';
    case 'NEW':
    default:
      return 'NEW';
  }
};

export const normalisePaymentStatus = (
  order: RawRestaurantOrder,
): RestaurantPaymentStatus => {
  const paymentStatus = String(order.paymentStatus || '')
    .trim()
    .toUpperCase();
  const legacyStatus = String(order.status || order.orderStatus || '')
    .trim()
    .toUpperCase();

  return paymentStatus === 'PAID' || legacyStatus === 'PAID'
    ? 'PAID'
    : 'UNPAID';
};

export const normalisePaymentMethod = (
  method?: RestaurantPaymentMethod | string,
): RestaurantPaymentMethod => {
  const normalized = String(method || '')
    .trim()
    .toUpperCase();

  return RESTAURANT_PAYMENT_METHODS.includes(
    normalized as RestaurantPaymentMethod,
  )
    ? (normalized as RestaurantPaymentMethod)
    : 'CASH';
};

export const normaliseBillSessionStatus = (
  status?: RestaurantBillSessionStatus | string,
): RestaurantBillSessionStatus => {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();

  return RESTAURANT_BILL_SESSION_STATUSES.includes(
    normalized as RestaurantBillSessionStatus,
  )
    ? (normalized as RestaurantBillSessionStatus)
    : 'OPEN';
};

export const canCustomerAddOrderToBillSession = (
  status?: RestaurantBillSessionStatus | string,
) => {
  return CUSTOMER_ORDERABLE_BILL_SESSION_STATUSES.includes(
    normaliseBillSessionStatus(status),
  );
};

export const isFinalBillSessionStatus = (
  status?: RestaurantBillSessionStatus | string,
) => {
  return FINAL_BILL_SESSION_STATUSES.includes(
    normaliseBillSessionStatus(status),
  );
};

export const createBillOrderSummary = (
  order: RestaurantOrder,
  index: number,
): RestaurantBillOrderSummary => ({
  orderId: order.id,
  orderNumber: index + 1,
  orderStatus: order.orderStatus,
  paymentStatus: order.paymentStatus,
  itemCount: order.items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity || 0)),
    0,
  ),
  total: order.orderStatus === 'CANCELLED' ? 0 : order.total,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

export const calculateRestaurantBillSubtotal = (
  orders: RestaurantOrder[] = [],
) => {
  return orders.reduce(
    (sum, order) =>
      order.orderStatus === 'CANCELLED'
        ? sum
        : sum + Math.max(0, Number(order.total || 0)),
    0,
  );
};

export const calculateRestaurantOrderTotal = (
  items: RestaurantOrderItem[] = [],
) => {
  return items.reduce((sum, item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const price = Math.max(0, Number(item.price || 0));
    return sum + price * quantity;
  }, 0);
};

export const normaliseRestaurantOrder = (
  order: RawRestaurantOrder,
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
): RestaurantOrder => {
  const timestamp = nowIso();
  return {
    id: String(order.id || createId('order')),
    restaurantId: order.restaurantId || restaurantId,
    branchId: order.branchId,
    tableId: order.tableId,
    billSessionId: order.billSessionId,
    guestSessionId: order.guestSessionId,
    orderSource:
      order.orderSource || (order.restaurantId ? 'customer' : 'local'),
    tableNumber: String(order.tableNumber || ''),
    items: Array.isArray(order.items) ? order.items : [],
    note: String(order.note || ''),
    total: calculateRestaurantOrderTotal(
      Array.isArray(order.items) ? order.items : [],
    ),
    orderStatus: normaliseOrderStatus(order.orderStatus || order.status),
    paymentStatus: normalisePaymentStatus(order),
    paymentMethod: normalisePaymentMethod(order.paymentMethod),
    createdAt: order.createdAt || timestamp,
    updatedAt: order.updatedAt || order.createdAt || timestamp,
  };
};

const normaliseBillTableChangeLog = (
  value: Partial<RestaurantBillTableChangeLog>,
): RestaurantBillTableChangeLog => ({
  id: String(value.id || createId('table_change')),
  auditLogId: value.auditLogId,
  fromBranchId: value.fromBranchId,
  fromTableId: value.fromTableId,
  fromTableNumber: value.fromTableNumber,
  toBranchId: value.toBranchId,
  toTableId: value.toTableId,
  toTableNumber: String(value.toTableNumber || ''),
  changedByUserId: value.changedByUserId,
  changedByUsername: value.changedByUsername,
  changedByRole: value.changedByRole,
  reason: String(value.reason || ''),
  changedAt: value.changedAt || nowIso(),
});

export const normaliseRestaurantBillSession = (
  billSession: RawRestaurantBillSession,
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
): RestaurantBillSessionDetail => {
  const timestamp = nowIso();
  const orders = Array.isArray(billSession.orders)
    ? billSession.orders.map(order =>
        normaliseRestaurantOrder(order, restaurantId),
      )
    : [];
  const orderIds = Array.isArray(billSession.orderIds)
    ? billSession.orderIds.map(id => String(id)).filter(Boolean)
    : orders.map(order => order.id);
  const subtotal = Number.isFinite(Number(billSession.subtotal))
    ? Math.max(0, Number(billSession.subtotal))
    : calculateRestaurantBillSubtotal(orders);
  const discountTotal = Math.max(0, Number(billSession.discountTotal || 0));
  const serviceFeeTotal = Math.max(0, Number(billSession.serviceFeeTotal || 0));
  const total = Number.isFinite(
    Number(billSession.total ?? billSession.billTotal),
  )
    ? Math.max(0, Number(billSession.total ?? billSession.billTotal))
    : Math.max(0, subtotal - discountTotal + serviceFeeTotal);
  const id = String(
    billSession.id || billSession.billSessionId || createId('bill'),
  );
  const orderSummaries = Array.isArray(billSession.orderSummaries)
    ? billSession.orderSummaries
    : orders.map(createBillOrderSummary);
  const tableChangeLogs = Array.isArray(billSession.tableChangeLogs)
    ? billSession.tableChangeLogs.map(normaliseBillTableChangeLog)
    : [];

  const status = normaliseBillSessionStatus(billSession.status);
  const openedAt = billSession.openedAt || billSession.createdAt || timestamp;
  const paymentMethod = normalisePaymentMethod(billSession.paymentMethod);
  const summary: RestaurantBillSummary = {
    billSessionId: id,
    restaurantId: billSession.restaurantId || restaurantId,
    branchId: billSession.branchId,
    tableId: billSession.tableId,
    tableNumber: String(billSession.tableNumber || ''),
    status,
    orderCount: Number.isFinite(Number(billSession.orderCount))
      ? Math.max(0, Number(billSession.orderCount))
      : orderIds.length,
    orders: orderSummaries,
    subtotal,
    discountTotal,
    serviceFeeTotal,
    total,
    paymentMethod,
    openedAt,
    paymentRequestedAt: billSession.paymentRequestedAt,
    paidAt: billSession.paidAt,
    closedAt: billSession.closedAt,
  };

  return {
    id,
    billSessionId: id,
    restaurantId: billSession.restaurantId || restaurantId,
    branchId: billSession.branchId,
    tableId: billSession.tableId,
    tableNumber: String(billSession.tableNumber || ''),
    guestSessionId: billSession.guestSessionId,
    status,
    orderIds,
    orderCount: summary.orderCount,
    subtotal,
    discountTotal,
    serviceFeeTotal,
    total,
    billTotal: total,
    paymentMethod,
    note: String(billSession.note || ''),
    tableChangeLogs,
    summary,
    openedAt,
    paymentRequestedAt: billSession.paymentRequestedAt,
    paidAt: billSession.paidAt,
    closedAt: billSession.closedAt,
    createdAt: billSession.createdAt || timestamp,
    updatedAt: billSession.updatedAt || billSession.createdAt || timestamp,
    orders,
    orderSummaries,
  };
};

const ORDER_STATUS_TRANSITIONS: Record<
  RestaurantOrderStatus,
  RestaurantOrderStatus[]
> = {
  NEW: ['NEW', 'ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['ACCEPTED', 'PREPARING', 'CANCELLED'],
  PREPARING: ['PREPARING', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED'],
};

export const isRestaurantOrderStatusTransitionAllowed = (
  fromStatus: RestaurantOrderStatus,
  toStatus: RestaurantOrderStatus,
) => ORDER_STATUS_TRANSITIONS[fromStatus].indexOf(toStatus) >= 0;

const getSeedBillSessionsForRestaurant = (
  _restaurantId: string,
): {orders: RestaurantOrder[]; billSessions: RestaurantBillSessionDetail[]} => {
  return {orders: [], billSessions: []};
};

const migrateLegacyLocalOrdersToBillSessions = async (
  restaurantId: string,
  orders: RestaurantOrder[],
  billSessions: RawRestaurantBillSession[],
): Promise<{
  orders: RestaurantOrder[];
  billSessions: RawRestaurantBillSession[];
  changed: boolean;
}> => {
  const legacyOrders = orders.filter(order => !order.billSessionId);
  if (legacyOrders.length === 0) {
    return {orders, billSessions, changed: false};
  }

  const billSessionsById = new Map(
    billSessions.map(billSession => [
      String(billSession.id || billSession.billSessionId || ''),
      billSession,
    ]),
  );
  const groups = new Map<string, RestaurantOrder[]>();
  legacyOrders.forEach(order => {
    const groupKey = getLegacyLocalOrderMigrationGroupKey(order);
    const group = groups.get(groupKey) || [];
    group.push(order);
    groups.set(groupKey, group);
  });

  const nextOrders = orders.map(order => ({...order}));
  const nextBillSessions = [...billSessions];
  const timestamp = nowIso();

  groups.forEach((groupOrders, groupKey) => {
    const first = groupOrders[0];
    const billSessionId = `bill_migrated_${stableHash(groupKey)}`;
    let billSession = billSessionsById.get(billSessionId);
    if (!billSession) {
      billSession = normaliseRestaurantBillSession(
        {
          id: billSessionId,
          restaurantId,
          branchId: first.branchId,
          tableId: first.tableId,
          tableNumber: first.tableNumber || 'Bàn chưa rõ',
          guestSessionId: first.guestSessionId,
          status: groupOrders.every(order => order.paymentStatus === 'PAID')
            ? 'PAID'
            : 'OPEN',
          orderIds: groupOrders.map(order => order.id),
          note: 'Batch 24 migration local: tạo BillSession tạm cho order cũ.',
          openedAt:
            groupOrders.map(order => order.createdAt).sort()[0] || timestamp,
          createdAt:
            groupOrders.map(order => order.createdAt).sort()[0] || timestamp,
          updatedAt: timestamp,
          orders: groupOrders,
        },
        restaurantId,
      );
      nextBillSessions.unshift(billSession);
      billSessionsById.set(billSessionId, billSession);
    }

    nextOrders.forEach(order => {
      if (groupOrders.some(item => item.id === order.id)) {
        order.billSessionId = billSessionId;
        order.branchId = billSession?.branchId || order.branchId;
        order.tableId = billSession?.tableId || order.tableId;
        order.tableNumber = billSession?.tableNumber || order.tableNumber;
        order.guestSessionId =
          billSession?.guestSessionId || order.guestSessionId;
        order.updatedAt = timestamp;
      }
    });
  });

  return {orders: nextOrders, billSessions: nextBillSessions, changed: true};
};

export const loadOrders = async (
  restaurantId?: string,
): Promise<RestaurantOrder[]> => {
  const scopedKeys = getScopedKeys(restaurantId);
  const scopedOrders = await readArray<RawRestaurantOrder>(scopedKeys.orders);
  const legacyOrders =
    scopedOrders.length > 0 || !shouldSeedDemoMenuForRestaurant(scopedKeys.restaurantId)
      ? []
      : await readArray<RawRestaurantOrder>(RESTAURANT_STORAGE_KEYS.orders);
  const rawOrders = scopedOrders.length > 0 ? scopedOrders : legacyOrders;
  const orders = rawOrders
    .filter(order => !isBuiltInSeedOrder(order))
    .map(order =>
      normaliseRestaurantOrder(order, scopedKeys.restaurantId),
    );
  const filteredOrders = orders.filter(
    order => order.restaurantId === scopedKeys.restaurantId,
  );
  const needsOrderMigration =
    rawOrders.length !== filteredOrders.length ||
    rawOrders.some((order, index) => {
      const normalised = orders[index];
      if (!normalised) {
        return true;
      }
      return (
        order.status !== undefined ||
        order.restaurantId !== scopedKeys.restaurantId ||
        order.orderStatus !== normalised.orderStatus ||
        String(order.paymentStatus || 'UNPAID').toUpperCase() !==
          normalised.paymentStatus
      );
    });

  if (needsOrderMigration) {
    await saveOrders(filteredOrders, scopedKeys.restaurantId);
  }

  return filteredOrders;
};

export const saveOrders = async (
  orders: RestaurantOrder[],
  restaurantId?: string,
) => {
  const scopedKeys = getScopedKeys(restaurantId);
  await writeArray(
    scopedKeys.orders,
    orders.map(order =>
      normaliseRestaurantOrder(
        withRestaurantId(order, scopedKeys.restaurantId),
        scopedKeys.restaurantId,
      ),
    ),
  );
};

export const loadBillSessions = async (
  restaurantId?: string,
): Promise<RestaurantBillSessionDetail[]> => {
  const scopedKeys = getScopedKeys(restaurantId);
  const rawScopedBillSessions = await readArray<RawRestaurantBillSession>(
    scopedKeys.billSessions,
  );
  const removedBuiltInSeedBillSessions = rawScopedBillSessions.some(
    billSession => isBuiltInSeedBillSession(billSession),
  );
  let scopedBillSessions = rawScopedBillSessions.filter(
    billSession => !isBuiltInSeedBillSession(billSession),
  );
  let orders = await loadOrders(scopedKeys.restaurantId);

  if (scopedBillSessions.length === 0 && orders.length === 0) {
    const seed = getSeedBillSessionsForRestaurant(scopedKeys.restaurantId);
    if (seed.billSessions.length > 0) {
      orders = seed.orders;
      scopedBillSessions = seed.billSessions;
      await saveOrders(orders, scopedKeys.restaurantId);
      await saveBillSessions(seed.billSessions, scopedKeys.restaurantId);
      await AsyncStorage.setItem(
        scopedKeys.schemaVersion,
        CURRENT_SCHEMA_VERSION,
      );
    }
  }

  if (removedBuiltInSeedBillSessions) {
    await saveBillSessions(
      scopedBillSessions.map(billSession =>
        normaliseRestaurantBillSession(billSession, scopedKeys.restaurantId),
      ),
      scopedKeys.restaurantId,
    );
  }

  const migration = await migrateLegacyLocalOrdersToBillSessions(
    scopedKeys.restaurantId,
    orders,
    scopedBillSessions,
  );
  if (migration.changed) {
    orders = migration.orders;
    scopedBillSessions = migration.billSessions;
    await saveOrders(orders, scopedKeys.restaurantId);
    await saveBillSessions(
      scopedBillSessions.map(billSession =>
        normaliseRestaurantBillSession(billSession, scopedKeys.restaurantId),
      ),
      scopedKeys.restaurantId,
    );
    await AsyncStorage.setItem(
      scopedKeys.schemaVersion,
      CURRENT_SCHEMA_VERSION,
    );
  }

  const normalised = scopedBillSessions.map(billSession => {
    const billOrders = orders.filter(
      order =>
        order.billSessionId === (billSession.id || billSession.billSessionId),
    );
    return normaliseRestaurantBillSession(
      {
        ...billSession,
        orders: billSession.orders || billOrders,
      },
      scopedKeys.restaurantId,
    );
  });

  return normalised.filter(
    billSession => billSession.restaurantId === scopedKeys.restaurantId,
  );
};

export const saveBillSessions = async (
  billSessions: RestaurantBillSessionDetail[],
  restaurantId?: string,
) => {
  const scopedKeys = getScopedKeys(restaurantId);
  await writeArray(
    scopedKeys.billSessions,
    billSessions.map(billSession => {
      const normalised = normaliseRestaurantBillSession(
        {
          ...billSession,
          restaurantId: scopedKeys.restaurantId,
        },
        scopedKeys.restaurantId,
      );
      const {
        orders,
        orderSummaries,
        billSessionId,
        billTotal,
        summary,
        ...stored
      } = normalised;
      return stored;
    }),
  );
};

const recalculateLocalBillSession = (
  billSession: RestaurantBillSessionDetail,
  orders: RestaurantOrder[],
): RestaurantBillSessionDetail => {
  const billOrders = orders.filter(
    order => order.billSessionId === billSession.id,
  );
  const subtotal = calculateRestaurantBillSubtotal(billOrders);
  const total = Math.max(
    0,
    subtotal -
      Number(billSession.discountTotal || 0) +
      Number(billSession.serviceFeeTotal || 0),
  );
  const updatedAt = nowIso();
  return normaliseRestaurantBillSession(
    {
      ...billSession,
      billSessionId: billSession.id,
      orderIds: billOrders.map(order => order.id),
      orderCount: billOrders.length,
      subtotal,
      total,
      orders: billOrders,
      orderSummaries: billOrders.map(createBillOrderSummary),
      updatedAt,
    },
    billSession.restaurantId,
  );
};

export const loadCurrentBillSession = async (
  query: {billSessionId?: string; guestSessionId?: string} = {},
  restaurantId?: string,
): Promise<RestaurantBillSessionDetail | null> => {
  const scopedRestaurantId = resolveRestaurantScopeId(restaurantId);
  const [billSessions, orders] = await Promise.all([
    loadBillSessions(scopedRestaurantId),
    loadOrders(scopedRestaurantId),
  ]);
  const billSession = query.billSessionId
    ? billSessions.find(item => item.id === query.billSessionId)
    : billSessions
        .filter(
          item =>
            query.guestSessionId &&
            item.guestSessionId === query.guestSessionId &&
            !isFinalBillSessionStatus(item.status),
        )
        .sort((left, right) =>
          String(right.updatedAt || right.createdAt).localeCompare(
            String(left.updatedAt || left.createdAt),
          ),
        )[0];

  if (!billSession) {
    return null;
  }

  return recalculateLocalBillSession(billSession, orders);
};

const resolveLocalBillSessionForOrder = async (
  payload: Omit<
    RestaurantOrder,
    'id' | 'orderStatus' | 'paymentStatus' | 'createdAt' | 'updatedAt'
  > & {
    paymentStatus?: RestaurantPaymentStatus;
    paymentMethod?: RestaurantPaymentMethod;
  },
  restaurantId: string,
): Promise<RestaurantBillSessionDetail | null> => {
  const shouldUseBillSession = Boolean(
    payload.billSessionId ||
    payload.guestSessionId ||
    payload.orderSource === 'customer',
  );

  if (!shouldUseBillSession) {
    return null;
  }

  const currentBillSessions = await loadBillSessions(restaurantId);
  const timestamp = nowIso();
  const existing = payload.billSessionId
    ? currentBillSessions.find(
        billSession => billSession.id === payload.billSessionId,
      )
    : undefined;

  if (payload.billSessionId && !existing) {
    throw new Error(
      'Không tìm thấy hóa đơn bàn hiện tại. Vui lòng gọi nhân viên hoặc quét lại QR.',
    );
  }

  if (existing) {
    if (isFinalBillSessionStatus(existing.status)) {
      throw new Error(
        'Hóa đơn này đã đóng/thanh toán, không thể gọi thêm món.',
      );
    }
    return existing;
  }

  const tableNumber = String(payload.tableNumber || '').trim();
  if (!tableNumber) {
    throw new Error('Vui lòng chọn bàn trước khi gửi đơn.');
  }

  const billSession = normaliseRestaurantBillSession(
    {
      id: createId('bill'),
      restaurantId,
      branchId: payload.branchId,
      tableId: payload.tableId,
      tableNumber,
      guestSessionId: payload.guestSessionId,
      status: 'OPEN',
      orderIds: [],
      orderCount: 0,
      subtotal: 0,
      discountTotal: 0,
      serviceFeeTotal: 0,
      total: 0,
      openedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    restaurantId,
  );
  await saveBillSessions([billSession, ...currentBillSessions], restaurantId);
  return billSession;
};

export const createRestaurantOrder = async (
  payload: Omit<
    RestaurantOrder,
    'id' | 'orderStatus' | 'paymentStatus' | 'createdAt' | 'updatedAt'
  > & {
    paymentStatus?: RestaurantPaymentStatus;
    paymentMethod?: RestaurantPaymentMethod;
  },
): Promise<RestaurantOrder[]> => {
  const restaurantId = resolveRestaurantScopeId(payload.restaurantId);
  const current = await loadOrders(restaurantId);
  const timestamp = nowIso();
  const orderItems = Array.isArray(payload.items) ? payload.items : [];
  const billSession = await resolveLocalBillSessionForOrder(
    payload,
    restaurantId,
  );
  const order: RestaurantOrder = {
    ...payload,
    branchId: billSession?.branchId || payload.branchId,
    tableId: billSession?.tableId || payload.tableId,
    tableNumber: billSession?.tableNumber || payload.tableNumber,
    billSessionId: billSession?.id || payload.billSessionId,
    guestSessionId: billSession?.guestSessionId || payload.guestSessionId,
    items: orderItems,
    total: calculateRestaurantOrderTotal(orderItems),
    restaurantId,
    id: createId('order'),
    orderStatus: 'NEW',
    paymentStatus: payload.paymentStatus || 'UNPAID',
    paymentMethod: normalisePaymentMethod(payload.paymentMethod),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const nextOrders = [order, ...current];
  await saveOrders(nextOrders, restaurantId);

  if (billSession) {
    const billSessions = await loadBillSessions(restaurantId);
    const nextBillSessions = billSessions.map(item =>
      item.id === billSession.id
        ? recalculateLocalBillSession(item, nextOrders)
        : item,
    );
    await saveBillSessions(nextBillSessions, restaurantId);
  }

  return nextOrders;
};

export const updateRestaurantBillSessionTable = async (
  billSessionId: string,
  payload: {
    tableId?: string;
    tableNumber: string;
    branchId?: string;
    reason?: string;
    changedByUsername?: string;
    changedByRole?: string;
  },
  restaurantId?: string,
): Promise<RestaurantBillSessionDetail> => {
  const scopedRestaurantId = resolveRestaurantScopeId(restaurantId);
  const [billSessions, orders] = await Promise.all([
    loadBillSessions(scopedRestaurantId),
    loadOrders(scopedRestaurantId),
  ]);
  const billSession = billSessions.find(item => item.id === billSessionId);

  if (!billSession) {
    throw new Error('Không tìm thấy hóa đơn bàn trong nhà hàng hiện tại.');
  }
  if (isFinalBillSessionStatus(billSession.status)) {
    throw new Error('Hóa đơn đã thanh toán/đóng/hủy nên không thể đổi bàn.');
  }

  const targetTableId = String(payload.tableId || '').trim();
  const targetTableNumber = String(payload.tableNumber || '').trim();
  if (!targetTableNumber) {
    throw new Error('Vui lòng chọn bàn đích trước khi chuyển bill.');
  }
  if (
    billSession.branchId &&
    payload.branchId &&
    payload.branchId !== billSession.branchId
  ) {
    throw new Error(
      'Chỉ được chuyển bill sang bàn trong cùng chi nhánh để QR khách không bị lẫn phiên.',
    );
  }

  const occupiedBill = billSessions.find(
    item =>
      item.id !== billSession.id &&
      !isFinalBillSessionStatus(item.status) &&
      targetTableId &&
      item.tableId === targetTableId,
  );
  if (occupiedBill) {
    throw new Error(
      'Bàn đích đang có hóa đơn mở. Vui lòng đóng bill đó hoặc xử lý gộp bill trước.',
    );
  }

  const timestamp = nowIso();
  const changeLog: RestaurantBillTableChangeLog = {
    id: createId('table_change'),
    fromBranchId: billSession.branchId,
    fromTableId: billSession.tableId,
    fromTableNumber: billSession.tableNumber,
    toBranchId: payload.branchId,
    toTableId: targetTableId || undefined,
    toTableNumber: targetTableNumber,
    changedByUsername: payload.changedByUsername,
    changedByRole: payload.changedByRole,
    reason: String(payload.reason || ''),
    changedAt: timestamp,
  };

  const nextOrders = orders.map(order =>
    order.billSessionId === billSession.id
      ? {
          ...order,
          branchId: payload.branchId || order.branchId,
          tableId: targetTableId || order.tableId,
          tableNumber: targetTableNumber,
          updatedAt: timestamp,
        }
      : order,
  );
  await saveOrders(nextOrders, scopedRestaurantId);

  const nextBillSessions = billSessions.map(item => {
    if (item.id !== billSession.id) {
      return item;
    }
    return recalculateLocalBillSession(
      {
        ...item,
        branchId: payload.branchId || item.branchId,
        tableId: targetTableId || item.tableId,
        tableNumber: targetTableNumber,
        tableChangeLogs: [
          changeLog,
          ...(Array.isArray(item.tableChangeLogs) ? item.tableChangeLogs : []),
        ].slice(0, 50),
        updatedAt: timestamp,
      },
      nextOrders,
    );
  });
  await saveBillSessions(nextBillSessions, scopedRestaurantId);

  const updated = nextBillSessions.find(item => item.id === billSession.id);
  if (!updated) {
    throw new Error('Không thể cập nhật hóa đơn sau khi đổi bàn.');
  }
  return updated;
};

export const updateRestaurantBillSessionPayment = async (
  billSessionId: string,
  payload: RestaurantBillPaymentPayload = {},
  restaurantId?: string,
): Promise<RestaurantBillSessionDetail> => {
  const scopedRestaurantId = resolveRestaurantScopeId(restaurantId);
  const [billSessions, orders] = await Promise.all([
    loadBillSessions(scopedRestaurantId),
    loadOrders(scopedRestaurantId),
  ]);
  const billSession = billSessions.find(item => item.id === billSessionId);

  if (!billSession) {
    throw new Error('Không tìm thấy hóa đơn bàn trong nhà hàng hiện tại.');
  }
  if (billSession.status === 'CLOSED' || billSession.status === 'CANCELLED') {
    throw new Error('Hóa đơn đã đóng/hủy nên không thể cập nhật thanh toán.');
  }

  const timestamp = nowIso();
  const nextPaymentStatus: RestaurantBillPaymentStatus =
    payload.status === 'PAID' || payload.paymentStatus === 'PAID'
      ? 'PAID'
      : 'PAYMENT_REQUESTED';
  const nextPaymentMethod = normalisePaymentMethod(
    payload.paymentMethod || billSession.paymentMethod,
  );
  const discountTotal = Number.isFinite(Number(payload.discountTotal))
    ? Math.max(0, Number(payload.discountTotal))
    : billSession.discountTotal;
  const serviceFeeTotal = Number.isFinite(Number(payload.serviceFeeTotal))
    ? Math.max(0, Number(payload.serviceFeeTotal))
    : billSession.serviceFeeTotal;

  const nextOrders =
    nextPaymentStatus === 'PAID'
      ? orders.map(order =>
          order.billSessionId === billSession.id &&
          order.orderStatus !== 'CANCELLED'
            ? {
                ...order,
                paymentStatus: 'PAID' as RestaurantPaymentStatus,
                paymentMethod: nextPaymentMethod,
                updatedAt: timestamp,
              }
            : order,
        )
      : orders;

  if (nextPaymentStatus === 'PAID') {
    await saveOrders(nextOrders, scopedRestaurantId);
  }

  const nextBillSessions = billSessions.map(item => {
    if (item.id !== billSession.id) {
      return item;
    }

    return recalculateLocalBillSession(
      {
        ...item,
        status: nextPaymentStatus,
        paymentMethod:
          nextPaymentStatus === 'PAID' ? nextPaymentMethod : item.paymentMethod,
        discountTotal,
        serviceFeeTotal,
        note:
          payload.note !== undefined ? String(payload.note || '') : item.note,
        paymentRequestedAt: item.paymentRequestedAt || timestamp,
        paidAt:
          nextPaymentStatus === 'PAID' ? item.paidAt || timestamp : item.paidAt,
        updatedAt: timestamp,
      },
      nextOrders,
    );
  });
  await saveBillSessions(nextBillSessions, scopedRestaurantId);

  const updated = nextBillSessions.find(item => item.id === billSession.id);
  if (!updated) {
    throw new Error('Không thể cập nhật thanh toán hóa đơn.');
  }
  return updated;
};

export const closeRestaurantBillSession = async (
  billSessionId: string,
  payload: RestaurantBillClosePayload = {},
  restaurantId?: string,
): Promise<RestaurantBillSessionDetail> => {
  const scopedRestaurantId = resolveRestaurantScopeId(restaurantId);
  const [billSessions, orders] = await Promise.all([
    loadBillSessions(scopedRestaurantId),
    loadOrders(scopedRestaurantId),
  ]);
  const billSession = billSessions.find(item => item.id === billSessionId);

  if (!billSession) {
    throw new Error('Không tìm thấy hóa đơn bàn trong nhà hàng hiện tại.');
  }
  if (billSession.status === 'CANCELLED') {
    throw new Error('Hóa đơn đã hủy nên không thể đóng.');
  }
  if (billSession.status !== 'PAID' && billSession.status !== 'CLOSED') {
    throw new Error('Chỉ đóng hóa đơn sau khi đã đánh dấu thanh toán.');
  }

  const timestamp = nowIso();
  const nextBillSessions = billSessions.map(item => {
    if (item.id !== billSession.id) {
      return item;
    }

    return recalculateLocalBillSession(
      {
        ...item,
        status: 'CLOSED',
        note:
          payload.note !== undefined ? String(payload.note || '') : item.note,
        closedAt: item.closedAt || timestamp,
        updatedAt: timestamp,
      },
      orders,
    );
  });
  await saveBillSessions(nextBillSessions, scopedRestaurantId);

  const updated = nextBillSessions.find(item => item.id === billSession.id);
  if (!updated) {
    throw new Error('Không thể đóng hóa đơn.');
  }
  return updated;
};

export const updateRestaurantOrderStatus = async (
  orderId: string,
  status: RestaurantOrderStatus,
  restaurantId?: string,
): Promise<RestaurantOrder[]> => {
  const scopedRestaurantId = resolveRestaurantScopeId(restaurantId);
  const current = await loadOrders(scopedRestaurantId);
  const timestamp = nowIso();
  const nextStatus = normaliseOrderStatus(status);
  const nextOrders = current.map(order => {
    if (order.id !== orderId) {
      return order;
    }

    if (
      !isRestaurantOrderStatusTransitionAllowed(order.orderStatus, nextStatus)
    ) {
      return order;
    }

    return {
      ...order,
      orderStatus: nextStatus,
      updatedAt: timestamp,
    };
  });
  await saveOrders(nextOrders, scopedRestaurantId);
  const billSessions = await loadBillSessions(scopedRestaurantId);
  const touchedBillIds = new Set(
    nextOrders
      .filter(order => order.id === orderId && order.billSessionId)
      .map(order => String(order.billSessionId)),
  );
  if (touchedBillIds.size > 0) {
    await saveBillSessions(
      billSessions.map(billSession =>
        touchedBillIds.has(billSession.id)
          ? recalculateLocalBillSession(billSession, nextOrders)
          : billSession,
      ),
      scopedRestaurantId,
    );
  }
  return nextOrders;
};

export const updateRestaurantOrderPaymentStatus = async (
  orderId: string,
  paymentStatus: RestaurantPaymentStatus,
  restaurantId?: string,
  paymentMethod?: RestaurantPaymentMethod,
): Promise<RestaurantOrder[]> => {
  const scopedRestaurantId = resolveRestaurantScopeId(restaurantId);
  const current = await loadOrders(scopedRestaurantId);
  const timestamp = nowIso();
  const nextOrders = current.map(order =>
    order.id === orderId
      ? {
          ...order,
          paymentStatus,
          paymentMethod: normalisePaymentMethod(
            paymentMethod || order.paymentMethod,
          ),
          updatedAt: timestamp,
        }
      : order,
  );

  await saveOrders(nextOrders, scopedRestaurantId);
  const billSessions = await loadBillSessions(scopedRestaurantId);
  const touchedBillIds = new Set(
    nextOrders
      .filter(order => order.id === orderId && order.billSessionId)
      .map(order => String(order.billSessionId)),
  );
  if (touchedBillIds.size > 0) {
    await saveBillSessions(
      billSessions.map(billSession =>
        touchedBillIds.has(billSession.id)
          ? recalculateLocalBillSession(billSession, nextOrders)
          : billSession,
      ),
      scopedRestaurantId,
    );
  }
  return nextOrders;
};

export const loadCurrentCart = async (
  restaurantId?: string,
): Promise<RestaurantCartState> => {
  const scopedKeys = getScopedKeys(restaurantId);
  const scopedValue = await AsyncStorage.getItem(scopedKeys.currentCart);
  const legacyValue =
    scopedKeys.restaurantId === DEFAULT_LOCAL_RESTAURANT_ID
      ? await AsyncStorage.getItem(RESTAURANT_STORAGE_KEYS.currentCart)
      : null;
  const value = scopedValue || legacyValue;
  const parsed = safeJsonParse<RestaurantCartState>(value, {
    restaurantId: scopedKeys.restaurantId,
    branchId: undefined,
    tableId: undefined,
    tableNumber: '',
    guestSessionId: undefined,
    billSessionId: undefined,
    lockedTableId: undefined,
    lockedTableNumber: undefined,
    billStatus: undefined,
    note: '',
    items: [],
  });

  if (!parsed.ok) {
    await AsyncStorage.removeItem(scopedKeys.currentCart);
  }

  const items = Array.isArray(parsed.value.items)
    ? parsed.value.items
        .map(item => ({
          itemId: String(item.itemId || ''),
          quantity: Math.max(0, Number(item.quantity) || 0),
        }))
        .filter(item => item.itemId && item.quantity > 0)
    : [];

  return {
    restaurantId: scopedKeys.restaurantId,
    branchId: parsed.value.branchId,
    tableId: parsed.value.tableId,
    tableNumber: parsed.value.tableNumber || '',
    guestSessionId: parsed.value.guestSessionId,
    billSessionId: parsed.value.billSessionId,
    lockedTableId: parsed.value.lockedTableId,
    lockedTableNumber: parsed.value.lockedTableNumber,
    billStatus: parsed.value.billStatus
      ? normaliseBillSessionStatus(parsed.value.billStatus)
      : undefined,
    note: parsed.value.note || '',
    items,
  };
};

export const saveCurrentCart = async (
  cart: RestaurantCartState,
  restaurantId?: string,
) => {
  const scopedKeys = getScopedKeys(cart.restaurantId || restaurantId);
  await AsyncStorage.setItem(
    scopedKeys.currentCart,
    JSON.stringify({
      restaurantId: cart.restaurantId || scopedKeys.restaurantId,
      branchId: cart.branchId,
      tableId: cart.tableId,
      tableNumber: cart.tableNumber || '',
      guestSessionId: cart.guestSessionId,
      billSessionId: cart.billSessionId,
      lockedTableId: cart.lockedTableId,
      lockedTableNumber: cart.lockedTableNumber,
      billStatus: cart.billStatus
        ? normaliseBillSessionStatus(cart.billStatus)
        : undefined,
      note: cart.note || '',
      items: Array.isArray(cart.items) ? cart.items : [],
    }),
  );
};

export const clearCurrentCart = async (restaurantId?: string) => {
  const scopedKeys = getScopedKeys(restaurantId);
  await AsyncStorage.removeItem(scopedKeys.currentCart);
};

export const clearRestaurantScopedMenuData = async (restaurantId?: string) => {
  const scopedKeys = getScopedKeys(restaurantId);
  await Promise.all([
    writeArray(scopedKeys.categories, []),
    writeArray(scopedKeys.menuItems, []),
    writeArray(scopedKeys.orders, []),
    writeArray(scopedKeys.billSessions, []),
    AsyncStorage.removeItem(scopedKeys.currentCart),
    AsyncStorage.setItem(scopedKeys.schemaVersion, CURRENT_SCHEMA_VERSION),
  ]);
};


export const sanitizeRestaurantScopedRuntimeData = async (
  restaurantId?: string,
  account?: Pick<RestaurantAdminAccount, 'createdAt'>,
) => {
  const scopedKeys = getScopedKeys(restaurantId);
  const [categories, items, rawOrders, rawBillSessions, rawCart] =
    await Promise.all([
      readArray<MenuCategory>(scopedKeys.categories),
      readArray<RestaurantMenuItem>(scopedKeys.menuItems),
      readArray<RawRestaurantOrder>(scopedKeys.orders),
      readArray<RawRestaurantBillSession>(scopedKeys.billSessions),
      AsyncStorage.getItem(scopedKeys.currentCart),
    ]);

  const orders = rawOrders.map((order: RawRestaurantOrder) =>
    normaliseRestaurantOrder(order, scopedKeys.restaurantId),
  );
  const billSessions = rawBillSessions.map((billSession: RawRestaurantBillSession) =>
    normaliseRestaurantBillSession(billSession, scopedKeys.restaurantId),
  );
  const parsedCart = safeJsonParse<unknown | null>(rawCart, null).value;
  const carts = parsedCart ? [parsedCart] : [];
  const snapshot: LocalRuntimeSnapshot = {
    categories,
    items,
    orders,
    billSessions,
    carts,
  };

  if (localRuntimeCount(snapshot) === 0) {
    return false;
  }

  if (
    hasLocalRuntimeOlderThanAdmin(snapshot, account) ||
    hasLocalBundledDemoFootprint(snapshot)
  ) {
    await clearRestaurantScopedMenuData(scopedKeys.restaurantId);
    return true;
  }

  const nextCategories = categories.filter(
    (category: MenuCategory) => !isLikelyLeakedDemoCategory(category),
  );
  const nextItems = items.filter((item: RestaurantMenuItem) => !isLikelyLeakedDemoItem(item));
  const nextOrders = rawOrders.filter(
    (order: RawRestaurantOrder) => !isLikelyLeakedDemoOrder(normaliseRestaurantOrder(order, scopedKeys.restaurantId)),
  );
  const nextBillSessions = rawBillSessions.filter(
    (billSession: RawRestaurantBillSession) =>
      !isLikelyLeakedDemoBillSession(
        normaliseRestaurantBillSession(billSession, scopedKeys.restaurantId),
      ),
  );
  let changed = false;

  if (nextCategories.length !== categories.length) {
    await writeArray(scopedKeys.categories, nextCategories);
    changed = true;
  }
  if (nextItems.length !== items.length) {
    await writeArray(scopedKeys.menuItems, nextItems);
    changed = true;
  }
  if (nextOrders.length !== rawOrders.length) {
    await writeArray(scopedKeys.orders, nextOrders);
    changed = true;
  }
  if (nextBillSessions.length !== rawBillSessions.length) {
    await writeArray(scopedKeys.billSessions, nextBillSessions);
    changed = true;
  }
  if (carts.length > 0) {
    const parsedCartObject = parsedCart as {items?: unknown[]} | null;
    const cartItems = Array.isArray(parsedCartObject?.items)
      ? parsedCartObject?.items || []
      : [];
    if (
      cartItems.length === 0 ||
      cartItems.some(item =>
        containsDemoRuntimeText(
          `${(item as {itemId?: unknown})?.itemId || ''} ${(item as {name?: unknown})?.name || ''} ${(item as {note?: unknown})?.note || ''}`,
        ),
      )
    ) {
      await AsyncStorage.removeItem(scopedKeys.currentCart);
      changed = true;
    }
  }

  if (changed) {
    await AsyncStorage.setItem(scopedKeys.schemaVersion, CURRENT_SCHEMA_VERSION);
  }
  return changed;
};

const loadAdminAccounts = async (): Promise<RestaurantAdminAccount[]> => {
  const current = await readArray<RestaurantAdminAccount>(
    RESTAURANT_STORAGE_KEYS.adminAccounts,
  );

  if (current.length > 0) {
    const withDefaults = mergeDefaultLocalAdminAccounts(current);
    if (JSON.stringify(withDefaults) !== JSON.stringify(current)) {
      await writeArray(RESTAURANT_STORAGE_KEYS.adminAccounts, withDefaults);
    }
    return withDefaults;
  }

  const legacy = await readArray<RestaurantAdminAccount>(
    RESTAURANT_STORAGE_KEYS.legacyAdminAccounts,
  );

  const seededAccounts = mergeDefaultLocalAdminAccounts(legacy);
  await writeArray(RESTAURANT_STORAGE_KEYS.adminAccounts, seededAccounts);

  return seededAccounts;
};

const getAccountPrimaryRestaurantId = (account: RestaurantAdminAccount) =>
  account.activeRestaurantId ||
  account.restaurantIds?.[0] ||
  DEFAULT_LOCAL_RESTAURANT_ID;

const shouldCreatePrivateLocalWorkspace = (
  account: RestaurantAdminAccount,
  accounts: RestaurantAdminAccount[],
) => {
  const role = account.role || 'OWNER';
  if (role !== 'OWNER') {
    return false;
  }

  const activeRestaurantId = getAccountPrimaryRestaurantId(account);
  if (
    activeRestaurantId === DEFAULT_LOCAL_RESTAURANT_ID ||
    activeRestaurantId === HAIDILAO_LOCAL_RESTAURANT_ID ||
    activeRestaurantId === 'haidilao_local_demo' ||
    activeRestaurantId === 'aplus_billiards_hanoi' ||
    activeRestaurantId === 'haidilao_demo'
  ) {
    return true;
  }

  return accounts.some(
    other =>
      normalise(other.username) !== normalise(account.username) &&
      (other.role || 'OWNER') === 'OWNER' &&
      getAccountPrimaryRestaurantId(other) === activeRestaurantId,
  );
};

const ensurePrivateLocalWorkspaceForAdmin = async (
  account: RestaurantAdminAccount,
  accounts: RestaurantAdminAccount[],
) => {
  if (!shouldCreatePrivateLocalWorkspace(account, accounts)) {
    const cleanedRuntimeData = await sanitizeRestaurantScopedRuntimeData(
      getAccountPrimaryRestaurantId(account),
      account,
    );
    return {account, accounts, changed: cleanedRuntimeData};
  }

  const userId = `local_admin_${normalise(account.username) || 'unknown'}`;
  const desiredRestaurantName = `Quán của ${account.username.trim()}`;
  let workspace: Awaited<ReturnType<typeof createRestaurantWorkspace>>;

  try {
    workspace = await createRestaurantWorkspace({
      name: desiredRestaurantName,
      ownerId: userId,
    });
  } catch (error) {
    if (!/tồn tại/i.test(String((error as Error)?.message || ''))) {
      throw error;
    }
    workspace = await createRestaurantWorkspace({
      name: `${desiredRestaurantName} ${Date.now().toString().slice(-5)}`,
      ownerId: userId,
    });
  }

  await clearRestaurantScopedMenuData(workspace.id);
  await sanitizeRestaurantScopedRuntimeData(workspace.id, account);

  const nextAccount: RestaurantAdminAccount = {
    ...account,
    restaurantIds: [workspace.id],
    activeRestaurantId: workspace.id,
    role: account.role || 'OWNER',
  };
  const nextAccounts = accounts.map(item =>
    normalise(item.username) === normalise(account.username)
      ? nextAccount
      : item,
  );
  await writeArray(RESTAURANT_STORAGE_KEYS.adminAccounts, nextAccounts);

  return {account: nextAccount, accounts: nextAccounts, changed: true};
};

export const registerRestaurantAdmin = async (
  username: string,
  password: string,
  restaurantId = '',
  restaurantName = '',
): Promise<{
  ok: boolean;
  message: string;
  userId?: string;
  role?: 'OWNER' | 'MANAGER' | 'STAFF';
  restaurantId?: string;
  restaurantName?: string;
  restaurantIds?: string[];
  branchIds?: string[];
  activeBranchId?: string;
  activeBranchName?: string;
  menuQrToken?: string;
}> => {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return {ok: false, message: 'Vui lòng nhập tên tài khoản và mật khẩu'};
  }

  const accounts = await loadAdminAccounts();
  const existed = accounts.some(
    account => normalise(account.username) === normalise(cleanUsername),
  );

  if (existed) {
    return {ok: false, message: 'Tài khoản admin đã tồn tại'};
  }

  const userId = `local_admin_${normalise(cleanUsername) || 'unknown'}`;
  const desiredRestaurantName =
    restaurantName.trim() || `Quán của ${cleanUsername}`;
  let workspace: Awaited<ReturnType<typeof createRestaurantWorkspace>>;

  try {
    workspace = await createRestaurantWorkspace({
      id: restaurantId || undefined,
      name: desiredRestaurantName,
      ownerId: userId,
    });
  } catch (error) {
    if (!/tồn tại/i.test(String((error as Error)?.message || ''))) {
      throw error;
    }
    workspace = await createRestaurantWorkspace({
      name: `${desiredRestaurantName} ${Date.now().toString().slice(-5)}`,
      ownerId: userId,
    });
  }

  await clearRestaurantScopedMenuData(workspace.id);
  await sanitizeRestaurantScopedRuntimeData(workspace.id, {createdAt: nowIso()});

  const branches = await loadRestaurantBranches(workspace.id);
  const activeBranch = branches[0];

  // password is stored in AsyncStorage for the first offline version.
  // This offline build stores credentials on device. Use a server-backed login only when enabling shared multi-device accounts.
  const nextAccounts = [
    ...accounts,
    {
      username: cleanUsername,
      password: cleanPassword,
      restaurantIds: [workspace.id],
      activeRestaurantId: workspace.id,
      role: 'OWNER' as const,
      createdAt: nowIso(),
    },
  ];
  await writeArray(RESTAURANT_STORAGE_KEYS.adminAccounts, nextAccounts);

  return {
    ok: true,
    message: 'Đăng ký admin local thành công',
    userId,
    role: 'OWNER',
    restaurantId: workspace.id,
    restaurantName: workspace.name,
    restaurantIds: [workspace.id],
    branchIds: activeBranch?.id ? [activeBranch.id] : [],
    activeBranchId: activeBranch?.id,
    activeBranchName: activeBranch?.name,
    menuQrToken: activeBranch?.menuQrToken,
  };
};

export const verifyRestaurantAdmin = async (
  username: string,
  password: string,
  restaurantId = '',
): Promise<{
  ok: boolean;
  message: string;
  userId?: string;
  role?: 'OWNER' | 'MANAGER' | 'STAFF';
  restaurantId?: string;
  restaurantName?: string;
  restaurantIds?: string[];
  branchIds?: string[];
  activeBranchId?: string;
  activeBranchName?: string;
  menuQrToken?: string;
}> => {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return {ok: false, message: 'Vui lòng nhập tên tài khoản và mật khẩu'};
  }

  const accounts = await loadAdminAccounts();
  const targetRestaurantId = resolveRestaurantScopeId(restaurantId);
  const matchedAccount = accounts.find(account => {
    const usernameMatched =
      normalise(account.username) === normalise(cleanUsername);
    const passwordMatched = account.password === cleanPassword;
    return usernameMatched && passwordMatched;
  });

  if (!matchedAccount) {
    return {ok: false, message: 'Tên tài khoản hoặc mật khẩu chưa đúng'};
  }

  const privateScope = await ensurePrivateLocalWorkspaceForAdmin(
    matchedAccount,
    accounts,
  );
  const activeAccount = privateScope.account;

  const accountRestaurantIds = activeAccount.restaurantIds || [
    activeAccount.activeRestaurantId || DEFAULT_LOCAL_RESTAURANT_ID,
  ];
  const role = activeAccount.role || 'OWNER';
  const preferredRestaurantId =
    activeAccount.activeRestaurantId ||
    accountRestaurantIds[0] ||
    DEFAULT_LOCAL_RESTAURANT_ID;
  const canUsePreferredRestaurant =
    accountRestaurantIds.length === 0 ||
    accountRestaurantIds.indexOf(preferredRestaurantId) >= 0;
  const canUseRequestedRestaurant =
    accountRestaurantIds.length === 0 ||
    accountRestaurantIds.indexOf(targetRestaurantId) >= 0;

  const scopedRestaurantId = canUsePreferredRestaurant
    ? preferredRestaurantId
    : canUseRequestedRestaurant
      ? targetRestaurantId
      : accountRestaurantIds[0] || DEFAULT_LOCAL_RESTAURANT_ID;

  await sanitizeRestaurantScopedRuntimeData(scopedRestaurantId, activeAccount);

  const branches = await loadRestaurantBranches(scopedRestaurantId);
  const activeBranch = branches[0];

  return {
    ok: true,
    message: 'Đăng nhập admin thành công',
    userId: `local_admin_${normalise(cleanUsername) || 'unknown'}`,
    role,
    restaurantId: scopedRestaurantId,
    restaurantIds: accountRestaurantIds,
    branchIds: activeBranch?.id ? [activeBranch.id] : [],
    activeBranchId: activeBranch?.id,
    activeBranchName: activeBranch?.name,
    menuQrToken: activeBranch?.menuQrToken,
  };
};
