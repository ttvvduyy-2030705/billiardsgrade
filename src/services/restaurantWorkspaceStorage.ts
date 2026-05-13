import AsyncStorage from '@react-native-async-storage/async-storage';
import {devWarn} from 'utils/devLogger';

export const DEFAULT_RESTAURANT_ID = 'local_restaurant';
export const HAIDILAO_LOCAL_RESTAURANT_ID = 'legacy_removed_restaurant';
export const DEFAULT_BRANCH_ID = 'local_main_branch';
export const HAIDILAO_LOCAL_BRANCH_ID = 'legacy_removed_branch';
export const DEFAULT_TABLE_ID = 'local_table_01';
export const HAIDILAO_LOCAL_TABLE_ID = 'legacy_removed_table';
export const DEFAULT_TABLE_QR_TOKEN = 'qr_local_main_01';
export const HAIDILAO_LOCAL_TABLE_QR_TOKEN = 'qr_haidilao_local_01';
// Batch 1 preferred naming: QR of restaurant/branch menu.
// Batch 4 will persist these as branch/menu tokens. For now we define the
// constants so the rest of the app stops treating QR as admin-owned or
// strictly table-owned.
export const DEFAULT_BRANCH_MENU_QR_TOKEN = 'qr_main_menu';
export const HAIDILAO_LOCAL_BRANCH_MENU_QR_TOKEN = 'legacy_removed_menu_qr';
export const DEFAULT_RESTAURANT_OWNER_ID = 'local_admin';

const WORKSPACE_STORAGE_KEYS = {
  restaurants: 'restaurant_workspaces_v1',
  activeContext: 'restaurant_active_context_v1',
  branches: 'restaurant_branches_v1',
  tables: 'restaurant_tables_v1',
};

