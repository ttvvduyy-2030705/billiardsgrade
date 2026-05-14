'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {createSeedDatabase, clone} = require('./data/seed');

const PORT = Number(process.env.SCOREMENU_PORT || process.env.PORT || 4012);
const HOST = process.env.SCOREMENU_HOST || '0.0.0.0';

const resolveStoragePath = (configuredPath, fallbackPath, options = {}) => {
  const label = options.label || 'storage';
  const isDirectory = Boolean(options.isDirectory);
  const normalizePath = value => (path.isAbsolute(value) ? value : path.join(__dirname, value));
  const fallback = normalizePath(fallbackPath);
  const requested = normalizePath(configuredPath || fallbackPath);

  const isWritable = targetPath => {
    try {
      const directory = isDirectory ? targetPath : path.dirname(targetPath);
      fs.mkdirSync(directory, {recursive: true});
      const probeFile = path.join(directory, `.scoremenu-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-write-test`);
      fs.writeFileSync(probeFile, 'ok');
      fs.unlinkSync(probeFile);
      return true;
    } catch (_error) {
      return false;
    }
  };

  if (isWritable(requested)) {
    return requested;
  }

  if (requested !== fallback && isWritable(fallback)) {
    console.warn(`[ScoreMenu] ${label} path is not writable; falling back to ${fallback}`);
    return fallback;
  }

  return requested;
};

const DATA_FILE = resolveStoragePath(process.env.SCOREMENU_DB_FILE, path.join('data', 'db.json'), {
  label: 'Database',
});
const SCHEMA_FILE = path.join(__dirname, 'data', 'schema.json');
const ENABLE_AUTH_GUARD = process.env.SCOREMENU_AUTH_GUARD !== '0';
const TOKEN_SECRET = process.env.SCOREMENU_TOKEN_SECRET || 'scoremenu_dev_secret_change_me';
const TOKEN_TTL_MS = Number(process.env.SCOREMENU_TOKEN_TTL_MS || 1000 * 60 * 60 * 24);
const UPLOAD_DIR = resolveStoragePath(process.env.SCOREMENU_UPLOAD_DIR, path.join('data', 'uploads'), {
  label: 'Uploads',
  isDirectory: true,
});
const PUBLIC_UPLOAD_PREFIX = '/uploads/menu-images';
const MAX_BODY_BYTES = Number(process.env.SCOREMENU_MAX_BODY_BYTES || 1024 * 1024 * 12);
const MAX_IMAGE_BYTES = Number(process.env.SCOREMENU_MAX_IMAGE_BYTES || 1024 * 1024 * 6);
const PUBLIC_ORDER_RATE_LIMIT_WINDOW_MS = Number(
  process.env.SCOREMENU_PUBLIC_ORDER_RATE_LIMIT_WINDOW_MS || 1000 * 60,
);
const PUBLIC_ORDER_RATE_LIMIT_MAX = Number(process.env.SCOREMENU_PUBLIC_ORDER_RATE_LIMIT_MAX || 8);
const PUBLIC_ORDER_ERROR_LIMIT_WINDOW_MS = Number(
  process.env.SCOREMENU_PUBLIC_ORDER_ERROR_LIMIT_WINDOW_MS || 1000 * 60 * 5,
);
const PUBLIC_ORDER_ERROR_LIMIT_MAX = Number(process.env.SCOREMENU_PUBLIC_ORDER_ERROR_LIMIT_MAX || 5);
const PUBLIC_ORDER_BLOCK_MS = Number(process.env.SCOREMENU_PUBLIC_ORDER_BLOCK_MS || 1000 * 60 * 5);
const PUBLIC_ORDER_RATE_LIMIT_STORE_MAX = Number(
  process.env.SCOREMENU_PUBLIC_ORDER_RATE_LIMIT_STORE_MAX || 2000,
);
const AUDIT_LOG_STORE_MAX = Number(process.env.SCOREMENU_AUDIT_LOG_STORE_MAX || 1000);
const SCOREMENU_SCHEMA_VERSION = 'scoremenu_backend_schema_v1_batch25';


const ORDER_STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'COMPLETED', 'CANCELLED'];
const PAYMENT_STATUSES = ['UNPAID', 'PAID'];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOCK'];
const BILL_SESSION_STATUSES = ['OPEN', 'PAYMENT_REQUESTED', 'PAID', 'CLOSED', 'CANCELLED'];
const CUSTOMER_ORDERABLE_BILL_SESSION_STATUSES = ['OPEN', 'PAYMENT_REQUESTED'];
const FINAL_BILL_SESSION_STATUSES = ['PAID', 'CLOSED', 'CANCELLED'];
const ITEM_STATUSES = ['SELLING', 'HIDDEN', 'OUT_OF_STOCK'];
const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'LOCKED', 'HIDDEN'];
const BRANCH_STATUSES = ['ACTIVE', 'LOCKED', 'HIDDEN'];

const nowIso = () => new Date().toISOString();
const createId = prefix => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

const PRODUCTION_DEMO_ADMIN_IDS = new Set([
  'admin_aplus_owner',
  'admin_aplus_staff',
  'admin_haidilao_owner',
  'admin_demo_owner',
]);
const PRODUCTION_DEMO_ADMIN_SALTS = new Set([
  'admin_aplus_owner_salt',
  'admin_aplus_staff_salt',
  'admin_haidilao_owner_salt',
  'admin_demo_owner_salt',
]);
const PRODUCTION_DEMO_ADMIN_USERNAMES = new Set(['admin', 'staff', 'haidilao']);
const PRODUCTION_DEMO_RESTAURANT_IDS = new Set([
  'aplus_billiards_hanoi',
  'haidilao_demo',
  'haidilao_local_demo',
  'legacy_removed_restaurant',
  'local_restaurant',
]);
const PRODUCTION_DEMO_BRANCH_IDS = new Set([
  'aplus_hanoi_main',
  'aplus_hanoi_vip',
  'haidilao_demo_main',
  'haidilao_demo_2',
  'haidilao_local_main_branch',
  'legacy_removed_branch',
  'local_main_branch',
]);
const PRODUCTION_DEMO_TABLE_IDS = new Set([
  'aplus_main_table_01',
  'aplus_main_table_02',
  'aplus_vip_table_01',
  'haidilao_main_table_01',
  'haidilao_main_table_02',
  'haidilao_2_table_01',
  'haidilao_local_table_01',
  'legacy_removed_table',
  'local_table_01',
]);
const PRODUCTION_DEMO_CATEGORY_IDS = new Set([
  'aplus_drink',
  'aplus_snack',
  'haidilao_hotpot',
  'haidilao_meat',
  'haidilao_side',
  'drink',
  'food',
]);
const PRODUCTION_DEMO_ITEM_IDS = new Set([
  'aplus_coca',
  'aplus_pepsi',
  'aplus_fries',
  'haidilao_mushroom_hotpot',
  'haidilao_beef_plate',
  'haidilao_spicy_hotpot',
  'haidilao_vegetable_set',
  'sample_coca',
  'sample_fanta',
  'sample_mirinda',
  'sample_pepsi',
]);


const isProductionDemoRestaurantId = value => {
  const id = cleanString(value);
  return Boolean(id) && (
    PRODUCTION_DEMO_RESTAURANT_IDS.has(id) ||
    /^aplus_|^haidilao_|^seed_|^sample_|^legacy_removed_/i.test(id)
  );
};

const isProductionDemoBranchId = value => {
  const id = cleanString(value);
  return Boolean(id) && (
    PRODUCTION_DEMO_BRANCH_IDS.has(id) ||
    /^aplus_|^haidilao_|^seed_|^sample_|^legacy_removed_/i.test(id)
  );
};

const sanitizeAdminUserScope = (db, user) => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const knownRestaurantIds = new Set(
    (Array.isArray(db.restaurants) ? db.restaurants : [])
      .filter(restaurant => !isProductionDemoRestaurant(restaurant))
      .map(restaurant => cleanString(restaurant.id))
      .filter(Boolean),
  );
  const cleanRestaurantIds = (Array.isArray(user.restaurantIds) ? user.restaurantIds : [])
    .map(cleanString)
    .filter(Boolean)
    .filter(id => knownRestaurantIds.has(id) && !isProductionDemoRestaurantId(id));
  const uniqueRestaurantIds = Array.from(new Set(cleanRestaurantIds));
  const cleanActiveRestaurantId = cleanString(user.activeRestaurantId);
  const nextActiveRestaurantId =
    cleanActiveRestaurantId && uniqueRestaurantIds.includes(cleanActiveRestaurantId)
      ? cleanActiveRestaurantId
      : uniqueRestaurantIds[0] || '';

  const cleanBranchIds = (Array.isArray(user.branchIds) ? user.branchIds : [])
    .map(cleanString)
    .filter(Boolean)
    .filter(id => !isProductionDemoBranchId(id));
  const uniqueBranchIds = Array.from(new Set(cleanBranchIds));
  const cleanActiveBranchId = cleanString(user.activeBranchId);
  const nextActiveBranchId =
    cleanActiveBranchId && uniqueBranchIds.includes(cleanActiveBranchId)
      ? cleanActiveBranchId
      : uniqueBranchIds[0] || '';

  const changed =
    JSON.stringify(user.restaurantIds || []) !== JSON.stringify(uniqueRestaurantIds) ||
    cleanString(user.activeRestaurantId) !== nextActiveRestaurantId ||
    JSON.stringify(user.branchIds || []) !== JSON.stringify(uniqueBranchIds) ||
    cleanString(user.activeBranchId) !== nextActiveBranchId;

  if (changed) {
    user.restaurantIds = uniqueRestaurantIds;
    user.activeRestaurantId = nextActiveRestaurantId;
    user.branchIds = uniqueBranchIds;
    user.activeBranchId = nextActiveBranchId;
    user.updatedAt = nowIso();
  }

  return changed;
};

const normalizeUsernameKey = value => String(value || '').trim().toLowerCase();

const isProductionDemoAdminUser = user => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  if (PRODUCTION_DEMO_ADMIN_IDS.has(String(user.id || ''))) {
    return true;
  }

  if (PRODUCTION_DEMO_ADMIN_SALTS.has(String(user.passwordSalt || ''))) {
    return true;
  }

  const username = normalizeUsernameKey(user.username);
  return (
    PRODUCTION_DEMO_ADMIN_USERNAMES.has(username) &&
    String(user.createdAt || '').startsWith('2026-05-09')
  );
};

const purgeProductionDemoAdmins = db => {
  if (!db || !Array.isArray(db.adminUsers)) {
    return false;
  }

  const before = db.adminUsers.length;
  db.adminUsers = db.adminUsers.filter(user => !isProductionDemoAdminUser(user));
  return db.adminUsers.length !== before;
};

const isProductionDemoRestaurant = restaurant => {
  if (!restaurant || typeof restaurant !== 'object') {
    return false;
  }

  const id = String(restaurant.id || '');
  const ownerId = String(restaurant.ownerId || '');
  return (
    PRODUCTION_DEMO_RESTAURANT_IDS.has(id) ||
    PRODUCTION_DEMO_ADMIN_IDS.has(ownerId) ||
    (String(restaurant.createdAt || '').startsWith('2026-05-09') &&
      /demo|aplus|haidilao|nhà hàng chính|nhà hàng cũ/i.test(`${id} ${restaurant.name || ''}`))
  );
};

const purgeProductionDemoData = db => {
  if (!db || typeof db !== 'object') {
    return false;
  }

  const demoRestaurantIds = new Set(PRODUCTION_DEMO_RESTAURANT_IDS);
  (Array.isArray(db.restaurants) ? db.restaurants : []).forEach(restaurant => {
    if (isProductionDemoRestaurant(restaurant)) {
      demoRestaurantIds.add(String(restaurant.id || ''));
    }
  });

  let changed = false;
  const filterArray = (key, predicate) => {
    const current = Array.isArray(db[key]) ? db[key] : [];
    const next = current.filter(predicate);
    if (next.length !== current.length) {
      changed = true;
      db[key] = next;
    }
  };

  filterArray('restaurants', item => !demoRestaurantIds.has(String(item.id || '')));
  filterArray('branches', item =>
    !demoRestaurantIds.has(String(item.restaurantId || '')) &&
    !PRODUCTION_DEMO_BRANCH_IDS.has(String(item.id || '')),
  );
  filterArray('tables', item =>
    !demoRestaurantIds.has(String(item.restaurantId || '')) &&
    !PRODUCTION_DEMO_TABLE_IDS.has(String(item.id || '')),
  );
  filterArray('categories', item =>
    !demoRestaurantIds.has(String(item.restaurantId || '')) &&
    !PRODUCTION_DEMO_CATEGORY_IDS.has(String(item.id || '')),
  );
  filterArray('items', item =>
    !demoRestaurantIds.has(String(item.restaurantId || '')) &&
    !PRODUCTION_DEMO_ITEM_IDS.has(String(item.id || '')),
  );
  filterArray('orders', item =>
    !demoRestaurantIds.has(String(item.restaurantId || '')) &&
    !String(item.id || '').startsWith('seed_'),
  );
  filterArray('billSessions', item =>
    !demoRestaurantIds.has(String(item.restaurantId || '')) &&
    !String(item.id || '').startsWith('seed_'),
  );
  filterArray('auditLogs', item =>
    !demoRestaurantIds.has(String(item.restaurantId || '')) &&
    !String(item.id || '').startsWith('seed_'),
  );
  filterArray('publicOrderRateLimits', item => !demoRestaurantIds.has(String(item.restaurantId || '')));
  filterArray('imageUploads', item => !demoRestaurantIds.has(String(item.restaurantId || '')));

  if (db.carts && typeof db.carts === 'object') {
    Object.keys(db.carts).forEach(key => {
      const restaurantId = key.split(':')[0];
      if (demoRestaurantIds.has(restaurantId)) {
        delete db.carts[key];
        changed = true;
      }
    });
  }

  return changed;
};


const isDemoRecordId = value => {
  const id = String(value || '').trim();
  return (
    id.startsWith('seed_') ||
    id.startsWith('sample_') ||
    id.startsWith('aplus_') ||
    id.startsWith('haidilao_') ||
    id.startsWith('legacy_removed_') ||
    PRODUCTION_DEMO_CATEGORY_IDS.has(id) ||
    PRODUCTION_DEMO_ITEM_IDS.has(id) ||
    PRODUCTION_DEMO_BRANCH_IDS.has(id) ||
    PRODUCTION_DEMO_TABLE_IDS.has(id)
  );
};

const isDemoRecordText = value =>
  /dữ liệu mẫu|demo|sample|haidilao|a\s*plus|aplus|nhà hàng chính|nhà hàng cũ/i.test(
    String(value || ''),
  );

const isLeakedDemoCategory = category =>
  isDemoRecordId(category?.id) ||
  isDemoRecordText(`${category?.name || ''} ${category?.description || ''}`);

const isLeakedDemoItem = item =>
  isDemoRecordId(item?.id) ||
  isDemoRecordId(item?.categoryId) ||
  isDemoRecordText(`${item?.name || ''} ${item?.description || ''} ${item?.note || ''}`);

const isLeakedDemoOrder = order => {
  if (isDemoRecordId(order?.id) || isDemoRecordText(`${order?.note || ''} ${order?.guestSessionId || ''}`)) {
    return true;
  }
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.length > 0 && items.every(item => isDemoRecordId(item?.itemId) || isDemoRecordText(`${item?.name || ''} ${item?.note || ''}`));
};

const isLeakedDemoBillSession = billSession =>
  isDemoRecordId(billSession?.id) ||
  isDemoRecordText(`${billSession?.note || ''} ${billSession?.guestSessionId || ''}`) ||
  (Array.isArray(billSession?.orders) && billSession.orders.some(isLeakedDemoOrder));

const clearRestaurantScopedRuntimeData = (db, restaurantId) => {
  const id = cleanString(restaurantId);
  if (!id) {
    return false;
  }

  let changed = false;
  const wipeKeys = ['categories', 'items', 'orders', 'billSessions'];
  wipeKeys.forEach(key => {
    const current = Array.isArray(db[key]) ? db[key] : [];
    const next = current.filter(item => cleanString(item.restaurantId) !== id);
    if (next.length !== current.length) {
      db[key] = next;
      changed = true;
    }
  });

  if (db.carts && typeof db.carts === 'object') {
    Object.keys(db.carts).forEach(key => {
      if (key.split(':')[0] === id) {
        delete db.carts[key];
        changed = true;
      }
    });
  }

  return changed;
};

const removeLeakedDemoRecordsForRestaurant = (db, restaurantId) => {
  const id = cleanString(restaurantId);
  if (!id) {
    return false;
  }

  let changed = false;
  const filterScoped = (key, predicate) => {
    const current = Array.isArray(db[key]) ? db[key] : [];
    const next = current.filter(item => cleanString(item.restaurantId) !== id || !predicate(item));
    if (next.length !== current.length) {
      db[key] = next;
      changed = true;
    }
  };

  filterScoped('categories', isLeakedDemoCategory);
  filterScoped('items', isLeakedDemoItem);
  filterScoped('orders', isLeakedDemoOrder);
  filterScoped('billSessions', isLeakedDemoBillSession);

  if (db.carts && typeof db.carts === 'object') {
    Object.keys(db.carts).forEach(key => {
      if (key.split(':')[0] !== id) {
        return;
      }
      const cart = db.carts[key];
      const items = Array.isArray(cart?.items) ? cart.items : [];
      if (items.length === 0 || items.some(item => isLeakedDemoItem({id: item.itemId, name: item.name, note: item.note}))) {
        delete db.carts[key];
        changed = true;
      }
    });
  }

  return changed;
};


