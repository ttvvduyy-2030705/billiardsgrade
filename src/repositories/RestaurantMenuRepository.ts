import type {
  MenuCategory,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentStatus,
} from 'services/restaurantMenuStorage';
import type {
  RestaurantBranch,
  RestaurantBranchPayload,
  RestaurantMenuContext,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantWorkspace,
  RestaurantWorkspacePayload,
} from 'services/restaurantWorkspaceStorage';

export type RestaurantMenuCategoryPayload = {
  id?: string;
  restaurantId?: string;
  name: string;
  sortOrder?: number;
  createdAt?: string;
};

export type RestaurantMenuItemPayload = {
  id?: string;
  restaurantId?: string;
  createdAt?: string;
  name: string;
  price: number;
  categoryId: string;
  description: string;
  imageUrl?: string;
  status?: RestaurantMenuItemStatus;
  available?: boolean;
};

export type RestaurantOrderPayload = Omit<
  RestaurantOrder,
  'id' | 'orderStatus' | 'paymentStatus' | 'createdAt' | 'updatedAt'
> & {
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
  orderSource?: 'admin' | 'customer' | 'local-demo';
  paymentStatus?: RestaurantPaymentStatus;
};

export type DeleteCategoryOptions = {
  moveItemsToCategoryId?: string;
};

export type CategoryMutationResult = {
  ok: boolean;
  message: string;
  categories: MenuCategory[];
};

export interface RestaurantMenuRepository {
  /**
   * Runs lightweight migrations/bootstrap for the selected data source.
   * Local implementation keeps old AsyncStorage demo data readable.
   * API implementation can use it to hydrate the active restaurant context.
   */
  bootstrap(): Promise<void>;

  /**
   * Multi-restaurant context. Every API call must be scoped by restaurantId
   * before this module is used in a real restaurant deployment.
   */
  getActiveContext(): Promise<RestaurantMenuContext>;
  setActiveContext(
    context: Partial<RestaurantMenuContext>,
  ): Promise<RestaurantMenuContext>;

  listRestaurants(): Promise<RestaurantWorkspace[]>;
  createRestaurant(
    payload: RestaurantWorkspacePayload,
  ): Promise<RestaurantWorkspace>;
  listBranches(restaurantId?: string): Promise<RestaurantBranch[]>;
  createBranch(payload: RestaurantBranchPayload): Promise<RestaurantBranch>;
  updateBranch(
    branchId: string,
    payload: Partial<RestaurantBranchPayload>,
  ): Promise<RestaurantBranch>;
  deleteBranch(branchId: string): Promise<RestaurantBranch[]>;

  listTables(restaurantId?: string): Promise<RestaurantTable[]>;
  createTable(payload: RestaurantTablePayload): Promise<RestaurantTable>;
  resolveTableToken(token: string): Promise<RestaurantMenuContext | null>;

  getCategories(): Promise<MenuCategory[]>;
  createCategory(
    payload: RestaurantMenuCategoryPayload,
  ): Promise<CategoryMutationResult>;
  updateCategory(
    id: string,
    payload: RestaurantMenuCategoryPayload,
  ): Promise<CategoryMutationResult>;
  deleteCategory(
    id: string,
    options?: DeleteCategoryOptions,
  ): Promise<CategoryMutationResult>;

  getItems(): Promise<RestaurantMenuItem[]>;
  createItem(payload: RestaurantMenuItemPayload): Promise<RestaurantMenuItem[]>;
  updateItem(
    id: string,
    payload: RestaurantMenuItemPayload,
  ): Promise<RestaurantMenuItem[]>;
  deleteItem(id: string): Promise<RestaurantMenuItem[]>;

  getOrders(): Promise<RestaurantOrder[]>;
  createOrder(payload: RestaurantOrderPayload): Promise<RestaurantOrder[]>;
  updateOrderStatus(
    orderId: string,
    status: RestaurantOrderStatus,
  ): Promise<RestaurantOrder[]>;
  updatePaymentStatus(
    orderId: string,
    paymentStatus: RestaurantPaymentStatus,
  ): Promise<RestaurantOrder[]>;

  getCurrentCart(): Promise<RestaurantCartState>;
  saveCurrentCart(cart: RestaurantCartState): Promise<void>;
  clearCurrentCart(): Promise<void>;
}

export type {
  RestaurantBranch,
  RestaurantBranchPayload,
  RestaurantMenuContext,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantWorkspace,
  RestaurantWorkspacePayload,
} from 'services/restaurantWorkspaceStorage';
