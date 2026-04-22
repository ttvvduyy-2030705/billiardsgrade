import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const BILLING_STORE_PATH = process.env.BILLING_STORE_PATH || path.join(DATA_DIR, 'billing.json');
const GOOGLE_PLAY_PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.aplus.score';
const APLUS_PRO_PRODUCT_ID = process.env.APLUS_PRO_PRODUCT_ID || 'aplus_pro';
const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TRANSFER_LIMIT = Number(process.env.BILLING_TRANSFER_LIMIT || 2);
const TRANSFER_WINDOW_DAYS = Number(process.env.BILLING_TRANSFER_WINDOW_DAYS || 30);

const googleAccessTokenCache = {token: '', expiresAtMs: 0};

export const billingRouter = express.Router();

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {recursive: true});
}

const nowIso = () => new Date().toISOString();
const sha256 = value => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const normalizePrivateKey = value => String(value || '').replace(/\\n/g, '\n');
const base64Url = value => Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const safeTokenTail = value => String(value || '').slice(-6);

const readJson = (filePath, fallback) => {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    return fallback;
  }
};

const writeJson = (filePath, value) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
};

const emptyBillingStore = () => ({
  version: 1,
  subscriptions: {},
  devices: {},
  deviceBindings: [],
  transferLogs: [],
  updatedAt: nowIso(),
});

const readBillingStore = () => {
  const store = readJson(BILLING_STORE_PATH, emptyBillingStore());
  return {
    ...emptyBillingStore(),
    ...store,
    subscriptions: store.subscriptions || {},
    devices: store.devices || {},
    deviceBindings: Array.isArray(store.deviceBindings) ? store.deviceBindings : [],
    transferLogs: Array.isArray(store.transferLogs) ? store.transferLogs : [],
  };
};

const writeBillingStore = store => writeJson(BILLING_STORE_PATH, {...store, updatedAt: nowIso()});

const getServiceAccountConfig = () => {
  const rawJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '';
  const rawBase64 = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 || '';

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      return {clientEmail: parsed.client_email, privateKey: parsed.private_key};
    } catch (_error) {
      return null;
    }
  }

  if (rawBase64) {
    try {
      const parsed = JSON.parse(Buffer.from(rawBase64, 'base64').toString('utf8'));
      return {clientEmail: parsed.client_email, privateKey: parsed.private_key};
    } catch (_error) {
      return null;
    }
  }

  if (process.env.GOOGLE_PLAY_CLIENT_EMAIL && process.env.GOOGLE_PLAY_PRIVATE_KEY) {
    return {clientEmail: process.env.GOOGLE_PLAY_CLIENT_EMAIL, privateKey: process.env.GOOGLE_PLAY_PRIVATE_KEY};
  }

  return null;
};