const normalizeDemoSearchText = value =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const DEMO_RUNTIME_KEYWORDS = [
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

const containsDemoRuntimeText = value => {
  const text = normalizeDemoSearchText(value);
  return DEMO_RUNTIME_KEYWORDS.some(keyword => text.includes(keyword));
};

const getRuntimeCreatedMs = item => {
  const candidates = [item?.createdAt, item?.openedAt, item?.orderedAt, item?.updatedAt];
  for (const candidate of candidates) {
    const ms = Date.parse(String(candidate || ''));
    if (Number.isFinite(ms)) {
      return ms;
    }
  }
  return 0;
};

const getRestaurantRuntimeRecords = (db, restaurantId) => {
  const id = cleanString(restaurantId);
  return {
    categories: (Array.isArray(db.categories) ? db.categories : []).filter(item => cleanString(item.restaurantId) === id),
    items: (Array.isArray(db.items) ? db.items : []).filter(item => cleanString(item.restaurantId) === id),
    orders: (Array.isArray(db.orders) ? db.orders : []).filter(item => cleanString(item.restaurantId) === id),
    billSessions: (Array.isArray(db.billSessions) ? db.billSessions : []).filter(item => cleanString(item.restaurantId) === id),
    carts: db.carts && typeof db.carts === 'object'
      ? Object.entries(db.carts)
          .filter(([key]) => key.split(':')[0] === id)
          .map(([, value]) => value)
      : [],
  };
};

const runtimeRecordCount = records =>
  records.categories.length +
  records.items.length +
  records.orders.length +
  records.billSessions.length +
  records.carts.length;

const hasRuntimeOlderThanAdmin = (records, user) => {
  const userCreatedMs = Date.parse(String(user?.createdAt || ''));
  if (!Number.isFinite(userCreatedMs) || userCreatedMs <= 0) {
    return false;
  }
  const allRecords = [
    ...records.categories,
    ...records.items,
    ...records.orders,
    ...records.billSessions,
    ...records.carts,
  ];
  return allRecords.some(record => {
    const recordMs = getRuntimeCreatedMs(record);
    return recordMs > 0 && recordMs + 1000 < userCreatedMs;
  });
};

const isLikelySeedCategoryRuntime = category =>
  isLeakedDemoCategory(category) ||
  containsDemoRuntimeText(`${category?.id || ''} ${category?.name || ''} ${category?.description || ''}`);

const isLikelySeedItemRuntime = item =>
  isLeakedDemoItem(item) ||
  containsDemoRuntimeText(`${item?.id || ''} ${item?.categoryId || ''} ${item?.name || ''} ${item?.description || ''} ${item?.note || ''}`);

const isLikelySeedOrderRuntime = order => {
  if (isLeakedDemoOrder(order)) {
    return true;
  }
  const orderText = `${order?.id || ''} ${order?.note || ''} ${order?.guestSessionId || ''} ${order?.tableNumber || ''}`;
  if (containsDemoRuntimeText(orderText)) {
    return true;
  }
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.length > 0 && items.every(item =>
    containsDemoRuntimeText(`${item?.itemId || ''} ${item?.name || ''} ${item?.note || ''}`),
  );
};

const isLikelySeedBillRuntime = billSession =>
  isLeakedDemoBillSession(billSession) ||
  containsDemoRuntimeText(`${billSession?.id || ''} ${billSession?.note || ''} ${billSession?.guestSessionId || ''} ${billSession?.tableNumber || ''}`) ||
  (Array.isArray(billSession?.orders) && billSession.orders.some(isLikelySeedOrderRuntime));

const hasBundledDemoFootprint = records => {
  const itemCount = records.items.length;
  const orderCount = records.orders.length;
  const billCount = records.billSessions.length;
  const categoryCount = records.categories.length;
  const cartCount = records.carts.length;
  const demoItemCount = records.items.filter(isLikelySeedItemRuntime).length;
  const demoOrderCount = records.orders.filter(isLikelySeedOrderRuntime).length;
  const demoBillCount = records.billSessions.filter(isLikelySeedBillRuntime).length;
  const demoCategoryCount = records.categories.filter(isLikelySeedCategoryRuntime).length;
  const cartHasDemoItems = records.carts.some(cart => {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    return items.length === 0 || items.some(item =>
      containsDemoRuntimeText(`${item?.itemId || ''} ${item?.name || ''} ${item?.note || ''}`),
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

const sanitizeOwnerRestaurantRuntimeData = (db, user) => {
  const restaurantId = getAdminPrimaryRestaurantId(user);
  if (!restaurantId) {
    return false;
  }

  const records = getRestaurantRuntimeRecords(db, restaurantId);
  if (runtimeRecordCount(records) === 0) {
    return false;
  }

  // Data that already existed before the admin account was created cannot be that admin's own data.
  // This is the main guard against the bundled test dataset leaking into every newly-created account.
  if (hasRuntimeOlderThanAdmin(records, user) || hasBundledDemoFootprint(records)) {
    return clearRestaurantScopedRuntimeData(db, restaurantId);
  }

  return removeLeakedDemoRecordsForRestaurant(db, restaurantId);
};

const safeJsonParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
};

const ensureDataFile = () => {
  fs.mkdirSync(path.dirname(DATA_FILE), {recursive: true});
  const existing = safeJsonParse(fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : '', null);

  if (!existing || !Array.isArray(existing.restaurants)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(createSeedDatabase(), null, 2));
  }
};

const loadDb = () => {
  ensureDataFile();
  const db = safeJsonParse(fs.readFileSync(DATA_FILE, 'utf8'), createSeedDatabase());
  const nextDb = {
    ...createSeedDatabase(),
    ...db,
    meta: {...createSeedDatabase().meta, ...(db.meta && typeof db.meta === 'object' ? db.meta : {})},
    restaurants: Array.isArray(db.restaurants) ? db.restaurants : [],
    branches: Array.isArray(db.branches) ? db.branches : [],
    tables: Array.isArray(db.tables) ? db.tables : [],
    categories: Array.isArray(db.categories) ? db.categories : [],
    items: Array.isArray(db.items) ? db.items : [],
    orders: Array.isArray(db.orders) ? db.orders : [],
    billSessions: Array.isArray(db.billSessions) ? db.billSessions : [],
    auditLogs: Array.isArray(db.auditLogs) ? db.auditLogs : [],
    publicOrderRateLimits: Array.isArray(db.publicOrderRateLimits) ? db.publicOrderRateLimits : [],
    carts: db.carts && typeof db.carts === 'object' ? db.carts : {},
    adminUsers: Array.isArray(db.adminUsers) ? db.adminUsers : [],
    imageUploads: Array.isArray(db.imageUploads) ? db.imageUploads : [],
  };

  const demoAdminsPurged = purgeProductionDemoAdmins(nextDb);
  const demoDataPurged = purgeProductionDemoData(nextDb);
  if (demoAdminsPurged || demoDataPurged) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(nextDb, null, 2));
  }

  return nextDb;
};

const saveDb = db => {
  purgeProductionDemoAdmins(db);
  purgeProductionDemoData(db);
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
};

const parseBody = req =>
  new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) {
        req.destroy();
      }
    });
    req.on('end', () => {
      resolve(safeJsonParse(raw, {}));
    });
  });

const send = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Restaurant-Id, X-Branch-Id',
  });
  if (status === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
};

const ok = (res, payload) => send(res, 200, payload);
const created = (res, payload) => send(res, 201, payload);
const noContent = res => send(res, 204);
const fail = (res, status, message, details) => send(res, status, {ok: false, message, details});

const getPathParts = url => {
  const parsed = new URL(url, 'http://localhost');
  const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  return {parts, query: parsed.searchParams, pathname: parsed.pathname};
};

const cleanString = value => String(value || '').trim();
const normalizeKey = value => cleanString(value).toLowerCase();

const SENSITIVE_LOG_FIELD_PATTERN = /(password|token|authorization|base64|datauri|dataurl|imagedata|secret)/i;

const redactValueForLog = (value, depth = 0) => {
  if (value === undefined || value === null) {
    return value;
  }
  if (depth > 4) {
    return '[truncated]';
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => redactValueForLog(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.entries(value).reduce((result, [key, item]) => {
      if (SENSITIVE_LOG_FIELD_PATTERN.test(key)) {
        result[key] = '[redacted]';
        return result;
      }
      result[key] = redactValueForLog(item, depth + 1);
      return result;
    }, {});
  }
  if (typeof value === 'string' && value.length > 160) {
    return `${value.slice(0, 157)}...`;
  }
  return value;
};

const sanitizeLogDetails = details => {
  if (!details || typeof details !== 'object') {
    return details;
  }
  return redactValueForLog(details);
};

const hashForLog = value =>
  cleanString(value)
    ? crypto.createHash('sha256').update(cleanString(value)).digest('hex').slice(0, 16)
    : undefined;


const IMAGE_MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const getImageExtensionFromMime = mimeType => IMAGE_MIME_TO_EXTENSION[mimeType] || 'jpg';

const getImageMimeFromExtension = filePath => {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
};

const createSafeStorageName = value =>
  cleanString(value || 'menu_image')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 72) || 'menu_image';

const getRequestBaseUrl = req => {
  const host = req.headers.host || `${HOST}:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
};

const isSafeUploadPath = filePath => {
  const resolved = path.resolve(filePath);
  const root = path.resolve(UPLOAD_DIR);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
};

const sendStaticUploadFile = (req, res, pathname) => {
  if (!pathname.startsWith(`${PUBLIC_UPLOAD_PREFIX}/`)) {
    return false;
  }

  const relative = pathname
    .slice(PUBLIC_UPLOAD_PREFIX.length + 1)
    .split('/')
    .map(decodeURIComponent)
    .filter(Boolean);
  const filePath = path.join(UPLOAD_DIR, ...relative);

  if (!isSafeUploadPath(filePath) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(res, 404, 'Không tìm thấy ảnh món.');
    return true;
  }

  res.writeHead(200, {
    'Content-Type': getImageMimeFromExtension(filePath),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  });
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  fs.createReadStream(filePath).pipe(res);
  return true;
};

const parseImageUploadPayload = body => {
  const dataUri = cleanString(body.dataUri || body.dataUrl || body.imageData);
  let mimeType = cleanString(body.mimeType || body.type || 'image/jpeg').toLowerCase();
  let base64 = cleanString(body.base64 || '');

  const dataSource = dataUri || base64;
  const match = dataSource.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1].toLowerCase();
    base64 = match[2];
  }

  if (!IMAGE_MIME_TO_EXTENSION[mimeType]) {
    throw new Error('Định dạng ảnh chưa hỗ trợ. Chỉ dùng JPG, PNG, WEBP hoặc GIF.');
  }

  base64 = base64.replace(/\s/g, '');
  if (!base64) {
    throw new Error('Thiếu dữ liệu ảnh base64 để upload.');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) {
    throw new Error('Dữ liệu ảnh không hợp lệ.');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Ảnh quá lớn. Giới hạn hiện tại là ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB.`);
  }

  return {buffer, mimeType};
};


const hashPassword = (password, salt) =>
  crypto.createHash('sha256').update(`${salt || ''}:${String(password || '')}`).digest('hex');

const createPasswordRecord = password => {
  const salt = crypto.randomBytes(12).toString('hex');
  return {passwordSalt: salt, passwordHash: hashPassword(password, salt)};
};

const verifyPassword = (user, password) => {
  if (!user) {
    return false;
  }
  if (user.passwordHash) {
    return user.passwordHash === hashPassword(password, user.passwordSalt || '');
  }
  // Backwards compatible for existing local db.json files created before v7.
  return Boolean(user.password && user.password === password);
};

const migratePlainPasswordIfNeeded = (user, password) => {
  if (!user || user.passwordHash || !user.password || user.password !== password) {
    return false;
  }
  Object.assign(user, createPasswordRecord(password), {updatedAt: nowIso()});
  delete user.password;
  return true;
};


const asPublicRestaurant = restaurant => ({
  id: restaurant.id,
  name: restaurant.name,
  ownerId: restaurant.ownerId,
  createdAt: restaurant.createdAt,
  updatedAt: restaurant.updatedAt,
});

const getToken = req => {
  const auth = req.headers.authorization || '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return auth.slice(7).trim();
};

const createSignedToken = payload => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
};

const createToken = user =>
  createSignedToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    restaurantIds: (Array.isArray(user.restaurantIds) ? user.restaurantIds : [])
      .map(cleanString)
      .filter(id => id && !isProductionDemoRestaurantId(id)),
    activeRestaurantId: isProductionDemoRestaurantId(user.activeRestaurantId)
      ? undefined
      : cleanString(user.activeRestaurantId),
    branchIds: (Array.isArray(user.branchIds) ? user.branchIds : [])
      .map(cleanString)
      .filter(id => id && !isProductionDemoBranchId(id)),
    activeBranchId: isProductionDemoBranchId(user.activeBranchId)
      ? undefined
      : cleanString(user.activeBranchId),
    branchIdsByRestaurant: user.branchIdsByRestaurant || {},
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
    nonce: crypto.randomBytes(6).toString('hex'),
  });

