import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CategoryMutationResult,
  DeleteCategoryOptions,
  RestaurantAdminCredentialResult,
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
import {
  normaliseRestaurantBillSession,
  normaliseRestaurantOrder,
} from 'services/restaurantMenuStorage';
import {devModuleLog, devModuleWarn} from 'utils/devLogger';
import type {
  MenuCategory,
  RawRestaurantBillSession,
  RawRestaurantOrder,
  RestaurantBillSessionDetail,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentMethod,
  RestaurantPaymentStatus,
} from 'services/restaurantMenuStorage';

export type RestaurantMenuApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'API_ERROR';

export class RestaurantMenuApiError extends Error {
  status?: number;
  code: RestaurantMenuApiErrorCode;
  details?: unknown;

  constructor({
    code,
    message,
    status,
    details,
  }: {
    code: RestaurantMenuApiErrorCode;
    message: string;
    status?: number;
    details?: unknown;
  }) {
    super(message);
    this.name = 'RestaurantMenuApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type ApiRestaurantMenuRepositoryConfig = {
  baseUrl: string;
  defaultRestaurantId?: string;
  timeoutMs?: number;
  retryCount?: number;
  getAuthToken?: () => Promise<string | undefined> | string | undefined;
};

type ApiRequestInit = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retryCount?: number;
};

type ApiPublicMenuPayload = Partial<RestaurantPublicMenuPayload> & {
  context?: RestaurantMenuContext;
  categories?: MenuCategory[];
  items?: RestaurantMenuItem[];
};

type ApiPublicOrderResponse = RawRestaurantOrder[] | {
  billSessionId?: string;
  tableId?: string;
  tableNumber?: string;
  order?: RawRestaurantOrder;
  orders?: RawRestaurantOrder[];
  billTotal?: number;
  billSession?: RawRestaurantBillSession;
};

const DEFAULT_API_TIMEOUT_MS = 15000;
const DEFAULT_API_RETRY_COUNT = 1;
const ADMIN_SESSION_STORAGE_KEY = 'restaurant_admin_session_v1';

const LEGACY_DEMO_RESTAURANT_IDS = new Set([
  'aplus_billiards_hanoi',
  'aplus_hanoi',
  'haidilao_demo',
  'haidilao_local_demo',
  'local_restaurant',
  'legacy_removed_restaurant',
]);

const isLegacyDemoRestaurantId = (restaurantId?: string | null) => {
  const id = String(restaurantId || '').trim();
  return Boolean(id) && (LEGACY_DEMO_RESTAURANT_IDS.has(id) || /^aplus_|^haidilao_|^seed_|^sample_/i.test(id));
};


const wait = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const isReadRequest = (method?: string) => {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  return normalizedMethod === 'GET' || normalizedMethod === 'HEAD';
};

const toReadableApiMessage = (status: number, fallback: string) => {
  switch (status) {
    case 400:
      return fallback || 'Dữ liệu gửi lên chưa hợp lệ.';
    case 401:
      return fallback || 'Tài khoản hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.';
    case 403:
      return 'Tài khoản không có quyền thao tác dữ liệu này.';
    case 404:
      return 'Không tìm thấy dữ liệu cần xử lý.';
    case 409:
      return fallback || 'Dữ liệu bị trùng hoặc xung đột.';
    case 429:
      return fallback || 'Bạn thao tác quá nhanh. Vui lòng chờ vài phút rồi thử lại.';
    default:
      if (status >= 500) {
        return 'Server menu đang lỗi. Vui lòng thử lại sau.';
      }
      return fallback || 'API menu trả về lỗi không xác định.';
  }
};

const statusToErrorCode = (status: number): RestaurantMenuApiErrorCode => {
  if (status === 401) {
    return 'UNAUTHORIZED';
  }
  if (status === 403) {
    return 'FORBIDDEN';
  }
  if (status === 404) {
    return 'NOT_FOUND';
  }
  if (status === 429) {
    return 'RATE_LIMIT';
  }
  if (status === 400 || status === 409 || status === 422) {
    return 'VALIDATION_ERROR';
  }
  if (status >= 500) {
    return 'SERVER_ERROR';
  }
  return 'API_ERROR';
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text().catch(() => '');

  if (!text) {
    return {text: '', json: undefined as unknown};
  }

  try {
    return {text, json: JSON.parse(text) as unknown};
  } catch (_error) {
    return {text, json: undefined as unknown};
  }
};

