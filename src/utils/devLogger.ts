declare const __DEV__: boolean | undefined;

export type DevLogModule =
  | 'MENU'
  | 'CART'
  | 'ADMIN'
  | 'ORDER'
  | 'API'
  | 'AUTH'
  | 'REALTIME'
  | 'QR'
  | 'STORAGE'
  | 'VIDEO'
  | 'SYSTEM';

const SENSITIVE_KEY_PATTERN = /(token|password|authorization|secret|credential|base64|datauri|data_uri)/i;
const MAX_LOG_STRING_LENGTH = 180;

const isDevBuild = () => {
  try {
    return typeof __DEV__ !== 'undefined' && !!__DEV__;
  } catch (_error) {
    return false;
  }
};

const buildModulePrefix = (module: DevLogModule, action?: string) => {
  return action ? `[${module}] ${action}` : `[${module}]`;
};

const shortenString = (value: string) => {
  if (value.length <= MAX_LOG_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_LOG_STRING_LENGTH)}…`;
};

const sanitizeForLog = (value: unknown, depth = 0): unknown => {
  if (depth > 4) {
    return '[depth-limit]';
  }

  if (value instanceof Error) {
    const apiLike = value as Error & {code?: string; status?: number; details?: unknown};
    return {
      name: value.name,
      message: value.message,
      code: apiLike.code,
      status: apiLike.status,
      details: sanitizeForLog(apiLike.details, depth + 1),
    };
  }

  if (typeof value === 'string') {
    return shortenString(value);
  }

  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 24).map(item => sanitizeForLog(item, depth + 1));
  }

  const source = value as Record<string, unknown>;
  return Object.keys(source).reduce<Record<string, unknown>>((result, key) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = '[redacted]';
      return result;
    }

    result[key] = sanitizeForLog(source[key], depth + 1);
    return result;
  }, {});
};

const sanitizeArgs = (args: unknown[]) => args.map(arg => sanitizeForLog(arg));

export const devWarn = (...args: unknown[]) => {
  if (!isDevBuild()) {
    return;
  }

  // Keep production logcat clean. Development warnings still help debug real
  // device issues without spamming release builds while scrolling menu/admin.
  console.warn(...sanitizeArgs(args));
};

export const devLog = (...args: unknown[]) => {
  if (!isDevBuild()) {
    return;
  }

  console.log(...sanitizeArgs(args));
};

export const devModuleLog = (
  module: DevLogModule,
  action: string,
  payload?: unknown,
) => {
  if (payload === undefined) {
    devLog(buildModulePrefix(module, action));
    return;
  }

  devLog(buildModulePrefix(module, action), payload);
};

export const devModuleWarn = (
  module: DevLogModule,
  action: string,
  payload?: unknown,
) => {
  if (payload === undefined) {
    devWarn(buildModulePrefix(module, action));
    return;
  }

  devWarn(buildModulePrefix(module, action), payload);
};

export const sanitizeDevLogPayload = sanitizeForLog;
