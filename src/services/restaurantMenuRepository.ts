import {
  RESTAURANT_MENU_ENV_CONFIG,
  getRestaurantMenuEnvironmentLabel,
} from 'config/restaurantMenu';
import {ApiRestaurantMenuRepository} from 'repositories/ApiRestaurantMenuRepository';
import {LocalRestaurantMenuRepository} from 'repositories/LocalRestaurantMenuRepository';
import type {
  CategoryMutationResult,
  DeleteCategoryOptions,
  RestaurantAdminCredentialResult,
  RestaurantBranch,
  RestaurantBranchPayload,
  RestaurantMenuCategoryPayload,
  RestaurantMenuContext,
  RestaurantMenuItemPayload,
  RestaurantMenuImageUploadPayload,
  RestaurantMenuImageUploadResult,
  RestaurantMenuRepository,
  RestaurantOrderPayload,
  RestaurantPublicMenuPayload,
  RestaurantQrResolveContext,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantTableStatus,
  RestaurantWorkspace,
  RestaurantWorkspacePayload,
} from 'repositories/RestaurantMenuRepository';
import type {
  MenuCategory,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentMethod,
  RestaurantPaymentStatus,
} from './restaurantMenuStorage';

export type {
  CategoryMutationResult,
  DeleteCategoryOptions,
  RestaurantAdminCredentialResult,
  RestaurantBranch,
  RestaurantBranchPayload,
  RestaurantMenuCategoryPayload,
  RestaurantMenuContext,
  RestaurantMenuItemPayload,
  RestaurantMenuImageUploadPayload,
  RestaurantMenuImageUploadResult,
  RestaurantMenuRepository,
  RestaurantOrderPayload,
  RestaurantPublicMenuPayload,
  RestaurantQrResolveContext,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantTableStatus,
  RestaurantWorkspace,
  RestaurantWorkspacePayload,
} from 'repositories/RestaurantMenuRepository';
export type {
  MenuCategory,
  RestaurantAdminAccount,
  RestaurantCartItem,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
  RestaurantOrder,
  RestaurantOrderItem,
  RestaurantOrderStatus,
  RestaurantPaymentMethod,
  RestaurantPaymentStatus,
} from './restaurantMenuStorage';
export {
  DEFAULT_DRINK_CATEGORY_ID,
  DEFAULT_FOOD_CATEGORY_ID,
  DEFAULT_MENU_CATEGORIES,
  getCategoryNameById,
  getDefaultMenuItems,
  getMenuCategories,
  RESTAURANT_PAYMENT_METHODS,
} from './restaurantMenuStorage';
export {
  DEFAULT_RESTAURANT_ID,
  getDefaultRestaurantWorkspace,
  resetActiveRestaurantContext,
} from './restaurantWorkspaceStorage';
export {
  getMenuItemImageValue,
  normaliseMenuImageUri,
} from './restaurantMenuImage';

const localRepository = new LocalRestaurantMenuRepository();
let activeRepository: RestaurantMenuRepository = localRepository;
let activeRepositoryMode: 'local' | 'api' | 'custom' = 'local';

export type ConfigureRestaurantMenuRepositoryOptions = {
  mode?: 'local' | 'api';
  baseUrl?: string;
  defaultRestaurantId?: string;
  timeoutMs?: number;
  retryCount?: number;
  getAuthToken?: () => Promise<string | undefined> | string | undefined;
};

export const getRestaurantMenuRepository = () => activeRepository;
export const getRestaurantMenuRepositoryMode = () => activeRepositoryMode;
export const getRestaurantMenuEnvironment = () => RESTAURANT_MENU_ENV_CONFIG;
export const getRestaurantMenuEnvironmentStatusLabel = () =>
  getRestaurantMenuEnvironmentLabel(RESTAURANT_MENU_ENV_CONFIG);

export const setRestaurantMenuRepository = (
  repository: RestaurantMenuRepository | null | undefined,
) => {
  activeRepository = repository || localRepository;
  activeRepositoryMode = repository ? 'custom' : 'local';
};

