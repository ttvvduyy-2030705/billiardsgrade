export type RestaurantMenuRepositoryMode = 'local' | 'api';

export type RestaurantMenuEnvironmentConfig = {
  mode: RestaurantMenuRepositoryMode;
  apiBaseUrl: string;
  apiTimeoutMs: number;
  apiRetryCount: number;
  defaultRestaurantId?: string;
  /**
   * Development helper for opening the customer menu from the Home button.
   * In production this value should come from a QR/deep link route param.
   */
  defaultTableToken?: string;
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
  defaultRestaurantId: 'haidilao_local_demo', // API seed example: 'haidilao_demo'
  // Local demo tokens: 'qr_haidilao_local_01' or 'qr_local_main_01'. API seed examples: 'qr_haidilao_main_01', 'qr_aplus_main_01'
  defaultTableToken: 'qr_haidilao_local_01',
};
