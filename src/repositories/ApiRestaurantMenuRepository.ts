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
import {normaliseRestaurantOrder} from 'services/restaurantMenuStorage';
import type {
  MenuCategory,
  RawRestaurantOrder,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentStatus,
} from 'services/restaurantMenuStorage';

export type ApiRestaurantMenuRepositoryConfig = {
  baseUrl: string;
  defaultRestaurantId?: string;
  getAuthToken?: () => Promise<string | undefined> | string | undefined;
};

type ApiRequestInit = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
};

export class ApiRestaurantMenuRepository implements RestaurantMenuRepository {
  private readonly baseUrl: string;
  private readonly getAuthToken?: ApiRestaurantMenuRepositoryConfig['getAuthToken'];
  private activeContext: RestaurantMenuContext;

  constructor(config: ApiRestaurantMenuRepositoryConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAuthToken = config.getAuthToken;
    this.activeContext = {
      restaurantId: config.defaultRestaurantId || '',
      source: 'admin',
    };
  }

  bootstrap(): Promise<void> {
    return Promise.resolve();
  }

  getActiveContext(): Promise<RestaurantMenuContext> {
    if (!this.activeContext.restaurantId) {
      throw new Error(
        'Restaurant Menu API requires an active restaurantId before loading menu data.',
      );
    }

    return Promise.resolve(this.activeContext);
  }

  async setActiveContext(
    context: Partial<RestaurantMenuContext>,
  ): Promise<RestaurantMenuContext> {
    this.activeContext = {
      ...this.activeContext,
      ...context,
      restaurantId: context.restaurantId || this.activeContext.restaurantId,
    };
    return this.getActiveContext();
  }

  private async request<T>(
    path: string,
    init: ApiRequestInit = {},
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('Restaurant Menu API baseUrl is not configured.');
    }

    const token = await this.getAuthToken?.();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(
        `Restaurant Menu API error ${response.status}: ${message || response.statusText}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private async restaurantPath(path: string) {
    const context = await this.getActiveContext();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/restaurants/${encodeURIComponent(context.restaurantId)}${cleanPath}`;
  }

  private normaliseOrders(orders: RawRestaurantOrder[]): RestaurantOrder[] {
    return Array.isArray(orders)
      ? orders.map(order => normaliseRestaurantOrder(order))
      : [];
  }

  listRestaurants(): Promise<RestaurantWorkspace[]> {
    return this.request<RestaurantWorkspace[]>('/restaurants');
  }

