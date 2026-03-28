import {Linking} from 'react-native';
import {
  APP_OAUTH_CALLBACK_URL,
  LIVESTREAM_AUTH_BASE_URL,
} from 'config/livestreamAuth';

export type LivestreamPlatform = 'facebook' | 'youtube' | 'tiktok';

export type OAuthCallbackPayload = {
  platform?: LivestreamPlatform;
  status?: 'success' | 'error' | string;
  accountName?: string;
  accountId?: string;
  errorCode?: string;
  errorMessage?: string;
  rawUrl: string;
};

const PLATFORM_ROUTE_MAP: Record<LivestreamPlatform, string> = {
  facebook: 'facebook',
  youtube: 'google',
  tiktok: 'tiktok',
};

const safeDecode = (value?: string | null) => {
  if (!value) {
    return '';
  }

  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch (_error) {
    return value;
  }
};

const parseQueryString = (queryString: string): Record<string, string> => {
  return queryString
    .replace(/^\?/, '')
    .split('&')
    .filter(Boolean)
    .reduce<Record<string, string>>((result, item) => {
      const [rawKey, rawValue = ''] = item.split('=');
      result[safeDecode(rawKey)] = safeDecode(rawValue);
      return result;
    }, {});
};

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const isConfiguredBaseUrl = (value: string) => {
  if (!value) {
    return false;
  }

  if (value.includes('YOUR_PUBLIC_BACKEND_OR_NGROK_URL')) {
    return false;
  }

  return /^https?:\/\/.+/i.test(value);
};

export const buildPlatformAuthUrl = (platform: LivestreamPlatform) => {
  const baseUrl = normalizeBaseUrl(LIVESTREAM_AUTH_BASE_URL);

  if (!isConfiguredBaseUrl(baseUrl)) {
    throw new Error(
      'Bạn chưa cấu hình URL backend public cho livestream auth.',
    );
  }

  const route = PLATFORM_ROUTE_MAP[platform];
  return `${baseUrl}/auth/${route}/start`;
};

export const openPlatformOAuth = async (platform: LivestreamPlatform) => {
  const url = buildPlatformAuthUrl(platform);
  console.log('[OAuth] opening url:', url);
  await Linking.openURL(url);
};

export const parseOAuthCallback = (
  url: string,
): OAuthCallbackPayload | null => {
  if (!url || !url.includes('://')) {
    return null;
  }

  const [basePart, queryPart = ''] = url.split('?');
  const normalizedBasePart = basePart.toLowerCase();
  const normalizedCallback = APP_OAUTH_CALLBACK_URL.toLowerCase();

  if (
    normalizedBasePart !== normalizedCallback &&
    !normalizedBasePart.startsWith(`${normalizedCallback}/`)
  ) {
    return null;
  }

  const params = parseQueryString(queryPart);

  return {
    platform: params.platform as LivestreamPlatform | undefined,
    status: params.status,
    accountName: params.accountName,
    accountId: params.accountId,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    rawUrl: url,
  };
};