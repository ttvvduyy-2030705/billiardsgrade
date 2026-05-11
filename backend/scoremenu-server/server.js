'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {createSeedDatabase, clone} = require('./data/seed');

const PORT = Number(process.env.SCOREMENU_PORT || process.env.PORT || 4012);
const HOST = process.env.SCOREMENU_HOST || '0.0.0.0';
const DATA_FILE = process.env.SCOREMENU_DB_FILE || path.join(__dirname, 'data', 'db.json');
const SCHEMA_FILE = path.join(__dirname, 'data', 'schema.json');
const ENABLE_AUTH_GUARD = process.env.SCOREMENU_AUTH_GUARD === '1';

const ORDER_STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'COMPLETED', 'CANCELLED'];
const PAYMENT_STATUSES = ['UNPAID', 'PAID'];
const ITEM_STATUSES = ['SELLING', 'HIDDEN', 'OUT_OF_STOCK'];
const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'LOCKED', 'HIDDEN'];

const nowIso = () => new Date().toISOString();
const createId = prefix => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

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
  return {
    ...createSeedDatabase(),
    ...db,
    restaurants: Array.isArray(db.restaurants) ? db.restaurants : [],
    branches: Array.isArray(db.branches) ? db.branches : [],
    tables: Array.isArray(db.tables) ? db.tables : [],
    categories: Array.isArray(db.categories) ? db.categories : [],
    items: Array.isArray(db.items) ? db.items : [],
    orders: Array.isArray(db.orders) ? db.orders : [],
    carts: db.carts && typeof db.carts === 'object' ? db.carts : {},
    adminUsers: Array.isArray(db.adminUsers) ? db.adminUsers : [],
  };
};

const saveDb = db => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
};

const parseBody = req =>
  new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024 * 5) {
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

const createToken = user => {
  const payload = JSON.stringify({
    userId: user.id,
    username: user.username,
    role: user.role,
    ts: Date.now(),
    nonce: crypto.randomBytes(6).toString('hex'),
  });
  return Buffer.from(payload).toString('base64url');
};

const readTokenPayload = token => {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
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
  if (!user) {
    return !ENABLE_AUTH_GUARD;
  }
  if (user.role === 'OWNER') {
    return Array.isArray(user.restaurantIds) && user.restaurantIds.includes(restaurantId);
  }
  return Array.isArray(user.restaurantIds) && user.restaurantIds.includes(restaurantId);
};

const requireRestaurantAccess = (db, req, res, restaurantId) => {
  const restaurant = db.restaurants.find(item => item.id === restaurantId);
  if (!restaurant) {
    fail(res, 404, 'Không tìm thấy nhà hàng.');
    return null;
  }

  const user = getUserFromRequest(db, req);
  if (ENABLE_AUTH_GUARD && !user) {
    fail(res, 401, 'Phiên đăng nhập chưa hợp lệ.');
    return null;
  }
  if (!canAccessRestaurant(user, restaurantId)) {
    fail(res, 403, 'Tài khoản không có quyền truy cập nhà hàng này.');
    return null;
  }

  return {restaurant, user};
};

const sortByOrderAndName = (a, b) => {
  const orderDelta = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  if (orderDelta !== 0) {
    return orderDelta;
  }
  return cleanString(a.name).localeCompare(cleanString(b.name), 'vi');
};

const getRestaurantCategories = (db, restaurantId) =>
  db.categories.filter(item => item.restaurantId === restaurantId).sort(sortByOrderAndName);

const getRestaurantItems = (db, restaurantId) =>
  db.items.filter(item => item.restaurantId === restaurantId).sort(sortByOrderAndName);

const getRestaurantOrders = (db, restaurantId, branchId) =>
  db.orders
    .filter(order => order.restaurantId === restaurantId && (!branchId || order.branchId === branchId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

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
    const quantity = Math.max(1, Number(rawItem.quantity || 1));
    const price = Number(rawItem.price ?? menuItem?.price ?? 0);
    const name = cleanString(rawItem.name || menuItem?.name);

    if (!itemId || !name) {
      throw new Error('Món trong đơn hàng chưa hợp lệ.');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Số lượng món trong đơn hàng chưa hợp lệ.');
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Giá món trong đơn hàng chưa hợp lệ.');
    }

    return {
      itemId,
      name,
      price,
      quantity,
      note: cleanString(rawItem.note),
    };
  });
};