  createRestaurant(
    payload: RestaurantWorkspacePayload,
  ): Promise<RestaurantWorkspace> {
    return this.request<RestaurantWorkspace>('/restaurants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listBranches(restaurantId?: string): Promise<RestaurantBranch[]> {
    const targetRestaurantId =
      restaurantId || (await this.getActiveContext()).restaurantId;
    return this.request<RestaurantBranch[]>(
      `/restaurants/${encodeURIComponent(targetRestaurantId)}/branches`,
    );
  }

  async createBranch(
    payload: RestaurantBranchPayload,
  ): Promise<RestaurantBranch> {
    const targetRestaurantId =
      payload.restaurantId || (await this.getActiveContext()).restaurantId;

    return this.request<RestaurantBranch>(
      `/restaurants/${encodeURIComponent(targetRestaurantId)}/branches`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  async updateBranch(
    branchId: string,
    payload: Partial<RestaurantBranchPayload>,
  ): Promise<RestaurantBranch> {
    const targetRestaurantId =
      payload.restaurantId || (await this.getActiveContext()).restaurantId;

    return this.request<RestaurantBranch>(
      `/restaurants/${encodeURIComponent(targetRestaurantId)}/branches/${encodeURIComponent(branchId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  }

  async deleteBranch(branchId: string): Promise<RestaurantBranch[]> {
    return this.request<RestaurantBranch[]>(
      await this.restaurantPath(`/branches/${encodeURIComponent(branchId)}`),
      {method: 'DELETE'},
    );
  }

  async listTables(restaurantId?: string): Promise<RestaurantTable[]> {
    if (restaurantId) {
      return this.request<RestaurantTable[]>(
        `/restaurants/${encodeURIComponent(restaurantId)}/tables`,
      );
    }

    return this.request<RestaurantTable[]>(
      await this.restaurantPath('/tables'),
    );
  }

  async createTable(payload: RestaurantTablePayload): Promise<RestaurantTable> {
    const path = payload.restaurantId
      ? `/restaurants/${encodeURIComponent(payload.restaurantId)}/tables`
      : await this.restaurantPath('/tables');

    return this.request<RestaurantTable>(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async resolveTableToken(
    token: string,
  ): Promise<RestaurantMenuContext | null> {
    return this.request<RestaurantMenuContext | null>(
      `/menu/table-tokens/${encodeURIComponent(token)}`,
    );
  }

  async getCategories(): Promise<MenuCategory[]> {
    return this.request<MenuCategory[]>(
      await this.restaurantPath('/menu/categories'),
    );
  }

  async createCategory(
    payload: RestaurantMenuCategoryPayload,
  ): Promise<CategoryMutationResult> {
    return this.request<CategoryMutationResult>(
      await this.restaurantPath('/menu/categories'),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  async updateCategory(
    id: string,
    payload: RestaurantMenuCategoryPayload,
  ): Promise<CategoryMutationResult> {
    return this.request<CategoryMutationResult>(
      await this.restaurantPath(`/menu/categories/${encodeURIComponent(id)}`),
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  }

  async deleteCategory(
    id: string,
    options: DeleteCategoryOptions = {},
  ): Promise<CategoryMutationResult> {
    return this.request<CategoryMutationResult>(
      await this.restaurantPath(`/menu/categories/${encodeURIComponent(id)}`),
      {
        method: 'DELETE',
        body: JSON.stringify(options),
      },
    );
  }

  async getItems(): Promise<RestaurantMenuItem[]> {
    return this.request<RestaurantMenuItem[]>(
      await this.restaurantPath('/menu/items'),
    );
  }

  async createItem(
    payload: RestaurantMenuItemPayload,
  ): Promise<RestaurantMenuItem[]> {
    return this.request<RestaurantMenuItem[]>(
      await this.restaurantPath('/menu/items'),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  async updateItem(
    id: string,
    payload: RestaurantMenuItemPayload,
  ): Promise<RestaurantMenuItem[]> {
    return this.request<RestaurantMenuItem[]>(
      await this.restaurantPath(`/menu/items/${encodeURIComponent(id)}`),
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  }

  async deleteItem(id: string): Promise<RestaurantMenuItem[]> {
    return this.request<RestaurantMenuItem[]>(
      await this.restaurantPath(`/menu/items/${encodeURIComponent(id)}`),
      {method: 'DELETE'},
    );
  }

  async getOrders(): Promise<RestaurantOrder[]> {
    const orders = await this.request<RawRestaurantOrder[]>(
      await this.restaurantPath('/orders'),
    );
    return this.normaliseOrders(orders);
  }

  async createOrder(
    payload: RestaurantOrderPayload,
  ): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    const orders = await this.request<RawRestaurantOrder[]>(
      await this.restaurantPath('/orders'),
      {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          restaurantId: payload.restaurantId || context.restaurantId,
          branchId: payload.branchId || context.branchId,
          tableId: payload.tableId || context.tableId,
          tableNumber: payload.tableNumber || context.tableNumber,
        }),
      },
    );
    return this.normaliseOrders(orders);
  }

  async updateOrderStatus(
    orderId: string,
    status: RestaurantOrderStatus,
  ): Promise<RestaurantOrder[]> {
    const orders = await this.request<RawRestaurantOrder[]>(
      await this.restaurantPath(
        `/orders/${encodeURIComponent(orderId)}/status`,
      ),
      {
        method: 'PATCH',
        body: JSON.stringify({orderStatus: status}),
      },
    );
    return this.normaliseOrders(orders);
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: RestaurantPaymentStatus,
  ): Promise<RestaurantOrder[]> {
    const orders = await this.request<RawRestaurantOrder[]>(
      await this.restaurantPath(
        `/orders/${encodeURIComponent(orderId)}/payment`,
      ),
      {
        method: 'PATCH',
        body: JSON.stringify({paymentStatus}),
      },
    );
    return this.normaliseOrders(orders);
  }

  async getCurrentCart(): Promise<RestaurantCartState> {
    const context = await this.getActiveContext();
    return this.request<RestaurantCartState>(
      await this.restaurantPath(
        context.tableId
          ? `/tables/${context.tableId}/cart/current`
          : '/menu/cart/current',
      ),
    );
  }

  async saveCurrentCart(cart: RestaurantCartState): Promise<void> {
    const context = await this.getActiveContext();
    await this.request(
      await this.restaurantPath(
        context.tableId
          ? `/tables/${context.tableId}/cart/current`
          : '/menu/cart/current',
      ),
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...cart,
          restaurantId: cart.restaurantId || context.restaurantId,
          branchId: cart.branchId || context.branchId,
          tableId: cart.tableId || context.tableId,
        }),
      },
    );
  }

  async clearCurrentCart(): Promise<void> {
    const context = await this.getActiveContext();
    await this.request(
      await this.restaurantPath(
        context.tableId
          ? `/tables/${context.tableId}/cart/current`
          : '/menu/cart/current',
      ),
      {method: 'DELETE'},
    );
  }
}