export const configureRestaurantMenuRepository = (
  options: ConfigureRestaurantMenuRepositoryOptions = {},
) => {
  const mode = options.mode || RESTAURANT_MENU_ENV_CONFIG.mode;

  if (mode === 'api') {
    const baseUrl = options.baseUrl || RESTAURANT_MENU_ENV_CONFIG.apiBaseUrl;

    // Batch 9: never silently fall back to local data when API mode is selected.
    // If baseUrl is missing, the API repository will surface a clear
    // configuration error on the first request. This prevents real-device tests
    // from looking successful while actually reading AsyncStorage/local seed.
    activeRepository = new ApiRestaurantMenuRepository({
      baseUrl,
      defaultRestaurantId:
        options.defaultRestaurantId ||
        RESTAURANT_MENU_ENV_CONFIG.defaultRestaurantId,
      timeoutMs: options.timeoutMs || RESTAURANT_MENU_ENV_CONFIG.apiTimeoutMs,
      retryCount:
        options.retryCount ?? RESTAURANT_MENU_ENV_CONFIG.apiRetryCount,
      getAuthToken: options.getAuthToken,
    });
    activeRepositoryMode = 'api';
    return activeRepository;
  }

  activeRepository = localRepository;
  activeRepositoryMode = 'local';
  return activeRepository;
};

configureRestaurantMenuRepository();

export const bootstrapRestaurantMenuRepository = () => {
  return activeRepository.bootstrap();
};

export const getActiveRestaurantContext =
  (): Promise<RestaurantMenuContext> => {
    return activeRepository.getActiveContext();
  };

export const setActiveRestaurantContext = (
  context: Partial<RestaurantMenuContext>,
): Promise<RestaurantMenuContext> => {
  return activeRepository.setActiveContext(context);
};

export const loadRestaurantWorkspaces = (): Promise<RestaurantWorkspace[]> => {
  return activeRepository.listRestaurants();
};

export const verifyRestaurantAdminCredentials = (
  username: string,
  password: string,
): Promise<RestaurantAdminCredentialResult> => {
  return activeRepository.verifyAdminCredentials(username, password);
};

export const registerRestaurantAdminCredentials = (
  username: string,
  password: string,
): Promise<RestaurantAdminCredentialResult> => {
  return activeRepository.registerAdminAccount(username, password);
};

export const createRestaurantWorkspace = (
  payload: RestaurantWorkspacePayload,
): Promise<RestaurantWorkspace> => {
  return activeRepository.createRestaurant(payload);
};

export const loadRestaurantBranches = (
  restaurantId?: string,
): Promise<RestaurantBranch[]> => {
  return activeRepository.listBranches(restaurantId);
};

export const createRestaurantBranch = (
  payload: RestaurantBranchPayload,
): Promise<RestaurantBranch> => {
  return activeRepository.createBranch(payload);
};

export const updateRestaurantBranch = (
  branchId: string,
  payload: Partial<RestaurantBranchPayload>,
): Promise<RestaurantBranch> => {
  return activeRepository.updateBranch(branchId, payload);
};

export const deleteRestaurantBranch = (
  branchId: string,
): Promise<RestaurantBranch[]> => {
  return activeRepository.deleteBranch(branchId);
};

export const loadRestaurantTables = (
  restaurantId?: string,
): Promise<RestaurantTable[]> => {
  return activeRepository.listTables(restaurantId);
};

export const createRestaurantTable = (
  payload: RestaurantTablePayload,
): Promise<RestaurantTable> => {
  return activeRepository.createTable(payload);
};

export const updateRestaurantTable = (
  tableId: string,
  payload: Partial<RestaurantTablePayload>,
): Promise<RestaurantTable> => {
  return activeRepository.updateTable(tableId, payload);
};

export const deleteRestaurantTable = (
  tableId: string,
): Promise<RestaurantTable[]> => {
  return activeRepository.deleteTable(tableId);
};

export const resolveRestaurantMenuQrToken = (
  token: string,
): Promise<RestaurantQrResolveContext | null> => {
  return activeRepository.resolveMenuQrToken(token);
};

