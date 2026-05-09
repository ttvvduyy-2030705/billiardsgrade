export type RestaurantMenuRepositoryMode = 'local' | 'api';

export type RestaurantMenuEnvironmentConfig = {
  mode: RestaurantMenuRepositoryMode;
  apiBaseUrl: string;
  apiTimeoutMs: number;
  apiRetryCount: number;
  defaultRestaurantId?: string;
};

/**
 * Batch 10 switch point. Keep local as the safe default for current MVP builds;
 * set these values from app bootstrap before production/server testing.
 */
export const RESTAURANT_MENU_ENV_CONFIG: RestaurantMenuEnvironmentConfig = {
  mode: 'local',
  apiBaseUrl: '',
  apiTimeoutMs: 15000,
  apiRetryCount: 1,
  defaultRestaurantId: 'local_demo_restaurant',
};
