import type {
  CategoryMutationResult,
  DeleteCategoryOptions,
  RestaurantBranchPayload,
  RestaurantMenuCategoryPayload,
  RestaurantMenuContext,
  RestaurantMenuItemPayload,
  RestaurantMenuImageUploadPayload,
  RestaurantMenuImageUploadResult,
  RestaurantMenuRepository,
  RestaurantOrderPayload,
  RestaurantCurrentBillSessionQuery,
  RestaurantBillSessionClosePayload,
  RestaurantBillSessionPaymentPayload,
  RestaurantBillSessionTableTransferPayload,
  RestaurantPublicMenuPayload,
  RestaurantBranch,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantWorkspace,
  RestaurantWorkspacePayload,
} from './RestaurantMenuRepository';
import type {
  MenuCategory,
  RestaurantBillSessionDetail,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentMethod,
  RestaurantPaymentStatus,
} from 'services/restaurantMenuStorage';
import {
  clearCurrentCart,
  closeRestaurantBillSession,
  createRestaurantOrder,
  deleteMenuCategory,
  deleteMenuItem,
  loadCurrentCart,
  loadCurrentBillSession,
  loadBillSessions,
  loadMenuCategories,
  loadMenuItems,
  loadOrders,
  registerRestaurantAdmin,
  saveCurrentCart,
  updateRestaurantBillSessionPayment,
  updateRestaurantBillSessionTable,
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
  deleteRestaurantTable,
  loadActiveRestaurantContext,
  loadRestaurantBranches,
  loadRestaurantTables,
  loadRestaurantWorkspaces,
  resolveRestaurantMenuQrToken,
  resolveRestaurantTableToken,
  saveActiveRestaurantContext,
  updateRestaurantBranch,
  updateRestaurantTable,
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

  updateTable(
    tableId: string,
    payload: Partial<RestaurantTablePayload>,
  ): Promise<RestaurantTable> {
    return updateRestaurantTable(tableId, payload);
  }

  deleteTable(tableId: string): Promise<RestaurantTable[]> {
    return deleteRestaurantTable(tableId);
  }


  async getPublicTablesByQrToken(token: string): Promise<RestaurantTable[]> {
    const cleanToken = String(token || '').trim();
    const context = await resolveRestaurantMenuQrToken(cleanToken);

    if (!context?.restaurantId) {
      throw new Error('QR menu không hợp lệ hoặc đã bị khoá.');
    }

    const tables = await loadRestaurantTables(context.restaurantId);
    return tables.filter(table => {
      const sameBranch = context.branchId
        ? table.branchId === context.branchId
        : true;
      return sameBranch && table.status !== 'HIDDEN';
    });
  }

  async getPublicMenuByQrToken(
    token: string,
  ): Promise<RestaurantPublicMenuPayload> {
    const cleanToken = String(token || '').trim();
    const context = await resolveRestaurantMenuQrToken(cleanToken);

    if (!context?.restaurantId) {
      throw new Error('QR menu không hợp lệ hoặc đã bị khoá.');
    }

    await saveActiveRestaurantContext({
      ...context,
      source: 'customer',
    });

    const [categories, items] = await Promise.all([
      loadMenuCategories(context.restaurantId),
      loadMenuItems(context.restaurantId),
    ]);

    return {
      qrToken: cleanToken,
      context: {
        ...context,
        qrCodeToken: context.qrCodeToken || context.menuQrToken || cleanToken,
        menuQrToken: context.menuQrToken || context.qrCodeToken || cleanToken,
        source: 'customer',
      },
      categories,
      items: items.filter(item => item.status !== 'HIDDEN'),
      receivedAt: new Date().toISOString(),
    };
  }

  resolveMenuQrToken(token: string): Promise<RestaurantMenuContext | null> {
    // Batch 4: resolve branch/menu QR first; old table QR keeps working.
    return resolveRestaurantMenuQrToken(token);
  }

  resolveTableToken(token: string): Promise<RestaurantMenuContext | null> {
    return this.resolveMenuQrToken(token);
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

  async uploadMenuItemImage(
    payload: RestaurantMenuImageUploadPayload,
  ): Promise<RestaurantMenuImageUploadResult> {
    const context = await this.getActiveContext();
    const imageUrl = String(payload.dataUri || payload.uri || '').trim();
    return {
      ok: Boolean(imageUrl),
      restaurantId: context.restaurantId,
      dishId: payload.dishId || payload.itemId,
      imageUrl,
      publicUrl: imageUrl,
      storagePath: imageUrl,
      mimeType: payload.mimeType,
      createdAt: new Date().toISOString(),
    };
  }

  async getOrders(): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    const orders = await loadOrders(context.restaurantId);

    return context.branchId
      ? orders.filter(order => order.branchId === context.branchId)
      : orders;
  }

  async getBillSessions(): Promise<RestaurantBillSessionDetail[]> {
    const context = await this.getActiveContext();
    const billSessions = await loadBillSessions(context.restaurantId);

    return context.branchId
      ? billSessions.filter(billSession => billSession.branchId === context.branchId)
      : billSessions;
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

  async getCurrentBillSession(
    query: RestaurantCurrentBillSessionQuery = {},
  ): Promise<RestaurantBillSessionDetail | null> {
    const context = await this.getActiveContext();
    const billSession = await loadCurrentBillSession(query, context.restaurantId);

    if (!billSession) {
      return null;
    }

    if (context.branchId && billSession.branchId !== context.branchId) {
      return null;
    }

    return billSession;
  }

  async updateBillSessionTable(
    billSessionId: string,
    payload: RestaurantBillSessionTableTransferPayload,
  ): Promise<RestaurantBillSessionDetail> {
    const context = await this.getActiveContext();
    return updateRestaurantBillSessionTable(
      billSessionId,
      payload,
      context.restaurantId,
    );
  }

  async updateBillSessionPayment(
    billSessionId: string,
    payload: RestaurantBillSessionPaymentPayload,
  ): Promise<RestaurantBillSessionDetail> {
    const context = await this.getActiveContext();
    return updateRestaurantBillSessionPayment(
      billSessionId,
      payload,
      context.restaurantId,
    );
  }

  async closeBillSession(
    billSessionId: string,
    payload: RestaurantBillSessionClosePayload = {},
  ): Promise<RestaurantBillSessionDetail> {
    const context = await this.getActiveContext();
    return closeRestaurantBillSession(
      billSessionId,
      payload,
      context.restaurantId,
    );
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
    paymentMethod?: RestaurantPaymentMethod,
  ): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    const orders = await updateRestaurantOrderPaymentStatus(
      orderId,
      paymentStatus,
      context.restaurantId,
      paymentMethod,
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
