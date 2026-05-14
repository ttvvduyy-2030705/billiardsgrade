declare const __DEV__: boolean | undefined;

/**
 * Public API URL for the deployed ScoreMenu backend.
 * Replace this value before building the APK when moving between Render/VPS/domain/IP.
 */
export const SCOREMENU_RENDER_API_BASE_URL = 'https://billiardsgrade.onrender.com';

export type RestaurantMenuRepositoryMode = 'local' | 'api';
export type RestaurantMenuEnvironmentName =
  | 'local'
  | 'dev-api'
  | 'staging'
  | 'prod';

export type RestaurantMenuEnvironmentConfig = {
  /** Human-readable environment key used for diagnostics and test notes. */
  name: RestaurantMenuEnvironmentName;
  mode: RestaurantMenuRepositoryMode;
  apiBaseUrl: string;
  apiTimeoutMs: number;
  apiRetryCount: number;
  defaultRestaurantId?: string;
  /**
   * Preferred customer entry token for Batch 1+ architecture.
   * This token represents a restaurant/branch menu QR first. Table QR tokens
   * can still be supported later as an optional shortcut.
   */
  defaultMenuQrToken?: string;
  /**
   * @deprecated Dev/test compatibility only. New customer entry should come
   * from a scanned QR/deep link, not from a hard-coded default.
   */
  defaultTableToken?: string;
};

type RuntimeRestaurantMenuConfig = Partial<RestaurantMenuEnvironmentConfig> & {
  envName?: RestaurantMenuEnvironmentName;
};

const isReactNativeDevBuild = () => {
  try {
    return typeof __DEV__ !== 'undefined' && !!__DEV__;
  } catch (_error) {
    return false;
  }
};

const DEFAULT_RESTAURANT_MENU_ENV_NAME: RestaurantMenuEnvironmentName = 'prod';

const getGlobalConfig = (): RuntimeRestaurantMenuConfig => {
  const globalConfig = globalThis as unknown as {
    __SCOREMENU_CONFIG__?: RuntimeRestaurantMenuConfig;
    __SCOREMENU_MENU_ENV__?: RestaurantMenuEnvironmentName;
    process?: {env?: Record<string, string | undefined>};
  };
  const env = globalConfig.process?.env || {};
  const envName =
    globalConfig.__SCOREMENU_MENU_ENV__ ||
    (env.SCOREMENU_MENU_ENV as RestaurantMenuEnvironmentName | undefined) ||
    (env.SCOREMENU_ENV as RestaurantMenuEnvironmentName | undefined);

  return {
    ...(globalConfig.__SCOREMENU_CONFIG__ || {}),
    ...(envName ? {envName} : {}),
    ...(env.SCOREMENU_API_BASE_URL
      ? {apiBaseUrl: env.SCOREMENU_API_BASE_URL}
      : {}),
    ...(env.SCOREMENU_DEFAULT_RESTAURANT_ID
      ? {defaultRestaurantId: env.SCOREMENU_DEFAULT_RESTAURANT_ID}
      : {}),
    ...(env.SCOREMENU_DEFAULT_MENU_QR_TOKEN
      ? {defaultMenuQrToken: env.SCOREMENU_DEFAULT_MENU_QR_TOKEN}
      : {}),
    ...(env.SCOREMENU_API_TIMEOUT_MS
      ? {apiTimeoutMs: Number(env.SCOREMENU_API_TIMEOUT_MS)}
      : {}),
    ...(env.SCOREMENU_API_RETRY_COUNT
      ? {apiRetryCount: Number(env.SCOREMENU_API_RETRY_COUNT)}
      : {}),
  };
};

export const RESTAURANT_MENU_ENV_PRESETS: Record<
  RestaurantMenuEnvironmentName,
  RestaurantMenuEnvironmentConfig
> = {
  local: {
    name: 'local',
    mode: 'local',
    apiBaseUrl: '',
    apiTimeoutMs: 10000,
    apiRetryCount: 0,
    defaultRestaurantId: undefined,
    defaultMenuQrToken: undefined,
    defaultTableToken: undefined,
  },
  'dev-api': {
    name: 'dev-api',
    mode: 'api',
    apiBaseUrl: SCOREMENU_RENDER_API_BASE_URL,
    apiTimeoutMs: 90000,
    apiRetryCount: 1,
    defaultRestaurantId: undefined,
    defaultMenuQrToken: undefined,
    defaultTableToken: undefined,
  },
  staging: {
    name: 'staging',
    mode: 'api',
    apiBaseUrl: SCOREMENU_RENDER_API_BASE_URL,
    apiTimeoutMs: 90000,
    apiRetryCount: 1,
    defaultRestaurantId: undefined,
    defaultMenuQrToken: undefined,
    defaultTableToken: undefined,
  },
  prod: {
    name: 'prod',
    mode: 'api',
    apiBaseUrl: SCOREMENU_RENDER_API_BASE_URL,
    apiTimeoutMs: 90000,
    apiRetryCount: 1,
    defaultRestaurantId: undefined,
    defaultMenuQrToken: undefined,
    defaultTableToken: undefined,
  },
};

const normalizeEnvName = (value?: string): RestaurantMenuEnvironmentName => {
  if (
    value === 'local' ||
    value === 'dev-api' ||
    value === 'staging' ||
    value === 'prod'
  ) {
    return value;
  }

  return DEFAULT_RESTAURANT_MENU_ENV_NAME;
};

const sanitizeNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

export const getRestaurantMenuEnvironmentConfig = (
  runtimeOverride: RuntimeRestaurantMenuConfig = getGlobalConfig(),
): RestaurantMenuEnvironmentConfig => {
  const envName = normalizeEnvName(
    runtimeOverride.envName || runtimeOverride.name,
  );
  const preset = RESTAURANT_MENU_ENV_PRESETS[envName];

  return {
    ...preset,
    ...runtimeOverride,
    name: envName,
    mode: runtimeOverride.mode || preset.mode,
    apiBaseUrl:
      typeof runtimeOverride.apiBaseUrl === 'string'
        ? runtimeOverride.apiBaseUrl.trim().replace(/\/$/, '')
        : preset.apiBaseUrl,
    apiTimeoutMs: sanitizeNumber(
      runtimeOverride.apiTimeoutMs,
      preset.apiTimeoutMs,
    ),
    apiRetryCount: sanitizeNumber(
      runtimeOverride.apiRetryCount,
      preset.apiRetryCount,
    ),
  };
};

export const RESTAURANT_MENU_ENV_CONFIG = getRestaurantMenuEnvironmentConfig();

export const isRestaurantMenuApiMode = (
  config: RestaurantMenuEnvironmentConfig = RESTAURANT_MENU_ENV_CONFIG,
) => config.mode === 'api';

export const isRestaurantMenuProductionRuntime = (
  config: RestaurantMenuEnvironmentConfig = RESTAURANT_MENU_ENV_CONFIG,
) => config.name === 'prod' || !isReactNativeDevBuild();

export const isRestaurantMenuDevToolsEnabled = (
  _config: RestaurantMenuEnvironmentConfig = RESTAURANT_MENU_ENV_CONFIG,
) => false;

export const getRestaurantMenuEnvironmentLabel = (
  config: RestaurantMenuEnvironmentConfig = RESTAURANT_MENU_ENV_CONFIG,
) => {
  if (config.mode === 'api') {
    return 'Kết nối máy chủ online';
  }

  return 'Dữ liệu lưu trên thiết bị';
};

export const getDefaultCustomerMenuQrToken = (
  _config: RestaurantMenuEnvironmentConfig = RESTAURANT_MENU_ENV_CONFIG,
) => '';