export type RestaurantWorkspace = {
  id: string;
  name: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantBranchStatus = 'ACTIVE' | 'LOCKED' | 'HIDDEN';

export type RestaurantBranch = {
  id: string;
  restaurantId: string;
  name: string;
  address?: string;
  /** Batch 4: QR menu của quán/chi nhánh. Không bắt buộc gắn với bàn. */
  menuQrToken?: string;
  status?: RestaurantBranchStatus;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantTableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'LOCKED'
  | 'HIDDEN';

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  branchId?: string;
  tableNumber: string;
  qrCodeToken: string;
  status: RestaurantTableStatus;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantQrTokenScope = 'BRANCH_MENU' | 'TABLE';

export type RestaurantMenuContext = {
  restaurantId: string;
  restaurantName?: string;
  branchId?: string;
  branchName?: string;
  tableId?: string;
  tableNumber?: string;
  qrCodeToken?: string;
  /**
   * Preferred customer menu token for Batch 1+ architecture.
   * It may point to a branch/menu QR now, while qrCodeToken remains for
   * backwards-compatible table QR entries.
   */
  menuQrToken?: string;
  /** Shows whether the scanned QR identifies a branch menu or a specific table. */
  qrTokenScope?: RestaurantQrTokenScope;
  source?: 'admin' | 'customer' | 'local';
  role?: 'OWNER' | 'MANAGER' | 'STAFF';
  allowedRestaurantIds?: string[];
};

export type RestaurantWorkspacePayload = {
  id?: string;
  name: string;
  ownerId?: string;
};

export type RestaurantBranchPayload = {
  id?: string;
  restaurantId?: string;
  name: string;
  address?: string;
  menuQrToken?: string;
  status?: RestaurantBranchStatus;
};

export type RestaurantTablePayload = {
  id?: string;
  restaurantId?: string;
  branchId?: string;
  tableNumber: string;
  qrCodeToken?: string;
  status?: RestaurantTableStatus;
};

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const normalise = (value?: string) => {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const safeJsonParse = <T>(value: string | null, fallback: T) => {
  if (!value) {
    return {value: fallback, ok: true};
  }

  try {
    return {value: JSON.parse(value) as T, ok: true};
  } catch (error) {
    devWarn('[RestaurantWorkspaceStorage] invalid JSON fallback', error);
    return {value: fallback, ok: false};
  }
};

const readArray = async <T>(key: string): Promise<T[]> => {
  const raw = await AsyncStorage.getItem(key);
  const parsed = safeJsonParse<T[]>(raw, []);

  if (!parsed.ok) {
    await AsyncStorage.removeItem(key);
  }

  return Array.isArray(parsed.value) ? parsed.value : [];
};

const writeArray = async <T>(key: string, value: T[]) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const getDefaultRestaurantWorkspace = (): RestaurantWorkspace => {
  const timestamp = nowIso();

  return {
    id: DEFAULT_RESTAURANT_ID,
    name: 'Nhà hàng chính',
    ownerId: DEFAULT_RESTAURANT_OWNER_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const getLegacyRestaurantWorkspace = (): RestaurantWorkspace => {
  const timestamp = nowIso();

  return {
    id: HAIDILAO_LOCAL_RESTAURANT_ID,
    name: 'Nhà hàng cũ',
    ownerId: 'local_haidilao_owner',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const cleanWorkspace = (
  workspace: Partial<RestaurantWorkspace>,
): RestaurantWorkspace => {
  const timestamp = nowIso();
  const cleanName = (workspace.name || '').trim() || 'Nhà hàng chưa đặt tên';

  return {
    id: workspace.id || createId('restaurant'),
    name: cleanName,
    ownerId: workspace.ownerId || DEFAULT_RESTAURANT_OWNER_ID,
    createdAt: workspace.createdAt || timestamp,
    updatedAt: workspace.updatedAt || timestamp,
  };
};

const BRANCH_STATUSES: RestaurantBranchStatus[] = [
  'ACTIVE',
  'LOCKED',
  'HIDDEN',
];

const cleanBranchStatus = (status?: string): RestaurantBranchStatus => {
  return BRANCH_STATUSES.includes(status as RestaurantBranchStatus)
    ? (status as RestaurantBranchStatus)
    : 'ACTIVE';
};

const inferBranchMenuQrToken = (branch: Partial<RestaurantBranch>) => {
  const explicitToken = String(branch.menuQrToken || '').trim();

  if (explicitToken) {
    return explicitToken;
  }

  if (branch.id === DEFAULT_BRANCH_ID) {
    return DEFAULT_BRANCH_MENU_QR_TOKEN;
  }

  if (branch.id === HAIDILAO_LOCAL_BRANCH_ID) {
    return HAIDILAO_LOCAL_BRANCH_MENU_QR_TOKEN;
  }

  const restaurantKey = normalise(branch.restaurantId || DEFAULT_RESTAURANT_ID)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const branchKey = normalise(branch.name || branch.id || 'main')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `qr_${restaurantKey}_${branchKey}_menu`;
};

const cleanBranch = (branch: Partial<RestaurantBranch>): RestaurantBranch => {
  const timestamp = nowIso();
  const cleanName = (branch.name || '').trim() || 'Chi nhánh chính';
  const baseBranch = {
    id: branch.id || createId('branch'),
    restaurantId: branch.restaurantId || DEFAULT_RESTAURANT_ID,
    name: cleanName,
    address: branch.address?.trim() || undefined,
    status: cleanBranchStatus(branch.status),
    createdAt: branch.createdAt || timestamp,
    updatedAt: branch.updatedAt || timestamp,
  };

  return {
    ...baseBranch,
    menuQrToken: inferBranchMenuQrToken({
      ...baseBranch,
      menuQrToken: branch.menuQrToken,
    }),
  };
};

const TABLE_STATUSES: RestaurantTableStatus[] = [
  'AVAILABLE',
  'OCCUPIED',
  'LOCKED',
  'HIDDEN',
];

const cleanTableStatus = (status?: string): RestaurantTableStatus => {
  return TABLE_STATUSES.includes(status as RestaurantTableStatus)
    ? (status as RestaurantTableStatus)
    : 'AVAILABLE';
};

const cleanTable = (table: Partial<RestaurantTable>): RestaurantTable => {
  const timestamp = nowIso();
  const restaurantId = table.restaurantId || DEFAULT_RESTAURANT_ID;
  const tableNumber = String(table.tableNumber || '').trim() || 'Bàn mới';

  return {
    id: table.id || createId('table'),
    restaurantId,
    branchId: table.branchId,
    tableNumber,
    qrCodeToken:
      table.qrCodeToken ||
      `${restaurantId}_${normalise(tableNumber).replace(/\s+/g, '_')}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    status: cleanTableStatus(table.status),
    createdAt: table.createdAt || timestamp,
    updatedAt: table.updatedAt || timestamp,
  };
};

const getDefaultRestaurantBranch = (): RestaurantBranch => {
  const timestamp = nowIso();

  return {
    id: DEFAULT_BRANCH_ID,
    restaurantId: DEFAULT_RESTAURANT_ID,
    name: 'Chi nhánh chính',
    address: 'Chi nhánh chính',
    menuQrToken: DEFAULT_BRANCH_MENU_QR_TOKEN,
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const getLegacyRestaurantBranch = (): RestaurantBranch => {
  const timestamp = nowIso();

  return {
    id: HAIDILAO_LOCAL_BRANCH_ID,
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    name: 'Chi nhánh cũ',
    address: 'Khu nhà hàng',
    menuQrToken: HAIDILAO_LOCAL_BRANCH_MENU_QR_TOKEN,
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const getDefaultRestaurantTable = (
  branchId = DEFAULT_BRANCH_ID,
): RestaurantTable => {
  const timestamp = nowIso();

  return {
    id: DEFAULT_TABLE_ID,
    restaurantId: DEFAULT_RESTAURANT_ID,
    branchId,
    tableNumber: 'Bàn 01',
    qrCodeToken: DEFAULT_TABLE_QR_TOKEN,
    status: 'AVAILABLE',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const getLegacyRestaurantTable = (
  branchId = HAIDILAO_LOCAL_BRANCH_ID,
): RestaurantTable => {
  const timestamp = nowIso();

  return {
    id: HAIDILAO_LOCAL_TABLE_ID,
    restaurantId: HAIDILAO_LOCAL_RESTAURANT_ID,
    branchId,
    tableNumber: 'Bàn cũ',
    qrCodeToken: HAIDILAO_LOCAL_TABLE_QR_TOKEN,
    status: 'AVAILABLE',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const ensureDefaultWorkspaceScaffolding = async () => {
  const [storedRestaurants, storedBranches, storedTables] = await Promise.all([
    readArray<RestaurantWorkspace>(WORKSPACE_STORAGE_KEYS.restaurants),
    readArray<RestaurantBranch>(WORKSPACE_STORAGE_KEYS.branches),
    readArray<RestaurantTable>(WORKSPACE_STORAGE_KEYS.tables),
  ]);

  let restaurants = storedRestaurants
    .map(cleanWorkspace)
    .filter(item => !['haidilao_local_demo'].includes(item.id));
  let branches = storedBranches
    .map(cleanBranch)
    .filter(
      item =>
        !['haidilao_local_main_branch'].includes(item.id) &&
        item.restaurantId !== 'haidilao_local_demo',
    );
  let tables = storedTables
    .map(cleanTable)
    .filter(
      item =>
        !['haidilao_local_table_01'].includes(item.id) &&
        item.restaurantId !== 'haidilao_local_demo',
    );

  let restaurantsChanged =
    JSON.stringify(storedRestaurants) !== JSON.stringify(restaurants);
  let branchesChanged =
    JSON.stringify(storedBranches) !== JSON.stringify(branches);
  let tablesChanged = JSON.stringify(storedTables) !== JSON.stringify(tables);

  if (!restaurants.some(item => item.id === DEFAULT_RESTAURANT_ID)) {
    restaurants = [getDefaultRestaurantWorkspace(), ...restaurants];
    restaurantsChanged = true;
  }

  let defaultBranch = branches.find(
    item =>
      item.id === DEFAULT_BRANCH_ID ||
      item.restaurantId === DEFAULT_RESTAURANT_ID,
  );

  if (!defaultBranch) {
    defaultBranch = getDefaultRestaurantBranch();
    branches = [defaultBranch, ...branches];
    branchesChanged = true;
  }

  const hasDefaultTable = tables.some(
    item => item.qrCodeToken === DEFAULT_TABLE_QR_TOKEN,
  );

  if (!hasDefaultTable) {
    tables = [getDefaultRestaurantTable(defaultBranch.id), ...tables];
    tablesChanged = true;
  }

  if (restaurantsChanged) {
    await writeArray(WORKSPACE_STORAGE_KEYS.restaurants, restaurants);
  }
  if (branchesChanged) {
    await writeArray(WORKSPACE_STORAGE_KEYS.branches, branches);
  }
  if (tablesChanged) {
    await writeArray(WORKSPACE_STORAGE_KEYS.tables, tables);
  }

  return {restaurants, branches, tables};
};

export const loadRestaurantWorkspaces = async () => {
  const {restaurants} = await ensureDefaultWorkspaceScaffolding();
  return restaurants;
};

export const createRestaurantWorkspace = async (
  payload: RestaurantWorkspacePayload,
) => {
  const name = payload.name.trim();

  if (!name) {
    throw new Error('Vui lòng nhập tên nhà hàng.');
  }

  const current = await loadRestaurantWorkspaces();
  const existed = current.some(
    workspace => normalise(workspace.name) === normalise(name),
  );

  if (existed) {
    throw new Error('Tên nhà hàng này đã tồn tại trong workspace local.');
  }

  const timestamp = nowIso();
  const nextWorkspace = cleanWorkspace({
    id: payload.id,
    name,
    ownerId: payload.ownerId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const next = [nextWorkspace, ...current];
  await writeArray(WORKSPACE_STORAGE_KEYS.restaurants, next);

  const branches = await readArray<RestaurantBranch>(
    WORKSPACE_STORAGE_KEYS.branches,
  );
  const hasBranch = branches.some(
    branch => branch.restaurantId === nextWorkspace.id,
  );
  if (!hasBranch) {
    await writeArray(WORKSPACE_STORAGE_KEYS.branches, [
      cleanBranch({
        restaurantId: nextWorkspace.id,
        name: 'Chi nhánh chính',
        status: 'ACTIVE',
      }),
      ...branches,
    ]);
  }

  return nextWorkspace;
};

const resolveValidBranchForRestaurant = async (
  restaurantId: string,
  branchId?: string,
) => {
  const branches = (
    await readArray<RestaurantBranch>(WORKSPACE_STORAGE_KEYS.branches)
  ).map(cleanBranch);
  const restaurantBranches = branches.filter(
    branch => branch.restaurantId === restaurantId,
  );
  const branch =
    restaurantBranches.find(item => item.id === branchId) ||
    restaurantBranches[0];

  return branch;
};

const resolveValidTableForRestaurant = async ({
  restaurantId,
  branchId,
  tableId,
}: {
  restaurantId: string;
  branchId?: string;
  tableId?: string;
}) => {
  if (!tableId) {
    return undefined;
  }

  const tables = (
    await readArray<RestaurantTable>(WORKSPACE_STORAGE_KEYS.tables)
  ).map(cleanTable);

  return tables.find(
    table =>
      table.id === tableId &&
      table.restaurantId === restaurantId &&
      (!branchId || !table.branchId || table.branchId === branchId),
  );
};

export const loadActiveRestaurantContext =
  async (): Promise<RestaurantMenuContext> => {
    const workspaces = await loadRestaurantWorkspaces();
    const defaultWorkspace =
      workspaces.find(workspace => workspace.id === DEFAULT_RESTAURANT_ID) ||
      workspaces[0] ||
      getDefaultRestaurantWorkspace();
    const raw = await AsyncStorage.getItem(
      WORKSPACE_STORAGE_KEYS.activeContext,
    );
    const parsed = safeJsonParse<Partial<RestaurantMenuContext> | null>(
      raw,
      null,
    );
    const workspace =
      workspaces.find(item => item.id === parsed.value?.restaurantId) ||
      defaultWorkspace;
    const branch = await resolveValidBranchForRestaurant(
      workspace.id,
      parsed.value?.branchId,
    );
    const table = await resolveValidTableForRestaurant({
      restaurantId: workspace.id,
      branchId: branch?.id,
      tableId: parsed.value?.tableId,
    });

    if (!parsed.ok) {
      await AsyncStorage.removeItem(WORKSPACE_STORAGE_KEYS.activeContext);
    }

    return {
      restaurantId: workspace.id,
      restaurantName: workspace.name,
      branchId: branch?.id,
      branchName: branch?.name,
      tableId: table?.id,
      tableNumber: table?.tableNumber || parsed.value?.tableNumber,
      qrCodeToken: table?.qrCodeToken || parsed.value?.qrCodeToken,
      menuQrToken:
        parsed.value?.menuQrToken ||
        parsed.value?.qrCodeToken ||
        (!table ? branch?.menuQrToken : undefined),
      qrTokenScope:
        parsed.value?.qrTokenScope ||
        (table ? 'TABLE' : branch ? 'BRANCH_MENU' : undefined),
      source: parsed.value?.source || 'local',
      role: parsed.value?.role,
      allowedRestaurantIds: parsed.value?.allowedRestaurantIds,
    };
  };

export const saveActiveRestaurantContext = async (
  context: Partial<RestaurantMenuContext>,
): Promise<RestaurantMenuContext> => {
  const current = await loadActiveRestaurantContext();
  const workspaces = await loadRestaurantWorkspaces();
  const workspace =
    workspaces.find(item => item.id === context.restaurantId) ||
    workspaces.find(item => item.id === current.restaurantId) ||
    workspaces[0] ||
    getDefaultRestaurantWorkspace();

  const restaurantChanged = workspace.id !== current.restaurantId;
  const branchIdWasProvided = Object.prototype.hasOwnProperty.call(
    context,
    'branchId',
  );
  const tableIdWasProvided = Object.prototype.hasOwnProperty.call(
    context,
    'tableId',
  );
  const requestedBranchId = restaurantChanged
    ? context.branchId
    : branchIdWasProvided
      ? context.branchId
      : current.branchId;
  const branch = await resolveValidBranchForRestaurant(
    workspace.id,
    requestedBranchId,
  );
  const requestedTableId = restaurantChanged
    ? context.tableId
    : tableIdWasProvided
      ? context.tableId
      : current.tableId;
  const table = await resolveValidTableForRestaurant({
    restaurantId: workspace.id,
    branchId: branch?.id,
    tableId: requestedTableId,
  });

  const next: RestaurantMenuContext = {
    restaurantId: workspace.id,
    restaurantName: workspace.name,
    branchId: branch?.id,
    branchName: branch?.name,
    tableId: table?.id,
    tableNumber:
      table?.tableNumber ||
      (tableIdWasProvided ? context.tableNumber : current.tableNumber),
    qrCodeToken:
      table?.qrCodeToken ||
      (tableIdWasProvided ? context.qrCodeToken : current.qrCodeToken),
    menuQrToken:
      context.menuQrToken ||
      context.qrCodeToken ||
      (tableIdWasProvided
        ? undefined
        : current.menuQrToken || current.qrCodeToken),
    qrTokenScope:
      context.qrTokenScope ||
      (table ? 'TABLE' : undefined) ||
      (tableIdWasProvided ? undefined : current.qrTokenScope),
    source: context.source || current.source || 'local',
    role: context.role || current.role,
    allowedRestaurantIds:
      context.allowedRestaurantIds || current.allowedRestaurantIds,
  };

  await AsyncStorage.setItem(
    WORKSPACE_STORAGE_KEYS.activeContext,
    JSON.stringify(next),
  );
  return next;
};

export const resetActiveRestaurantContext = async (
  source: RestaurantMenuContext['source'] = 'local',
): Promise<RestaurantMenuContext> => {
  const workspaces = await loadRestaurantWorkspaces();
  const workspace =
    workspaces.find(item => item.id === DEFAULT_RESTAURANT_ID) ||
    workspaces[0] ||
    getDefaultRestaurantWorkspace();

  return saveActiveRestaurantContext({
    restaurantId: workspace.id,
    branchId: undefined,
    tableId: undefined,
    tableNumber: undefined,
    qrCodeToken: undefined,
    menuQrToken: undefined,
    qrTokenScope: undefined,
    source,
    role: undefined,
    allowedRestaurantIds: undefined,
  });
};

export const loadRestaurantBranches = async (restaurantId?: string) => {
  await ensureDefaultWorkspaceScaffolding();
  const context = await loadActiveRestaurantContext();
  const targetRestaurantId = restaurantId || context.restaurantId;
  const stored = await readArray<RestaurantBranch>(
    WORKSPACE_STORAGE_KEYS.branches,
  );
  const cleaned = stored.map(cleanBranch);
  const filtered = cleaned.filter(
    branch => branch.restaurantId === targetRestaurantId,
  );

  if (JSON.stringify(stored) !== JSON.stringify(cleaned)) {
    await writeArray(WORKSPACE_STORAGE_KEYS.branches, cleaned);
  }

  return filtered;
};

export const createRestaurantBranch = async (
  payload: RestaurantBranchPayload,
) => {
  const context = await loadActiveRestaurantContext();
  const restaurantId = payload.restaurantId || context.restaurantId;
  const name = payload.name.trim();

  if (!name) {
    throw new Error('Vui lòng nhập tên chi nhánh.');
  }

  const current = await readArray<RestaurantBranch>(
    WORKSPACE_STORAGE_KEYS.branches,
  );
  const sameRestaurant = current.filter(
    branch => branch.restaurantId === restaurantId,
  );
  const existed = sameRestaurant.some(
    branch => normalise(branch.name) === normalise(name),
  );

  if (existed) {
    throw new Error('Chi nhánh này đã tồn tại trong nhà hàng hiện tại.');
  }

  const duplicateQr = current.some(
    branch =>
      cleanStringLike(branch.menuQrToken) ===
      cleanStringLike(
        payload.menuQrToken ||
          inferBranchMenuQrToken({
            id: payload.id,
            restaurantId,
            name,
          }),
      ),
  );

  if (duplicateQr) {
    throw new Error('Mã QR menu chi nhánh này đã được dùng.');
  }

  const nextBranch = cleanBranch({
    id: payload.id,
    restaurantId,
    name,
    address: payload.address,
    menuQrToken: payload.menuQrToken,
    status: payload.status,
  });
  await writeArray(WORKSPACE_STORAGE_KEYS.branches, [nextBranch, ...current]);
  return nextBranch;
};

export const updateRestaurantBranch = async (
  branchId: string,
  payload: Partial<RestaurantBranchPayload>,
) => {
  const context = await loadActiveRestaurantContext();
  const current = await readArray<RestaurantBranch>(
    WORKSPACE_STORAGE_KEYS.branches,
  );
  const existedBranch = current.find(branch => branch.id === branchId);

  if (!existedBranch) {
    throw new Error('Không tìm thấy chi nhánh cần cập nhật.');
  }

  const restaurantId =
    payload.restaurantId || existedBranch.restaurantId || context.restaurantId;
  const cleanName = (payload.name ?? existedBranch.name).trim();

  if (!cleanName) {
    throw new Error('Vui lòng nhập tên chi nhánh.');
  }

  const duplicate = current.some(
    branch =>
      branch.id !== branchId &&
      branch.restaurantId === restaurantId &&
      normalise(branch.name) === normalise(cleanName),
  );

  if (duplicate) {
    throw new Error('Chi nhánh này đã tồn tại trong nhà hàng hiện tại.');
  }

  const requestedQrToken = cleanStringLike(
    payload.menuQrToken ?? existedBranch.menuQrToken,
  );
  const duplicateQr = current.some(
    branch =>
      branch.id !== branchId &&
      cleanStringLike(branch.menuQrToken) === requestedQrToken,
  );

  if (duplicateQr) {
    throw new Error('Mã QR menu chi nhánh này đã được dùng.');
  }

  const timestamp = nowIso();
  const next = current.map(branch =>
    branch.id === branchId
      ? cleanBranch({
          ...branch,
          restaurantId,
          name: cleanName,
          address: payload.address ?? branch.address,
          menuQrToken: payload.menuQrToken ?? branch.menuQrToken,
          status: payload.status ?? branch.status,
          updatedAt: timestamp,
        })
      : cleanBranch(branch),
  );

  await writeArray(WORKSPACE_STORAGE_KEYS.branches, next);
  return next.find(branch => branch.id === branchId) as RestaurantBranch;
};

export const deleteRestaurantBranch = async (branchId: string) => {
  const [branches, tables] = await Promise.all([
    readArray<RestaurantBranch>(WORKSPACE_STORAGE_KEYS.branches),
    readArray<RestaurantTable>(WORKSPACE_STORAGE_KEYS.tables),
  ]);
  const targetBranch = branches.find(branch => branch.id === branchId);

  if (!targetBranch) {
    throw new Error('Không tìm thấy chi nhánh cần xoá.');
  }

  const cleanedBranches = branches.map(cleanBranch);
  const sameRestaurantBranches = cleanedBranches.filter(
    branch => branch.restaurantId === targetBranch.restaurantId,
  );

  if (sameRestaurantBranches.length <= 1) {
    throw new Error('Nhà hàng cần ít nhất 1 chi nhánh.');
  }

  const fallbackBranch = sameRestaurantBranches.find(
    branch => branch.id !== branchId,
  );
  const updatedTables = tables.map(table =>
    table.branchId === branchId
      ? cleanTable({...table, branchId: fallbackBranch?.id})
      : cleanTable(table),
  );
  const nextBranches = cleanedBranches.filter(branch => branch.id !== branchId);

  await Promise.all([
    writeArray(WORKSPACE_STORAGE_KEYS.branches, nextBranches),
    writeArray(WORKSPACE_STORAGE_KEYS.tables, updatedTables),
  ]);

  return nextBranches.filter(
    branch => branch.restaurantId === targetBranch.restaurantId,
  );
};

export const loadRestaurantTables = async (restaurantId?: string) => {
  await ensureDefaultWorkspaceScaffolding();
  const context = await loadActiveRestaurantContext();
  const targetRestaurantId = restaurantId || context.restaurantId;
  const stored = await readArray<RestaurantTable>(
    WORKSPACE_STORAGE_KEYS.tables,
  );
  const cleaned = stored.map(cleanTable);
  const filtered = cleaned.filter(
    table => table.restaurantId === targetRestaurantId,
  );

  if (JSON.stringify(stored) !== JSON.stringify(cleaned)) {
    await writeArray(WORKSPACE_STORAGE_KEYS.tables, cleaned);
  }

  return filtered;
};

export const createRestaurantTable = async (
  payload: RestaurantTablePayload,
) => {
  const context = await loadActiveRestaurantContext();
  const restaurantId = payload.restaurantId || context.restaurantId;
  const tableNumber = payload.tableNumber.trim();

  if (!tableNumber) {
    throw new Error('Vui lòng nhập số bàn.');
  }

  const current = await readArray<RestaurantTable>(
    WORKSPACE_STORAGE_KEYS.tables,
  );
  const sameRestaurant = current.filter(
    table => table.restaurantId === restaurantId,
  );
  const existed = sameRestaurant.some(
    table => normalise(table.tableNumber) === normalise(tableNumber),
  );

  if (existed) {
    throw new Error('Bàn này đã tồn tại trong nhà hàng hiện tại.');
  }

  const nextTable = cleanTable({
    id: payload.id,
    restaurantId,
    branchId: payload.branchId,
    tableNumber,
    qrCodeToken: payload.qrCodeToken,
    status: payload.status,
  });
  await writeArray(WORKSPACE_STORAGE_KEYS.tables, [nextTable, ...current]);
  return nextTable;
};

export const updateRestaurantTable = async (
  tableId: string,
  payload: Partial<RestaurantTablePayload>,
) => {
  const current = await readArray<RestaurantTable>(
    WORKSPACE_STORAGE_KEYS.tables,
  );
  const existedTable = current.find(table => table.id === tableId);

  if (!existedTable) {
    throw new Error('Không tìm thấy bàn cần cập nhật.');
  }

  const restaurantId = payload.restaurantId || existedTable.restaurantId;
  const tableNumber = (payload.tableNumber ?? existedTable.tableNumber).trim();

  if (!tableNumber) {
    throw new Error('Vui lòng nhập số bàn.');
  }

  const duplicate = current.some(
    table =>
      table.id !== tableId &&
      table.restaurantId === restaurantId &&
      normalise(table.tableNumber) === normalise(tableNumber),
  );

  if (duplicate) {
    throw new Error('Bàn này đã tồn tại trong nhà hàng hiện tại.');
  }

  const duplicateQr = current.some(
    table =>
      table.id !== tableId &&
      cleanStringLike(table.qrCodeToken) ===
        cleanStringLike(payload.qrCodeToken ?? existedTable.qrCodeToken),
  );

  if (duplicateQr) {
    throw new Error('Mã QR này đã được dùng cho bàn khác.');
  }

  const timestamp = nowIso();
  const next = current.map(table =>
    table.id === tableId
      ? cleanTable({
          ...table,
          restaurantId,
          branchId: payload.branchId ?? table.branchId,
          tableNumber,
          qrCodeToken: payload.qrCodeToken ?? table.qrCodeToken,
          status: payload.status ?? table.status,
          updatedAt: timestamp,
        })
      : cleanTable(table),
  );

  await writeArray(WORKSPACE_STORAGE_KEYS.tables, next);
  return next.find(table => table.id === tableId) as RestaurantTable;
};

export const deleteRestaurantTable = async (tableId: string) => {
  const context = await loadActiveRestaurantContext();
  const current = await readArray<RestaurantTable>(
    WORKSPACE_STORAGE_KEYS.tables,
  );
  const target = current.find(
    table =>
      table.id === tableId && table.restaurantId === context.restaurantId,
  );

  if (!target) {
    throw new Error('Không tìm thấy bàn cần xoá.');
  }

  const next = current.filter(table => table.id !== tableId).map(cleanTable);

  await writeArray(WORKSPACE_STORAGE_KEYS.tables, next);
  return next.filter(table => table.restaurantId === target.restaurantId);
};

const cleanStringLike = (value?: string) => String(value || '').trim();

export const resolveRestaurantMenuQrToken = async (qrToken: string) => {
  const cleanToken = qrToken.trim();

  if (!cleanToken) {
    return null;
  }

  await ensureDefaultWorkspaceScaffolding();

  const [workspaces, branches] = await Promise.all([
    loadRestaurantWorkspaces(),
    readArray<RestaurantBranch>(WORKSPACE_STORAGE_KEYS.branches),
  ]);

  const branch = branches
    .map(cleanBranch)
    .find(item => item.menuQrToken === cleanToken);

  if (branch) {
    if (branch.status === 'LOCKED' || branch.status === 'HIDDEN') {
      return null;
    }

    const workspace = workspaces.find(item => item.id === branch.restaurantId);

    return {
      restaurantId: branch.restaurantId,
      restaurantName: workspace?.name,
      branchId: branch.id,
      branchName: branch.name,
      tableId: undefined,
      tableNumber: undefined,
      qrCodeToken: cleanToken,
      menuQrToken: cleanToken,
      qrTokenScope: 'BRANCH_MENU' as const,
      source: 'customer' as const,
    };
  }

  const tableContext = await resolveRestaurantTableToken(cleanToken);
  if (tableContext) {
    return tableContext;
  }

  // Offline-first build: there is no remote QR registry. If a real printed QR
  // has not been saved in local settings yet, open it against the current
  // local restaurant/branch so the app works fully offline.
  if (/^qr[_-]/i.test(cleanToken)) {
    const workspace =
      workspaces.find(item => item.id === DEFAULT_RESTAURANT_ID) ||
      workspaces[0] ||
      getDefaultRestaurantWorkspace();
    const defaultBranch = branches
      .map(cleanBranch)
      .find(item => item.restaurantId === workspace.id);

    return {
      restaurantId: workspace.id,
      restaurantName: workspace.name,
      branchId: defaultBranch?.id,
      branchName: defaultBranch?.name,
      tableId: undefined,
      tableNumber: undefined,
      qrCodeToken: cleanToken,
      menuQrToken: cleanToken,
      qrTokenScope: 'BRANCH_MENU' as const,
      source: 'customer' as const,
    };
  }

  return null;
};

export const resolveRestaurantTableToken = async (qrCodeToken: string) => {
  const cleanToken = qrCodeToken.trim();

  if (!cleanToken) {
    return null;
  }

  await ensureDefaultWorkspaceScaffolding();

  const [workspaces, branches, tables] = await Promise.all([
    loadRestaurantWorkspaces(),
    readArray<RestaurantBranch>(WORKSPACE_STORAGE_KEYS.branches),
    readArray<RestaurantTable>(WORKSPACE_STORAGE_KEYS.tables),
  ]);
  const table = tables
    .map(cleanTable)
    .find(item => item.qrCodeToken === cleanToken);

  if (!table) {
    return null;
  }

  const workspace = workspaces.find(item => item.id === table.restaurantId);
  const branch = branches
    .map(cleanBranch)
    .find(item => item.id === table.branchId);

  return {
    restaurantId: table.restaurantId,
    restaurantName: workspace?.name,
    branchId: table.branchId,
    branchName: branch?.name,
    tableId: table.id,
    tableNumber: table.tableNumber,
    qrCodeToken: table.qrCodeToken,
    menuQrToken: table.qrCodeToken,
    qrTokenScope: 'TABLE' as const,
    source: 'customer' as const,
  };
};