const normalizeOrderPayload = (db, restaurantId, payload, existing) => {
  const branchId = cleanString(payload.branchId ?? existing?.branchId);
  const tableId = cleanString(payload.tableId ?? existing?.tableId);
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

  const items = normalizeOrderItems(db, restaurantId, payload.items ?? existing?.items);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const timestamp = nowIso();
  const orderStatus = ORDER_STATUSES.includes(payload.orderStatus)
    ? payload.orderStatus
    : existing?.orderStatus || 'NEW';
  const paymentStatus = PAYMENT_STATUSES.includes(payload.paymentStatus)
    ? payload.paymentStatus
    : existing?.paymentStatus || 'UNPAID';

  return {
    id: cleanString(payload.id) || existing?.id || createId('order'),
    restaurantId,
    branchId: branchId || table?.branchId || undefined,
    tableId: tableId || undefined,
    orderSource: payload.orderSource || existing?.orderSource || 'customer',
    tableNumber: cleanString(payload.tableNumber || table?.tableNumber || existing?.tableNumber),
    items,
    note: cleanString(payload.note ?? existing?.note),
    total,
    orderStatus,
    paymentStatus,
    paymentMethod: payload.paymentMethod || existing?.paymentMethod || 'MOCK',
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
  const rank = {NEW: 1, ACCEPTED: 2, PREPARING: 3, COMPLETED: 4};
  return Number(rank[to] || 0) >= Number(rank[from] || 0);
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
    if (!user || user.password !== password) {
      fail(res, 401, 'Tài khoản hoặc mật khẩu chưa đúng.');
      return true;
    }

    ok(res, {
      ok: true,
      message: 'Đăng nhập Admin thành công',
      token: createToken(user),
      userId: user.id,
      role: user.role,
      restaurantId: user.activeRestaurantId || user.restaurantIds?.[0],
      restaurantIds: user.restaurantIds || [],
    });
    return true;
  }

  if (parts[2] === 'register' && req.method === 'POST') {
    if (password.length < 6) {
      fail(res, 400, 'Mật khẩu Admin nên có tối thiểu 6 ký tự.');
      return true;
    }
    if (db.adminUsers.some(item => normalizeKey(item.username) === normalizeKey(username))) {
      fail(res, 409, 'Tài khoản Admin này đã tồn tại.');
      return true;
    }

    const timestamp = nowIso();
    const defaultRestaurantId = db.restaurants[0]?.id || 'restaurant_default';
    const user = {
      id: createId('admin'),
      username,
      password,
      role: 'OWNER',
      restaurantIds: [defaultRestaurantId],
      activeRestaurantId: defaultRestaurantId,
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
      restaurantIds: user.restaurantIds,
    });
    return true;
  }

  return false;
};