const getResponseRequestId = (response: Response, body?: {text: string; json: unknown}) => {
  const headerRequestId =
    response.headers?.get?.('x-request-id') ||
    response.headers?.get?.('x-correlation-id') ||
    '';

  if (headerRequestId) {
    return headerRequestId;
  }

  if (body?.json && typeof body.json === 'object') {
    const payload = body.json as Record<string, unknown>;
    const requestId = payload.requestId || payload.traceId || payload.correlationId;
    return typeof requestId === 'string' ? requestId : '';
  }

  return '';
};

const extractApiMessage = (body: {text: string; json: unknown}) => {
  if (body.json && typeof body.json === 'object') {
    const payload = body.json as Record<string, unknown>;
    const message = payload.message || payload.error || payload.detail;

    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return body.text;
};

const readStoredAdminToken = async () => {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as {token?: string; expiresAt?: string};
    const expiresAt = Date.parse(parsed.expiresAt || '');
    if (!parsed.token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return undefined;
    }
    return parsed.token;
  } catch (_error) {
    return undefined;
  }
};

export class ApiRestaurantMenuRepository implements RestaurantMenuRepository {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retryCount: number;
  private readonly getAuthToken?: ApiRestaurantMenuRepositoryConfig['getAuthToken'];
  private activeContext: RestaurantMenuContext;
  private publicMenuCache: {
    token: string;
    payload: RestaurantPublicMenuPayload;
  } | null = null;

  constructor(config: ApiRestaurantMenuRepositoryConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs || DEFAULT_API_TIMEOUT_MS;
    this.retryCount = Math.max(0, config.retryCount ?? DEFAULT_API_RETRY_COUNT);
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
      throw new RestaurantMenuApiError({
        code: 'VALIDATION_ERROR',
        message:
          'Restaurant Menu API requires an active restaurantId before loading menu data.',
      });
    }

