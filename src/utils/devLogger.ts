declare const __DEV__: boolean | undefined;

const isDevBuild = () => {
  try {
    return typeof __DEV__ !== "undefined" && !!__DEV__;
  } catch (_error) {
    return false;
  }
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
