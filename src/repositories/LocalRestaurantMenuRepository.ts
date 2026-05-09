import type {
  CategoryMutationResult,
  DeleteCategoryOptions,
  RestaurantBranchPayload,
  RestaurantMenuCategoryPayload,
  RestaurantMenuContext,
  RestaurantMenuItemPayload,
  RestaurantMenuRepository,
  RestaurantOrderPayload,
  RestaurantBranch,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantWorkspace,
  RestaurantWorkspacePayload,
} from './RestaurantMenuRepository';
import type {
  MenuCategory,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentStatus,
} from 'services/restaurantMenuStorage';
import {
  clearCurrentCart,
  createRestaurantOrder,
  deleteMenuCategory,
  deleteMenuItem,
  loadCurrentCart,
  loadMenuCategories,
  loadMenuItems,
  loadOrders,
  saveCurrentCart,
  updateRestaurantOrderPaymentStatus,
  updateRestaurantOrderStatus,
  upsertMenuCategory,
  upsertMenuItem,
} from 'services/restaurantMenuStorage';
import {
  createRestaurantBranch,
  createRestaurantTable,
  createRestaurantWorkspace,
  deleteRestaurantBranch,
  loadActiveRestaurantContext,
  loadRestaurantBranches,
  loadRestaurantTables,
  loadRestaurantWorkspaces,
  resolveRestaurantTableToken,
  saveActiveRestaurantContext,
  updateRestaurantBranch,
} from 'services/restaurantWorkspaceStorage';

export class LocalRestaurantMenuRepository implements RestaurantMenuRepository {
  async bootstrap(): Promise<void> {
    // These loaders run the existing AsyncStorage schema migration safely.
    await Promise.all([
      loadRestaurantWorkspaces(),
      loadRestaurantBranches(),
      loadRestaurantTables(),
      loadActiveRestaurantContext(),
      loadMenuCategories(),
      loadMenuItems(),
      loadOrders(),
    ]);
  }

  getActiveContext(): Promise<RestaurantMenuContext> {
    return loadActiveRestaurantContext();
  }

  setActiveContext(
    context: Partial<RestaurantMenuContext>,
  ): Promise<RestaurantMenuContext> {
    return saveActiveRestaurantContext(context);
  }

  listRestaurants(): Promise<RestaurantWorkspace[]> {
    return loadRestaurantWorkspaces();
  }

  createRestaurant(
    payload: RestaurantWorkspacePayload,
  ): Promise<RestaurantWorkspace> {
    return createRestaurantWorkspace(payload);
  }

  listBranches(restaurantId?: string): Promise<RestaurantBranch[]> {
    return loadRestaurantBranches(restaurantId);
  }

  createBranch(payload: RestaurantBranchPayload): Promise<RestaurantBranch> {
    return createRestaurantBranch(payload);
  }

  updateBranch(
    branchId: string,
    payload: Partial<RestaurantBranchPayload>,
  ): Promise<RestaurantBranch> {
    return updateRestaurantBranch(branchId, payload);
  }

  deleteBranch(branchId: string): Promise<RestaurantBranch[]> {
    return deleteRestaurantBranch(branchId);
  }

  listTables(restaurantId?: string): Promise<RestaurantTable[]> {
    return loadRestaurantTables(restaurantId);
  }

  createTable(payload: RestaurantTablePayload): Promise<RestaurantTable> {
    return createRestaurantTable(payload);
  }

  resolveTableToken(token: string): Promise<RestaurantMenuContext | null> {
    return resolveRestaurantTableToken(token);
  }

  getCategories(): Promise<MenuCategory[]> {
    return loadMenuCategories();
  }

  async createCategory(
    payload: RestaurantMenuCategoryPayload,
  ): Promise<CategoryMutationResult> {
    const context = await this.getActiveContext();
    return upsertMenuCategory({
      ...payload,
      restaurantId: payload.restaurantId || context.restaurantId,
    });
  }

  async updateCategory(
    id: string,
    payload: RestaurantMenuCategoryPayload,
  ): Promise<CategoryMutationResult> {
    const context = await this.getActiveContext();
    return upsertMenuCategory({
      ...payload,
      id,
      restaurantId: payload.restaurantId || context.restaurantId,
    });
  }

  deleteCategory(
    id: string,
    options: DeleteCategoryOptions = {},
  ): Promise<CategoryMutationResult> {
    return deleteMenuCategory(id, options);
  }

  getItems(): Promise<RestaurantMenuItem[]> {
    return loadMenuItems();
  }

  async createItem(
    payload: RestaurantMenuItemPayload,
  ): Promise<RestaurantMenuItem[]> {
    const context = await this.getActiveContext();
    return upsertMenuItem({
      ...payload,
      restaurantId: payload.restaurantId || context.restaurantId,
    });
  }

  async updateItem(
    id: string,
    payload: RestaurantMenuItemPayload,
  ): Promise<RestaurantMenuItem[]> {
    const context = await this.getActiveContext();
    return upsertMenuItem({
      ...payload,
      id,
      restaurantId: payload.restaurantId || context.restaurantId,
    });
  }

  deleteItem(id: string): Promise<RestaurantMenuItem[]> {
    return deleteMenuItem(id);
  }

  getOrders(): Promise<RestaurantOrder[]> {
    return loadOrders();
  }

  async createOrder(
    payload: RestaurantOrderPayload,
  ): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    return createRestaurantOrder({
      ...payload,
      restaurantId: payload.restaurantId || context.restaurantId,
      branchId: payload.branchId || context.branchId,
      tableId: payload.tableId || context.tableId,
      tableNumber: payload.tableNumber || context.tableNumber || '',
      orderSource: payload.orderSource || context.source || 'local-demo',
    });
  }

  updateOrderStatus(
    orderId: string,
    status: RestaurantOrderStatus,
  ): Promise<RestaurantOrder[]> {
    return updateRestaurantOrderStatus(orderId, status);
  }

  updatePaymentStatus(
    orderId: string,
    paymentStatus: RestaurantPaymentStatus,
  ): Promise<RestaurantOrder[]> {
    return updateRestaurantOrderPaymentStatus(orderId, paymentStatus);
  }

  async getCurrentCart(): Promise<RestaurantCartState> {
    const [context, cart] = await Promise.all([
      this.getActiveContext(),
      loadCurrentCart(),
    ]);

    return {
      ...cart,
      restaurantId: cart.restaurantId || context.restaurantId,
      branchId: cart.branchId || context.branchId,
      tableId: cart.tableId || context.tableId,
      tableNumber: cart.tableNumber || context.tableNumber || '',
    };
  }

  async saveCurrentCart(cart: RestaurantCartState): Promise<void> {
    const context = await this.getActiveContext();
    return saveCurrentCart({
      ...cart,
      restaurantId: cart.restaurantId || context.restaurantId,
      branchId: cart.branchId || context.branchId,
      tableId: cart.tableId || context.tableId,
    });
  }

  clearCurrentCart(): Promise<void> {
    return clearCurrentCart();
  }
}
