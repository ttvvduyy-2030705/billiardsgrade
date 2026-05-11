export type RestaurantMenuRepositoryMode = 'local' | 'api';

export type RestaurantMenuEnvironmentConfig = {
  mode: RestaurantMenuRepositoryMode;
  apiBaseUrl: string;
  apiTimeoutMs: number;
  apiRetryCount: number;
  defaultRestaurantId?: string;
};

/**
 * Batch 10-12 switch point. Keep local as the safe default for current MVP builds.
 * Batch 12 backend runs at http://localhost:4012. On Android emulator use
 * http://10.0.2.2:4012, or the LAN IP of your server machine for real devices.
 * Switch mode to 'api' in batch 13 testing when you want app screens to read the server.
 */
export const RESTAURANT_MENU_ENV_CONFIG: RestaurantMenuEnvironmentConfig = {
  mode: 'local',
  apiBaseUrl: '', // Example for Android emulator: 'http://10.0.2.2:4012'
  apiTimeoutMs: 15000,
  apiRetryCount: 1,
  defaultRestaurantId: 'local_demo_restaurant', // API seed example: 'aplus_billiards_hanoi'
};
