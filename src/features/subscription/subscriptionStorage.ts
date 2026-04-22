import AsyncStorage from '@react-native-async-storage/async-storage';

const APLUS_PRO_ENTITLEMENT_CACHE_KEY = '@aplus_pro_entitlement_cache_v1';

export const APLUS_PRO_OFFLINE_GRACE_MS = 72 * 60 * 60 * 1000;

export type StoredAplusProEntitlement = {
  isActive: boolean;
  productId?: string;
  source?: 'google_play_backend' | 'local_cache' | 'none';
  lastCheckedAt?: number;
  expiresAt?: string;
  reason?: string;
  updatedAt?: number;
};

export const readStoredAplusProEntitlement = async () => {
  try {
    const raw = await AsyncStorage.getItem(APLUS_PRO_ENTITLEMENT_CACHE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredAplusProEntitlement;
  } catch {
    return null;
  }
};

export const isStoredAplusProEntitlementInGrace = (
  value?: StoredAplusProEntitlement | null,
) => {
  if (!value?.isActive || !value.lastCheckedAt) {
    return false;
  }

  const withinGrace = Date.now() - value.lastCheckedAt <= APLUS_PRO_OFFLINE_GRACE_MS;
  const notExpired = value.expiresAt
    ? new Date(value.expiresAt).getTime() > Date.now()
    : true;

  return withinGrace && notExpired;
};

export const writeStoredAplusProEntitlement = async (
  value: StoredAplusProEntitlement,
) => {
  try {
    await AsyncStorage.setItem(
      APLUS_PRO_ENTITLEMENT_CACHE_KEY,
      JSON.stringify({
        ...value,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // Cache write failure must never block an active backend-verified entitlement.
  }
};

export const clearStoredAplusProEntitlement = async () => {
  try {
    await AsyncStorage.removeItem(APLUS_PRO_ENTITLEMENT_CACHE_KEY);
  } catch {
    // Cache clear failure is non-fatal because backend verification remains source of truth.
  }
};