const readTokenPayload = token => {
  try {
    const rawToken = cleanString(token);
    if (!rawToken) {
      return null;
    }

    if (rawToken.includes('.')) {
      const [encodedPayload, signature] = rawToken.split('.');
      const expectedSignature = crypto
        .createHmac('sha256', TOKEN_SECRET)
        .update(encodedPayload)
        .digest('base64url');

      if (!signature || signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      if (!payload?.userId || !payload.exp || Number(payload.exp) <= Date.now()) {
        return null;
      }
      return payload;
    }

    // Old unsigned demo tokens are accepted only while auth guard is off.
    if (!ENABLE_AUTH_GUARD) {
      return JSON.parse(Buffer.from(rawToken, 'base64url').toString('utf8'));
    }
    return null;
  } catch (_error) {
    return null;
  }
};

const getUserFromRequest = (db, req) => {
  const token = getToken(req);
  const payload = readTokenPayload(token);
  if (!payload?.userId) {
    return null;
  }
  return db.adminUsers.find(user => user.id === payload.userId) || null;
};

const canAccessRestaurant = (user, restaurantId) => {
  const cleanRestaurantId = cleanString(restaurantId);
  if (!user || !cleanRestaurantId || isProductionDemoRestaurantId(cleanRestaurantId)) {
    return false;
  }
  const allowedRestaurantIds = Array.isArray(user.restaurantIds)
    ? user.restaurantIds.map(cleanString).filter(id => id && !isProductionDemoRestaurantId(id))
    : [];
  return allowedRestaurantIds.includes(cleanRestaurantId);
};

const requireRestaurantAccess = (db, req, res, restaurantId) => {
  const restaurant = db.restaurants.find(item => item.id === restaurantId);
  if (!restaurant) {
    fail(res, 404, 'Không tìm thấy nhà hàng.');
    return null;
  }

  const user = getUserFromRequest(db, req);
  if (!user) {
    fail(res, 401, 'Phiên đăng nhập chưa hợp lệ.');
    return null;
  }
  if (!canAccessRestaurant(user, restaurantId)) {
    fail(res, 403, 'Tài khoản không có quyền truy cập nhà hàng này.');
    return null;
  }

  if (user.role === 'OWNER' && getAdminPrimaryRestaurantId(user) === restaurantId) {
    const cleanedRuntimeData = sanitizeOwnerRestaurantRuntimeData(db, user);
    if (cleanedRuntimeData) {
      saveDb(db);
    }
  }

  return {restaurant, user};
};

const getUserBranchIds = (user, restaurantId) => {
  if (!user || !restaurantId) {
    return [];
  }
  const scoped = user.branchIdsByRestaurant?.[restaurantId];
  const ids = Array.isArray(scoped) && scoped.length > 0 ? scoped : user.branchIds;
  return Array.isArray(ids) ? ids.map(cleanString).filter(Boolean) : [];
};

const isBranchRestricted = (user, restaurantId) => {
  if (!user || user.role === 'OWNER') {
    return false;
  }
  return getUserBranchIds(user, restaurantId).length > 0;
};

const canAccessBranch = (user, restaurantId, branchId) => {
  if (!branchId || !isBranchRestricted(user, restaurantId)) {
    return true;
  }
  return getUserBranchIds(user, restaurantId).includes(branchId);
};

const requireBranchAccess = (res, user, restaurantId, branchId) => {
  if (canAccessBranch(user, restaurantId, branchId)) {
    return true;
  }
  fail(res, 403, 'Tài khoản không có quyền truy cập chi nhánh này.');
  return false;
};

const requireRole = (res, user, allowedRoles, actionLabel) => {
  if (!user) {
    fail(res, 401, 'Phiên đăng nhập chưa hợp lệ.');
    return false;
  }
  if (allowedRoles.includes(user.role)) {
    return true;
  }
  fail(res, 403, actionLabel || 'Tài khoản không có quyền thực hiện thao tác này.');
  return false;
};

const filterBranchesForUser = (branches, user, restaurantId) => {
  if (!isBranchRestricted(user, restaurantId)) {
    return branches;
  }
  const allowed = getUserBranchIds(user, restaurantId);
  return branches.filter(branch => allowed.includes(branch.id));
};

const filterTablesForUser = (tables, user, restaurantId) => {
  if (!isBranchRestricted(user, restaurantId)) {
    return tables;
  }
  const allowed = getUserBranchIds(user, restaurantId);
  return tables.filter(table => !table.branchId || allowed.includes(table.branchId));
};

const filterOrdersForUser = (orders, user, restaurantId) => {
  if (!isBranchRestricted(user, restaurantId)) {
    return orders;
  }
  const allowed = getUserBranchIds(user, restaurantId);
  return orders.filter(order => !order.branchId || allowed.includes(order.branchId));
};

const filterBillSessionsForUser = (billSessions, user, restaurantId) => {
  if (!isBranchRestricted(user, restaurantId)) {
    return billSessions;
  }
  const allowed = getUserBranchIds(user, restaurantId);
  return billSessions.filter(billSession => !billSession.branchId || allowed.includes(billSession.branchId));
};

const audit = (action, {user, restaurantId, branchId, targetId, details} = {}) => {
  if (process.env.SCOREMENU_AUDIT_LOG === '0') {
    return;
  }
  console.log(
    '[scoremenu-audit]',
    JSON.stringify({
      at: nowIso(),
      action,
      userId: user?.id,
      role: user?.role,
      restaurantId,
      branchId,
      targetId,
      details: sanitizeLogDetails(details),
    }),
  );
};

const createAuditLogEntry = (action, {user, restaurantId, branchId, targetId, details} = {}) => ({
  id: createId('audit'),
  at: nowIso(),
  action,
  userId: user?.id,
  username: user?.username,
  role: user?.role,
  restaurantId,
  branchId,
  targetId,
  details: details && typeof details === 'object' ? sanitizeLogDetails(details) : undefined,
});

const sortByOrderAndName = (a, b) => {
  const orderDelta = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  if (orderDelta !== 0) {
    return orderDelta;
  }
  return cleanString(a.name).localeCompare(cleanString(b.name), 'vi');
};

const getRestaurantCategories = (db, restaurantId) =>
  db.categories.filter(item => item.restaurantId === restaurantId).sort(sortByOrderAndName);

const DEFAULT_RESTAURANT_CATEGORY_IDS = new Set(['menu_drink', 'menu_food']);

const DEFAULT_RESTAURANT_CATEGORY_NAMES = new Set(['đồ uống', 'đồ ăn', 'do uong', 'do an']);

const isDefaultRestaurantCategory = category =>
  DEFAULT_RESTAURANT_CATEGORY_IDS.has(String(category?.id || '')) &&
  DEFAULT_RESTAURANT_CATEGORY_NAMES.has(normalizeKey(category?.name));

const removeUnusedDefaultCategoriesForRestaurant = (db, restaurantId) => {
  if (!restaurantId) {
    return false;
  }

  const usedCategoryIds = new Set(
    db.items
      .filter(item => item.restaurantId === restaurantId && cleanString(item.categoryId))
      .map(item => item.categoryId),
  );
  const beforeCount = db.categories.length;
  db.categories = db.categories.filter(category => {
    if (category.restaurantId !== restaurantId) {
      return true;
    }
    if (!isDefaultRestaurantCategory(category)) {
      return true;
    }
    return usedCategoryIds.has(category.id);
  });
  return db.categories.length !== beforeCount;
};

const ensureDefaultCategoriesForRestaurant = (_db, _restaurantId) => false;

const resolveRestaurantCategoryId = (db, restaurantId, categoryId) => {
  ensureDefaultCategoriesForRestaurant(db, restaurantId);
  const categories = getRestaurantCategories(db, restaurantId);
  const cleanCategoryId = cleanString(categoryId);

  if (!cleanCategoryId) {
    return '';
  }

  // Exact id wins first. This is the normal path for admin-created categories
  // such as "Bia", "Cafe", "Đồ ăn vặt"... Do not remap those to the default
  // Đồ uống/Đồ ăn buckets.
  if (categories.some(category => category.id === cleanCategoryId)) {
    return cleanCategoryId;
  }

  const normalizedCategory = normalizeKey(cleanCategoryId);
  if (!normalizedCategory) {
    return '';
  }

  const byName = categories.find(category => normalizeKey(category.name) === normalizedCategory);
  if (byName) {
    return byName.id;
  }

  // Compatibility only for very old app builds that submitted fixed legacy ids.
  // Avoid broad "contains" matching because a custom category id/name can
  // include words like "an" or "nuoc" and must still be preserved.
  const drinkAliases = new Set(['drink', 'drinks', 'menu_drink', 'do_uong', 'douong']);
  const foodAliases = new Set(['food', 'foods', 'menu_food', 'do_an', 'doan', 'mon_an', 'monan']);

  if (drinkAliases.has(normalizedCategory)) {
    return (
      categories.find(category => category.id === 'menu_drink')?.id ||
      categories.find(category => normalizeKey(category.name) === 'do_uong')?.id ||
      ''
    );
  }

  if (foodAliases.has(normalizedCategory)) {
    return (
      categories.find(category => category.id === 'menu_food')?.id ||
      categories.find(category => normalizeKey(category.name) === 'do_an')?.id ||
      ''
    );
  }

  return '';
};

const isSafeClientCategoryId = value => {
  const clean = cleanString(value);
  return Boolean(clean) && /^[A-Za-z0-9_:-]{1,96}$/.test(clean);
};

const resolveOrCreateRestaurantCategoryId = (db, restaurantId, categoryId, categoryName) => {
  const resolvedCategoryId = resolveRestaurantCategoryId(db, restaurantId, categoryId);
  if (resolvedCategoryId) {
    return {categoryId: resolvedCategoryId, created: false};
  }

  const cleanCategoryId = cleanString(categoryId);
  const cleanCategoryName = cleanString(categoryName);
  const nameForRepair = cleanCategoryName || cleanCategoryId;
  if (!nameForRepair) {
    return {categoryId: '', created: false};
  }

  const categories = getRestaurantCategories(db, restaurantId);
  const byRepairName = categories.find(category => normalizeKey(category.name) === normalizeKey(nameForRepair));
  if (byRepairName) {
    return {categoryId: byRepairName.id, created: false};
  }

  const timestamp = nowIso();
  let nextId = isSafeClientCategoryId(cleanCategoryId) ? cleanCategoryId : createId('category');
  if (categories.some(category => category.id === nextId)) {
    nextId = createId('category');
  }

  db.categories.push({
    id: nextId,
    restaurantId,
    name: nameForRepair,
    sortOrder: categories.length + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return {categoryId: nextId, created: true};
};

const getRestaurantItems = (db, restaurantId) =>
  db.items.filter(item => item.restaurantId === restaurantId).sort(sortByOrderAndName);

const getRestaurantOrders = (db, restaurantId, branchId) =>
  db.orders
    .filter(order => order.restaurantId === restaurantId && (!branchId || order.branchId === branchId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

const normalizeBillSessionStatus = status => {
  const normalized = cleanString(status).toUpperCase();
  return BILL_SESSION_STATUSES.includes(normalized) ? normalized : 'OPEN';
};

const canCustomerAddOrderToBillSession = status =>
  CUSTOMER_ORDERABLE_BILL_SESSION_STATUSES.includes(normalizeBillSessionStatus(status));

const isFinalBillSessionStatus = status =>
  FINAL_BILL_SESSION_STATUSES.includes(normalizeBillSessionStatus(status));

const getBillSessionOrders = (db, billSession) => {
  if (!billSession?.id) {
    return [];
  }
  const orderIds = Array.isArray(billSession.orderIds) ? billSession.orderIds : [];
  return db.orders
    .filter(order =>
      order.restaurantId === billSession.restaurantId &&
      (order.billSessionId === billSession.id || orderIds.includes(order.id)),
    )
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
};

const calculateBillSessionSubtotal = orders =>
  orders.reduce(
    (sum, order) => order.orderStatus === 'CANCELLED' ? sum : sum + Number(order.total || 0),
    0,
  );

const createBillOrderSummary = (order, index) => ({
  orderId: order.id,
  orderNumber: index + 1,
  orderStatus: order.orderStatus,
  paymentStatus: order.paymentStatus,
  itemCount: Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0)
    : 0,
  total: order.orderStatus === 'CANCELLED' ? 0 : Number(order.total || 0),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const normalizeBillSessionPayload = (db, restaurantId, payload = {}, existing) => {
  const tableId = cleanString(payload.tableId ?? existing?.tableId);
  const branchId = cleanString(payload.branchId ?? existing?.branchId);
  const table = tableId ? findTable(db, restaurantId, tableId) : null;

  if (branchId && !ensureBranch(db, restaurantId, branchId)) {
    throw new Error('Chi nhánh không thuộc nhà hàng hiện tại.');
  }
  if (tableId && !table) {
    throw new Error('Bàn không thuộc nhà hàng hiện tại.');
  }
  if (table && branchId && table.branchId && table.branchId !== branchId) {
    throw new Error('Bàn không thuộc chi nhánh hiện tại.');
  }

  const timestamp = nowIso();
  const orderIds = Array.isArray(payload.orderIds || existing?.orderIds)
    ? (payload.orderIds || existing.orderIds).map(cleanString).filter(Boolean)
    : [];
  const subtotal = Math.max(0, Number(payload.subtotal ?? existing?.subtotal ?? 0));
  const discountTotal = Math.max(0, Number(payload.discountTotal ?? existing?.discountTotal ?? 0));
  const serviceFeeTotal = Math.max(0, Number(payload.serviceFeeTotal ?? existing?.serviceFeeTotal ?? 0));

  return {
    id: cleanString(payload.id) || existing?.id || createId('bill'),
    restaurantId,
    branchId: branchId || table?.branchId || undefined,
    tableId: tableId || undefined,
    tableNumber: cleanString(payload.tableNumber || table?.tableNumber || existing?.tableNumber),
    guestSessionId: cleanString(payload.guestSessionId || existing?.guestSessionId) || undefined,
    status: normalizeBillSessionStatus(payload.status || existing?.status),
    orderIds,
    orderCount: orderIds.length,
    subtotal,
    discountTotal,
    serviceFeeTotal,
    total: Math.max(0, subtotal - discountTotal + serviceFeeTotal),
    paymentMethod: PAYMENT_METHODS.includes(payload.paymentMethod || existing?.paymentMethod)
      ? (payload.paymentMethod || existing.paymentMethod)
      : undefined,
    note: cleanString(payload.note ?? existing?.note),
    tableChangeLogs: Array.isArray(payload.tableChangeLogs)
      ? payload.tableChangeLogs
      : Array.isArray(existing?.tableChangeLogs)
        ? existing.tableChangeLogs
        : [],
    openedAt: existing?.openedAt || cleanString(payload.openedAt) || timestamp,
    paymentRequestedAt: cleanString(payload.paymentRequestedAt || existing?.paymentRequestedAt) || undefined,
    paidAt: cleanString(payload.paidAt || existing?.paidAt) || undefined,
    closedAt: cleanString(payload.closedAt || existing?.closedAt) || undefined,
    createdAt: existing?.createdAt || cleanString(payload.createdAt) || timestamp,
    updatedAt: timestamp,
  };
};

const recalculateBillSessionTotals = (db, billSession) => {
  const orders = getBillSessionOrders(db, billSession);
  const subtotal = calculateBillSessionSubtotal(orders);
  billSession.orderIds = orders.map(order => order.id);
  billSession.orderCount = orders.length;
  billSession.subtotal = subtotal;
  billSession.total = Math.max(
    0,
    subtotal - Number(billSession.discountTotal || 0) + Number(billSession.serviceFeeTotal || 0),
  );
  billSession.updatedAt = nowIso();
  return billSession;
};



const getOrderMigrationGroupKey = order => {
  const restaurantId = cleanString(order.restaurantId) || 'unknown_restaurant';
  const branchId = cleanString(order.branchId) || 'no_branch';
  const tableId = cleanString(order.tableId) || 'no_table_id';
  const tableNumber = cleanString(order.tableNumber) || 'Bàn chưa rõ';
  const guestSessionId = cleanString(order.guestSessionId) || 'legacy_guest';
  return [restaurantId, branchId, tableId, tableNumber, guestSessionId].join('|');
};

const normalizeLegacyOrderForBillMigration = order => {
  const timestamp = nowIso();
  const items = Array.isArray(order.items) ? order.items : [];
  const calculatedTotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Math.max(0, Number(item.quantity || 0)),
    0,
  );
  order.id = cleanString(order.id) || createId('order_migrated');
  order.tableNumber = cleanString(order.tableNumber) || 'Bàn chưa rõ';
  order.items = items;
  order.total = Number.isFinite(Number(order.total)) && Number(order.total) > 0
    ? Number(order.total)
    : calculatedTotal;
  order.orderStatus = ORDER_STATUSES.includes(order.orderStatus)
    ? order.orderStatus
    : ORDER_STATUSES.includes(order.status)
      ? order.status
      : 'NEW';
  order.paymentStatus = PAYMENT_STATUSES.includes(order.paymentStatus)
    ? order.paymentStatus
    : order.status === 'PAID'
      ? 'PAID'
      : 'UNPAID';
  order.paymentMethod = normalizePaymentMethod(order.paymentMethod);
  order.orderSource = order.orderSource || 'customer';
  order.createdAt = order.createdAt || timestamp;
  order.updatedAt = timestamp;
  delete order.status;
  return order;
};

const findTableForLegacyOrder = (db, order) => {
  const restaurantId = cleanString(order.restaurantId);
  const branchId = cleanString(order.branchId);
  const tableId = cleanString(order.tableId);
  const tableNumber = cleanString(order.tableNumber);

  if (tableId) {
    const byId = db.tables.find(table => table.id === tableId && table.restaurantId === restaurantId);
    if (byId) {
      return byId;
    }
  }

  return db.tables.find(table =>
    table.restaurantId === restaurantId &&
    (!branchId || table.branchId === branchId) &&
    normalizeKey(table.tableNumber) === normalizeKey(tableNumber),
  ) || null;
};

const createMigratedBillSessionFromOrders = (db, groupKey, groupOrders) => {
  const first = groupOrders[0];
  const table = findTableForLegacyOrder(db, first);
  const createdAt = groupOrders
    .map(order => order.createdAt)
    .filter(Boolean)
    .sort()[0] || nowIso();
  const paidOrders = groupOrders.filter(order => order.paymentStatus === 'PAID');
  const status = paidOrders.length === groupOrders.length && groupOrders.length > 0 ? 'PAID' : 'OPEN';
  const id = `bill_migrated_${hashForLog(groupKey)}`;
  const existing = db.billSessions.find(billSession => billSession.id === id);

  if (existing) {
    return existing;
  }

  const billSession = normalizeBillSessionPayload(db, cleanString(first.restaurantId), {
    id,
    restaurantId: cleanString(first.restaurantId),
    branchId: cleanString(first.branchId || table?.branchId),
    tableId: cleanString(first.tableId || table?.id),
    tableNumber: cleanString(first.tableNumber || table?.tableNumber || 'Bàn chưa rõ'),
    guestSessionId: cleanString(first.guestSessionId),
    status,
    orderIds: groupOrders.map(order => order.id),
    openedAt: createdAt,
    createdAt,
    note: 'Batch 24 migration: tạo BillSession tạm cho order cũ chưa có billSessionId.',
  });
  billSession.migratedFromLegacyOrders = true;
  billSession.migrationBatch = 'batch24';
  billSession.source = 'migration';
  if (status === 'PAID') {
    billSession.paymentMethod = paidOrders[0]?.paymentMethod || 'MOCK';
    billSession.paidAt = groupOrders.map(order => order.updatedAt || order.createdAt).filter(Boolean).sort().slice(-1)[0] || nowIso();
  }
  db.billSessions.unshift(billSession);
  return billSession;
};

const migrateLegacyOrdersToBillSessions = db => {
  if (!Array.isArray(db.orders) || db.orders.length === 0) {
    return {changed: false, migratedOrderCount: 0, migratedBillSessionCount: 0};
  }
  if (!Array.isArray(db.billSessions)) {
    db.billSessions = [];
  }

  const groups = new Map();
  db.orders.forEach(order => {
    if (cleanString(order.billSessionId) || !cleanString(order.restaurantId)) {
      return;
    }
    normalizeLegacyOrderForBillMigration(order);
    const groupKey = getOrderMigrationGroupKey(order);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(order);
  });

  if (groups.size === 0) {
    return {changed: false, migratedOrderCount: 0, migratedBillSessionCount: 0};
  }

  let migratedOrderCount = 0;
  let migratedBillSessionCount = 0;
  groups.forEach((orders, groupKey) => {
    const beforeBillCount = db.billSessions.length;
    const billSession = createMigratedBillSessionFromOrders(db, groupKey, orders);
    migratedBillSessionCount += db.billSessions.length > beforeBillCount ? 1 : 0;
    orders.forEach(order => {
      order.billSessionId = billSession.id;
      order.branchId = billSession.branchId || order.branchId;
      order.tableId = billSession.tableId || order.tableId;
      order.tableNumber = billSession.tableNumber || order.tableNumber;
      order.guestSessionId = billSession.guestSessionId || order.guestSessionId;
      order.migratedBillSessionId = billSession.id;
      order.updatedAt = nowIso();
      migratedOrderCount += 1;
    });
    recalculateBillSessionTotals(db, billSession);
  });

  if (!Array.isArray(db.auditLogs)) {
    db.auditLogs = [];
  }
  db.auditLogs.unshift(createAuditLogEntry('legacyOrdersMigratedToBillSessions', {
    details: {migratedOrderCount, migratedBillSessionCount, migrationBatch: 'batch24'},
  }));
  db.auditLogs = db.auditLogs.slice(0, AUDIT_LOG_STORE_MAX);
  return {changed: true, migratedOrderCount, migratedBillSessionCount};
};

const buildBackfilledBranchMenuQrToken = (branch, usedTokens) => {
  const restaurantKey = normalizeKey(branch?.restaurantId || 'restaurant')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'restaurant';
  const branchKey = normalizeKey(branch?.name || branch?.id || 'main')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'main';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const randomPart = crypto.randomBytes(4).toString('hex');
    const token = `qr_${restaurantKey}_${branchKey}_${randomPart}_menu`;
    if (!usedTokens.has(token)) {
      return token;
    }
  }

  return `qr_${restaurantKey}_${branchKey}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}_menu`;
};

const ensureBranchMenuQrTokens = db => {
  if (!Array.isArray(db.branches) || db.branches.length === 0) {
    return {changed: false, backfilledBranchCount: 0};
  }

  const usedTokens = new Set(
    db.branches
      .map(branch => cleanString(branch?.menuQrToken))
      .filter(Boolean),
  );
  let backfilledBranchCount = 0;

  db.branches.forEach(branch => {
    if (!branch || typeof branch !== 'object') {
      return;
    }

    const currentToken = cleanString(branch.menuQrToken);
    if (currentToken) {
      branch.menuQrToken = currentToken;
      usedTokens.add(currentToken);
      return;
    }

    const token = buildBackfilledBranchMenuQrToken(branch, usedTokens);
    branch.menuQrToken = token;
    branch.updatedAt = nowIso();
    usedTokens.add(token);
    backfilledBranchCount += 1;
  });

  return {changed: backfilledBranchCount > 0, backfilledBranchCount};
};

const ensureBatch25DatabaseShape = db => {
  let changed = false;
  if (!db.meta || typeof db.meta !== 'object') {
    db.meta = {};
  }
  if (db.meta.schemaVersion !== SCOREMENU_SCHEMA_VERSION) {
    db.meta.schemaVersion = SCOREMENU_SCHEMA_VERSION;
    changed = true;
  }
  const migration = migrateLegacyOrdersToBillSessions(db);
  if (migration.changed) {
    changed = true;
    db.meta.lastMigration = {
      name: 'batch24_legacy_orders_to_bill_sessions',
      migratedOrderCount: migration.migratedOrderCount,
      migratedBillSessionCount: migration.migratedBillSessionCount,
      migratedAt: nowIso(),
    };
  }

  const qrTokenBackfill = ensureBranchMenuQrTokens(db);
  if (qrTokenBackfill.changed) {
    changed = true;
    db.meta.lastQrTokenBackfill = {
      name: 'branch_menu_qr_token_backfill',
      backfilledBranchCount: qrTokenBackfill.backfilledBranchCount,
      migratedAt: nowIso(),
    };
  }

  return {changed, migration, qrTokenBackfill};
};

const createBillTableChangeLog = ({billSession, table, user, reason, auditLogId}) => ({
  id: createId('table_change'),
  auditLogId,
  fromBranchId: billSession.branchId,
  fromTableId: billSession.tableId,
  fromTableNumber: billSession.tableNumber,
  toBranchId: table.branchId,
  toTableId: table.id,
  toTableNumber: table.tableNumber,
  changedByUserId: user?.id,
  changedByUsername: user?.username,
  changedByRole: user?.role,
  reason: cleanString(reason),
  changedAt: nowIso(),
});

const findOpenBillSessionByTable = (db, restaurantId, tableId, excludeBillSessionId) => {
  const targetTableId = cleanString(tableId);
  if (!targetTableId) {
    return null;
  }
  return db.billSessions.find(
    billSession =>
      billSession.restaurantId === restaurantId &&
      billSession.id !== excludeBillSessionId &&
      billSession.tableId === targetTableId &&
      canCustomerAddOrderToBillSession(billSession.status),
  );
};

const transferBillSessionToTable = (db, restaurantId, billSession, table, {user, reason} = {}) => {
  if (!billSession) {
    throw new Error('Không tìm thấy hóa đơn bàn.');
  }
  if (!table || table.restaurantId !== restaurantId) {
    throw new Error('Bàn đích không thuộc nhà hàng hiện tại.');
  }
  if (isFinalBillSessionStatus(billSession.status)) {
    throw new Error('Hóa đơn đã thanh toán/đóng/hủy nên không thể đổi bàn.');
  }
  if (table.status === 'HIDDEN') {
    throw new Error('Không thể chuyển bill sang bàn đang ẩn.');
  }
  if (billSession.branchId && table.branchId !== billSession.branchId) {
    throw new Error('Chỉ được chuyển bill sang bàn trong cùng chi nhánh để QR khách không bị lẫn phiên.');
  }
  const occupiedBill = findOpenBillSessionByTable(db, restaurantId, table.id, billSession.id);
  if (occupiedBill) {
    throw new Error('Bàn đích đang có hóa đơn mở. Vui lòng đóng bill đó hoặc xử lý gộp bill trước.');
  }

  const previous = {
    branchId: billSession.branchId,
    tableId: billSession.tableId,
    tableNumber: billSession.tableNumber,
  };
  const auditLog = createAuditLogEntry('tableChanged', {
    user,
    restaurantId,
    branchId: table.branchId || billSession.branchId,
    targetId: billSession.id,
    details: {
      fromBranchId: previous.branchId,
      fromTableId: previous.tableId,
      fromTableNumber: previous.tableNumber,
      toBranchId: table.branchId,
      toTableId: table.id,
      toTableNumber: table.tableNumber,
      reason: cleanString(reason),
    },
  });
  if (!Array.isArray(db.auditLogs)) {
    db.auditLogs = [];
  }
  db.auditLogs.unshift(auditLog);
  db.auditLogs = db.auditLogs.slice(0, AUDIT_LOG_STORE_MAX);

  const tableChangeLog = createBillTableChangeLog({
    billSession,
    table,
    user,
    reason,
    auditLogId: auditLog.id,
  });
  billSession.branchId = table.branchId;
  billSession.tableId = table.id;
  billSession.tableNumber = table.tableNumber;
  billSession.tableChangeLogs = [
    tableChangeLog,
    ...(Array.isArray(billSession.tableChangeLogs) ? billSession.tableChangeLogs : []),
  ].slice(0, 50);
  billSession.updatedAt = nowIso();

  const billOrderIds = new Set(getBillSessionOrders(db, billSession).map(order => order.id));
  db.orders.forEach(order => {
    if (order.restaurantId === restaurantId && (order.billSessionId === billSession.id || billOrderIds.has(order.id))) {
      order.branchId = table.branchId;
      order.tableId = table.id;
      order.tableNumber = table.tableNumber;
      order.updatedAt = nowIso();
    }
  });

  db.tables.forEach(existingTable => {
    if (existingTable.restaurantId !== restaurantId) {
      return;
    }
    if (
      previous.tableId &&
      existingTable.id === previous.tableId &&
      existingTable.status === 'OCCUPIED' &&
      !findOpenBillSessionByTable(db, restaurantId, existingTable.id, billSession.id)
    ) {
      existingTable.status = 'AVAILABLE';
      existingTable.updatedAt = nowIso();
    }
    if (existingTable.id === table.id && existingTable.status === 'AVAILABLE') {
      existingTable.status = 'OCCUPIED';
      existingTable.updatedAt = nowIso();
    }
  });

  audit('tableChanged', {
    user,
    restaurantId,
    branchId: table.branchId || billSession.branchId,
    targetId: billSession.id,
    details: auditLog.details,
  });

  return recalculateBillSessionTotals(db, billSession);
};

const normalizeBillPaymentStatus = body => {
  const explicitStatus = cleanString(body.status || body.billStatus).toUpperCase();
  if (explicitStatus === 'PAID' || body.paymentStatus === 'PAID') {
    return 'PAID';
  }
  return 'PAYMENT_REQUESTED';
};

const appendAuditLog = (db, action, {user, restaurantId, branchId, targetId, details} = {}) => {
  const auditLog = createAuditLogEntry(action, {user, restaurantId, branchId, targetId, details});
  if (!Array.isArray(db.auditLogs)) {
    db.auditLogs = [];
  }
  db.auditLogs.unshift(auditLog);
  db.auditLogs = db.auditLogs.slice(0, AUDIT_LOG_STORE_MAX);
  audit(action, {user, restaurantId, branchId, targetId, details});
  return auditLog;
};


const getPublicOrderRateLimitKey = ({guestSessionId, qrToken}) => {
  const cleanGuestSessionId = cleanString(guestSessionId) || 'guest_anonymous';
  return `${cleanGuestSessionId}:${hashForLog(qrToken) || 'no_qr'}`;
};

const getPublicOrderRateLimitBucket = (db, guard) => {
  if (!Array.isArray(db.publicOrderRateLimits)) {
    db.publicOrderRateLimits = [];
  }
  const key = getPublicOrderRateLimitKey(guard);
  let bucket = db.publicOrderRateLimits.find(item => item.key === key);
  const timestamp = nowIso();

  if (!bucket) {
    bucket = {
      key,
      guestSessionId: cleanString(guard.guestSessionId) || 'guest_anonymous',
      qrHash: hashForLog(guard.qrToken),
      restaurantId: guard.restaurantId,
      branchId: guard.branchId,
      orderWindowStartedAt: timestamp,
      orderCount: 0,
      errorWindowStartedAt: timestamp,
      errorCount: 0,
      blockedUntil: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.publicOrderRateLimits.unshift(bucket);
  }

  return bucket;
};

const resetBucketWindowIfExpired = (bucket, fieldPrefix, windowMs, nowMs) => {
  const startedAt = Date.parse(bucket[`${fieldPrefix}WindowStartedAt`] || '');
  if (!Number.isFinite(startedAt) || nowMs - startedAt > windowMs) {
    bucket[`${fieldPrefix}WindowStartedAt`] = nowIso();
    bucket[`${fieldPrefix}Count`] = 0;
  }
};

const trimPublicOrderRateLimitStore = db => {
  if (!Array.isArray(db.publicOrderRateLimits)) {
    db.publicOrderRateLimits = [];
    return;
  }
  db.publicOrderRateLimits = db.publicOrderRateLimits
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, PUBLIC_ORDER_RATE_LIMIT_STORE_MAX);
};

const createPublicOrderGuard = (scope, body = {}) => ({
  guestSessionId: cleanString(body.guestSessionId),
  qrToken: scope.context.qrCodeToken || scope.context.menuQrToken,
  restaurantId: scope.context.restaurantId,
  branchId: scope.context.branchId,
});

const appendAbuseDetectedLog = (db, guard, reason, details = {}) => {
  appendAuditLog(db, 'abuseDetected', {
    restaurantId: guard.restaurantId,
    branchId: guard.branchId,
    targetId: cleanString(guard.guestSessionId) || 'guest_anonymous',
    details: {
      reason,
      guestSessionId: cleanString(guard.guestSessionId) || 'guest_anonymous',
      qrHash: hashForLog(guard.qrToken),
      ...details,
    },
  });
};

const assertPublicOrderAllowed = (db, guard) => {
  const nowMs = Date.now();
  const bucket = getPublicOrderRateLimitBucket(db, guard);
  const blockedUntilMs = Date.parse(bucket.blockedUntil || '');

  if (Number.isFinite(blockedUntilMs) && blockedUntilMs > nowMs) {
    appendAbuseDetectedLog(db, guard, 'blocked_public_order_attempt', {
      blockedUntil: bucket.blockedUntil,
      orderCount: bucket.orderCount,
      errorCount: bucket.errorCount,
    });
    throw Object.assign(new Error('Thiết bị này đang gửi quá nhiều yêu cầu. Vui lòng chờ vài phút rồi thử lại.'), {
      statusCode: 429,
    });
  }

  resetBucketWindowIfExpired(bucket, 'order', PUBLIC_ORDER_RATE_LIMIT_WINDOW_MS, nowMs);
  bucket.orderCount = Number(bucket.orderCount || 0) + 1;
  bucket.updatedAt = nowIso();

  if (bucket.orderCount > PUBLIC_ORDER_RATE_LIMIT_MAX) {
    bucket.blockedUntil = new Date(nowMs + PUBLIC_ORDER_BLOCK_MS).toISOString();
    appendAbuseDetectedLog(db, guard, 'public_order_rate_limit_exceeded', {
      orderCount: bucket.orderCount,
      max: PUBLIC_ORDER_RATE_LIMIT_MAX,
      windowMs: PUBLIC_ORDER_RATE_LIMIT_WINDOW_MS,
      blockedUntil: bucket.blockedUntil,
    });
    throw Object.assign(new Error('Bạn gửi đơn quá nhanh. Vui lòng chờ vài phút rồi thử lại.'), {
      statusCode: 429,
    });
  }

  trimPublicOrderRateLimitStore(db);
  return bucket;
};

const recordPublicOrderValidationError = (db, guard, message) => {
  const nowMs = Date.now();
  const bucket = getPublicOrderRateLimitBucket(db, guard);
  resetBucketWindowIfExpired(bucket, 'error', PUBLIC_ORDER_ERROR_LIMIT_WINDOW_MS, nowMs);
  bucket.errorCount = Number(bucket.errorCount || 0) + 1;
  bucket.lastErrorMessage = cleanString(message).slice(0, 160);
  bucket.updatedAt = nowIso();

  if (bucket.errorCount >= PUBLIC_ORDER_ERROR_LIMIT_MAX) {
    bucket.blockedUntil = new Date(nowMs + PUBLIC_ORDER_BLOCK_MS).toISOString();
    appendAbuseDetectedLog(db, guard, 'public_order_error_limit_exceeded', {
      errorCount: bucket.errorCount,
      max: PUBLIC_ORDER_ERROR_LIMIT_MAX,
      windowMs: PUBLIC_ORDER_ERROR_LIMIT_WINDOW_MS,
      blockedUntil: bucket.blockedUntil,
      lastErrorMessage: bucket.lastErrorMessage,
    });
  }

  trimPublicOrderRateLimitStore(db);
  return bucket;
};

const updateBillSessionPayment = (db, restaurantId, billSession, body = {}, {user} = {}) => {
  if (!billSession) {
    throw new Error('Không tìm thấy hóa đơn bàn.');
  }
  if (billSession.status === 'CLOSED' || billSession.status === 'CANCELLED') {
    throw new Error('Hóa đơn đã đóng/hủy nên không thể cập nhật thanh toán.');
  }

  const nextPaymentStatus = normalizeBillPaymentStatus(body);
  if (billSession.status === 'PAID' && nextPaymentStatus !== 'PAID') {
    throw new Error('Hóa đơn đã thanh toán, không thể chuyển về yêu cầu thanh toán.');
  }

  const timestamp = nowIso();
  const previousStatus = billSession.status;
  const discountTotal = Number.isFinite(Number(body.discountTotal))
    ? Math.max(0, Number(body.discountTotal))
    : Math.max(0, Number(billSession.discountTotal || 0));
  const serviceFeeTotal = Number.isFinite(Number(body.serviceFeeTotal))
    ? Math.max(0, Number(body.serviceFeeTotal))
    : Math.max(0, Number(billSession.serviceFeeTotal || 0));

  billSession.discountTotal = discountTotal;
  billSession.serviceFeeTotal = serviceFeeTotal;
  if (body.note !== undefined) {
    billSession.note = cleanString(body.note);
  }
  billSession.paymentRequestedAt = billSession.paymentRequestedAt || timestamp;

  if (nextPaymentStatus === 'PAID') {
    const paymentMethod = normalizePaymentMethod(body.paymentMethod || billSession.paymentMethod || 'MOCK');
    billSession.status = 'PAID';
    billSession.paymentMethod = paymentMethod;
    billSession.paidAt = billSession.paidAt || timestamp;

    db.orders.forEach(order => {
      if (
        order.restaurantId === restaurantId &&
        order.billSessionId === billSession.id &&
        order.orderStatus !== 'CANCELLED'
      ) {
        order.paymentStatus = 'PAID';
        order.paymentMethod = paymentMethod;
        order.updatedAt = timestamp;
      }
    });
  } else {
    billSession.status = 'PAYMENT_REQUESTED';
  }

  billSession.updatedAt = timestamp;
  const updated = recalculateBillSessionTotals(db, billSession);

  appendAuditLog(db, nextPaymentStatus === 'PAID' ? 'bill.payment.paid' : 'bill.payment.requested', {
    user,
    restaurantId,
    branchId: updated.branchId,
    targetId: updated.id,
    details: {
      previousStatus,
      nextStatus: updated.status,
      paymentMethod: updated.paymentMethod,
      subtotal: updated.subtotal,
      discountTotal: updated.discountTotal,
      serviceFeeTotal: updated.serviceFeeTotal,
      total: updated.total,
    },
  });

  return updated;
};

const closeBillSession = (db, restaurantId, billSession, body = {}, {user} = {}) => {
  if (!billSession) {
    throw new Error('Không tìm thấy hóa đơn bàn.');
  }
  if (billSession.status === 'CANCELLED') {
    throw new Error('Hóa đơn đã hủy nên không thể đóng.');
  }
  if (billSession.status !== 'PAID' && billSession.status !== 'CLOSED') {
    throw new Error('Chỉ đóng hóa đơn sau khi đã đánh dấu thanh toán.');
  }

  const timestamp = nowIso();
  const previousStatus = billSession.status;
  billSession.status = 'CLOSED';
  billSession.closedAt = billSession.closedAt || timestamp;
  billSession.updatedAt = timestamp;
  if (body.note !== undefined) {
    billSession.note = cleanString(body.note);
  }

  const updated = recalculateBillSessionTotals(db, billSession);

  if (updated.tableId) {
    db.tables.forEach(table => {
      if (
        table.restaurantId === restaurantId &&
        table.id === updated.tableId &&
        table.status === 'OCCUPIED' &&
        !findOpenBillSessionByTable(db, restaurantId, table.id, updated.id)
      ) {
        table.status = 'AVAILABLE';
        table.updatedAt = timestamp;
      }
    });
  }

  appendAuditLog(db, 'billClosed', {
    user,
    restaurantId,
    branchId: updated.branchId,
    targetId: updated.id,
    details: {
      previousStatus,
      nextStatus: updated.status,
      subtotal: updated.subtotal,
      discountTotal: updated.discountTotal,
      serviceFeeTotal: updated.serviceFeeTotal,
      total: updated.total,
    },
  });

  return updated;
};

const BILL_SESSION_MODEL = Object.freeze({
  statuses: BILL_SESSION_STATUSES,
  customerOrderableStatuses: CUSTOMER_ORDERABLE_BILL_SESSION_STATUSES,
  finalStatuses: FINAL_BILL_SESSION_STATUSES,
  normalizeStatus: normalizeBillSessionStatus,
  canCustomerAddOrder: canCustomerAddOrderToBillSession,
  isFinalStatus: isFinalBillSessionStatus,
  getOrders: getBillSessionOrders,
  calculateSubtotal: calculateBillSessionSubtotal,
  createOrderSummary: createBillOrderSummary,
  normalizePayload: normalizeBillSessionPayload,
  recalculateTotals: recalculateBillSessionTotals,
  updatePayment: updateBillSessionPayment,
  close: closeBillSession,
});

const asPublicBillSession = (db, billSession) => {
  const normalized = recalculateBillSessionTotals(db, billSession);
  const orders = getBillSessionOrders(db, normalized);
  const orderSummaries = orders.map(createBillOrderSummary);
  const summary = {
    billSessionId: normalized.id,
    restaurantId: normalized.restaurantId,
    branchId: normalized.branchId,
    tableId: normalized.tableId,
    tableNumber: normalized.tableNumber,
    status: normalized.status,
    orderCount: normalized.orderCount,
    orders: orderSummaries,
    subtotal: normalized.subtotal,
    discountTotal: normalized.discountTotal,
    serviceFeeTotal: normalized.serviceFeeTotal,
    total: normalized.total,
    paymentMethod: normalized.paymentMethod,
    openedAt: normalized.openedAt,
    paymentRequestedAt: normalized.paymentRequestedAt,
    paidAt: normalized.paidAt,
    closedAt: normalized.closedAt,
  };
  return {
    ...normalized,
    billSessionId: normalized.id,
    billTotal: normalized.total,
    orders,
    orderSummaries,
    summary,
  };
};

const getRestaurantBillSessions = (db, restaurantId, branchId) =>
  db.billSessions
    .filter(billSession =>
      billSession.restaurantId === restaurantId && (!branchId || billSession.branchId === branchId),
    )
    .map(billSession => asPublicBillSession(db, billSession))
    .sort((a, b) =>
      String(b.updatedAt || b.openedAt || b.createdAt).localeCompare(
        String(a.updatedAt || a.openedAt || a.createdAt),
      ),
    );

const getRestaurantBillSessionById = (db, restaurantId, billSessionId) => {
  const billSession = db.billSessions.find(
    item => item.id === billSessionId && item.restaurantId === restaurantId,
  );
  return billSession ? asPublicBillSession(db, billSession) : null;
};

const ensureBillSessionMatchesPublicScope = (scope, billSession) => {
  if (!billSession || billSession.restaurantId !== scope.context.restaurantId) {
    throw new Error('BillSession không tồn tại trong nhà hàng của QR hiện tại.');
  }
  if (scope.context.branchId && billSession.branchId !== scope.context.branchId) {
    throw new Error('BillSession không thuộc chi nhánh của QR hiện tại.');
  }
  return billSession;
};

const findPublicBillSessionById = (db, scope, billSessionId) => {
  const cleanId = cleanString(billSessionId);
  if (!cleanId) {
    return null;
  }
  const billSession = db.billSessions.find(
    item => item.id === cleanId && item.restaurantId === scope.context.restaurantId,
  );
  return billSession ? ensureBillSessionMatchesPublicScope(scope, billSession) : null;
};

const findCurrentPublicBillSession = (db, scope, {billSessionId, guestSessionId} = {}) => {
  const byId = findPublicBillSessionById(db, scope, billSessionId);
  if (byId) {
    return byId;
  }

  const cleanGuestSessionId = cleanString(guestSessionId);
  if (!cleanGuestSessionId) {
    return null;
  }

  return db.billSessions
    .filter(billSession =>
      billSession.restaurantId === scope.context.restaurantId &&
      (!scope.context.branchId || billSession.branchId === scope.context.branchId) &&
      billSession.guestSessionId === cleanGuestSessionId &&
      canCustomerAddOrderToBillSession(billSession.status),
    )
    .sort((a, b) => String(b.updatedAt || b.openedAt).localeCompare(String(a.updatedAt || a.openedAt)))[0] || null;
};

const createPublicBillSessionForOrder = (db, scope, table, body = {}) => {
  const billSession = normalizeBillSessionPayload(db, scope.context.restaurantId, {
    restaurantId: scope.context.restaurantId,
    branchId: table.branchId || scope.context.branchId,
    tableId: table.id,
    tableNumber: table.tableNumber,
    guestSessionId: cleanString(body.guestSessionId),
    status: 'OPEN',
    note: cleanString(body.billNote),
  });
  db.billSessions.unshift(billSession);
  return billSession;
};

const resolvePublicOrderBillSession = (db, scope, body = {}) => {
  const requestedBillSessionId = cleanString(body.billSessionId);

  if (requestedBillSessionId) {
    const billSession = findPublicBillSessionById(db, scope, requestedBillSessionId);
    if (!billSession) {
      throw new Error('BillSession không tồn tại hoặc không thuộc QR hiện tại.');
    }
    if (!canCustomerAddOrderToBillSession(billSession.status)) {
      throw new Error('Hóa đơn bàn này đã thanh toán/đóng, không thể gọi thêm món.');
    }
    return {billSession, created: false};
  }

  const table = resolvePublicOrderTable(db, scope, body);
  const billSession = createPublicBillSessionForOrder(db, scope, table, body);
  return {billSession, created: true};
};

const createPublicOrderResponse = (db, billSession, order) => {
  const bill = asPublicBillSession(db, billSession);
  return {
    billSessionId: bill.id,
    tableId: bill.tableId,
    tableNumber: bill.tableNumber,
    order,
    billTotal: bill.total,
    billSession: bill,
    orders: bill.orders,
  };
};


const cartKey = ({restaurantId, branchId, tableId}) =>
  [restaurantId || 'no_restaurant', branchId || 'no_branch', tableId || 'no_table'].join(':');

const emptyCart = ({restaurantId, branchId, tableId, tableNumber}) => ({
  restaurantId,
  branchId,
  tableId,
  tableNumber: tableNumber || '',
  note: '',
  items: [],
});

const findBranch = (db, restaurantId, branchId) =>
  db.branches.find(branch => branch.id === branchId && branch.restaurantId === restaurantId);

const findTable = (db, restaurantId, tableId) =>
  db.tables.find(table => table.id === tableId && table.restaurantId === restaurantId);

const normalizeTableNumberKey = value => cleanString(value).toLowerCase();

const findTableByBranchAndNumber = (db, restaurantId, branchId, tableNumber) => {
  const tableNumberKey = normalizeTableNumberKey(tableNumber);
  if (!tableNumberKey) {
    return null;
  }

  const candidates = db.tables.filter(table =>
    table.restaurantId === restaurantId &&
    normalizeTableNumberKey(table.tableNumber) === tableNumberKey
  );

  if (!branchId) {
    return candidates[0] || null;
  }

  return (
    candidates.find(table => table.branchId === branchId) ||
    // Compatibility: older app builds could create tables before the
    // admin context had a branchId, so those rows are restaurant-scoped.
    // Keep them selectable from the current branch menu QR.
    candidates.find(table => !table.branchId) ||
    null
  );
};

const findTableByQrToken = (db, token) => {
  const cleanToken = cleanString(token);
  if (!cleanToken) {
    return null;
  }
  return db.tables.find(table => table.qrCodeToken === cleanToken) || null;
};

const inferBranchMenuQrToken = branch => {
  const explicitToken = cleanString(branch?.menuQrToken);
  if (explicitToken) {
    return explicitToken;
  }
  if (branch?.id && isProductionDemoBranchId(branch.id)) {
    return createUniqueMenuQrToken({branches: []}, branch.restaurantId || 'restaurant', branch.name || 'main');
  }
  const restaurantKey = normalizeKey(branch?.restaurantId || 'restaurant').replace(/[^a-z0-9]+/g, '_');
  const branchKey = normalizeKey(branch?.name || branch?.id || 'main').replace(/[^a-z0-9]+/g, '_');
  return `qr_${restaurantKey}_${branchKey}_menu`;
};

const createUniqueMenuQrToken = (db, restaurantId, label = 'main') => {
  const restaurantKey = normalizeKey(restaurantId || 'restaurant').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'restaurant';
  const labelKey = normalizeKey(label || 'main').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'main';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const randomPart = crypto.randomBytes(4).toString('hex');
    const token = `qr_${restaurantKey}_${labelKey}_${randomPart}_menu`;
    if (!branchMenuQrTokenExists(db, token)) {
      return token;
    }
  }

  return `qr_${restaurantKey}_${labelKey}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}_menu`;
};

const createFreshRestaurantForAdmin = (db, {userId, username, timestamp}) => {
  const cleanRestaurantName = `Quán của ${cleanString(username) || 'Admin'}`;
  const restaurant = {
    id: createId('restaurant'),
    name: cleanRestaurantName,
    ownerId: userId,
    status: 'ACTIVE',
    logoUrl: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const branch = {
    id: createId('branch'),
    restaurantId: restaurant.id,
    name: cleanRestaurantName,
    address: '',
    menuQrToken: createUniqueMenuQrToken(db, restaurant.id, cleanRestaurantName),
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.restaurants.unshift(restaurant);
  db.branches.unshift(branch);
  clearRestaurantScopedRuntimeData(db, restaurant.id);
  ensureDefaultCategoriesForRestaurant(db, restaurant.id);

  return {restaurant, branch};
};

const getAdminPrimaryRestaurantId = user => {
  const activeRestaurantId = cleanString(user?.activeRestaurantId);
  if (activeRestaurantId && !isProductionDemoRestaurantId(activeRestaurantId)) {
    return activeRestaurantId;
  }
  const restaurantIds = Array.isArray(user?.restaurantIds) ? user.restaurantIds : [];
  return restaurantIds.map(cleanString).find(id => id && !isProductionDemoRestaurantId(id)) || '';
};

const shouldCreatePrivateRestaurantForOwner = (db, user) => {
  if (!user || user.role !== 'OWNER') {
    return false;
  }

  const activeRestaurantId = getAdminPrimaryRestaurantId(user);
  if (!activeRestaurantId) {
    return true;
  }

  const restaurant = db.restaurants.find(item => item.id === activeRestaurantId);
  if (!restaurant) {
    return true;
  }

  if (isProductionDemoRestaurant(restaurant)) {
    return true;
  }

  if (restaurant.ownerId && restaurant.ownerId !== user.id) {
    return true;
  }

  return db.adminUsers.some(other =>
    other.id !== user.id &&
    other.role === 'OWNER' &&
    getAdminPrimaryRestaurantId(other) === activeRestaurantId,
  );
};

const ensurePrivateRestaurantForOwner = (db, user) => {
  if (!user || user.role !== 'OWNER') {
    return false;
  }

  const scopeSanitized = sanitizeAdminUserScope(db, user);

  if (!shouldCreatePrivateRestaurantForOwner(db, user)) {
    return sanitizeOwnerRestaurantRuntimeData(db, user) || scopeSanitized;
  }

  const timestamp = nowIso();
  const {restaurant, branch} = createFreshRestaurantForAdmin(db, {
    userId: user.id,
    username: user.username,
    timestamp,
  });

  Object.assign(user, {
    restaurantIds: [restaurant.id],
    activeRestaurantId: restaurant.id,
    branchIds: [branch.id],
    activeBranchId: branch.id,
    updatedAt: timestamp,
  });
  clearRestaurantScopedRuntimeData(db, restaurant.id);

  return true;
};

const findBranchByMenuQrToken = (db, token) => {
  const cleanToken = cleanString(token);
  if (!cleanToken) {
    return null;
  }
  return db.branches.find(branch => inferBranchMenuQrToken(branch) === cleanToken) || null;
};

const branchMenuQrTokenExists = (db, token, exceptBranchId = '') => {
  const cleanToken = cleanString(token);
  if (!cleanToken) {
    return false;
  }
  return db.branches.some(branch =>
    branch.id !== exceptBranchId && inferBranchMenuQrToken(branch) === cleanToken,
  );
};

const cleanBranchStatus = status =>
  BRANCH_STATUSES.includes(status) ? status : 'ACTIVE';

const isPublicTableUsable = table =>
  Boolean(table) && table.status !== 'LOCKED' && table.status !== 'HIDDEN';

const isPublicBranchUsable = branch =>
  Boolean(branch) && branch.status !== 'LOCKED' && branch.status !== 'HIDDEN';

const getPublicMenuScope = (db, token) => {
  const cleanToken = cleanString(token);
  const branchFromQr = findBranchByMenuQrToken(db, cleanToken);

  if (branchFromQr) {
    if (!isPublicBranchUsable(branchFromQr)) {
      return null;
    }

    const restaurant = db.restaurants.find(item => item.id === branchFromQr.restaurantId);
    return {
      restaurant,
      branch: branchFromQr,
      table: null,
      context: {
        restaurantId: branchFromQr.restaurantId,
        restaurantName: restaurant?.name,
        branchId: branchFromQr.id,
        branchName: branchFromQr.name,
        tableId: undefined,
        tableNumber: undefined,
        qrCodeToken: cleanToken,
        menuQrToken: inferBranchMenuQrToken(branchFromQr),
        qrTokenScope: 'BRANCH_MENU',
        source: 'customer',
      },
    };
  }

  const table = findTableByQrToken(db, cleanToken);

  if (!isPublicTableUsable(table)) {
    return null;
  }

  const restaurant = db.restaurants.find(item => item.id === table.restaurantId);
  const branch = db.branches.find(
    item => item.id === table.branchId && item.restaurantId === table.restaurantId,
  );

  return {
    restaurant,
    branch,
    table,
    context: {
      restaurantId: table.restaurantId,
      restaurantName: restaurant?.name,
      branchId: table.branchId,
      branchName: branch?.name,
      tableId: table.id,
      tableNumber: table.tableNumber,
      qrCodeToken: table.qrCodeToken,
      menuQrToken: inferBranchMenuQrToken(branch) || table.qrCodeToken,
      qrTokenScope: 'TABLE',
      source: 'customer',
    },
  };
};

const resolvePublicOrderTable = (db, scope, body = {}) => {
  if (!scope?.context?.restaurantId || !scope.context.branchId) {
    throw new Error('QR menu chưa xác định được chi nhánh. Vui lòng quét lại QR của quán.');
  }

  const bodyTableId = cleanString(body.tableId || body.table_id);
  const bodyTableNumber = cleanString(body.tableNumber || body.tableCode || body.number);

  if (scope.table) {
    if (!isPublicTableUsable(scope.table)) {
      throw new Error('Bàn này đang bị khóa hoặc không nhận đơn.');
    }

    if (bodyTableNumber && normalizeTableNumberKey(bodyTableNumber) !== normalizeTableNumberKey(scope.table.tableNumber)) {
      throw new Error('Số bàn không khớp với QR đã quét. Vui lòng kiểm tra lại.');
    }

    return scope.table;
  }

  if (!bodyTableId && !bodyTableNumber) {
    throw new Error('Vui lòng nhập hoặc chọn số bàn trước khi gửi đơn.');
  }

  const table = bodyTableId
    ? findTable(db, scope.context.restaurantId, bodyTableId)
    : findTableByBranchAndNumber(
        db,
        scope.context.restaurantId,
        scope.context.branchId,
        bodyTableNumber,
      );

  if (!table || (table.branchId && table.branchId !== scope.context.branchId)) {
    throw new Error('Số bàn không tồn tại trong chi nhánh này. Vui lòng kiểm tra lại.');
  }

  if (!isPublicTableUsable(table)) {
    throw new Error('Bàn này đang bị khóa hoặc không nhận đơn. Vui lòng gọi nhân viên.');
  }

  return table;
};

const ensureBranch = (db, restaurantId, branchId) => {
  if (!branchId) {
    return true;
  }
  return Boolean(findBranch(db, restaurantId, branchId));
};

const ensureCategory = (db, restaurantId, categoryId) =>
  db.categories.some(category => category.id === categoryId && category.restaurantId === restaurantId);

const buildCategoryResult = (db, restaurantId, message) => ({
  ok: true,
  message,
  categories: getRestaurantCategories(db, restaurantId),
});

const normalizeCategoryPayload = (payload, restaurantId, existing) => {
  const name = cleanString(payload.name ?? existing?.name);
  if (!name) {
    throw new Error('Vui lòng nhập tên danh mục.');
  }

  const timestamp = nowIso();
  return {
    id: cleanString(payload.id) || existing?.id || createId('category'),
    restaurantId,
    name,
    sortOrder: Number.isFinite(Number(payload.sortOrder ?? existing?.sortOrder))
      ? Number(payload.sortOrder ?? existing?.sortOrder)
      : 99,
    createdAt: existing?.createdAt || cleanString(payload.createdAt) || timestamp,
    updatedAt: timestamp,
  };
};

const normalizeItemPayload = (payload, restaurantId, existing) => {
  const name = cleanString(payload.name ?? existing?.name);
  const description = cleanString(payload.description ?? existing?.description);
  const price = Number(payload.price ?? existing?.price);
  const categoryId = cleanString(payload.categoryId ?? existing?.categoryId);
  const status = ITEM_STATUSES.includes(payload.status) ? payload.status : existing?.status || 'SELLING';

  if (!name) {
    throw new Error('Vui lòng nhập tên món.');
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Giá món không hợp lệ.');
  }
  if (!categoryId) {
    throw new Error('Vui lòng chọn danh mục cho món.');
  }

  const timestamp = nowIso();
  return {
    id: cleanString(payload.id) || existing?.id || createId('item'),
    restaurantId,
    categoryId,
    name,
    price,
    description,
    imageUrl: cleanString(payload.imageUrl ?? existing?.imageUrl),
    available: payload.available === undefined ? status === 'SELLING' : Boolean(payload.available),
    status,
    sortOrder: Number.isFinite(Number(payload.sortOrder ?? existing?.sortOrder))
      ? Number(payload.sortOrder ?? existing?.sortOrder)
      : 99,
    createdAt: existing?.createdAt || cleanString(payload.createdAt) || timestamp,
    updatedAt: timestamp,
  };
};

const normalizeOrderItems = (db, restaurantId, rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Đơn hàng cần có ít nhất một món.');
  }

  return rawItems.map(rawItem => {
    const itemId = cleanString(rawItem.itemId || rawItem.id);
    const menuItem = db.items.find(item => item.id === itemId && item.restaurantId === restaurantId);
    const quantity = Math.max(1, Math.floor(Number(rawItem.quantity || 1)));

    if (!itemId) {
      throw new Error('Món trong đơn hàng chưa hợp lệ.');
    }
    if (!menuItem) {
      throw new Error('Có món không thuộc menu của nhà hàng hiện tại.');
    }
    if (menuItem.status !== 'SELLING' || menuItem.available === false) {
      throw new Error(`Món ${menuItem.name || itemId} hiện không thể đặt.`);
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Số lượng món trong đơn hàng chưa hợp lệ.');
    }

    return {
      itemId,
      name: menuItem.name,
      price: Number(menuItem.price || 0),
      quantity,
      note: cleanString(rawItem.note),
    };
  });
};

const normalizePaymentMethod = method => {
  const normalized = cleanString(method).toUpperCase();
  return PAYMENT_METHODS.includes(normalized) ? normalized : 'MOCK';
};

const normalizeOrderPayload = (db, restaurantId, payload, existing) => {
  const branchId = cleanString(payload.branchId ?? existing?.branchId);
  const tableId = cleanString(payload.tableId ?? existing?.tableId);
  const billSessionId = cleanString(payload.billSessionId ?? existing?.billSessionId);
  const billSession = billSessionId
    ? db.billSessions.find(item => item.id === billSessionId && item.restaurantId === restaurantId)
    : null;
  const table = tableId ? findTable(db, restaurantId, tableId) : null;

  if (branchId && !ensureBranch(db, restaurantId, branchId)) {
    throw new Error('Chi nhánh không thuộc nhà hàng hiện tại.');
  }
  if (tableId && !table) {
    throw new Error('Bàn không thuộc nhà hàng hiện tại.');
  }
  if (table && branchId && table.branchId && table.branchId !== branchId) {
    throw new Error('Bàn không thuộc chi nhánh hiện tại.');
  }
  if (billSessionId && !billSession) {
    throw new Error('BillSession không thuộc nhà hàng hiện tại hoặc không tồn tại.');
  }

  const items = normalizeOrderItems(db, restaurantId, payload.items ?? existing?.items);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const timestamp = nowIso();
  const orderStatus = ORDER_STATUSES.includes(payload.orderStatus)
    ? payload.orderStatus
    : existing?.orderStatus || 'NEW';
  const paymentStatus = PAYMENT_STATUSES.includes(payload.paymentStatus)
    ? payload.paymentStatus
    : existing?.paymentStatus || 'UNPAID';
  const paymentMethod = normalizePaymentMethod(
    payload.paymentMethod || existing?.paymentMethod,
  );

  return {
    id: cleanString(payload.id) || existing?.id || createId('order'),
    restaurantId,
    branchId: branchId || billSession?.branchId || table?.branchId || undefined,
    tableId: tableId || billSession?.tableId || undefined,
    billSessionId: billSessionId || undefined,
    guestSessionId: cleanString(payload.guestSessionId || existing?.guestSessionId || billSession?.guestSessionId) || undefined,
    orderSource: payload.orderSource || existing?.orderSource || 'customer',
    tableNumber: cleanString(payload.tableNumber || billSession?.tableNumber || table?.tableNumber || existing?.tableNumber),
    items,
    note: cleanString(payload.note ?? existing?.note),
    total,
    orderStatus,
    paymentStatus,
    paymentMethod,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
};

const canChangeOrderStatus = (from, to) => {
  if (from === to) {
    return true;
  }
  if (from === 'CANCELLED' || from === 'COMPLETED') {
    return false;
  }
  if (to === 'CANCELLED') {
    return true;
  }
  const allowed = {
    NEW: ['NEW', 'ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['ACCEPTED', 'PREPARING', 'CANCELLED'],
    PREPARING: ['PREPARING', 'COMPLETED', 'CANCELLED'],
    COMPLETED: ['COMPLETED'],
    CANCELLED: ['CANCELLED'],
  };
  return (allowed[from] || []).includes(to);
};

const routeAuth = async (req, res, db, parts) => {
  const body = await parseBody(req);
  const username = cleanString(body.username);
  const password = cleanString(body.password);

  if (!username || !password) {
    fail(res, 400, 'Vui lòng nhập tài khoản và mật khẩu Admin.');
    return true;
  }

  if (parts[2] === 'login' && req.method === 'POST') {
    const user = db.adminUsers.find(item => normalizeKey(item.username) === normalizeKey(username));
    if (!user) {
      fail(res, 401, 'Tài khoản Admin không tồn tại. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.', {
        reason: 'USERNAME_NOT_FOUND',
      });
      return true;
    }
    if (!verifyPassword(user, password)) {
      fail(res, 401, 'Mật khẩu Admin chưa đúng. Vui lòng nhập lại mật khẩu.', {
        reason: 'WRONG_PASSWORD',
      });
      return true;
    }
    const passwordMigrated = migratePlainPasswordIfNeeded(user, password);
    const scopeChanged = ensurePrivateRestaurantForOwner(db, user);
    if (passwordMigrated || scopeChanged) {
      saveDb(db);
    }

    const activeRestaurantId = user.activeRestaurantId || user.restaurantIds?.[0];
    const activeRestaurant = db.restaurants.find(item => item.id === activeRestaurantId);
    const activeBranch =
      db.branches.find(branch => branch.id === user.activeBranchId && branch.restaurantId === activeRestaurantId) ||
      db.branches.find(branch => branch.restaurantId === activeRestaurantId);

    ok(res, {
      ok: true,
      message: 'Đăng nhập Admin thành công',
      token: createToken(user),
      userId: user.id,
      role: user.role,
      restaurantId: activeRestaurantId,
      restaurantName: activeRestaurant?.name,
      restaurantIds: user.restaurantIds || [],
      branchIds: user.branchIds || [],
      activeBranchId: activeBranch?.id || user.activeBranchId,
      activeBranchName: activeBranch?.name,
      menuQrToken: activeBranch ? inferBranchMenuQrToken(activeBranch) : undefined,
    });
    return true;
  }

  if (parts[2] === 'register' && req.method === 'POST') {
    if (password.length < 6) {
      fail(res, 400, 'Mật khẩu Admin nên có tối thiểu 6 ký tự.');
      return true;
    }
    const existingUser = db.adminUsers.find(item => normalizeKey(item.username) === normalizeKey(username));
    if (existingUser) {
      // Register must be a pure "create new account" action. Even when the
      // password is correct, do not silently log in here; otherwise the admin
      // thinks a new account was created while the app reuses the old
      // restaurant name/table configuration from the existing account.
      fail(res, 409, 'Tài khoản Admin này đã tồn tại. Vui lòng bấm Đăng nhập, hoặc đăng ký bằng tài khoản khác.', {
        reason: 'USERNAME_ALREADY_EXISTS',
      });
      return true;
    }

    const timestamp = nowIso();
    const passwordRecord = createPasswordRecord(password);
    const userId = createId('admin');
    const {restaurant, branch} = createFreshRestaurantForAdmin(db, {
      userId,
      username,
      timestamp,
    });
    const user = {
      id: userId,
      username,
      ...passwordRecord,
      role: 'OWNER',
      restaurantIds: [restaurant.id],
      activeRestaurantId: restaurant.id,
      branchIds: [branch.id],
      activeBranchId: branch.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.adminUsers.push(user);
    saveDb(db);
    created(res, {
      ok: true,
      message: 'Đăng ký Admin thành công',
      token: createToken(user),
      userId: user.id,
      role: user.role,
      restaurantId: user.activeRestaurantId,
      restaurantName: restaurant.name,
      restaurantIds: user.restaurantIds,
      branchIds: user.branchIds || [],
      activeBranchId: user.activeBranchId,
      activeBranchName: branch.name,
      menuQrToken: branch.menuQrToken,
    });
    return true;
  }

  return false;
};

const routeRestaurants = async (req, res, db, parts) => {
  if (parts.length === 1 && req.method === 'GET') {
    const user = getUserFromRequest(db, req);
    if (!user) {
      fail(res, 401, 'Phiên đăng nhập chưa hợp lệ.');
      return true;
    }
    const cleanedRuntimeData = ensurePrivateRestaurantForOwner(db, user);
    if (cleanedRuntimeData) {
      saveDb(db);
    }
    const restaurants = user
      ? db.restaurants.filter(
          restaurant =>
            !isProductionDemoRestaurant(restaurant) &&
            !isProductionDemoRestaurantId(restaurant.id) &&
            canAccessRestaurant(user, restaurant.id),
        )
      : [];
    ok(res, restaurants.map(asPublicRestaurant));
    return true;
  }

  if (parts.length === 1 && req.method === 'POST') {
    const user = getUserFromRequest(db, req);
    if (!user) {
      fail(res, 401, 'Phiên đăng nhập chưa hợp lệ.');
      return true;
    }
    if (!requireRole(res, user, ['OWNER'], 'Chỉ chủ nhà hàng mới được tạo nhà hàng mới.')) {
      return true;
    }

    const body = await parseBody(req);
    const name = cleanString(body.name);
    if (!name) {
      fail(res, 400, 'Vui lòng nhập tên nhà hàng.');
      return true;
    }
    if (db.restaurants.some(item => normalizeKey(item.name) === normalizeKey(name))) {
      fail(res, 409, 'Tên nhà hàng đã tồn tại.');
      return true;
    }

    const timestamp = nowIso();
    const restaurant = {
      id: cleanString(body.id) || createId('restaurant'),
      name,
      ownerId: cleanString(body.ownerId) || user?.id,
      status: 'ACTIVE',
      logoUrl: cleanString(body.logoUrl),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.restaurants.push(restaurant);
    const menuQrToken = cleanString(body.menuQrToken) || createUniqueMenuQrToken(db, restaurant.id, name);
    if (branchMenuQrTokenExists(db, menuQrToken)) {
      fail(res, 409, 'Mã QR menu quán này đã được dùng.');
      return true;
    }
    const branch = {
      id: createId('branch'),
      restaurantId: restaurant.id,
      name,
      address: '',
      menuQrToken,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.branches.push(branch);
    if (user) {
      user.restaurantIds = [restaurant.id];
      user.activeRestaurantId = restaurant.id;
      user.branchIds = [branch.id];
      user.activeBranchId = branch.id;
      user.updatedAt = timestamp;
    }
    saveDb(db);
    audit('restaurant.create', {user, restaurantId: restaurant.id});
    created(res, asPublicRestaurant(restaurant));
    return true;
  }

  if (parts.length === 2 && req.method === 'PATCH') {
    const user = getUserFromRequest(db, req);
    const restaurantId = parts[1];
    const restaurant = db.restaurants.find(item => item.id === restaurantId);
    if (!restaurant) {
      fail(res, 404, 'Không tìm thấy nhà hàng.');
      return true;
    }
    if (!user) {
      fail(res, 401, 'Phiên đăng nhập chưa hợp lệ.');
      return true;
    }
    if (!canAccessRestaurant(user, restaurantId)) {
      fail(res, 403, 'Tài khoản không có quyền sửa nhà hàng này.');
      return true;
    }
    if (!requireRole(res, user, ['OWNER'], 'Chỉ chủ nhà hàng mới được sửa tên quán.')) {
      return true;
    }

    const body = await parseBody(req);
    const name = cleanString(body.name ?? restaurant.name);
    if (!name) {
      fail(res, 400, 'Vui lòng nhập tên quán.');
      return true;
    }
    const duplicateName = db.restaurants.some(item =>
      item.id !== restaurant.id && normalizeKey(item.name) === normalizeKey(name),
    );
    if (duplicateName) {
      fail(res, 409, 'Tên quán đã tồn tại. Vui lòng nhập tên khác.');
      return true;
    }

    const timestamp = nowIso();
    const previousName = restaurant.name;
    restaurant.name = name;
    restaurant.updatedAt = timestamp;
    db.branches = db.branches.map(branch =>
      branch.restaurantId === restaurant.id && (!branch.name || branch.name === previousName || branch.name === 'Chi nhánh chính')
        ? {...branch, name, updatedAt: timestamp}
        : branch,
    );
    saveDb(db);
    audit('restaurant.update', {user, restaurantId: restaurant.id, targetId: restaurant.id});
    ok(res, asPublicRestaurant(restaurant));
    return true;
  }

  return false;
};

const routeBranches = async (req, res, db, restaurantId, parts, user) => {
  if (parts.length === 3 && req.method === 'GET') {
    const branches = db.branches.filter(branch => branch.restaurantId === restaurantId);
    ok(res, filterBranchesForUser(branches, user, restaurantId));
    return true;
  }

  if (parts.length === 3 && req.method === 'POST') {
    if (!requireRole(res, user, ['OWNER'], 'Chỉ chủ nhà hàng mới được tạo chi nhánh.')) {
      return true;
    }
    const body = await parseBody(req);
    const name = cleanString(body.name);
    if (!name) {
      fail(res, 400, 'Vui lòng nhập tên chi nhánh.');
      return true;
    }
    const timestamp = nowIso();
    const branchId = cleanString(body.id) || createId('branch');
    const menuQrToken = cleanString(body.menuQrToken) || inferBranchMenuQrToken({
      id: branchId,
      restaurantId,
      name,
    });
    if (branchMenuQrTokenExists(db, menuQrToken)) {
      fail(res, 409, 'Mã QR menu chi nhánh này đã được dùng.');
      return true;
    }
    const branch = {
      id: branchId,
      restaurantId,
      name,
      address: cleanString(body.address),
      menuQrToken,
      status: cleanBranchStatus(body.status),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.branches.push(branch);
    saveDb(db);
    audit('branch.create', {user, restaurantId, branchId: branch.id, targetId: branch.id});
    created(res, branch);
    return true;
  }

  if (parts.length === 4 && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER'], 'Chỉ chủ nhà hàng mới được sửa chi nhánh.')) {
      return true;
    }
    const branch = findBranch(db, restaurantId, parts[3]);
    if (!branch) {
      fail(res, 404, 'Không tìm thấy chi nhánh.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, branch.id)) {
      return true;
    }
    const body = await parseBody(req);
    const name = cleanString(body.name ?? branch.name);
    if (!name) {
      fail(res, 400, 'Vui lòng nhập tên chi nhánh.');
      return true;
    }
    const menuQrToken = cleanString(body.menuQrToken ?? branch.menuQrToken) || inferBranchMenuQrToken(branch);
    if (branchMenuQrTokenExists(db, menuQrToken, branch.id)) {
      fail(res, 409, 'Mã QR menu chi nhánh này đã được dùng.');
      return true;
    }
    Object.assign(branch, {
      name,
      address: cleanString(body.address ?? branch.address),
      menuQrToken,
      status: body.status ? cleanBranchStatus(body.status) : branch.status || 'ACTIVE',
      updatedAt: nowIso(),
    });
    saveDb(db);
    audit('branch.update', {user, restaurantId, branchId: branch.id, targetId: branch.id});
    ok(res, branch);
    return true;
  }

  if (parts.length === 4 && req.method === 'DELETE') {
    if (!requireRole(res, user, ['OWNER'], 'Chỉ chủ nhà hàng mới được xoá chi nhánh.')) {
      return true;
    }
    const branchId = parts[3];
    if (!requireBranchAccess(res, user, restaurantId, branchId)) {
      return true;
    }
    const before = db.branches.length;
    db.branches = db.branches.filter(branch => !(branch.id === branchId && branch.restaurantId === restaurantId));
    if (before === db.branches.length) {
      fail(res, 404, 'Không tìm thấy chi nhánh.');
      return true;
    }
    db.tables = db.tables.map(table =>
      table.restaurantId === restaurantId && table.branchId === branchId
        ? {...table, branchId: undefined, updatedAt: nowIso()}
        : table,
    );
    saveDb(db);
    audit('branch.delete', {user, restaurantId, branchId, targetId: branchId});
    ok(res, filterBranchesForUser(db.branches.filter(branch => branch.restaurantId === restaurantId), user, restaurantId));
    return true;
  }

  return false;
};

const routeTables = async (req, res, db, restaurantId, parts, user) => {
  if (parts.length === 3 && req.method === 'GET') {
    const tables = db.tables.filter(table => table.restaurantId === restaurantId);
    ok(res, filterTablesForUser(tables, user, restaurantId));
    return true;
  }

  if (parts.length === 3 && req.method === 'POST') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền tạo QR.')) {
      return true;
    }
    const body = await parseBody(req);
    const tableNumber = cleanString(body.tableNumber || body.tableCode || body.number);
    const branchId = cleanString(body.branchId);
    if (!tableNumber) {
      fail(res, 400, 'Vui lòng nhập số bàn.');
      return true;
    }
    if (branchId && !ensureBranch(db, restaurantId, branchId)) {
      fail(res, 400, 'Chi nhánh không thuộc nhà hàng hiện tại.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, branchId)) {
      return true;
    }
    const timestamp = nowIso();
    const table = {
      id: cleanString(body.id) || createId('table'),
      restaurantId,
      branchId: branchId || undefined,
      tableNumber,
      qrCodeToken: cleanString(body.qrCodeToken) || createId(`qr_${restaurantId}`),
      status: TABLE_STATUSES.includes(body.status) ? body.status : 'AVAILABLE',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const duplicateTable = db.tables.some(item =>
      item.restaurantId === restaurantId &&
      String(item.tableNumber || '').trim().toLowerCase() === String(tableNumber || '').trim().toLowerCase()
    );
    if (duplicateTable) {
      fail(res, 409, 'Bàn này đã tồn tại trong nhà hàng hiện tại.');
      return true;
    }
    const duplicateQr = db.tables.some(item => item.qrCodeToken === table.qrCodeToken);
    if (duplicateQr) {
      fail(res, 409, 'Mã QR này đã được dùng cho bàn khác.');
      return true;
    }
    db.tables.push(table);
    saveDb(db);
    audit('table.create', {user, restaurantId, branchId: table.branchId, targetId: table.id});
    created(res, table);
    return true;
  }

  if (parts.length === 4 && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền sửa QR.')) {
      return true;
    }
    const table = findTable(db, restaurantId, parts[3]);
    if (!table) {
      fail(res, 404, 'Không tìm thấy bàn cần cập nhật.');
      return true;
    }
    const body = await parseBody(req);
    const tableNumber = cleanString(body.tableNumber ?? body.tableCode ?? body.number ?? table.tableNumber);
    const branchId = cleanString(body.branchId ?? table.branchId);
    const qrCodeToken = cleanString(body.qrCodeToken ?? table.qrCodeToken);
    if (!tableNumber) {
      fail(res, 400, 'Vui lòng nhập số bàn.');
      return true;
    }
    if (branchId && !ensureBranch(db, restaurantId, branchId)) {
      fail(res, 400, 'Chi nhánh không thuộc nhà hàng hiện tại.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, table.branchId) || !requireBranchAccess(res, user, restaurantId, branchId)) {
      return true;
    }
    const duplicateTable = db.tables.some(item =>
      item.id !== table.id &&
      item.restaurantId === restaurantId &&
      String(item.tableNumber || '').trim().toLowerCase() === String(tableNumber || '').trim().toLowerCase()
    );
    if (duplicateTable) {
      fail(res, 409, 'Bàn này đã tồn tại trong nhà hàng hiện tại.');
      return true;
    }
    const duplicateQr = db.tables.some(item =>
      item.id !== table.id && item.qrCodeToken === qrCodeToken
    );
    if (duplicateQr) {
      fail(res, 409, 'Mã QR này đã được dùng cho bàn khác.');
      return true;
    }
    Object.assign(table, {
      branchId: branchId || undefined,
      tableNumber,
      qrCodeToken: qrCodeToken || table.qrCodeToken,
      status: TABLE_STATUSES.includes(body.status) ? body.status : table.status || 'AVAILABLE',
      updatedAt: nowIso(),
    });
    saveDb(db);
    audit('table.update', {user, restaurantId, branchId: table.branchId, targetId: table.id});
    ok(res, table);
    return true;
  }

  if (parts.length === 4 && req.method === 'DELETE') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền xoá QR.')) {
      return true;
    }
    const tableId = parts[3];
    const table = findTable(db, restaurantId, tableId);
    if (!table) {
      fail(res, 404, 'Không tìm thấy bàn cần xoá.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, table.branchId)) {
      return true;
    }
    const before = db.tables.length;
    db.tables = db.tables.filter(
      table => !(table.id === tableId && table.restaurantId === restaurantId),
    );
    if (before === db.tables.length) {
      fail(res, 404, 'Không tìm thấy bàn cần xoá.');
      return true;
    }
    Object.keys(db.carts || {}).forEach(key => {
      if (key.includes(tableId)) {
        delete db.carts[key];
      }
    });
    saveDb(db);
    audit('table.delete', {user, restaurantId, branchId: table.branchId, targetId: tableId});
    ok(res, filterTablesForUser(db.tables.filter(table => table.restaurantId === restaurantId), user, restaurantId));
    return true;
  }

  return false;
};

const routeCategories = async (req, res, db, restaurantId, parts, user) => {
  if (parts.length === 4 && req.method === 'GET') {
    if (removeUnusedDefaultCategoriesForRestaurant(db, restaurantId)) {
      saveDb(db);
    }
    ok(res, getRestaurantCategories(db, restaurantId));
    return true;
  }

  if (parts.length === 4 && req.method === 'POST') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền thêm danh mục.')) {
      return true;
    }
    const body = await parseBody(req);
    try {
      removeUnusedDefaultCategoriesForRestaurant(db, restaurantId);
      const category = normalizeCategoryPayload(body, restaurantId);
      if (db.categories.some(item => item.restaurantId === restaurantId && normalizeKey(item.name) === normalizeKey(category.name))) {
        fail(res, 409, 'Tên danh mục đã tồn tại.');
        return true;
      }
      db.categories.push(category);
      saveDb(db);
      audit('category.create', {user, restaurantId, targetId: category.id});
      created(res, buildCategoryResult(db, restaurantId, 'Đã thêm danh mục.'));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu danh mục chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền sửa danh mục.')) {
      return true;
    }
    const category = db.categories.find(item => item.id === parts[4] && item.restaurantId === restaurantId);
    if (!category) {
      fail(res, 404, 'Không tìm thấy danh mục.');
      return true;
    }
    const body = await parseBody(req);
    try {
      const next = normalizeCategoryPayload(body, restaurantId, category);
      Object.assign(category, next);
      saveDb(db);
      audit('category.update', {user, restaurantId, targetId: category.id});
      ok(res, buildCategoryResult(db, restaurantId, 'Đã cập nhật danh mục.'));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu danh mục chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && req.method === 'DELETE') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền xoá danh mục.')) {
      return true;
    }
    const categoryId = parts[4];
    const category = db.categories.find(item => item.id === categoryId && item.restaurantId === restaurantId);
    if (!category) {
      fail(res, 404, 'Không tìm thấy danh mục.');
      return true;
    }
    const body = await parseBody(req);
    const moveItemsToCategoryId = cleanString(body.moveItemsToCategoryId);
    if (moveItemsToCategoryId && !ensureCategory(db, restaurantId, moveItemsToCategoryId)) {
      fail(res, 400, 'Danh mục chuyển món không hợp lệ.');
      return true;
    }
    db.categories = db.categories.filter(item => !(item.id === categoryId && item.restaurantId === restaurantId));
    db.items = db.items.map(item => {
      if (item.restaurantId !== restaurantId || item.categoryId !== categoryId) {
        return item;
      }
      if (moveItemsToCategoryId) {
        return {...item, categoryId: moveItemsToCategoryId, updatedAt: nowIso()};
      }
      return {...item, status: 'HIDDEN', available: false, updatedAt: nowIso()};
    });
    saveDb(db);
    audit('category.delete', {user, restaurantId, targetId: categoryId});
    ok(res, buildCategoryResult(db, restaurantId, 'Đã xóa danh mục.'));
    return true;
  }

  return false;
};

const routeMenuImages = async (req, res, db, restaurantId, parts, user) => {
  if (parts.length !== 4 || req.method !== 'POST') {
    return false;
  }
  if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền upload ảnh món.')) {
    return true;
  }

  const body = await parseBody(req);
  const dishId = createSafeStorageName(body.dishId || body.itemId || 'new_dish');

  try {
    const {buffer, mimeType} = parseImageUploadPayload(body);
    const restaurantDirName = createSafeStorageName(restaurantId);
    const restaurantUploadDir = path.join(UPLOAD_DIR, restaurantDirName);
    fs.mkdirSync(restaurantUploadDir, {recursive: true});

    const extension = getImageExtensionFromMime(mimeType);
    const fileName = `${dishId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension}`;
    const filePath = path.join(restaurantUploadDir, fileName);

    if (!isSafeUploadPath(filePath)) {
      fail(res, 400, 'Đường dẫn lưu ảnh không hợp lệ.');
      return true;
    }

    fs.writeFileSync(filePath, buffer);

    const storagePath = `menu-images/${restaurantDirName}/${fileName}`;
    const publicPath = `${PUBLIC_UPLOAD_PREFIX}/${restaurantDirName}/${fileName}`;
    const publicUrl = `${getRequestBaseUrl(req)}${publicPath}`;
    const createdAt = nowIso();
    const metadata = {
      id: createId('image'),
      restaurantId,
      dishId: cleanString(body.dishId || body.itemId),
      storagePath,
      publicUrl,
      imageUrl: publicUrl,
      mimeType,
      size: buffer.length,
      createdAt,
      updatedAt: createdAt,
    };

    db.imageUploads = Array.isArray(db.imageUploads) ? db.imageUploads : [];
    db.imageUploads.unshift(metadata);
    saveDb(db);
    audit('menu.image.upload', {user, restaurantId, targetId: metadata.id, dishId: metadata.dishId, size: metadata.size});
    created(res, {ok: true, ...metadata});
  } catch (error) {
    fail(res, 400, error.message || 'Không thể upload ảnh món.');
  }

  return true;
};

const routeItems = async (req, res, db, restaurantId, parts, user) => {
  if (parts.length === 4 && req.method === 'GET') {
    ok(res, getRestaurantItems(db, restaurantId));
    return true;
  }

  if (parts.length === 4 && req.method === 'POST') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền thêm món.')) {
      return true;
    }
    const body = await parseBody(req);
    try {
      const item = normalizeItemPayload(body, restaurantId);
      const resolvedCategory = resolveOrCreateRestaurantCategoryId(db, restaurantId, item.categoryId, body.categoryName || body.categoryLabel || body.category);
      if (!resolvedCategory.categoryId) {
        fail(res, 400, 'Danh mục đã chọn không tồn tại hoặc chưa đồng bộ. Vui lòng tải lại trang quản lý món rồi chọn lại danh mục.');
        return true;
      }
      item.categoryId = resolvedCategory.categoryId;
      db.items.push(item);
      saveDb(db);
      audit('item.create', {user, restaurantId, targetId: item.id, categoryId: item.categoryId, categoryRepaired: resolvedCategory.created});
      created(res, getRestaurantItems(db, restaurantId));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu món chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền sửa món.')) {
      return true;
    }
    const item = db.items.find(entry => entry.id === parts[4] && entry.restaurantId === restaurantId);
    if (!item) {
      fail(res, 404, 'Không tìm thấy món.');
      return true;
    }
    const body = await parseBody(req);
    try {
      const next = normalizeItemPayload(body, restaurantId, item);
      const resolvedCategory = resolveOrCreateRestaurantCategoryId(db, restaurantId, next.categoryId, body.categoryName || body.categoryLabel || body.category);
      if (!resolvedCategory.categoryId) {
        fail(res, 400, 'Danh mục đã chọn không tồn tại hoặc chưa đồng bộ. Vui lòng tải lại trang quản lý món rồi chọn lại danh mục.');
        return true;
      }
      next.categoryId = resolvedCategory.categoryId;
      Object.assign(item, next);
      saveDb(db);
      audit('item.update', {user, restaurantId, targetId: item.id, categoryId: item.categoryId, categoryRepaired: resolvedCategory.created});
      ok(res, getRestaurantItems(db, restaurantId));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu món chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && req.method === 'DELETE') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền xoá món.')) {
      return true;
    }
    const itemId = parts[4];
    const before = db.items.length;
    db.items = db.items.filter(item => !(item.id === itemId && item.restaurantId === restaurantId));
    if (before === db.items.length) {
      fail(res, 404, 'Không tìm thấy món.');
      return true;
    }
    saveDb(db);
    audit('item.delete', {user, restaurantId, targetId: itemId});
    ok(res, getRestaurantItems(db, restaurantId));
    return true;
  }

  return false;
};


const routeBills = async (req, res, db, restaurantId, parts, query, user) => {
  if (parts.length === 3 && req.method === 'GET') {
    const requestedBranchId = cleanString(query.get('branchId'));
    if (!requireBranchAccess(res, user, restaurantId, requestedBranchId)) {
      return true;
    }
    const billSessions = getRestaurantBillSessions(db, restaurantId, requestedBranchId);
    saveDb(db);
    ok(res, filterBillSessionsForUser(billSessions, user, restaurantId));
    return true;
  }

  if (parts.length === 4 && req.method === 'GET') {
    const billSession = getRestaurantBillSessionById(db, restaurantId, parts[3]);
    if (!billSession) {
      fail(res, 404, 'Không tìm thấy hóa đơn bàn.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, billSession.branchId)) {
      return true;
    }
    saveDb(db);
    ok(res, billSession);
    return true;
  }

  if (parts.length === 5 && parts[4] === 'payment' && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER', 'STAFF'], 'Tài khoản không có quyền cập nhật thanh toán hóa đơn.')) {
      return true;
    }
    const billSession = db.billSessions.find(
      item => item.id === parts[3] && item.restaurantId === restaurantId,
    );
    if (!billSession) {
      fail(res, 404, 'Không tìm thấy hóa đơn bàn.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, billSession.branchId)) {
      return true;
    }

    const body = await parseBody(req);
    try {
      const updated = updateBillSessionPayment(db, restaurantId, billSession, body, {user});
      saveDb(db);
      ok(res, asPublicBillSession(db, updated));
    } catch (error) {
      const message = error.message || 'Không thể cập nhật thanh toán hóa đơn.';
      fail(res, message.includes('đã') ? 409 : 400, message);
    }
    return true;
  }

  if (parts.length === 5 && parts[4] === 'close' && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER', 'STAFF'], 'Tài khoản không có quyền đóng hóa đơn.')) {
      return true;
    }
    const billSession = db.billSessions.find(
      item => item.id === parts[3] && item.restaurantId === restaurantId,
    );
    if (!billSession) {
      fail(res, 404, 'Không tìm thấy hóa đơn bàn.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, billSession.branchId)) {
      return true;
    }

    const body = await parseBody(req);
    try {
      const updated = closeBillSession(db, restaurantId, billSession, body, {user});
      saveDb(db);
      ok(res, asPublicBillSession(db, updated));
    } catch (error) {
      const message = error.message || 'Không thể đóng hóa đơn.';
      fail(res, message.includes('Chỉ đóng') || message.includes('đã') ? 409 : 400, message);
    }
    return true;
  }

  if (parts.length === 5 && parts[4] === 'table' && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER', 'STAFF'], 'Tài khoản không có quyền đổi bàn cho hóa đơn.')) {
      return true;
    }
    const billSession = db.billSessions.find(
      item => item.id === parts[3] && item.restaurantId === restaurantId,
    );
    if (!billSession) {
      fail(res, 404, 'Không tìm thấy hóa đơn bàn.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, billSession.branchId)) {
      return true;
    }

    const body = await parseBody(req);
    const requestedTableId = cleanString(body.tableId);
    const requestedTableNumber = normalizeKey(body.tableNumber);
    const requestedBranchId = cleanString(body.branchId || billSession.branchId);
    const targetTable = requestedTableId
      ? findTable(db, restaurantId, requestedTableId)
      : db.tables.find(
          table =>
            table.restaurantId === restaurantId &&
            (!requestedBranchId || table.branchId === requestedBranchId) &&
            normalizeKey(table.tableNumber) === requestedTableNumber,
        );

    if (!targetTable) {
      fail(res, 404, 'Không tìm thấy bàn đích trong nhà hàng hiện tại.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, targetTable.branchId)) {
      return true;
    }

    try {
      const updated = transferBillSessionToTable(db, restaurantId, billSession, targetTable, {
        user,
        reason: body.reason,
      });
      saveDb(db);
      ok(res, asPublicBillSession(db, updated));
    } catch (error) {
      const message = error.message || 'Không thể đổi bàn cho hóa đơn.';
      fail(res, message.includes('đang có hóa đơn mở') ? 409 : 400, message);
    }
    return true;
  }

  return false;
};


const routeAuditLogs = async (req, res, db, restaurantId, parts, query, user) => {
  if (parts.length !== 3 || req.method !== 'GET') {
    return false;
  }
  const requestedBranchId = cleanString(query.get('branchId'));
  if (!requireBranchAccess(res, user, restaurantId, requestedBranchId)) {
    return true;
  }
  const action = cleanString(query.get('action'));
  const limit = Math.min(200, Math.max(1, Number(query.get('limit') || 50)));
  const logs = (Array.isArray(db.auditLogs) ? db.auditLogs : [])
    .filter(log => log.restaurantId === restaurantId)
    .filter(log => !requestedBranchId || log.branchId === requestedBranchId)
    .filter(log => !action || log.action === action)
    .filter(log => canAccessBranch(user, restaurantId, log.branchId))
    .slice(0, limit);
  ok(res, logs);
  return true;
};

const routeOrders = async (req, res, db, restaurantId, parts, query, user) => {
  if (parts.length === 3 && req.method === 'GET') {
    const requestedBranchId = cleanString(query.get('branchId'));
    if (!requireBranchAccess(res, user, restaurantId, requestedBranchId)) {
      return true;
    }
    const orders = getRestaurantOrders(db, restaurantId, requestedBranchId);
    ok(res, filterOrdersForUser(orders, user, restaurantId));
    return true;
  }

  if (parts.length === 3 && req.method === 'POST') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER', 'STAFF'], 'Tài khoản không có quyền tạo đơn.')) {
      return true;
    }
    const body = await parseBody(req);
    try {
      const table = body.tableId ? findTable(db, restaurantId, cleanString(body.tableId)) : null;
      const targetBranchId = cleanString(body.branchId || table?.branchId);
      if (!requireBranchAccess(res, user, restaurantId, targetBranchId)) {
        return true;
      }
      const order = normalizeOrderPayload(db, restaurantId, body);
      db.orders.unshift(order);
      if (order.tableId) {
        delete db.carts[cartKey(order)];
      }
      saveDb(db);
      audit('order.create.admin', {user, restaurantId, branchId: order.branchId, targetId: order.id});
      ok(res, filterOrdersForUser(getRestaurantOrders(db, restaurantId, order.branchId), user, restaurantId));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu đơn hàng chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && parts[4] === 'status' && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER', 'STAFF'], 'Tài khoản không có quyền đổi trạng thái đơn.')) {
      return true;
    }
    const order = db.orders.find(item => item.id === parts[3] && item.restaurantId === restaurantId);
    if (!order) {
      fail(res, 404, 'Không tìm thấy đơn hàng.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, order.branchId)) {
      return true;
    }
    const body = await parseBody(req);
    const nextStatus = body.orderStatus || body.status;
    if (!ORDER_STATUSES.includes(nextStatus)) {
      fail(res, 400, 'Trạng thái đơn hàng không hợp lệ.');
      return true;
    }
    if (!canChangeOrderStatus(order.orderStatus, nextStatus)) {
      fail(res, 409, 'Không thể chuyển trạng thái đơn không đúng luồng hoặc đơn đã hoàn tất/hủy.');
      return true;
    }
    order.orderStatus = nextStatus;
    order.updatedAt = nowIso();
    if (order.billSessionId) {
      const billSession = db.billSessions.find(
        item => item.id === order.billSessionId && item.restaurantId === restaurantId,
      );
      if (billSession) {
        recalculateBillSessionTotals(db, billSession);
      }
    }
    saveDb(db);
    audit('order.status.update', {user, restaurantId, branchId: order.branchId, targetId: order.id});
    ok(res, filterOrdersForUser(getRestaurantOrders(db, restaurantId, order.branchId), user, restaurantId));
    return true;
  }

  if (parts.length === 5 && parts[4] === 'payment' && req.method === 'PATCH') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER', 'STAFF'], 'Tài khoản không có quyền cập nhật thanh toán.')) {
      return true;
    }
    const order = db.orders.find(item => item.id === parts[3] && item.restaurantId === restaurantId);
    if (!order) {
      fail(res, 404, 'Không tìm thấy đơn hàng.');
      return true;
    }
    if (!requireBranchAccess(res, user, restaurantId, order.branchId)) {
      return true;
    }
    const body = await parseBody(req);
    const paymentStatus = body.paymentStatus;
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      fail(res, 400, 'Trạng thái thanh toán không hợp lệ.');
      return true;
    }
    if (order.orderStatus === 'CANCELLED' && paymentStatus === 'PAID') {
      fail(res, 409, 'Đơn đã huỷ không thể đánh dấu đã thanh toán.');
      return true;
    }
    order.paymentStatus = paymentStatus;
    order.paymentMethod = normalizePaymentMethod(body.paymentMethod || order.paymentMethod);
    order.updatedAt = nowIso();
    saveDb(db);
    audit('order.payment.update', {user, restaurantId, branchId: order.branchId, targetId: order.id});
    ok(res, filterOrdersForUser(getRestaurantOrders(db, restaurantId, order.branchId), user, restaurantId));
    return true;
  }

  return false;
};

