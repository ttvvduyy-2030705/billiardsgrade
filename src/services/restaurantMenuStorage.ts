import AsyncStorage from "@react-native-async-storage/async-storage";
import { devWarn } from "utils/devLogger";
import {
  cleanupRestaurantMenuImageIfUnused,
  getMenuItemImageValue,
} from "./restaurantMenuImage";

export {
  getMenuItemImageValue,
  normaliseMenuImageUri,
} from "./restaurantMenuImage";

const DEFAULT_LOCAL_RESTAURANT_ID = "local_demo_restaurant";
const HAIDILAO_LOCAL_RESTAURANT_ID = "haidilao_local_demo";

export const RESTAURANT_STORAGE_KEYS = {
  schemaVersion: "restaurant_menu_schema_version",
  categories: "menu_categories",
  menuItems: "menu_items",
  orders: "restaurant_orders",
  currentCart: "current_cart",
  adminAccounts: "admin_accounts",
  legacyAdminAccounts: "restaurant_admin_accounts",
};

const CURRENT_SCHEMA_VERSION = "20260510_local_multirestaurant_order_payment_v4";

export type MenuCategory = {
  id: string;
  /** Required in Batch 10 repository/API foundation. */
  restaurantId?: string;
  name: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type RestaurantMenuItemStatus = "SELLING" | "HIDDEN" | "OUT_OF_STOCK";

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

export type RestaurantCartState = {
  /** Required in Batch 10 repository/API foundation. */
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
  tableNumber: string;
  note: string;
  items: RestaurantCartItem[];
};

export type RestaurantOrderStatus =
  | "NEW"
  | "ACCEPTED"
  | "PREPARING"
  | "COMPLETED"
  | "CANCELLED";

type LegacyRestaurantOrderStatus = RestaurantOrderStatus | string;
export type RawRestaurantOrder = Omit<
  Partial<RestaurantOrder>,
  "orderStatus" | "status" | "paymentStatus"
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

export type RestaurantPaymentStatus = "UNPAID" | "PAID";
export type RestaurantPaymentMethod = "CASH" | "BANK_TRANSFER" | "MOCK";

export const RESTAURANT_PAYMENT_METHODS: RestaurantPaymentMethod[] = [
  "CASH",
  "BANK_TRANSFER",
  "MOCK",
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

export type RestaurantOrderSource = "admin" | "customer" | "local-demo";

export type RestaurantOrder = {
  id: string;
  /** Required once ApiRepository/server mode is enabled. Optional only for old local demo migration. */
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
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

export type RestaurantAdminAccount = {
  username: string;
  password: string;
  restaurantIds?: string[];
  activeRestaurantId?: string;
  role?: "OWNER" | "MANAGER" | "STAFF";
  createdAt: string;
};

const nowIso = () => new Date().toISOString();

const getDefaultLocalAdminAccounts = (): RestaurantAdminAccount[] => {
  const timestamp = nowIso();

  return [
    {
      username: "admin",
      password: "admin123",
      restaurantIds: [DEFAULT_LOCAL_RESTAURANT_ID, HAIDILAO_LOCAL_RESTAURANT_ID],
      activeRestaurantId: DEFAULT_LOCAL_RESTAURANT_ID,
      role: "OWNER",
      createdAt: timestamp,
    },
    {
      username: "haidilao",
      password: "admin123",
      restaurantIds: [HAIDILAO_LOCAL_RESTAURANT_ID],
      activeRestaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
      role: "OWNER",
      createdAt: timestamp,
    },
    {
      username: "staff",
      password: "staff123",
      restaurantIds: [DEFAULT_LOCAL_RESTAURANT_ID],
      activeRestaurantId: DEFAULT_LOCAL_RESTAURANT_ID,
      role: "STAFF",
      createdAt: timestamp,
    },
  ];
};

const mergeDefaultLocalAdminAccounts = (
  accounts: RestaurantAdminAccount[],
) => {
  const defaults = getDefaultLocalAdminAccounts();
  const defaultsByUsername = new Map(
    defaults.map(account => [normalise(account.username), account]),
  );
  const seen = new Set<string>();
  let changed = false;

  const merged = accounts.map(account => {
    const usernameKey = normalise(account.username);
    const defaultAccount = defaultsByUsername.get(usernameKey);
    seen.add(usernameKey);

    if (!defaultAccount) {
      return account;
    }

    const upgraded: RestaurantAdminAccount = {
      ...account,
      password: defaultAccount.password,
      restaurantIds: defaultAccount.restaurantIds,
      activeRestaurantId: defaultAccount.activeRestaurantId,
      role: defaultAccount.role,
    };

    if (JSON.stringify(upgraded) !== JSON.stringify(account)) {
      changed = true;
    }

    return upgraded;
  });

  const missingDefaults = defaults.filter(
    account => !seen.has(normalise(account.username)),
  );

  if (missingDefaults.length > 0) {
    changed = true;
  }

  return changed ? [...merged, ...missingDefaults] : accounts;
};

const createId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const sampleTime = nowIso();

export const DEFAULT_DRINK_CATEGORY_ID = "drink";
export const DEFAULT_FOOD_CATEGORY_ID = "food";

export const DEFAULT_MENU_CATEGORIES: MenuCategory[] = [
  {
    id: DEFAULT_DRINK_CATEGORY_ID,
    name: "Đồ uống",
    sortOrder: 1,
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: DEFAULT_FOOD_CATEGORY_ID,
    name: "Đồ ăn",
    sortOrder: 2,
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
];

export const defaultMenuItems: RestaurantMenuItem[] = [
  {
    id: "sample_coca",
    categoryId: DEFAULT_DRINK_CATEGORY_ID,
    name: "Coca",
    price: 25000,
    description: "Coca-Cola lạnh, phục vụ nhanh tại bàn.",
    imageUrl:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80",
    available: true,
    status: "SELLING",
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: "sample_fanta",
    categoryId: DEFAULT_DRINK_CATEGORY_ID,
    name: "Fanta",
    price: 25000,
    description: "Nước cam có gas, vị ngọt mát, uống lạnh ngon hơn.",
    imageUrl:
      "https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=900&q=80",
    available: true,
    status: "SELLING",
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: "sample_mirinda",
    categoryId: DEFAULT_DRINK_CATEGORY_ID,
    name: "Mirinda",
    price: 25000,
    description: "Mirinda lạnh, hợp dùng khi chơi hoặc nghỉ giữa trận.",
    imageUrl:
      "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=900&q=80",
    available: true,
    status: "SELLING",
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: "sample_pepsi",
    categoryId: DEFAULT_DRINK_CATEGORY_ID,
    name: "Pepsi",
    price: 25000,
    description: "Pepsi lạnh, vị ga mạnh, phục vụ nhanh cho bàn chơi.",
    imageUrl:
      "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=80",
    available: true,
    status: "SELLING",
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
];

const HAIDILAO_LOCAL_CATEGORIES: MenuCategory[] = [
  {
    id: "haidilao_hotpot",
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    name: "Nước lẩu",
    sortOrder: 1,
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: "haidilao_meat",
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    name: "Thịt nhúng",
    sortOrder: 2,
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: "haidilao_side",
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    name: "Rau - món kèm",
    sortOrder: 3,
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
];

const HAIDILAO_LOCAL_MENU_ITEMS: RestaurantMenuItem[] = [
  {
    id: "haidilao_mushroom_hotpot",
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    categoryId: "haidilao_hotpot",
    name: "Lẩu nấm thanh ngọt",
    price: 189000,
    description: "Nước lẩu nấm dịu vị, phù hợp dùng cùng thịt bò và rau tươi.",
    imageUrl:
      "https://images.unsplash.com/photo-1512003867696-6d5ce6835040?auto=format&fit=crop&w=900&q=80",
    available: true,
    status: "SELLING",
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: "haidilao_spicy_hotpot",
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    categoryId: "haidilao_hotpot",
    name: "Lẩu cay Tứ Xuyên",
    price: 199000,
    description: "Vị cay thơm, hợp với đồ nhúng bò, hải sản và viên thả lẩu.",
    imageUrl:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    available: true,
    status: "SELLING",
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: "haidilao_beef_plate",
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    categoryId: "haidilao_meat",
    name: "Ba chỉ bò Mỹ",
    price: 129000,
    description: "Thịt bò cắt lát mỏng, nhúng nhanh trong nước lẩu đang sôi.",
    imageUrl:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=900&q=80",
    available: true,
    status: "SELLING",
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
  {
    id: "haidilao_vegetable_set",
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    categoryId: "haidilao_side",
    name: "Set rau nấm tổng hợp",
    price: 79000,
    description: "Rau xanh, nấm và đồ ăn kèm cho bàn lẩu.",
    imageUrl:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80",
    available: true,
    status: "SELLING",
    createdAt: sampleTime,
    updatedAt: sampleTime,
  },
];

const getSeedCategoriesForRestaurant = (restaurantId: string) => {
  if (restaurantId === HAIDILAO_LOCAL_RESTAURANT_ID) {
    return HAIDILAO_LOCAL_CATEGORIES;
  }

  return DEFAULT_MENU_CATEGORIES;
};

const getSeedItemsForRestaurant = (restaurantId: string) => {
  if (restaurantId === HAIDILAO_LOCAL_RESTAURANT_ID) {
    return HAIDILAO_LOCAL_MENU_ITEMS;
  }

  return defaultMenuItems;
};

const legacySeedCategoryIds = [
  "hotpot",
  "meat",
  "seafood",
  "vegetable",
  "snack",
  "combo",
  "other",
];

const legacySeedItemIds = [
  "sample_hotpot_combo",
  "sample_beef_plate",
  "sample_seafood_plate",
  "sample_mushroom_set",
  "sample_snack_combo",
  "sample_iced_tea",
];

const normalise = (value?: string) => {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const safeJsonParse = <T>(value: string | null, fallback: T) => {
  if (!value) {
    return { value: fallback, ok: true };
  }

  try {
    return { value: JSON.parse(value) as T, ok: true };
  } catch (error) {
    devWarn("[RestaurantMenuStorage] invalid JSON, reset safe fallback", error);
    return { value: fallback, ok: false };
  }
};

const resolveRestaurantScopeId = (restaurantId?: string) => {
  const cleanRestaurantId = String(restaurantId || "").trim();
  return cleanRestaurantId || DEFAULT_LOCAL_RESTAURANT_ID;
};

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
    orders: getRestaurantScopedStorageKey(RESTAURANT_STORAGE_KEYS.orders, scopeId),
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

const withRestaurantId = <T extends { restaurantId?: string }>(
  record: T,
  restaurantId: string,
): T => ({ ...record, restaurantId: record.restaurantId || restaurantId });

const cleanCategory = (
  category: Partial<MenuCategory>,
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
): MenuCategory => {
  const timestamp = nowIso();
  const cleanName = (category.name || "").trim() || "Đồ uống";

  return {
    id: category.id || createId("cat"),
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
  const cleaned = categories.map(category => cleanCategory(category, restaurantId));
  const withoutDuplicateNames = cleaned.filter(
    (category, index, source) =>
      source.findIndex(
        item => normalise(item.name) === normalise(category.name),
      ) === index,
  );

  // Defaults are only used when there is no category data yet. After the first
  // seed, Admin must be able to rename/delete Đồ uống and Đồ ăn like normal
  // dynamic categories. Do not force them back into AsyncStorage on every load.
  return withoutDuplicateNames.length > 0
    ? withoutDuplicateNames
    : DEFAULT_MENU_CATEGORIES.map(category => cleanCategory(category, restaurantId));
};

const seedDefaultMenu = async (restaurantId = DEFAULT_LOCAL_RESTAURANT_ID) => {
  const scopedKeys = getScopedKeys(restaurantId);
  const categories = getSeedCategoriesForRestaurant(scopedKeys.restaurantId).map(category =>
    cleanCategory(category, scopedKeys.restaurantId),
  );
  const seededItems = getSeedItemsForRestaurant(scopedKeys.restaurantId).map(item =>
    migrateMenuItem(item, categories, scopedKeys.restaurantId),
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
      category => normalise(category.name) === normalise("Đồ uống"),
    ) ||
    categories[0];
  const foodCategory =
    categories.find(category => category.id === DEFAULT_FOOD_CATEGORY_ID) ||
    categories.find(
      category => normalise(category.name) === normalise("Đồ ăn"),
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
    raw.includes("uong") ||
    raw.includes("drink") ||
    raw.includes("coca") ||
    raw.includes("pepsi") ||
    raw.includes("fanta") ||
    raw.includes("mirinda") ||
    raw.includes("tra") ||
    raw.includes("nuoc")
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
    status === "HIDDEN" ||
    status === "OUT_OF_STOCK" ||
    status === "SELLING"
  ) {
    return status;
  }

  return available === false ? "HIDDEN" : "SELLING";
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
    id: item.id || createId("dish"),
    restaurantId: item.restaurantId || restaurantId,
    categoryId,
    name: (item.name || "Món chưa đặt tên").trim(),
    price: Number(item.price) || 0,
    description: item.description || "",
    imageUrl,
    imageUri: undefined,
    available: status === "SELLING",
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

  const sourceCategories =
    scopedCategories.length > 0 ? scopedCategories : legacyCategories;
  const sourceItems = scopedItems.length > 0 ? scopedItems : legacyItems;

  if (sourceCategories.length === 0 && sourceItems.length === 0) {
    await seedDefaultMenu(scopedKeys.restaurantId);
    return;
  }

  const nextCategories = ensureDefaultCategories(
    sourceCategories.map(category =>
      cleanCategory(withRestaurantId(category, scopedKeys.restaurantId), scopedKeys.restaurantId),
    ),
    scopedKeys.restaurantId,
  );
  const nextItems = sourceItems
    .filter(item => legacySeedItemIds.indexOf(item.id || "") < 0)
    .map(item =>
      migrateMenuItem(
        withRestaurantId(item, scopedKeys.restaurantId),
        nextCategories,
        scopedKeys.restaurantId,
      ),
    );

  await writeArray(scopedKeys.categories, nextCategories);
  await writeArray(
    scopedKeys.menuItems,
    nextItems.length > 0
      ? nextItems
      : defaultMenuItems.map(item =>
          migrateMenuItem(item, nextCategories, scopedKeys.restaurantId),
        ),
  );
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
    await seedDefaultMenu(scopedKeys.restaurantId);
    return DEFAULT_MENU_CATEGORIES.map(category =>
      cleanCategory(category, scopedKeys.restaurantId),
    );
  }

  const migrated = ensureDefaultCategories(
    stored.map(category => cleanCategory(category, scopedKeys.restaurantId)),
    scopedKeys.restaurantId,
  );

  if (JSON.stringify(stored) !== JSON.stringify(migrated)) {
    await writeArray(scopedKeys.categories, migrated);
  }

  return migrated.sort(
    (a, b) =>
      Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
  );
};

export const saveMenuCategories = async (
  categories: MenuCategory[],
  restaurantId?: string,
) => {
  const scopedKeys = getScopedKeys(restaurantId);
  const cleaned = ensureDefaultCategories(
    categories.map(category => cleanCategory(category, scopedKeys.restaurantId)),
    scopedKeys.restaurantId,
  );
  await writeArray(scopedKeys.categories, cleaned);
  await AsyncStorage.setItem(scopedKeys.schemaVersion, CURRENT_SCHEMA_VERSION);
  return cleaned;
};

export const upsertMenuCategory = async (
  input: Partial<MenuCategory> & { name: string },
): Promise<{ ok: boolean; message: string; categories: MenuCategory[] }> => {
  const restaurantId = resolveRestaurantScopeId(input.restaurantId);
  const cleanName = input.name.trim();

  if (!cleanName) {
    return {
      ok: false,
      message: "Vui lòng nhập tên danh mục",
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
      message: "Danh mục này đã tồn tại",
      categories: current,
    };
  }

  const timestamp = nowIso();
  const nextCategory: MenuCategory = {
    id: input.id || createId("cat"),
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
    message: input.id ? "Đã cập nhật danh mục" : "Đã thêm danh mục mới",
    categories,
  };
};

export const deleteMenuCategory = async (
  categoryId: string,
  options: { moveItemsToCategoryId?: string; restaurantId?: string } = {},
): Promise<{ ok: boolean; message: string; categories: MenuCategory[] }> => {
  const restaurantId = resolveRestaurantScopeId(options.restaurantId);
  const [categories, items] = await Promise.all([
    loadMenuCategories(restaurantId),
    loadMenuItems(restaurantId),
  ]);
  const targetCategory = categories.find(category => category.id === categoryId);

  if (!targetCategory) {
    return {
      ok: false,
      message: "Không tìm thấy danh mục cần xoá",
      categories,
    };
  }

  if (categories.length <= 1) {
    return {
      ok: false,
      message: "Menu cần ít nhất 1 danh mục.",
      categories,
    };
  }

  const nextCategories = categories.filter(category => category.id !== categoryId);
  const fallbackCategory =
    nextCategories.find(
      category => category.id === options.moveItemsToCategoryId,
    ) || nextCategories[0];

  if (!fallbackCategory) {
    return {
      ok: false,
      message: "Không có danh mục thay thế để chuyển món.",
      categories,
    };
  }

  const usedItems = items.filter(item => item.categoryId === categoryId);
  const savedCategories = await saveMenuCategories(nextCategories, restaurantId);

  if (usedItems.length > 0) {
    const timestamp = nowIso();
    const movedItems = items.map(item =>
      item.categoryId === categoryId
        ? { ...item, categoryId: fallbackCategory.id, updatedAt: timestamp }
        : item,
    );

    await saveMenuItems(movedItems, restaurantId);
  }

  const message =
    usedItems.length > 0
      ? `Đã xoá danh mục và chuyển ${usedItems.length} món sang “${fallbackCategory.name}”`
      : "Đã xoá danh mục";

  return { ok: true, message, categories: savedCategories };
};

export const getCategoryNameById = (
  categoryId: string,
  categories: MenuCategory[] = DEFAULT_MENU_CATEGORIES,
) => {
  return (
    categories.find(category => category.id === categoryId)?.name ||
    categories[0]?.name ||
    "Chưa phân loại"
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
    const seededItems = defaultMenuItems.map(item =>
      migrateMenuItem(item, categories, scopedKeys.restaurantId),
    );
    await writeArray(scopedKeys.menuItems, seededItems);
    return seededItems;
  }

  const migrated = stored.map(item =>
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
    items.map(item => migrateMenuItem(item, categories, scopedKeys.restaurantId)),
  );
};

export const upsertMenuItem = async (
  input: Omit<
    RestaurantMenuItem,
    "id" | "createdAt" | "updatedAt" | "available"
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
  const itemId = input.id || createId("dish");
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
    available: status === "SELLING",
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
    String(status || "")
      .trim()
      .toUpperCase()
  ) {
    case "ACCEPTED":
      return "ACCEPTED";
    case "PREPARING":
      return "PREPARING";
    case "SERVED":
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    case "PAID":
      // Legacy builds incorrectly used `paid` as an order processing status.
      // Do not blindly mark the kitchen/service flow as completed here; Batch 2
      // migrates payment to paymentStatus and keeps the processing state safe.
      return "NEW";
    case "NEW":
    default:
      return "NEW";
  }
};

export const normalisePaymentStatus = (
  order: RawRestaurantOrder,
): RestaurantPaymentStatus => {
  const paymentStatus = String(order.paymentStatus || "")
    .trim()
    .toUpperCase();
  const legacyStatus = String(order.status || order.orderStatus || "")
    .trim()
    .toUpperCase();

  return paymentStatus === "PAID" || legacyStatus === "PAID"
    ? "PAID"
    : "UNPAID";
};

export const normalisePaymentMethod = (
  method?: RestaurantPaymentMethod | string,
): RestaurantPaymentMethod => {
  const normalized = String(method || "")
    .trim()
    .toUpperCase();

  return RESTAURANT_PAYMENT_METHODS.includes(
    normalized as RestaurantPaymentMethod,
  )
    ? (normalized as RestaurantPaymentMethod)
    : "MOCK";
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
    id: String(order.id || createId("order")),
    restaurantId: order.restaurantId || restaurantId,
    branchId: order.branchId,
    tableId: order.tableId,
    orderSource:
      order.orderSource || (order.restaurantId ? "customer" : "local-demo"),
    tableNumber: String(order.tableNumber || ""),
    items: Array.isArray(order.items) ? order.items : [],
    note: String(order.note || ""),
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

const ORDER_STATUS_TRANSITIONS: Record<RestaurantOrderStatus, RestaurantOrderStatus[]> = {
  NEW: ["NEW", "ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ACCEPTED", "PREPARING", "CANCELLED"],
  PREPARING: ["PREPARING", "COMPLETED", "CANCELLED"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED"],
};

export const isRestaurantOrderStatusTransitionAllowed = (
  fromStatus: RestaurantOrderStatus,
  toStatus: RestaurantOrderStatus,
) => ORDER_STATUS_TRANSITIONS[fromStatus].indexOf(toStatus) >= 0;

export const loadOrders = async (
  restaurantId?: string,
): Promise<RestaurantOrder[]> => {
  const scopedKeys = getScopedKeys(restaurantId);
  const scopedOrders = await readArray<RawRestaurantOrder>(scopedKeys.orders);
  const legacyOrders = scopedOrders.length > 0
    ? []
    : await readArray<RawRestaurantOrder>(RESTAURANT_STORAGE_KEYS.orders);
  const rawOrders = scopedOrders.length > 0 ? scopedOrders : legacyOrders;
  const orders = rawOrders.map(order =>
    normaliseRestaurantOrder(order, scopedKeys.restaurantId),
  );
  const filteredOrders = orders.filter(
    order => order.restaurantId === scopedKeys.restaurantId,
  );
  const needsOrderMigration =
    rawOrders.length !== filteredOrders.length ||
    rawOrders.some((order, index) => {
      const normalised = orders[index];
      return (
        order.status !== undefined ||
        order.restaurantId !== scopedKeys.restaurantId ||
        order.orderStatus !== normalised.orderStatus ||
        String(order.paymentStatus || "UNPAID").toUpperCase() !==
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

export const createRestaurantOrder = async (
  payload: Omit<
    RestaurantOrder,
    "id" | "orderStatus" | "paymentStatus" | "createdAt" | "updatedAt"
  > & {
    paymentStatus?: RestaurantPaymentStatus;
    paymentMethod?: RestaurantPaymentMethod;
  },
): Promise<RestaurantOrder[]> => {
  const restaurantId = resolveRestaurantScopeId(payload.restaurantId);
  const current = await loadOrders(restaurantId);
  const timestamp = nowIso();
  const orderItems = Array.isArray(payload.items) ? payload.items : [];
  const order: RestaurantOrder = {
    ...payload,
    items: orderItems,
    total: calculateRestaurantOrderTotal(orderItems),
    restaurantId,
    id: createId("order"),
    orderStatus: "NEW",
    paymentStatus: payload.paymentStatus || "UNPAID",
    paymentMethod: normalisePaymentMethod(payload.paymentMethod),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const nextOrders = [order, ...current];
  await saveOrders(nextOrders, restaurantId);
  return nextOrders;
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

    if (!isRestaurantOrderStatusTransitionAllowed(order.orderStatus, nextStatus)) {
      return order;
    }

    return {
      ...order,
      orderStatus: nextStatus,
      updatedAt: timestamp,
    };
  });
  await saveOrders(nextOrders, scopedRestaurantId);
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
          paymentMethod: normalisePaymentMethod(paymentMethod || order.paymentMethod),
          updatedAt: timestamp,
        }
      : order,
  );

  await saveOrders(nextOrders, scopedRestaurantId);
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
    tableNumber: "",
    note: "",
    items: [],
  });

  if (!parsed.ok) {
    await AsyncStorage.removeItem(scopedKeys.currentCart);
  }

  const items = Array.isArray(parsed.value.items)
    ? parsed.value.items
        .map(item => ({
          itemId: String(item.itemId || ""),
          quantity: Math.max(0, Number(item.quantity) || 0),
        }))
        .filter(item => item.itemId && item.quantity > 0)
    : [];

  return {
    restaurantId: scopedKeys.restaurantId,
    branchId: parsed.value.branchId,
    tableId: parsed.value.tableId,
    tableNumber: parsed.value.tableNumber || "",
    note: parsed.value.note || "",
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
      tableNumber: cart.tableNumber || "",
      note: cart.note || "",
      items: Array.isArray(cart.items) ? cart.items : [],
    }),
  );
};

export const clearCurrentCart = async (restaurantId?: string) => {
  const scopedKeys = getScopedKeys(restaurantId);
  await AsyncStorage.removeItem(scopedKeys.currentCart);
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

export const registerRestaurantAdmin = async (
  username: string,
  password: string,
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
): Promise<{
  ok: boolean;
  message: string;
  userId?: string;
  role?: 'OWNER' | 'MANAGER' | 'STAFF';
  restaurantId?: string;
  restaurantIds?: string[];
}> => {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return { ok: false, message: "Vui lòng nhập tên tài khoản và mật khẩu" };
  }

  const accounts = await loadAdminAccounts();
  const existed = accounts.some(
    account => normalise(account.username) === normalise(cleanUsername),
  );

  if (existed) {
    return { ok: false, message: "Tài khoản admin đã tồn tại" };
  }

  // DEMO LOCAL ONLY: password is stored in AsyncStorage for the first offline version.
  // Replace this with backend auth + hashed password/session before production restaurant deployment.
  const nextAccounts = [
    ...accounts,
    {
      username: cleanUsername,
      password: cleanPassword,
      restaurantIds: [resolveRestaurantScopeId(restaurantId)],
      activeRestaurantId: resolveRestaurantScopeId(restaurantId),
      role: "OWNER" as const,
      createdAt: nowIso(),
    },
  ];
  await writeArray(RESTAURANT_STORAGE_KEYS.adminAccounts, nextAccounts);

  const scopedRestaurantId = resolveRestaurantScopeId(restaurantId);
  return {
    ok: true,
    message: "Đăng ký admin local thành công",
    userId: `local_admin_${normalise(cleanUsername) || 'unknown'}`,
    role: "OWNER",
    restaurantId: scopedRestaurantId,
    restaurantIds: [scopedRestaurantId],
  };
};

export const verifyRestaurantAdmin = async (
  username: string,
  password: string,
  restaurantId = DEFAULT_LOCAL_RESTAURANT_ID,
): Promise<{
  ok: boolean;
  message: string;
  userId?: string;
  role?: 'OWNER' | 'MANAGER' | 'STAFF';
  restaurantId?: string;
  restaurantIds?: string[];
}> => {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return { ok: false, message: "Vui lòng nhập tên tài khoản và mật khẩu" };
  }

  const accounts = await loadAdminAccounts();
  const targetRestaurantId = resolveRestaurantScopeId(restaurantId);
  const matchedAccount = accounts.find(account => {
    const usernameMatched = normalise(account.username) === normalise(cleanUsername);
    const passwordMatched = account.password === cleanPassword;
    return usernameMatched && passwordMatched;
  });

  if (!matchedAccount) {
    return { ok: false, message: "Tên tài khoản hoặc mật khẩu chưa đúng" };
  }

  const accountRestaurantIds = matchedAccount.restaurantIds || [
    matchedAccount.activeRestaurantId || DEFAULT_LOCAL_RESTAURANT_ID,
  ];
  const role = matchedAccount.role || "OWNER";
  const preferredRestaurantId =
    matchedAccount.activeRestaurantId ||
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

  return {
    ok: true,
    message: "Đăng nhập admin thành công",
    userId: `local_admin_${normalise(cleanUsername) || 'unknown'}`,
    role,
    restaurantId: scopedRestaurantId,
    restaurantIds: accountRestaurantIds,
  };
};
