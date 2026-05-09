declare const __DEV__: boolean | undefined;

export type DevLogModule =
  | 'MENU'
  | 'CART'
  | 'ADMIN'
  | 'ORDER'
  | 'API'
  | 'AUTH'
  | 'REALTIME'
  | 'VIDEO'
  | 'SYSTEM';

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

export const devWarn = (...args: unknown[]) => {
  if (!isDevBuild()) {
    return;
  }

  // Keep production logcat clean. Development warnings still help debug real
  // device issues without spamming release builds while scrolling menu/admin.
  console.warn(...args);
};

export const devLog = (...args: unknown[]) => {
  if (!isDevBuild()) {
    return;
  }

  console.log(...args);
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