const routeCart = async (req, res, db, restaurantId, parts, user) => {
  const isMenuCart = parts[2] === 'menu' && parts[3] === 'cart' && parts[4] === 'current';
  const isTableCart = parts[2] === 'tables' && parts[4] === 'cart' && parts[5] === 'current';
  if (!isMenuCart && !isTableCart) {
    return false;
  }

  const tableId = isTableCart ? cleanString(parts[3]) : '';
  const table = tableId ? findTable(db, restaurantId, tableId) : null;
  if (tableId && !table) {
    fail(res, 404, 'Không tìm thấy bàn.');
    return true;
  }
  if (table && !requireBranchAccess(res, user, restaurantId, table.branchId)) {
    return true;
  }
  const scope = {
    restaurantId,
    branchId: table?.branchId,
    tableId: table?.id,
    tableNumber: table?.tableNumber,
  };
  const key = cartKey(scope);

  if (req.method === 'GET') {
    ok(res, db.carts[key] || emptyCart(scope));
    return true;
  }

  if (req.method === 'PATCH') {
    const body = await parseBody(req);
    const cart = {
      restaurantId,
      branchId: cleanString(body.branchId) || scope.branchId,
      tableId: cleanString(body.tableId) || scope.tableId,
      tableNumber: cleanString(body.tableNumber) || scope.tableNumber || '',
      note: cleanString(body.note),
      items: Array.isArray(body.items)
        ? body.items
            .map(item => ({itemId: cleanString(item.itemId), quantity: Math.max(1, Number(item.quantity || 1))}))
            .filter(item => item.itemId)
        : [],
    };
    db.carts[key] = cart;
    saveDb(db);
    ok(res, cart);
    return true;
  }

  if (req.method === 'DELETE') {
    delete db.carts[key];
    saveDb(db);
    noContent(res);
    return true;
  }

  return false;
};

