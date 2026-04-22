import {LIVESTREAM_AUTH_BASE_URL} from 'config/livestreamAuth';
import {APLUS_PRO_PRODUCT_ID} from './subscriptionProducts';
import {getAplusProDeviceInfo, getAplusProDeviceInstanceId} from './deviceIdentity';

const APLUS_PRO_PACKAGE_NAME = 'com.aplus.score';

export type AplusProBackendEntitlement = {
  isAplusProActive?: boolean;
  boundToThisDevice?: boolean;
  requireDeviceTransfer?: boolean;
  reason?: string;
  message?: string;
  currentDeviceLabel?: string;
  expiryTime?: string;
  plan?: string;
  transferRemaining?: number;
  transferWindowDays?: number;
  debugMessage?: string;
};

const normalizeBaseUrl = (value: string) => String(value || '').replace(/\/+$/, '');
const getBillingBaseUrl = () => normalizeBaseUrl(LIVESTREAM_AUTH_BASE_URL);

const parseBillingResponse = async (response: Response) => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    return {
      isAplusProActive: false,
      reason: 'server_error',
      message: data?.message || 'Backend billing không phản hồi hợp lệ.',
      debugMessage: data?.debugMessage,
    } as AplusProBackendEntitlement;
  }

  return data as AplusProBackendEntitlement;
};

const buildVerifyBody = async (purchaseToken: string) => {
  const appDeviceId = await getAplusProDeviceInstanceId();
  return {
    packageName: APLUS_PRO_PACKAGE_NAME,
    productId: APLUS_PRO_PRODUCT_ID,
    purchaseToken,
    appDeviceId,
    deviceInfo: getAplusProDeviceInfo(),
    platform: 'android',
  };
};

export const verifyAplusProPurchaseWithBackend = async (purchaseToken?: string) => {
  if (!purchaseToken) {
    return {
      isAplusProActive: false,
      reason: 'not_verified',
      message: 'Thiếu purchaseToken để xác thực Aplus Pro.',
    } as AplusProBackendEntitlement;
  }

  const response = await fetch(`${getBillingBaseUrl()}/billing/google/verify`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(await buildVerifyBody(purchaseToken)),
  });

  return parseBillingResponse(response);
};

export const transferAplusProDeviceWithBackend = async (purchaseToken?: string) => {
  if (!purchaseToken) {
    return {
      isAplusProActive: false,
      reason: 'not_verified',
      message: 'Thiếu purchaseToken để chuyển Aplus Pro sang thiết bị này.',
    } as AplusProBackendEntitlement;
  }

  const response = await fetch(`${getBillingBaseUrl()}/billing/google/transfer-device`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(await buildVerifyBody(purchaseToken)),
  });

  return parseBillingResponse(response);
};

export const checkAplusProEntitlementWithBackend = async (purchaseToken?: string) => {
  if (!purchaseToken) {
    return {
      isAplusProActive: false,
      reason: 'not_verified',
      message: 'Thiếu purchaseToken để kiểm tra entitlement Aplus Pro.',
    } as AplusProBackendEntitlement;
  }

  const appDeviceId = await getAplusProDeviceInstanceId();
  const query = [
    ['packageName', APLUS_PRO_PACKAGE_NAME],
    ['productId', APLUS_PRO_PRODUCT_ID],
    ['purchaseToken', purchaseToken],
    ['appDeviceId', appDeviceId],
    ['platform', 'android'],
  ]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const response = await fetch(`${getBillingBaseUrl()}/billing/google/entitlement?${query}`);
  return parseBillingResponse(response);
};
