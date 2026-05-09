import {LocalRestaurantMenuRepository} from 'repositories/LocalRestaurantMenuRepository';
import type {
  CategoryMutationResult,
  DeleteCategoryOptions,
  RestaurantBranch,
  RestaurantBranchPayload,
  RestaurantMenuCategoryPayload,
  RestaurantMenuContext,
  RestaurantMenuItemPayload,
  RestaurantMenuRepository,
  RestaurantOrderPayload,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantWorkspace,
  RestaurantWorkspacePayload,
} from 'repositories/RestaurantMenuRepository';
import type {
  MenuCategory,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentStatus,
} from './restaurantMenuStorage';

export type {
  CategoryMutationResult,
  DeleteCategoryOptions,
  RestaurantBranch,
  RestaurantBranchPayload,
  RestaurantMenuCategoryPayload,
  RestaurantMenuContext,
  RestaurantMenuItemPayload,
  RestaurantMenuRepository,
  RestaurantOrderPayload,
  RestaurantTable,
  RestaurantTablePayload,
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
  RestaurantPaymentStatus,
} from './restaurantMenuStorage';
export {
  DEFAULT_DRINK_CATEGORY_ID,
  DEFAULT_FOOD_CATEGORY_ID,
  DEFAULT_MENU_CATEGORIES,
  getCategoryNameById,
  getDefaultMenuItems,
  getMenuCategories,
} from './restaurantMenuStorage';
export {
  DEFAULT_RESTAURANT_ID,
  getDefaultRestaurantWorkspace,
} from './restaurantWorkspaceStorage';
export {
  getMenuItemImageValue,
  normaliseMenuImageUri,
} from './restaurantMenuImage';

const localRepository = new LocalRestaurantMenuRepository();
let activeRepository: RestaurantMenuRepository = localRepository;

export const getRestaurantMenuRepository = () => activeRepository;

export const setRestaurantMenuRepository = (
  repository: RestaurantMenuRepository | null | undefined,
) => {
  activeRepository = repository || localRepository;
};

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

export const resolveRestaurantTableToken = (
  token: string,
): Promise<RestaurantMenuContext | null> => {
  return activeRepository.resolveTableToken(token);
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
): Promise<RestaurantOrder[]> => {
  return activeRepository.updatePaymentStatus(orderId, paymentStatus);
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
