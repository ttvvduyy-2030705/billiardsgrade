import {Linking} from 'react-native';
import {
  APP_OAUTH_CALLBACK_URL,
  LIVESTREAM_AUTH_BASE_URL,
  normalizeLivestreamBaseUrl,
  isConfiguredLivestreamBaseUrl,
} from 'config/livestreamAuth';

export type LivestreamPlatform = 'facebook' | 'youtube' | 'tiktok';

export type OAuthCallbackPayload = {
  platform?: LivestreamPlatform;
  status?: 'success' | 'error' | string;
  accountName?: string;
  accountId?: string;
  setupToken?: string;
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

const resolveSetupToken = (params: Record<string, string>) => {
  return (
    params.setupToken ||
    params.setup_token ||
    params.sessionToken ||
    params.session_token ||
    params.token ||
    ''
  );
};

export const buildPlatformAuthUrl = (platform: LivestreamPlatform) => {
  const baseUrl = normalizeLivestreamBaseUrl(LIVESTREAM_AUTH_BASE_URL);

  if (!isConfiguredLivestreamBaseUrl(baseUrl)) {
    throw new Error(
      'Bạn chưa cấu hình URL backend public cho livestream auth.',
    );
  }

  const route = PLATFORM_ROUTE_MAP[platform];
  const callbackParam = `appCallback=${encodeURIComponent(
    APP_OAUTH_CALLBACK_URL,
  )}`;
  return `${baseUrl}/auth/${route}/start?${callbackParam}`;
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
    setupToken: resolveSetupToken(params),
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    rawUrl: url,
  };
};