const createServiceAccountJwt = ({clientEmail, privateKey}) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({alg: 'RS256', typ: 'JWT'}));
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: ANDROID_PUBLISHER_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(normalizePrivateKey(privateKey), 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${unsigned}.${signature}`;
};

const parseResponse = async response => {
  const text = await response.text();
  let data = {};
  if (text) {
    try { data = JSON.parse(text); } catch (_error) { data = {rawText: text}; }
  }
  if (!response.ok) {
    const message = data.error_description || data.error?.message || data.error || data.message || data.rawText || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
};

const getGoogleAccessToken = async () => {
  if (googleAccessTokenCache.token && googleAccessTokenCache.expiresAtMs > Date.now() + 60000) {
    return googleAccessTokenCache.token;
  }
  const config = getServiceAccountConfig();
  if (!config?.clientEmail || !config?.privateKey) throw new Error('missing_google_play_service_account');
  const assertion = createServiceAccountJwt(config);
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion}),
  });
  const data = await parseResponse(response);
  googleAccessTokenCache.token = data.access_token || '';
  googleAccessTokenCache.expiresAtMs = Date.now() + Number(data.expires_in || 3600) * 1000;
  return googleAccessTokenCache.token;
};

const isActiveSubscriptionState = state => state === 'SUBSCRIPTION_STATE_ACTIVE' || state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';

const getLatestLineItem = lineItems => {
  const validItems = Array.isArray(lineItems) ? lineItems : [];
  return validItems.reduce((latest, item) => {
    if (!latest) return item;
    const latestTime = new Date(latest.expiryTime || 0).getTime();
    const itemTime = new Date(item.expiryTime || 0).getTime();
    return itemTime > latestTime ? item : latest;
  }, null);
};

const normalizeGoogleSubscription = (data, expectedProductId) => {
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
  const productLineItem = lineItems.find(item => item.productId === expectedProductId);
  const latestLineItem = productLineItem || getLatestLineItem(lineItems);
  const expiryTime = latestLineItem?.expiryTime || '';
  const expiresAtMs = expiryTime ? new Date(expiryTime).getTime() : 0;
  const productMatches = Boolean(productLineItem);
  const active = productMatches && isActiveSubscriptionState(data.subscriptionState) && (!expiresAtMs || expiresAtMs > Date.now());
  return {
    active,
    productMatches,
    productId: latestLineItem?.productId || expectedProductId,
    status: active ? 'active' : 'inactive',
    subscriptionState: data.subscriptionState || 'SUBSCRIPTION_STATE_UNSPECIFIED',
    acknowledgementState: data.acknowledgementState || '',
    orderId: data.latestOrderId || '',
    expiryTime,
    autoRenewing: Boolean(latestLineItem?.autoRenewingPlan),
    plan: latestLineItem?.offerDetails?.basePlanId || '',
  };
};

const acknowledgeSubscriptionIfNeeded = async ({packageName, productId, purchaseToken, acknowledgementState}) => {
  if (acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_PENDING') return false;
  const accessToken = await getGoogleAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({}),
  });
  await parseResponse(response);
  return true;
};

const verifySubscriptionWithGoogle = async ({packageName, productId, purchaseToken}) => {
  const accessToken = await getGoogleAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {headers: {Authorization: `Bearer ${accessToken}`}});
  const data = await parseResponse(response);
  const normalized = normalizeGoogleSubscription(data, productId);
  if (normalized.productMatches) {
    try {
      await acknowledgeSubscriptionIfNeeded({packageName, productId, purchaseToken, acknowledgementState: normalized.acknowledgementState});
    } catch (error) {
      normalized.acknowledgeError = error?.message || 'acknowledge_failed';
    }
  }
  return normalized;
};

const sanitizeDeviceInfo = value => {
  const input = typeof value === 'object' && value !== null ? value : {};
  const trim = item => String(item || '').slice(0, 80);
  return {
    brand: trim(input.brand),
    model: trim(input.model),
    androidVersion: trim(input.androidVersion),
    appVersion: trim(input.appVersion),
    platform: trim(input.platform || 'android'),
  };
};

const getDeviceLabel = deviceInfo => {
  const pieces = [deviceInfo.brand, deviceInfo.model].filter(Boolean);
  return pieces.length ? pieces.join(' ') : 'Thiết bị Android';
};

const upsertDevice = (store, appDeviceId, deviceInfo) => {
  const appDeviceIdHash = sha256(appDeviceId);
  const existing = store.devices[appDeviceIdHash];
  const safeInfo = sanitizeDeviceInfo(deviceInfo);
  const timestamp = nowIso();
  const device = {
    id: appDeviceIdHash,
    appDeviceIdHash,
    deviceLabel: getDeviceLabel(safeInfo),
    ...safeInfo,
    firstSeenAt: existing?.firstSeenAt || timestamp,
    lastSeenAt: timestamp,
    isActive: true,
  };
  store.devices[appDeviceIdHash] = device;
  return device;
};

const countRecentTransfers = (store, subscriptionId) => {
  const windowStart = Date.now() - TRANSFER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return store.transferLogs.filter(item => item.subscriptionId === subscriptionId && new Date(item.transferredAt || 0).getTime() >= windowStart).length;
};

const getActiveBinding = (store, subscriptionId) => store.deviceBindings.find(item => item.subscriptionId === subscriptionId && item.isActive);

const deactivateActiveBinding = (store, subscriptionId) => {
  const timestamp = nowIso();
  store.deviceBindings.forEach(item => {
    if (item.subscriptionId === subscriptionId && item.isActive) {
      item.isActive = false;
      item.deactivatedAt = timestamp;
    }
  });
};

const activateBinding = (store, subscriptionId, deviceId, reason = 'verify') => {
  const timestamp = nowIso();
  deactivateActiveBinding(store, subscriptionId);
  const binding = {
    id: sha256(`${subscriptionId}:${deviceId}:${timestamp}`),
    subscriptionId,
    appDeviceIdHash: deviceId,
    isActive: true,
    activatedAt: timestamp,
    lastSeenAt: timestamp,
    deactivatedAt: null,
    reason,
  };
  store.deviceBindings.push(binding);
  store.subscriptions[subscriptionId].activeDeviceId = deviceId;
  store.subscriptions[subscriptionId].updatedAt = timestamp;
  return binding;
};

const upsertSubscription = ({store, tokenHash, productId, googleResult, purchaseToken}) => {
  const existing = store.subscriptions[tokenHash];
  const timestamp = nowIso();
  const subscription = {
    id: tokenHash,
    purchaseTokenHash: tokenHash,
    tokenTail: existing?.tokenTail || safeTokenTail(purchaseToken),
    productId,
    orderId: googleResult.orderId || existing?.orderId || '',
    status: googleResult.active ? 'active' : 'expired',
    subscriptionState: googleResult.subscriptionState,
    expiryTime: googleResult.expiryTime,
    autoRenewing: googleResult.autoRenewing,
    plan: googleResult.plan,
    activeDeviceId: existing?.activeDeviceId || '',
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  store.subscriptions[tokenHash] = subscription;
  return subscription;
};

const safeInactiveResponse = (reason, message, extra = {}) => ({
  isAplusProActive: false,
  boundToThisDevice: false,
  requireDeviceTransfer: false,
  reason,
  message,
  ...extra,
});

const verifyAndBind = async ({packageName, productId, purchaseToken, appDeviceId, deviceInfo, transfer = false}) => {
  if (!purchaseToken || !appDeviceId) {
    return safeInactiveResponse('not_verified', 'Thiếu purchaseToken hoặc appDeviceId để xác thực Aplus Pro.');
  }

  const normalizedPackageName = String(packageName || GOOGLE_PLAY_PACKAGE_NAME);
  const normalizedProductId = String(productId || APLUS_PRO_PRODUCT_ID);
  if (normalizedPackageName !== GOOGLE_PLAY_PACKAGE_NAME) {
    return safeInactiveResponse('invalid_package', 'Package name không khớp cấu hình backend.');
  }
  if (normalizedProductId !== APLUS_PRO_PRODUCT_ID) {
    return safeInactiveResponse('invalid_product', 'Product ID không phải Aplus Pro.');
  }

  let googleResult;
  try {
    googleResult = await verifySubscriptionWithGoogle({packageName: normalizedPackageName, productId: normalizedProductId, purchaseToken});
  } catch (error) {
    const code = error?.message === 'missing_google_play_service_account' ? 'not_verified' : 'invalid_purchase';
    return safeInactiveResponse(
      code,
      code === 'not_verified'
        ? 'Backend chưa cấu hình Google Play service account để verify subscription.'
        : 'Google Play không xác thực được gói Aplus Pro này.',
      {debugMessage: error?.message || ''},
    );
  }

  if (!googleResult.productMatches) {
    return safeInactiveResponse('invalid_product', 'Purchase token không thuộc product Aplus Pro.');
  }

  if (!googleResult.active) {
    const reason = googleResult.subscriptionState === 'SUBSCRIPTION_STATE_PENDING' ? 'pending' : 'expired';
    return safeInactiveResponse(
      reason,
      reason === 'pending' ? 'Giao dịch Aplus Pro đang chờ xử lý.' : 'Gói Aplus Pro đã hết hạn hoặc không còn hoạt động.',
      {expiryTime: googleResult.expiryTime},
    );
  }

  const tokenHash = sha256(purchaseToken);
  const store = readBillingStore();
  const device = upsertDevice(store, appDeviceId, deviceInfo);
  const subscription = upsertSubscription({store, tokenHash, productId: normalizedProductId, googleResult, purchaseToken});
  const activeBinding = getActiveBinding(store, subscription.id);

  if (!activeBinding) {
    activateBinding(store, subscription.id, device.id, 'first_verify');
    writeBillingStore(store);
    return {isAplusProActive: true, boundToThisDevice: true, requireDeviceTransfer: false, reason: 'active', expiryTime: googleResult.expiryTime, plan: googleResult.plan};
  }

  if (activeBinding.appDeviceIdHash === device.id) {
    activeBinding.lastSeenAt = nowIso();
    subscription.activeDeviceId = device.id;
    writeBillingStore(store);
    return {isAplusProActive: true, boundToThisDevice: true, requireDeviceTransfer: false, reason: 'active', expiryTime: googleResult.expiryTime, plan: googleResult.plan};
  }

  if (!transfer) {
    const activeDevice = store.devices[activeBinding.appDeviceIdHash];
    writeBillingStore(store);
    return {
      isAplusProActive: false,
      boundToThisDevice: false,
      requireDeviceTransfer: true,
      reason: 'bound_to_other_device',
      message: 'Gói Aplus Pro hiện đang được kích hoạt trên một thiết bị khác.',
      currentDeviceLabel: activeDevice?.deviceLabel || 'Thiết bị khác',
      expiryTime: googleResult.expiryTime,
      plan: googleResult.plan,
    };
  }

  const recentTransfers = countRecentTransfers(store, subscription.id);
  if (recentTransfers >= TRANSFER_LIMIT) {
    writeBillingStore(store);
    return {
      isAplusProActive: false,
      boundToThisDevice: false,
      requireDeviceTransfer: false,
      reason: 'transfer_limited',
      message: 'Bạn đã chuyển thiết bị gần đây. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
      transferRemaining: 0,
      transferWindowDays: TRANSFER_WINDOW_DAYS,
    };
  }

  const oldDeviceId = activeBinding.appDeviceIdHash;
  activateBinding(store, subscription.id, device.id, 'manual_transfer');
  store.transferLogs.push({
    id: sha256(`${subscription.id}:${oldDeviceId}:${device.id}:${Date.now()}`),
    subscriptionId: subscription.id,
    oldDeviceId,
    newDeviceId: device.id,
    transferredAt: nowIso(),
    reason: 'user_requested_transfer',
  });
  writeBillingStore(store);

  return {isAplusProActive: true, boundToThisDevice: true, requireDeviceTransfer: false, reason: 'active', expiryTime: googleResult.expiryTime, plan: googleResult.plan, transferRemaining: Math.max(0, TRANSFER_LIMIT - recentTransfers - 1)};
};

billingRouter.get('/google/health', (_req, res) => {
  res.json({
    ok: true,
    productId: APLUS_PRO_PRODUCT_ID,
    packageName: GOOGLE_PLAY_PACKAGE_NAME,
    transferLimit: TRANSFER_LIMIT,
    transferWindowDays: TRANSFER_WINDOW_DAYS,
    googleServiceAccountConfigured: Boolean(getServiceAccountConfig()),
  });
});

billingRouter.post('/google/verify', async (req, res) => {
  try {
    res.json(await verifyAndBind({...req.body, transfer: false}));
  } catch (error) {
    res.status(500).json(safeInactiveResponse('server_error', 'Backend billing verify bị lỗi.', {debugMessage: error?.message || ''}));
  }
});

billingRouter.post('/google/bind-device', async (req, res) => {
  try {
    const result = await verifyAndBind({...req.body, transfer: false});
    res.json({success: result.isAplusProActive === true, ...result});
  } catch (error) {
    res.status(500).json(safeInactiveResponse('server_error', 'Backend billing bind-device bị lỗi.', {success: false, debugMessage: error?.message || ''}));
  }
});

billingRouter.post('/google/transfer-device', async (req, res) => {
  try {
    const result = await verifyAndBind({...req.body, transfer: true});
    res.json({success: result.isAplusProActive === true, ...result});
  } catch (error) {
    res.status(500).json(safeInactiveResponse('server_error', 'Backend billing transfer-device bị lỗi.', {success: false, debugMessage: error?.message || ''}));
  }
});

billingRouter.get('/google/entitlement', async (req, res) => {
  try {
    res.json(await verifyAndBind({
      packageName: req.query?.packageName,
      productId: req.query?.productId,
      purchaseToken: req.query?.purchaseToken,
      appDeviceId: req.query?.appDeviceId,
      deviceInfo: {platform: req.query?.platform || 'android', appVersion: req.query?.appVersion || ''},
      transfer: false,
    }));
  } catch (error) {
    res.status(500).json(safeInactiveResponse('server_error', 'Backend billing entitlement bị lỗi.', {debugMessage: error?.message || ''}));
  }
});
