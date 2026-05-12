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
const TOKEN_SECRET = process.env.SCOREMENU_TOKEN_SECRET || 'scoremenu_dev_secret_change_me';
const TOKEN_TTL_MS = Number(process.env.SCOREMENU_TOKEN_TTL_MS || 1000 * 60 * 60 * 24);
const UPLOAD_DIR = process.env.SCOREMENU_UPLOAD_DIR || path.join(__dirname, 'data', 'uploads');
const PUBLIC_UPLOAD_PREFIX = '/uploads/menu-images';
const MAX_BODY_BYTES = Number(process.env.SCOREMENU_MAX_BODY_BYTES || 1024 * 1024 * 12);
const MAX_IMAGE_BYTES = Number(process.env.SCOREMENU_MAX_IMAGE_BYTES || 1024 * 1024 * 6);


const ORDER_STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'COMPLETED', 'CANCELLED'];
const PAYMENT_STATUSES = ['UNPAID', 'PAID'];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOCK'];
const ITEM_STATUSES = ['SELLING', 'HIDDEN', 'OUT_OF_STOCK'];
const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'LOCKED', 'HIDDEN'];
const BRANCH_STATUSES = ['ACTIVE', 'LOCKED', 'HIDDEN'];

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
    imageUploads: Array.isArray(db.imageUploads) ? db.imageUploads : [],
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
    restaurantIds: user.restaurantIds || [],
    branchIds: user.branchIds || [],
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

const getUserBranchIds = (user, restaurantId) => {
  if (!user || !restaurantId) {
    return [];
  }
  const scoped = user.branchIdsByRestaurant?.[restaurantId];
  const ids = Array.isArray(scoped) && scoped.length > 0 ? scoped : user.branchIds;
  return Array.isArray(ids) ? ids.map(cleanString).filter(Boolean) : [];
};

