import type {
  MenuCategory,
  RestaurantCartState,
  RestaurantMenuItem,
  RestaurantMenuItemStatus,
  RestaurantBillSession,
  RestaurantBillSessionDetail,
  RestaurantBillClosePayload,
  RestaurantBillPaymentPayload,
  RestaurantBillSessionStatus,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentMethod,
  RestaurantPaymentStatus,
} from 'services/restaurantMenuStorage';
import type {
  RestaurantBranch,
  RestaurantBranchPayload,
  RestaurantBranchStatus,
  RestaurantMenuContext,
  RestaurantQrTokenScope,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantTableStatus,
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

export type RestaurantMenuImageUploadPayload = {
  itemId?: string;
  dishId?: string;
  uri?: string;
  base64?: string;
  dataUri?: string;
  fileName?: string;
  mimeType?: string;
};

export type RestaurantMenuImageUploadResult = {
  ok: boolean;
  restaurantId?: string;
  dishId?: string;
  imageUrl: string;
  publicUrl?: string;
  storagePath?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
};


export type RestaurantCustomerQrTokenScope = RestaurantQrTokenScope;

export type RestaurantQrResolveContext = RestaurantMenuContext & {
  /** Preferred Batch 1+ token name. QR can identify a branch menu first. */
  menuQrToken?: string;
  /** TABLE is still supported as a compatibility mode. */
  qrTokenScope?: RestaurantCustomerQrTokenScope;
};


export type RestaurantPublicMenuPayload = {
  qrToken: string;
  context: RestaurantQrResolveContext;
  categories: MenuCategory[];
  items: RestaurantMenuItem[];
  receivedAt?: string;
};

export type RestaurantOrderPayload = Omit<
  RestaurantOrder,
  'id' | 'orderStatus' | 'paymentStatus' | 'createdAt' | 'updatedAt'
> & {
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
  /** Optional until Batch 17 creates/locks the session server-side. */
  billSessionId?: string;
  guestSessionId?: string;
  orderSource?: 'admin' | 'customer' | 'local-demo';
  paymentStatus?: RestaurantPaymentStatus;
};

export type RestaurantBillSessionPayload = Omit<
  RestaurantBillSession,
  | 'id'
  | 'status'
  | 'orderIds'
  | 'orderCount'
  | 'subtotal'
  | 'total'
  | 'openedAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  status?: RestaurantBillSessionStatus;
  orderIds?: string[];
};

export type RestaurantCurrentBillSessionQuery = {
  billSessionId?: string;
  guestSessionId?: string;
};

export type RestaurantBillSessionPaymentPayload = RestaurantBillPaymentPayload;
export type RestaurantBillSessionClosePayload = RestaurantBillClosePayload;

export type RestaurantBillSessionTableTransferPayload = {
  tableId?: string;
  tableNumber: string;
  branchId?: string;
  reason?: string;
  changedByUsername?: string;
  changedByRole?: string;
};

export type DeleteCategoryOptions = {
  moveItemsToCategoryId?: string;
  restaurantId?: string;
  restaurantIds?: string[];
};

export type RestaurantAdminCredentialResult = {
  ok: boolean;
  message: string;
  token?: string;
  userId?: string;
  role?: 'OWNER' | 'MANAGER' | 'STAFF';
  restaurantId?: string;
  restaurantIds?: string[];
  branchIds?: string[];
  activeBranchId?: string;
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

  verifyAdminCredentials(
    username: string,
    password: string,
  ): Promise<RestaurantAdminCredentialResult>;
  registerAdminAccount(
    username: string,
    password: string,
  ): Promise<RestaurantAdminCredentialResult>;
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
  updateTable(
    tableId: string,
    payload: Partial<RestaurantTablePayload>,
  ): Promise<RestaurantTable>;
  deleteTable(tableId: string): Promise<RestaurantTable[]>;

  /**
   * Public customer menu loader for Batch 5+. QR identifies the
   * restaurant/branch menu first; table information is collected later in cart.
   */
  getPublicMenuByQrToken(token: string): Promise<RestaurantPublicMenuPayload>;

  /**
   * Public table choices for Batch 6+. QR identifies the branch/menu,
   * then customer selects/enters a table that must belong to that branch.
   */
  getPublicTablesByQrToken(token: string): Promise<RestaurantTable[]>;

  /**
   * Preferred Batch 1+ resolver. The QR should be understood as a
   * restaurant/branch menu QR first. Existing table QR tokens may still resolve
   * to a table-scoped context for backward compatibility.
   */
  resolveMenuQrToken(token: string): Promise<RestaurantQrResolveContext | null>;

  /**
   * @deprecated Use resolveMenuQrToken. Kept so the old table-QR demo keeps
   * working until Batch 4 migrates seed/API to branch/menu QR tokens.
   */
  resolveTableToken(token: string): Promise<RestaurantQrResolveContext | null>;

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
  uploadMenuItemImage(
    payload: RestaurantMenuImageUploadPayload,
  ): Promise<RestaurantMenuImageUploadResult>;

  getOrders(): Promise<RestaurantOrder[]>;
  getBillSessions(): Promise<RestaurantBillSessionDetail[]>;
  createOrder(payload: RestaurantOrderPayload): Promise<RestaurantOrder[]>;
  getCurrentBillSession(
    query?: RestaurantCurrentBillSessionQuery,
  ): Promise<RestaurantBillSessionDetail | null>;
  updateBillSessionTable(
    billSessionId: string,
    payload: RestaurantBillSessionTableTransferPayload,
  ): Promise<RestaurantBillSessionDetail>;
  updateBillSessionPayment(
    billSessionId: string,
    payload: RestaurantBillSessionPaymentPayload,
  ): Promise<RestaurantBillSessionDetail>;
  closeBillSession(
    billSessionId: string,
    payload?: RestaurantBillSessionClosePayload,
  ): Promise<RestaurantBillSessionDetail>;
  updateOrderStatus(
    orderId: string,
    status: RestaurantOrderStatus,
  ): Promise<RestaurantOrder[]>;
  updatePaymentStatus(
    orderId: string,
    paymentStatus: RestaurantPaymentStatus,
    paymentMethod?: RestaurantPaymentMethod,
  ): Promise<RestaurantOrder[]>;

  getCurrentCart(): Promise<RestaurantCartState>;
  saveCurrentCart(cart: RestaurantCartState): Promise<void>;
  clearCurrentCart(): Promise<void>;
}

export type {
  BillClosePayload,
  BillOrderSummary,
  BillPaymentPayload,
  BillPaymentStatus,
  BillSession,
  BillSessionStatus,
  RestaurantBillClosePayload,
  RestaurantBillOrderSummary,
  RestaurantBillPaymentPayload,
  RestaurantBillPaymentStatus,
  RestaurantBillSession,
  RestaurantBillSessionDetail,
  RestaurantBillSessionStatus,
  RestaurantBillSummary,
  RestaurantTableBill,
  TableBill,
} from 'services/restaurantMenuStorage';

export type {
  RestaurantBranch,
  RestaurantBranchPayload,
  RestaurantBranchStatus,
  RestaurantMenuContext,
  RestaurantQrTokenScope,
  RestaurantTable,
  RestaurantTablePayload,
  RestaurantTableStatus,
  RestaurantWorkspace,
  RestaurantWorkspacePayload,
} from 'services/restaurantWorkspaceStorage';