/** @deprecated Use resolveRestaurantMenuQrToken for Batch 1+ QR architecture. */
export const resolveRestaurantTableToken = (
  token: string,
): Promise<RestaurantQrResolveContext | null> => {
  return activeRepository.resolveTableToken(token);
};


export const loadPublicMenuByQrToken = (
  token: string,
): Promise<RestaurantPublicMenuPayload> => {
  return activeRepository.getPublicMenuByQrToken(token);
};

export const loadPublicTablesByQrToken = (
  token: string,
): Promise<RestaurantTable[]> => {
  return activeRepository.getPublicTablesByQrToken(token);
};

export const loadMenuCategories = (): Promise<MenuCategory[]> => {
  return activeRepository.getCategories();
};

export const createMenuCategory = (
  payload: RestaurantMenuCategoryPayload,
): Promise<CategoryMutationResult> => {
  return activeRepository.createCategory(payload);
};

export const updateMenuCategory = (
  id: string,
  payload: RestaurantMenuCategoryPayload,
): Promise<CategoryMutationResult> => {
  return activeRepository.updateCategory(id, payload);
};

export const deleteMenuCategory = (
  id: string,
  options: DeleteCategoryOptions = {},
): Promise<CategoryMutationResult> => {
  return activeRepository.deleteCategory(id, options);
};

export const loadMenuItems = (): Promise<RestaurantMenuItem[]> => {
  return activeRepository.getItems();
};

export const createMenuItem = (
  payload: RestaurantMenuItemPayload,
): Promise<RestaurantMenuItem[]> => {
  return activeRepository.createItem(payload);
};

export const updateMenuItem = (
  id: string,
  payload: RestaurantMenuItemPayload,
): Promise<RestaurantMenuItem[]> => {
  return activeRepository.updateItem(id, payload);
};

export const deleteMenuItem = (id: string): Promise<RestaurantMenuItem[]> => {
  return activeRepository.deleteItem(id);
};

export const uploadRestaurantMenuImage = (
  payload: RestaurantMenuImageUploadPayload,
): Promise<RestaurantMenuImageUploadResult> => {
  return activeRepository.uploadMenuItemImage(payload);
};

export const loadOrders = (): Promise<RestaurantOrder[]> => {
  return activeRepository.getOrders();
};

export const createRestaurantOrder = (
  payload: RestaurantOrderPayload,
): Promise<RestaurantOrder[]> => {
  return activeRepository.createOrder(payload);
};

export const updateRestaurantOrderStatus = (
  orderId: string,
  status: RestaurantOrderStatus,
): Promise<RestaurantOrder[]> => {
  return activeRepository.updateOrderStatus(orderId, status);
};

export const updateRestaurantOrderPaymentStatus = (
  orderId: string,
  paymentStatus: RestaurantPaymentStatus,
  paymentMethod?: RestaurantPaymentMethod,
): Promise<RestaurantOrder[]> => {
  return activeRepository.updatePaymentStatus(orderId, paymentStatus, paymentMethod);
};

export const loadCurrentCart = (): Promise<RestaurantCartState> => {
  return activeRepository.getCurrentCart();
};

export const saveCurrentCart = (cart: RestaurantCartState): Promise<void> => {
  return activeRepository.saveCurrentCart(cart);
};

export const clearCurrentCart = (): Promise<void> => {
  return activeRepository.clearCurrentCart();
};

// Backwards-compatible names used by the current Admin service.
export const upsertMenuCategory = async (
  input: RestaurantMenuCategoryPayload,
): Promise<CategoryMutationResult> => {
  if (input.id) {
    return activeRepository.updateCategory(input.id, input);
  }
  return activeRepository.createCategory(input);
};

export const upsertMenuItem = async (
  input: RestaurantMenuItemPayload,
): Promise<RestaurantMenuItem[]> => {
  if (input.id) {
    return activeRepository.updateItem(input.id, input);
  }
  return activeRepository.createItem(input);
};