const isBranchRestricted = (user, restaurantId) => {
  if (!ENABLE_AUTH_GUARD || !user || user.role === 'OWNER') {
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
  if (!ENABLE_AUTH_GUARD || !user) {
    return true;
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

const audit = (action, {user, restaurantId, branchId, targetId} = {}) => {
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
    }),
  );
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

const normalizeTableNumberKey = value => cleanString(value).toLowerCase();

const findTableByBranchAndNumber = (db, restaurantId, branchId, tableNumber) => {
  const tableNumberKey = normalizeTableNumberKey(tableNumber);
  if (!tableNumberKey) {
    return null;
  }

  return db.tables.find(table => {
    const sameRestaurant = table.restaurantId === restaurantId;
    const sameBranch = branchId ? table.branchId === branchId : true;
    return sameRestaurant && sameBranch && normalizeTableNumberKey(table.tableNumber) === tableNumberKey;
  }) || null;
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
  const defaults = {
    aplus_hanoi_main: 'qr_aplus_main_menu',
    aplus_hanoi_vip: 'qr_aplus_vip_menu',
    haidilao_demo_main: 'qr_haidilao_main_menu',
    haidilao_demo_2: 'qr_haidilao_2_menu',
  };
  if (branch?.id && defaults[branch.id]) {
    return defaults[branch.id];
  }
  const restaurantKey = normalizeKey(branch?.restaurantId || 'restaurant').replace(/[^a-z0-9]+/g, '_');
  const branchKey = normalizeKey(branch?.name || branch?.id || 'main').replace(/[^a-z0-9]+/g, '_');
  return `qr_${restaurantKey}_${branchKey}_menu`;
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

  if (!table || table.branchId !== scope.context.branchId) {
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
  const paymentMethod = normalizePaymentMethod(
    payload.paymentMethod || existing?.paymentMethod,
  );

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
    if (!verifyPassword(user, password)) {
      fail(res, 401, 'Tài khoản hoặc mật khẩu chưa đúng.');
      return true;
    }
    if (migratePlainPasswordIfNeeded(user, password)) {
      saveDb(db);
    }

    ok(res, {
      ok: true,
      message: 'Đăng nhập Admin thành công',
      token: createToken(user),
      userId: user.id,
      role: user.role,
      restaurantId: user.activeRestaurantId || user.restaurantIds?.[0],
      restaurantIds: user.restaurantIds || [],
      branchIds: user.branchIds || [],
      activeBranchId: user.activeBranchId,
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
    const passwordRecord = createPasswordRecord(password);
    const user = {
      id: createId('admin'),
      username,
      ...passwordRecord,
      role: 'OWNER',
      restaurantIds: [defaultRestaurantId],
      activeRestaurantId: defaultRestaurantId,
      branchIds: [],
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
      branchIds: user.branchIds || [],
      activeBranchId: user.activeBranchId,
    });
    return true;
  }

  return false;
};

const routeRestaurants = async (req, res, db, parts) => {
  if (parts.length === 1 && req.method === 'GET') {
    const user = getUserFromRequest(db, req);
    if (ENABLE_AUTH_GUARD && !user) {
      fail(res, 401, 'Phiên đăng nhập chưa hợp lệ.');
      return true;
    }
    const restaurants = ENABLE_AUTH_GUARD && user
      ? db.restaurants.filter(restaurant => canAccessRestaurant(user, restaurant.id))
      : db.restaurants;
    ok(res, restaurants.map(asPublicRestaurant));
    return true;
  }

  if (parts.length === 1 && req.method === 'POST') {
    const user = getUserFromRequest(db, req);
    if (ENABLE_AUTH_GUARD && !user) {
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
    const branch = {
      id: createId('branch'),
      restaurantId: restaurant.id,
      name: 'Chi nhánh chính',
      address: '',
      menuQrToken: cleanString(body.menuQrToken),
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.branches.push(branch);
    if (user && !Array.isArray(user.restaurantIds)) {
      user.restaurantIds = [];
    }
    if (user && !user.restaurantIds.includes(restaurant.id)) {
      user.restaurantIds.push(restaurant.id);
      user.updatedAt = timestamp;
    }
    saveDb(db);
    audit('restaurant.create', {user, restaurantId: restaurant.id});
    created(res, asPublicRestaurant(restaurant));
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
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền tạo bàn/QR.')) {
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
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền sửa bàn/QR.')) {
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
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền xoá bàn/QR.')) {
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
    ok(res, getRestaurantCategories(db, restaurantId));
    return true;
  }

  if (parts.length === 4 && req.method === 'POST') {
    if (!requireRole(res, user, ['OWNER', 'MANAGER'], 'Tài khoản không có quyền thêm danh mục.')) {
      return true;
    }
    const body = await parseBody(req);
    try {
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
      if (!ensureCategory(db, restaurantId, item.categoryId)) {
        fail(res, 400, 'Danh mục món không thuộc nhà hàng hiện tại.');
        return true;
      }
      db.items.push(item);
      saveDb(db);
      audit('item.create', {user, restaurantId, targetId: item.id});
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
      if (!ensureCategory(db, restaurantId, next.categoryId)) {
        fail(res, 400, 'Danh mục món không thuộc nhà hàng hiện tại.');
        return true;
      }
      Object.assign(item, next);
      saveDb(db);
      audit('item.update', {user, restaurantId, targetId: item.id});
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

const routePublicMenu = async (req, res, db, parts) => {
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
    const tables = db.tables
      .filter(table =>
        table.restaurantId === scope.context.restaurantId &&
        (!scope.context.branchId || table.branchId === scope.context.branchId) &&
        table.status !== 'HIDDEN',
      )
      .map(table => ({
        ...table,
        qrCodeToken: undefined,
      }));
    ok(res, tables);
    return true;
  }

  if (parts.length === 4 && parts[3] === 'orders' && req.method === 'POST') {
    const body = await parseBody(req);
    try {
      const table = resolvePublicOrderTable(db, scope, body);
      const order = normalizeOrderPayload(db, scope.context.restaurantId, {
        ...body,
        restaurantId: scope.context.restaurantId,
        branchId: scope.context.branchId,
        tableId: table.id,
        tableNumber: table.tableNumber,
        orderSource: 'customer',
      });
      db.orders.unshift(order);
      delete db.carts[cartKey(scope.context)];
      delete db.carts[cartKey(order)];
      saveDb(db);
      audit('order.create.public', {
        restaurantId: scope.context.restaurantId,
        branchId: order.branchId,
        tableId: table.id,
        tableNumber: table.tableNumber,
        targetId: order.id,
      });
      created(res, [order]);
    } catch (error) {
      fail(res, 400, error.message || 'Dữ liệu đơn hàng chưa hợp lệ.');
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
  if (parts[2] === 'orders') {
    return routeOrders(req, res, db, restaurantId, parts, query, access.user);
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

  const {parts, query, pathname} = getPathParts(req.url);
  if ((req.method === 'GET' || req.method === 'HEAD') && sendStaticUploadFile(req, res, pathname)) {
    return;
  }
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

    if (parts[0] === 'menu' && ['qr-tokens', 'table-tokens'].includes(parts[1]) && routeQrToken(req, res, db, parts)) {
      return;
    }

    if (parts[0] === 'public' && parts[1] === 'menu' && (await routePublicMenu(req, res, db, parts))) {
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
  console.log(`[scoremenu-server] auth guard: ${ENABLE_AUTH_GUARD ? 'ON' : 'OFF for MVP batch 12'}`);
});