const routeRestaurants = async (req, res, db, parts) => {
  if (parts.length === 1 && req.method === 'GET') {
    ok(res, db.restaurants.map(asPublicRestaurant));
    return true;
  }

  if (parts.length === 1 && req.method === 'POST') {
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
      ownerId: cleanString(body.ownerId),
      status: 'ACTIVE',
      logoUrl: cleanString(body.logoUrl),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.restaurants.push(restaurant);
    const branch = {
      id: createId('branch'),
      restaurantId: restaurant.id,
      name: 'Chi nhánh chính',
      address: '',
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.branches.push(branch);
    saveDb(db);
    created(res, asPublicRestaurant(restaurant));
    return true;
  }

  return false;
};

const routeBranches = async (req, res, db, restaurantId, parts) => {
  if (parts.length === 3 && req.method === 'GET') {
    ok(res, db.branches.filter(branch => branch.restaurantId === restaurantId));
    return true;
  }

  if (parts.length === 3 && req.method === 'POST') {
    const body = await parseBody(req);
    const name = cleanString(body.name);
    if (!name) {
      fail(res, 400, 'Vui lòng nhập tên chi nhánh.');
      return true;
    }
    const timestamp = nowIso();
    const branch = {
      id: cleanString(body.id) || createId('branch'),
      restaurantId,
      name,
      address: cleanString(body.address),
      status: body.status || 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.branches.push(branch);
    saveDb(db);
    created(res, branch);
    return true;
  }

  if (parts.length === 4 && req.method === 'PATCH') {
    const branch = findBranch(db, restaurantId, parts[3]);
    if (!branch) {
      fail(res, 404, 'Không tìm thấy chi nhánh.');
      return true;
    }
    const body = await parseBody(req);
    const name = cleanString(body.name ?? branch.name);
    if (!name) {
      fail(res, 400, 'Vui lòng nhập tên chi nhánh.');
      return true;
    }
    Object.assign(branch, {
      name,
      address: cleanString(body.address ?? branch.address),
      status: body.status || branch.status || 'ACTIVE',
      updatedAt: nowIso(),
    });
    saveDb(db);
    ok(res, branch);
    return true;
  }

  if (parts.length === 4 && req.method === 'DELETE') {
    const branchId = parts[3];
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
    ok(res, db.branches.filter(branch => branch.restaurantId === restaurantId));
    return true;
  }

  return false;
};

const routeTables = async (req, res, db, restaurantId, parts) => {
  if (parts.length === 3 && req.method === 'GET') {
    ok(res, db.tables.filter(table => table.restaurantId === restaurantId));
    return true;
  }

  if (parts.length === 3 && req.method === 'POST') {
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
    db.tables.push(table);
    saveDb(db);
    created(res, table);
    return true;
  }

  return false;
};

const routeCategories = async (req, res, db, restaurantId, parts) => {
  if (parts.length === 4 && req.method === 'GET') {
    ok(res, getRestaurantCategories(db, restaurantId));
    return true;
  }

  if (parts.length === 4 && req.method === 'POST') {
    const body = await parseBody(req);
    try {
      const category = normalizeCategoryPayload(body, restaurantId);
      if (db.categories.some(item => item.restaurantId === restaurantId && normalizeKey(item.name) === normalizeKey(category.name))) {
        fail(res, 409, 'Tên danh mục đã tồn tại.');
        return true;
      }
      db.categories.push(category);
      saveDb(db);
      created(res, buildCategoryResult(db, restaurantId, 'Đã thêm danh mục.'));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu danh mục chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && req.method === 'PATCH') {
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
      ok(res, buildCategoryResult(db, restaurantId, 'Đã cập nhật danh mục.'));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu danh mục chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && req.method === 'DELETE') {
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
    ok(res, buildCategoryResult(db, restaurantId, 'Đã xóa danh mục.'));
    return true;
  }

  return false;
};

const routeItems = async (req, res, db, restaurantId, parts) => {
  if (parts.length === 4 && req.method === 'GET') {
    ok(res, getRestaurantItems(db, restaurantId));
    return true;
  }

  if (parts.length === 4 && req.method === 'POST') {
    const body = await parseBody(req);
    try {
      const item = normalizeItemPayload(body, restaurantId);
      if (!ensureCategory(db, restaurantId, item.categoryId)) {
        fail(res, 400, 'Danh mục món không thuộc nhà hàng hiện tại.');
        return true;
      }
      db.items.push(item);
      saveDb(db);
      created(res, getRestaurantItems(db, restaurantId));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu món chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && req.method === 'PATCH') {
    const item = db.items.find(entry => entry.id === parts[4] && entry.restaurantId === restaurantId);
    if (!item) {
      fail(res, 404, 'Không tìm thấy món.');
      return true;
    }
    const body = await parseBody(req);
    try {
      const next = normalizeItemPayload(body, restaurantId, item);
      if (!ensureCategory(db, restaurantId, next.categoryId)) {
        fail(res, 400, 'Danh mục món không thuộc nhà hàng hiện tại.');
        return true;
      }
      Object.assign(item, next);
      saveDb(db);
      ok(res, getRestaurantItems(db, restaurantId));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu món chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && req.method === 'DELETE') {
    const itemId = parts[4];
    const before = db.items.length;
    db.items = db.items.filter(item => !(item.id === itemId && item.restaurantId === restaurantId));
    if (before === db.items.length) {
      fail(res, 404, 'Không tìm thấy món.');
      return true;
    }
    saveDb(db);
    ok(res, getRestaurantItems(db, restaurantId));
    return true;
  }

  return false;
};

const routeOrders = async (req, res, db, restaurantId, parts, query) => {
  if (parts.length === 3 && req.method === 'GET') {
    ok(res, getRestaurantOrders(db, restaurantId, cleanString(query.get('branchId'))));
    return true;
  }

  if (parts.length === 3 && req.method === 'POST') {
    const body = await parseBody(req);
    try {
      const order = normalizeOrderPayload(db, restaurantId, body);
      db.orders.unshift(order);
      if (order.tableId) {
        delete db.carts[cartKey(order)];
      }
      saveDb(db);
      created(res, getRestaurantOrders(db, restaurantId, order.branchId));
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu đơn hàng chưa hợp lệ.');
    }
    return true;
  }

  if (parts.length === 5 && parts[4] === 'status' && req.method === 'PATCH') {
    const order = db.orders.find(item => item.id === parts[3] && item.restaurantId === restaurantId);
    if (!order) {
      fail(res, 404, 'Không tìm thấy đơn hàng.');
      return true;
    }
    const body = await parseBody(req);
    const nextStatus = body.orderStatus || body.status;
    if (!ORDER_STATUSES.includes(nextStatus)) {
      fail(res, 400, 'Trạng thái đơn hàng không hợp lệ.');
      return true;
    }
    if (!canChangeOrderStatus(order.orderStatus, nextStatus)) {
      fail(res, 409, 'Không thể chuyển ngược trạng thái đơn đã hoàn tất hoặc đã hủy.');
      return true;
    }
    order.orderStatus = nextStatus;
    order.updatedAt = nowIso();
    saveDb(db);
    ok(res, getRestaurantOrders(db, restaurantId, order.branchId));
    return true;
  }

  if (parts.length === 5 && parts[4] === 'payment' && req.method === 'PATCH') {
    const order = db.orders.find(item => item.id === parts[3] && item.restaurantId === restaurantId);
    if (!order) {
      fail(res, 404, 'Không tìm thấy đơn hàng.');
      return true;
    }
    const body = await parseBody(req);
    const paymentStatus = body.paymentStatus;
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      fail(res, 400, 'Trạng thái thanh toán không hợp lệ.');
      return true;
    }
    order.paymentStatus = paymentStatus;
    order.paymentMethod = body.paymentMethod || order.paymentMethod || 'MOCK';
    order.updatedAt = nowIso();
    saveDb(db);
    ok(res, getRestaurantOrders(db, restaurantId, order.branchId));
    return true;
  }

  return false;
};

const routeCart = async (req, res, db, restaurantId, parts) => {
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

const routeTableToken = (req, res, db, parts) => {
  if (req.method !== 'GET' || parts.length !== 3) {
    return false;
  }
  const token = parts[2];
  const table = db.tables.find(item => item.qrCodeToken === token);
  if (!table || table.status === 'LOCKED' || table.status === 'HIDDEN') {
    ok(res, null);
    return true;
  }
  const restaurant = db.restaurants.find(item => item.id === table.restaurantId);
  const branch = db.branches.find(item => item.id === table.branchId && item.restaurantId === table.restaurantId);
  ok(res, {
    restaurantId: table.restaurantId,
    restaurantName: restaurant?.name,
    branchId: table.branchId,
    branchName: branch?.name,
    tableId: table.id,
    tableNumber: table.tableNumber,
    qrCodeToken: table.qrCodeToken,
    source: 'customer',
  });
  return true;
};

const routePublicMenu = (req, res, db, parts) => {
  if (req.method !== 'GET' || parts.length !== 3) {
    return false;
  }
  const token = parts[2];
  const table = db.tables.find(item => item.qrCodeToken === token);
  if (!table || table.status === 'LOCKED' || table.status === 'HIDDEN') {
    fail(res, 404, 'QR bàn không tồn tại hoặc đang bị khóa.');
    return true;
  }
  const restaurant = db.restaurants.find(item => item.id === table.restaurantId);
  const branch = db.branches.find(item => item.id === table.branchId && item.restaurantId === table.restaurantId);
  ok(res, {
    context: {
      restaurantId: table.restaurantId,
      restaurantName: restaurant?.name,
      branchId: table.branchId,
      branchName: branch?.name,
      tableId: table.id,
      tableNumber: table.tableNumber,
      qrCodeToken: table.qrCodeToken,
      source: 'customer',
    },
    categories: getRestaurantCategories(db, table.restaurantId),
    items: getRestaurantItems(db, table.restaurantId).filter(item => item.status !== 'HIDDEN'),
  });
  return true;
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
    return routeBranches(req, res, db, restaurantId, parts);
  }
  if (parts[2] === 'tables' && parts[4] !== 'cart') {
    return routeTables(req, res, db, restaurantId, parts);
  }
  if (parts[2] === 'menu' && parts[3] === 'categories') {
    return routeCategories(req, res, db, restaurantId, parts);
  }
  if (parts[2] === 'menu' && parts[3] === 'items') {
    return routeItems(req, res, db, restaurantId, parts);
  }
  if (parts[2] === 'orders') {
    return routeOrders(req, res, db, restaurantId, parts, query);
  }
  if (await routeCart(req, res, db, restaurantId, parts)) {
    return true;
  }

  return false;
};

const handleRequest = async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204);
    return;
  }

  const {parts, query, pathname} = getPathParts(req.url);
  const db = loadDb();

  try {
    if (pathname === '/health' && req.method === 'GET') {
      ok(res, {
        ok: true,
        service: 'scoremenu-server',
        schemaVersion: db.meta?.schemaVersion || 'unknown',
        restaurants: db.restaurants.length,
        branches: db.branches.length,
        tables: db.tables.length,
        categories: db.categories.length,
        items: db.items.length,
        orders: db.orders.length,
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

    if (parts[0] === 'menu' && parts[1] === 'table-tokens' && routeTableToken(req, res, db, parts)) {
      return;
    }

    if (parts[0] === 'public' && parts[1] === 'menu' && routePublicMenu(req, res, db, parts)) {
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

const server = http.createServer(handleRequest);
server.listen(PORT, HOST, () => {
  console.log(`[scoremenu-server] running at http://${HOST}:${PORT}`);
  console.log(`[scoremenu-server] data file: ${DATA_FILE}`);
  console.log(`[scoremenu-server] auth guard: ${ENABLE_AUTH_GUARD ? 'ON' : 'OFF for MVP batch 12'}`);
});