    return Promise.resolve(this.activeContext);
  }

  async setActiveContext(
    context: Partial<RestaurantMenuContext>,
  ): Promise<RestaurantMenuContext> {
    const previousToken = this.getCustomerMenuToken(this.activeContext);
    this.activeContext = {
      ...this.activeContext,
      ...context,
      restaurantId: context.restaurantId || this.activeContext.restaurantId,
    };
    if (previousToken !== this.getCustomerMenuToken(this.activeContext)) {
      this.publicMenuCache = null;
    }
    return this.getActiveContext();
  }

  private getCustomerMenuToken(context: Partial<RestaurantMenuContext>) {
    if (context.qrTokenScope === 'TABLE' && context.qrCodeToken) {
      return String(context.qrCodeToken).trim();
    }

    return String(context.menuQrToken || context.qrCodeToken || '').trim();
  }

  private isCustomerTableContext(context: RestaurantMenuContext) {
    return context.source === 'customer' && Boolean(this.getCustomerMenuToken(context));
  }

  private normalisePublicMenuPayload(
    token: string,
    payload: ApiPublicMenuPayload,
  ): RestaurantPublicMenuPayload {
    const context = payload.context || this.activeContext;
    const nextContext: RestaurantPublicMenuPayload['context'] = {
      ...context,
      restaurantId: context.restaurantId || this.activeContext.restaurantId,
      qrCodeToken: context.qrCodeToken || context.menuQrToken || token,
      menuQrToken: context.menuQrToken || context.qrCodeToken || token,
      qrTokenScope:
        context.qrTokenScope || (context.tableId ? 'TABLE' : 'BRANCH_MENU'),
      source: 'customer',
    };

    return {
      qrToken: token,
      context: nextContext,
      categories: Array.isArray(payload.categories) ? payload.categories : [],
      items: Array.isArray(payload.items)
        ? payload.items.filter(item => item.status !== 'HIDDEN')
        : [],
      receivedAt: payload.receivedAt || new Date().toISOString(),
    };
  }

  async getPublicTablesByQrToken(token: string): Promise<RestaurantTable[]> {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
      throw new RestaurantMenuApiError({
        code: 'VALIDATION_ERROR',
        message: 'Thiếu QR menu để tải danh sách bàn.',
      });
    }

    return this.request<RestaurantTable[]>(
      `/public/menu/${encodeURIComponent(cleanToken)}/tables`,
    );
  }

  async getPublicMenuByQrToken(
    token: string,
  ): Promise<RestaurantPublicMenuPayload> {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
      throw new RestaurantMenuApiError({
        code: 'VALIDATION_ERROR',
        message: 'Thiếu QR menu để tải menu khách.',
      });
    }

    if (this.publicMenuCache?.token === cleanToken) {
      return this.publicMenuCache.payload;
    }

    const payload = await this.request<ApiPublicMenuPayload>(
      `/public/menu/${encodeURIComponent(cleanToken)}`,
    );
    const publicMenu = this.normalisePublicMenuPayload(cleanToken, payload);

    this.activeContext = {
      ...this.activeContext,
      ...publicMenu.context,
      source: 'customer',
    };
    this.publicMenuCache = {token: cleanToken, payload: publicMenu};
    return publicMenu;
  }

  private async getPublicMenu(
    context: RestaurantMenuContext,
  ): Promise<RestaurantPublicMenuPayload> {
    const token = this.getCustomerMenuToken(context);
    return this.getPublicMenuByQrToken(token);
  }

  private async publicTablePath(suffix: string) {
    const context = await this.getActiveContext();
    const token = this.getCustomerMenuToken(context);
    if (!this.isCustomerTableContext(context) || !token) {
      return '';
    }
    const cleanSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
    return `/public/menu/${encodeURIComponent(token)}${cleanSuffix}`;
  }

  private async requestOnce<T>(
    path: string,
    init: ApiRequestInit = {},
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new RestaurantMenuApiError({
        code: 'VALIDATION_ERROR',
        message: 'API mode đang bật nhưng chưa cấu hình baseUrl. Vui lòng chọn local hoặc nhập apiBaseUrl cho dev-api/staging/prod.',
      });
    }

    const token = (await this.getAuthToken?.()) || (await readStoredAdminToken());
    const controller =
      typeof AbortController !== 'undefined'
        ? new AbortController()
        : undefined;
    const timeoutMs = init.timeoutMs || this.timeoutMs;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

    const method = init.method || 'GET';
    const startedAt = Date.now();

    try {
      devModuleLog('API', 'request:start', {method, path});
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        body: init.body,
        signal: controller?.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
          ...(init.headers || {}),
        },
      });

      if (!response.ok) {
        const body = await parseResponseBody(response);
        const rawMessage = extractApiMessage(body);
        const requestId = getResponseRequestId(response, body);
        const apiError = new RestaurantMenuApiError({
          code: statusToErrorCode(response.status),
          status: response.status,
          message: toReadableApiMessage(response.status, rawMessage),
          details: body.json || body.text,
        });
        devModuleWarn('API', 'request:error', {
          method,
          path,
          status: response.status,
          code: apiError.code,
          requestId,
          durationMs: Date.now() - startedAt,
        });
        throw apiError;
      }

      if (response.status === 204) {
        devModuleLog('API', 'request:success', {
          method,
          path,
          status: response.status,
          requestId: getResponseRequestId(response),
          durationMs: Date.now() - startedAt,
        });
        return undefined as T;
      }

      const body = await parseResponseBody(response);
      devModuleLog('API', 'request:success', {
        method,
        path,
        status: response.status,
        requestId: getResponseRequestId(response, body),
        durationMs: Date.now() - startedAt,
      });
      return (body.json !== undefined ? body.json : undefined) as T;
    } catch (error) {
      if (error instanceof RestaurantMenuApiError) {
        throw error;
      }

      const errorName = error instanceof Error ? error.name : '';
      const timedOut = errorName === 'AbortError';
      const apiError = new RestaurantMenuApiError({
        code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: timedOut
          ? 'Kết nối API menu quá lâu. Vui lòng thử lại.'
          : 'Không thể kết nối API menu. Kiểm tra mạng hoặc backend.',
        details: error,
      });
      devModuleWarn('API', timedOut ? 'request:timeout' : 'request:network-error', {
        method,
        path,
        code: apiError.code,
        durationMs: Date.now() - startedAt,
      });
      throw apiError;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async request<T>(
    path: string,
    init: ApiRequestInit = {},
  ): Promise<T> {
    const retryCount = Math.max(0, init.retryCount ?? this.retryCount);
    const canRetry = isReadRequest(init.method);
    let lastError: unknown;

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await this.requestOnce<T>(path, init);
      } catch (error) {
        lastError = error;
        const apiError = error as Partial<RestaurantMenuApiError>;
        const retryable =
          canRetry &&
          (apiError.code === 'NETWORK_ERROR' ||
            apiError.code === 'TIMEOUT' ||
            apiError.code === 'SERVER_ERROR');

        if (!retryable || attempt >= retryCount) {
          throw error;
        }

        await wait(250 * (attempt + 1));
      }
    }

    throw lastError;
  }

  private async restaurantPath(path: string) {
    const context = await this.getActiveContext();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/restaurants/${encodeURIComponent(context.restaurantId)}${cleanPath}`;
  }

  private normaliseOrders(
    orders: RawRestaurantOrder[],
    restaurantId?: string,
  ): RestaurantOrder[] {
    return Array.isArray(orders)
      ? orders.map(order => normaliseRestaurantOrder(order, restaurantId))
      : [];
  }


  private getOrdersFromOrderResponse(
    response: ApiPublicOrderResponse,
  ): RawRestaurantOrder[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.orders)) {
      return response.orders;
    }
    if (response?.order) {
      return [response.order];
    }
    return [];
  }

  async listRestaurants(): Promise<RestaurantWorkspace[]> {
    const restaurants = await this.request<RestaurantWorkspace[]>('/restaurants');
    return Array.isArray(restaurants)
      ? restaurants.filter(restaurant => !isLegacyDemoRestaurantId(restaurant.id))
      : [];
  }

  async verifyAdminCredentials(
    username: string,
    password: string,
  ): Promise<RestaurantAdminCredentialResult> {
    return this.request<RestaurantAdminCredentialResult>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({username, password}),
      retryCount: 0,
    });
  }

  async registerAdminAccount(
    username: string,
    password: string,
  ): Promise<RestaurantAdminCredentialResult> {
    return this.request<RestaurantAdminCredentialResult>('/auth/admin/register', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        forcePrivateWorkspace: true,
        cleanAdminWorkspace: true,
      }),
      retryCount: 0,
    });
  }

  createRestaurant(
    payload: RestaurantWorkspacePayload,
  ): Promise<RestaurantWorkspace> {
    return this.request<RestaurantWorkspace>('/restaurants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateRestaurant(
    restaurantId: string,
    payload: Partial<RestaurantWorkspacePayload>,
  ): Promise<RestaurantWorkspace> {
    return this.request<RestaurantWorkspace>(
      `/restaurants/${encodeURIComponent(restaurantId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
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

    return this.request<RestaurantTable[]>(await this.restaurantPath('/tables'));
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

  async updateTable(
    tableId: string,
    payload: Partial<RestaurantTablePayload>,
  ): Promise<RestaurantTable> {
    const targetRestaurantId =
      payload.restaurantId || (await this.getActiveContext()).restaurantId;

    return this.request<RestaurantTable>(
      `/restaurants/${encodeURIComponent(targetRestaurantId)}/tables/${encodeURIComponent(tableId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  }

  async deleteTable(tableId: string): Promise<RestaurantTable[]> {
    return this.request<RestaurantTable[]>(
      await this.restaurantPath(`/tables/${encodeURIComponent(tableId)}`),
      {method: 'DELETE'},
    );
  }

  async resolveMenuQrToken(
    token: string,
  ): Promise<RestaurantMenuContext | null> {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
      return null;
    }

    const context = await this.request<RestaurantMenuContext | null>(
      `/menu/qr-tokens/${encodeURIComponent(cleanToken)}`,
    );

    if (!context) {
      return null;
    }

    return {
      ...context,
      source: 'customer',
      qrCodeToken: context.qrCodeToken || context.menuQrToken || cleanToken,
      menuQrToken: context.menuQrToken || context.qrCodeToken || cleanToken,
      qrTokenScope: context.qrTokenScope || (context.tableId ? 'TABLE' : 'BRANCH_MENU'),
    };
  }

  resolveTableToken(token: string): Promise<RestaurantMenuContext | null> {
    return this.resolveMenuQrToken(token);
  }

  async getCategories(): Promise<MenuCategory[]> {
    const context = await this.getActiveContext();
    if (this.isCustomerTableContext(context)) {
      const payload = await this.getPublicMenu(context);
      return Array.isArray(payload.categories) ? payload.categories : [];
    }

    return this.request<MenuCategory[]>(
      await this.restaurantPath('/menu/categories'),
    );
  }

  async createCategory(
    payload: RestaurantMenuCategoryPayload,
  ): Promise<CategoryMutationResult> {
    const context = await this.getActiveContext();
    return this.request<CategoryMutationResult>(
      await this.restaurantPath('/menu/categories'),
      {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          restaurantId: payload.restaurantId || context.restaurantId,
        }),
      },
    );
  }

  async updateCategory(
    id: string,
    payload: RestaurantMenuCategoryPayload,
  ): Promise<CategoryMutationResult> {
    const context = await this.getActiveContext();
    return this.request<CategoryMutationResult>(
      await this.restaurantPath(`/menu/categories/${encodeURIComponent(id)}`),
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...payload,
          restaurantId: payload.restaurantId || context.restaurantId,
        }),
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
    const context = await this.getActiveContext();
    if (this.isCustomerTableContext(context)) {
      const payload = await this.getPublicMenu(context);
      return Array.isArray(payload.items) ? payload.items : [];
    }

    return this.request<RestaurantMenuItem[]>(
      await this.restaurantPath('/menu/items'),
    );
  }

  async createItem(
    payload: RestaurantMenuItemPayload,
  ): Promise<RestaurantMenuItem[]> {
    const context = await this.getActiveContext();
    return this.request<RestaurantMenuItem[]>(
      await this.restaurantPath('/menu/items'),
      {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          restaurantId: payload.restaurantId || context.restaurantId,
        }),
      },
    );
  }

  async updateItem(
    id: string,
    payload: RestaurantMenuItemPayload,
  ): Promise<RestaurantMenuItem[]> {
    const context = await this.getActiveContext();
    return this.request<RestaurantMenuItem[]>(
      await this.restaurantPath(`/menu/items/${encodeURIComponent(id)}`),
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...payload,
          restaurantId: payload.restaurantId || context.restaurantId,
        }),
      },
    );
  }

  async deleteItem(id: string): Promise<RestaurantMenuItem[]> {
    return this.request<RestaurantMenuItem[]>(
      await this.restaurantPath(`/menu/items/${encodeURIComponent(id)}`),
      {method: 'DELETE'},
    );
  }

  async uploadMenuItemImage(
    payload: RestaurantMenuImageUploadPayload,
  ): Promise<RestaurantMenuImageUploadResult> {
    const context = await this.getActiveContext();
    return this.request<RestaurantMenuImageUploadResult>(
      await this.restaurantPath('/menu/images'),
      {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          restaurantId: context.restaurantId,
          dishId: payload.dishId || payload.itemId,
          mimeType: payload.mimeType || 'image/jpeg',
        }),
        retryCount: 0,
      },
    );
  }

  async getOrders(): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    const branchQuery = context.branchId
      ? `?branchId=${encodeURIComponent(context.branchId)}`
      : '';
    const orders = await this.request<RawRestaurantOrder[]>(
      await this.restaurantPath(`/orders${branchQuery}`),
    );
    const normalised = this.normaliseOrders(orders, context.restaurantId);
    return context.branchId
      ? normalised.filter(order => order.branchId === context.branchId)
      : normalised;
  }

  async getBillSessions(): Promise<RestaurantBillSessionDetail[]> {
    const context = await this.getActiveContext();
    const branchQuery = context.branchId
      ? `?branchId=${encodeURIComponent(context.branchId)}`
      : '';
    const billSessions = await this.request<RawRestaurantBillSession[]>(
      await this.restaurantPath(`/bills${branchQuery}`),
    );
    const normalised = Array.isArray(billSessions)
      ? billSessions.map(billSession =>
          normaliseRestaurantBillSession(billSession, context.restaurantId),
        )
      : [];
    return context.branchId
      ? normalised.filter(billSession => billSession.branchId === context.branchId)
      : normalised;
  }

  async createOrder(
    payload: RestaurantOrderPayload,
  ): Promise<RestaurantOrder[]> {
    const context = await this.getActiveContext();
    if (this.isCustomerTableContext(context)) {
      const response = await this.request<ApiPublicOrderResponse>(
        await this.publicTablePath('/orders'),
        {
          method: 'POST',
          body: JSON.stringify({
            items: payload.items,
            tableId: payload.tableId,
            tableNumber: payload.tableNumber,
            billSessionId: payload.billSessionId,
            guestSessionId: payload.guestSessionId,
            note: payload.note,
            paymentMethod: payload.paymentMethod,
            paymentStatus: payload.paymentStatus,
          }),
          retryCount: 0,
        },
      );
      const normalised = this.normaliseOrders(
        this.getOrdersFromOrderResponse(response),
        context.restaurantId,
      );
      return context.branchId
        ? normalised.filter(order => order.branchId === context.branchId)
        : normalised;
    }

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
    const normalised = this.normaliseOrders(orders, context.restaurantId);
    return context.branchId
      ? normalised.filter(order => order.branchId === context.branchId)
      : normalised;
  }

  async getCurrentBillSession(
    query: RestaurantCurrentBillSessionQuery = {},
  ): Promise<RestaurantBillSessionDetail | null> {
    const context = await this.getActiveContext();
    if (!this.isCustomerTableContext(context)) {
      return null;
    }

    const suffix = query.billSessionId
      ? `/bills/${encodeURIComponent(query.billSessionId)}`
      : `/bills/current${
          query.guestSessionId
            ? `?guestSessionId=${encodeURIComponent(query.guestSessionId)}`
            : ''
        }`;

    try {
      const billSession = await this.request<RawRestaurantBillSession>(
        await this.publicTablePath(suffix),
      );
      return normaliseRestaurantBillSession(billSession, context.restaurantId);
    } catch (error) {
      const apiError = error as Partial<RestaurantMenuApiError>;
      if (apiError.status === 404 || apiError.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  async updateBillSessionTable(
    billSessionId: string,
    payload: RestaurantBillSessionTableTransferPayload,
  ): Promise<RestaurantBillSessionDetail> {
    const context = await this.getActiveContext();
    const billSession = await this.request<RawRestaurantBillSession>(
      await this.restaurantPath(`/bills/${encodeURIComponent(billSessionId)}/table`),
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
    return normaliseRestaurantBillSession(billSession, context.restaurantId);
  }

  async updateBillSessionPayment(
    billSessionId: string,
    payload: RestaurantBillSessionPaymentPayload,
  ): Promise<RestaurantBillSessionDetail> {
    const context = await this.getActiveContext();
    const billSession = await this.request<RawRestaurantBillSession>(
      await this.restaurantPath(`/bills/${encodeURIComponent(billSessionId)}/payment`),
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
    return normaliseRestaurantBillSession(billSession, context.restaurantId);
  }

  async closeBillSession(
    billSessionId: string,
    payload: RestaurantBillSessionClosePayload = {},
  ): Promise<RestaurantBillSessionDetail> {
    const context = await this.getActiveContext();
    const billSession = await this.request<RawRestaurantBillSession>(
      await this.restaurantPath(`/bills/${encodeURIComponent(billSessionId)}/close`),
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
    return normaliseRestaurantBillSession(billSession, context.restaurantId);
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
    const context = await this.getActiveContext();
    const normalised = this.normaliseOrders(orders, context.restaurantId);
    return context.branchId
      ? normalised.filter(order => order.branchId === context.branchId)
      : normalised;
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: RestaurantPaymentStatus,
    paymentMethod?: RestaurantPaymentMethod,
  ): Promise<RestaurantOrder[]> {
    const orders = await this.request<RawRestaurantOrder[]>(
      await this.restaurantPath(
        `/orders/${encodeURIComponent(orderId)}/payment`,
      ),
      {
        method: 'PATCH',
        body: JSON.stringify({paymentStatus, paymentMethod}),
      },
    );
    const context = await this.getActiveContext();
    const normalised = this.normaliseOrders(orders, context.restaurantId);
    return context.branchId
      ? normalised.filter(order => order.branchId === context.branchId)
      : normalised;
  }

  async getCurrentCart(): Promise<RestaurantCartState> {
    const context = await this.getActiveContext();
    if (this.isCustomerTableContext(context)) {
      return this.request<RestaurantCartState>(
        await this.publicTablePath('/cart/current'),
      );
    }

    return this.request<RestaurantCartState>(
      await this.restaurantPath(
        context.tableId
          ? `/tables/${encodeURIComponent(context.tableId)}/cart/current`
          : '/menu/cart/current',
      ),
    );
  }

  async saveCurrentCart(cart: RestaurantCartState): Promise<void> {
    const context = await this.getActiveContext();
    if (this.isCustomerTableContext(context)) {
      await this.request(await this.publicTablePath('/cart/current'), {
        method: 'PATCH',
        body: JSON.stringify({
          ...cart,
          restaurantId: context.restaurantId,
          branchId: context.branchId,
          tableId: cart.tableId || context.tableId,
          tableNumber: cart.tableNumber || context.tableNumber,
        }),
      });
      return;
    }

    await this.request(
      await this.restaurantPath(
        context.tableId
          ? `/tables/${encodeURIComponent(context.tableId)}/cart/current`
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
    if (this.isCustomerTableContext(context)) {
      await this.request(await this.publicTablePath('/cart/current'), {
        method: 'DELETE',
      });
      return;
    }

    await this.request(
      await this.restaurantPath(
        context.tableId
          ? `/tables/${encodeURIComponent(context.tableId)}/cart/current`
          : '/menu/cart/current',
      ),
      {method: 'DELETE'},
    );
  }
}
