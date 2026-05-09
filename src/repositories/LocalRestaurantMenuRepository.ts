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
  registerRestaurantAdmin,
  saveCurrentCart,
  updateRestaurantOrderPaymentStatus,
  updateRestaurantOrderStatus,
  upsertMenuCategory,
  upsertMenuItem,
  verifyRestaurantAdmin,
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
    // These loaders run the existing AsyncStorage schema migration safely and
    // keep local menu/order/cart data scoped by active restaurantId.
    const context = await loadActiveRestaurantContext();
    await Promise.all([
      loadRestaurantWorkspaces(),
      loadRestaurantBranches(context.restaurantId),
      loadRestaurantTables(context.restaurantId),
      loadMenuCategories(context.restaurantId),
      loadMenuItems(context.restaurantId),
      loadOrders(context.restaurantId),
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

  async verifyAdminCredentials(username: string, password: string) {
    const context = await this.getActiveContext();
    return verifyRestaurantAdmin(username, password, context.restaurantId);
  }

  async registerAdminAccount(username: string, password: string) {
    const context = await this.getActiveContext();
    return registerRestaurantAdmin(username, password, context.restaurantId);
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

  async getCategories(): Promise<MenuCategory[]> {
    const context = await this.getActiveContext();
    return loadMenuCategories(context.restaurantId);
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

  async deleteCategory(
    id: string,
    options: DeleteCategoryOptions = {},
  ): Promise<CategoryMutationResult> {
    const context = await this.getActiveContext();
    return deleteMenuCategory(id, {
      ...options,
      restaurantId: options.restaurantId || context.restaurantId,
    });
  }

  async getItems(): Promise<RestaurantMenuItem[]> {
    const context = await this.getActiveContext();
    return loadMenuItems(context.restaurantId);
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

  async deleteItem(id: string): Promise<RestaurantMenuItem[]> {
    const context = await this.getActiveContext();
    return deleteMenuItem(id, context.restaurantId);
  }

  async getOrders(): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    const orders = await loadOrders(context.restaurantId);

    return context.branchId
      ? orders.filter(order => order.branchId === context.branchId)
      : orders;
  }

  async createOrder(
    payload: RestaurantOrderPayload,
  ): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    const orders = await createRestaurantOrder({
      ...payload,
      restaurantId: payload.restaurantId || context.restaurantId,
      branchId: payload.branchId || context.branchId,
      tableId: payload.tableId || context.tableId,
      tableNumber: payload.tableNumber || context.tableNumber || '',
      orderSource: payload.orderSource || context.source || 'local-demo',
    });
    return context.branchId
      ? orders.filter(order => order.branchId === context.branchId)
      : orders;
  }

  async updateOrderStatus(
    orderId: string,
    status: RestaurantOrderStatus,
  ): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    const orders = await updateRestaurantOrderStatus(
      orderId,
      status,
      context.restaurantId,
    );
    return context.branchId
      ? orders.filter(order => order.branchId === context.branchId)
      : orders;
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: RestaurantPaymentStatus,
  ): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    const orders = await updateRestaurantOrderPaymentStatus(
      orderId,
      paymentStatus,
      context.restaurantId,
    );
    return context.branchId
      ? orders.filter(order => order.branchId === context.branchId)
      : orders;
  }

  async getCurrentCart(): Promise<RestaurantCartState> {
    const context = await this.getActiveContext();
    const cart = await loadCurrentCart(context.restaurantId);

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
    return saveCurrentCart(
      {
        ...cart,
        restaurantId: cart.restaurantId || context.restaurantId,
        branchId: cart.branchId || context.branchId,
        tableId: cart.tableId || context.tableId,
      },
      context.restaurantId,
    );
  }

  async clearCurrentCart(): Promise<void> {
    const context = await this.getActiveContext();
    return clearCurrentCart(context.restaurantId);
  }
}