const routeQrToken = (req, res, db, parts) => {
  if (req.method !== 'GET' || parts.length !== 3) {
    return false;
  }
  const scope = getPublicMenuScope(db, parts[2]);
  if (!scope) {
    ok(res, null);
    return true;
  }
  ok(res, scope.context);
  return true;
};

const routePublicMenu = async (req, res, db, parts, query) => {
  if (parts.length < 3) {
    return false;
  }

  const token = parts[2];
  const scope = getPublicMenuScope(db, token);
  if (!scope) {
    fail(res, 404, 'QR menu không tồn tại hoặc đang bị khóa.');
    return true;
  }

  if (parts.length === 3 && req.method === 'GET') {
    ok(res, {
      context: scope.context,
      categories: getRestaurantCategories(db, scope.context.restaurantId),
      items: getRestaurantItems(db, scope.context.restaurantId).filter(item => item.status !== 'HIDDEN'),
    });
    return true;
  }

  if (parts.length === 4 && parts[3] === 'tables' && req.method === 'GET') {
    const restaurantTables = db.tables.filter(
      table =>
        table.restaurantId === scope.context.restaurantId &&
        table.status !== 'HIDDEN',
    );
    const branchTables = scope.context.branchId
      ? restaurantTables.filter(table => table.branchId === scope.context.branchId)
      : restaurantTables;
    const legacyBranchlessTables = scope.context.branchId
      ? restaurantTables.filter(table => !table.branchId)
      : [];
    const tables = [
      ...branchTables,
      ...legacyBranchlessTables.filter(
        table => !branchTables.some(item => item.id === table.id),
      ),
    ].map(table => ({
      ...table,
      // Compatibility: expose old branchless rows as choices for the branch
      // behind this menu QR, so the customer app does not filter them out.
      branchId: table.branchId || scope.context.branchId,
      qrCodeToken: undefined,
    }));
    ok(res, tables);
    return true;
  }

  if (parts.length === 4 && parts[3] === 'orders' && req.method === 'POST') {
    const body = await parseBody(req);
    const publicOrderGuard = createPublicOrderGuard(scope, body);
    try {
      assertPublicOrderAllowed(db, publicOrderGuard);
      const {billSession, created: createdBillSession} = resolvePublicOrderBillSession(db, scope, body);
      const order = normalizeOrderPayload(db, scope.context.restaurantId, {
        ...body,
        restaurantId: scope.context.restaurantId,
        branchId: billSession.branchId || scope.context.branchId,
        tableId: billSession.tableId,
        tableNumber: billSession.tableNumber,
        billSessionId: billSession.id,
        guestSessionId: cleanString(body.guestSessionId) || billSession.guestSessionId,
        orderSource: 'customer',
      });
      db.orders.unshift(order);
      recalculateBillSessionTotals(db, billSession);
      delete db.carts[cartKey(scope.context)];
      delete db.carts[cartKey(order)];
      appendAuditLog(db, createdBillSession ? 'billOpened' : 'orderAdded', {
        restaurantId: scope.context.restaurantId,
        branchId: order.branchId,
        targetId: billSession.id,
        details: {
          orderId: order.id,
          tableId: billSession.tableId,
          tableNumber: billSession.tableNumber,
          guestSessionId: order.guestSessionId,
          qrHash: hashForLog(publicOrderGuard.qrToken),
          billTotal: billSession.total,
          itemCount: order.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0),
        },
      });
      appendAuditLog(db, 'order.create.public', {
        restaurantId: scope.context.restaurantId,
        branchId: order.branchId,
        targetId: order.id,
        details: {
          billSessionId: billSession.id,
          tableId: billSession.tableId,
          tableNumber: billSession.tableNumber,
          guestSessionId: order.guestSessionId,
        },
      });
      saveDb(db);
      created(res, createPublicOrderResponse(db, billSession, order));
    } catch (error) {
      const statusCode = Number(error.statusCode || 400);
      if (statusCode !== 429) {
        recordPublicOrderValidationError(db, publicOrderGuard, error.message || 'public order validation failed');
      }
      saveDb(db);
      fail(res, statusCode, error.message || 'Dữ liệu đơn hàng chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && parts[3] === 'bills' && req.method === 'GET') {
    try {
      const requestedId = parts[4] === 'current' ? cleanString(query?.get('billSessionId')) : parts[4];
      const billSession = findCurrentPublicBillSession(db, scope, {
        billSessionId: requestedId,
        guestSessionId: query?.get('guestSessionId'),
      });
      if (!billSession) {
        fail(res, 404, 'Không tìm thấy hóa đơn đang mở cho phiên khách này.');
        return true;
      }
      const bill = asPublicBillSession(db, billSession);
      saveDb(db);
      ok(res, bill);
    } catch (error) {
      fail(res, 400, error.message || 'Không thể tải hóa đơn hiện tại.');
    }
    return true;
  }

  if (parts.length === 5 && parts[3] === 'cart' && parts[4] === 'current') {
    const key = cartKey(scope.context);

    if (req.method === 'GET') {
      ok(res, db.carts[key] || emptyCart(scope.context));
      return true;
    }

    if (req.method === 'PATCH') {
      const body = await parseBody(req);
      const cart = {
        restaurantId: scope.context.restaurantId,
        branchId: scope.context.branchId,
        tableId: scope.context.tableId,
        tableNumber: scope.context.tableNumber || cleanString(body.tableNumber),
        note: cleanString(body.note),
        items: Array.isArray(body.items)
          ? body.items
              .map(item => ({itemId: cleanString(item.itemId), quantity: Math.max(1, Number(item.quantity || 1))}))
              .filter(item => item.itemId)
          : [],
      };
      db.carts[key] = cart;
      saveDb(db);
      ok(res, cart);
      return true;
    }

    if (req.method === 'DELETE') {
      delete db.carts[key];
      saveDb(db);
      noContent(res);
      return true;
    }
  }

  return false;
};

const routeRestaurantScoped = async (req, res, db, parts, query) => {
  if (parts[0] !== 'restaurants' || parts.length < 2) {
    return false;
  }

  const restaurantId = parts[1];
  const access = requireRestaurantAccess(db, req, res, restaurantId);
  if (!access) {
    return true;
  }

  if (parts[2] === 'branches') {
    return routeBranches(req, res, db, restaurantId, parts, access.user);
  }
  if (parts[2] === 'tables' && parts[4] !== 'cart') {
    return routeTables(req, res, db, restaurantId, parts, access.user);
  }
  if (parts[2] === 'menu' && parts[3] === 'categories') {
    return routeCategories(req, res, db, restaurantId, parts, access.user);
  }
  if (parts[2] === 'menu' && parts[3] === 'images') {
    return routeMenuImages(req, res, db, restaurantId, parts, access.user);
  }
  if (parts[2] === 'menu' && parts[3] === 'items') {
    return routeItems(req, res, db, restaurantId, parts, access.user);
  }
  if (parts[2] === 'bills') {
    return routeBills(req, res, db, restaurantId, parts, query, access.user);
  }
  if (parts[2] === 'orders') {
    return routeOrders(req, res, db, restaurantId, parts, query, access.user);
  }
  if (parts[2] === 'audit-logs') {
    return routeAuditLogs(req, res, db, restaurantId, parts, query, access.user);
  }
  if (await routeCart(req, res, db, restaurantId, parts, access.user)) {
    return true;
  }

  return false;
};

const handleRequest = async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204);
    return;
  }

  const requestPath = getPathParts(req.url);
  let {parts, pathname} = requestPath;
  const {query} = requestPath;

  // Render/proxy/app configs sometimes append an `/api` prefix to the base URL.
  // The ScoreMenu backend routes are rooted at `/`, so accept both forms:
  //   /auth/admin/register and /api/auth/admin/register
  //   /public/menu/:qrToken and /api/public/menu/:qrToken
  // This keeps old mobile builds working even if the saved API URL includes /api.
  if (parts[0] === 'api') {
    parts = parts.slice(1);
    pathname = `/${parts.join('/')}` || '/';
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && sendStaticUploadFile(req, res, pathname)) {
    return;
  }
  const db = loadDb();
  const batch25Migration = ensureBatch25DatabaseShape(db);
  if (batch25Migration.changed) {
    saveDb(db);
  }

  try {
    if (pathname === '/health' && req.method === 'GET') {
      ok(res, {
        ok: true,
        service: 'scoremenu-server',
        schemaVersion: db.meta?.schemaVersion || SCOREMENU_SCHEMA_VERSION,
        restaurants: db.restaurants.length,
        branches: db.branches.length,
        tables: db.tables.length,
        categories: db.categories.length,
        items: db.items.length,
        orders: db.orders.length,
        billSessions: db.billSessions.length,
        auditLogs: db.auditLogs.length,
        publicOrderRateLimits: db.publicOrderRateLimits.length,
        lastMigration: db.meta?.lastMigration,
        billSessionStatuses: BILL_SESSION_MODEL.statuses,
      });
      return;
    }

    if (pathname === '/schema' && req.method === 'GET') {
      ok(res, safeJsonParse(fs.readFileSync(SCHEMA_FILE, 'utf8'), {}));
      return;
    }

    if (pathname === '/dev/reset' && req.method === 'POST') {
      const seed = createSeedDatabase();
      saveDb(seed);
      ok(res, {ok: true, message: 'Đã reset database demo.', ...seed.meta});
      return;
    }

    if (parts[0] === 'auth' && parts[1] === 'admin' && (await routeAuth(req, res, db, parts))) {
      return;
    }

    if (parts[0] === 'restaurants' && (await routeRestaurants(req, res, db, parts))) {
      return;
    }

    if (parts[0] === 'menu' && ['qr-tokens', 'table-tokens'].includes(parts[1]) && routeQrToken(req, res, db, parts)) {
      return;
    }

    if (parts[0] === 'public' && parts[1] === 'menu' && (await routePublicMenu(req, res, db, parts, query))) {
      return;
    }

    if (await routeRestaurantScoped(req, res, db, parts, query)) {
      return;
    }

    fail(res, 404, 'Endpoint ScoreMenu không tồn tại.', {method: req.method, path: pathname});
  } catch (error) {
    console.error('[scoremenu-server] unhandled error', error);
    fail(res, 500, 'Server menu đang lỗi. Vui lòng kiểm tra log backend.', error?.message || error);
  }
};

ensureDataFile();
fs.mkdirSync(UPLOAD_DIR, {recursive: true});

const server = http.createServer(handleRequest);
server.listen(PORT, HOST, () => {
  console.log(`[scoremenu-server] running at http://${HOST}:${PORT}`);
  console.log(`[scoremenu-server] data file: ${DATA_FILE}`);
  console.log(`[scoremenu-server] auth guard: ${ENABLE_AUTH_GUARD ? 'ON' : 'OFF by SCOREMENU_AUTH_GUARD=0'}`);
});
