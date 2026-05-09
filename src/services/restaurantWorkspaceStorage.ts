import AsyncStorage from '@react-native-async-storage/async-storage';
import {devWarn} from 'utils/devLogger';

export const DEFAULT_RESTAURANT_ID = 'local_demo_restaurant';
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

export type RestaurantBranch = {
  id: string;
  restaurantId: string;
  name: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  branchId?: string;
  tableNumber: string;
  qrCodeToken: string;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantMenuContext = {
  restaurantId: string;
  restaurantName?: string;
  branchId?: string;
  branchName?: string;
  tableId?: string;
  tableNumber?: string;
  qrCodeToken?: string;
  source?: 'admin' | 'customer' | 'local-demo';
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
};

export type RestaurantTablePayload = {
  id?: string;
  restaurantId?: string;
  branchId?: string;
  tableNumber: string;
  qrCodeToken?: string;
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
    name: 'Nhà hàng demo local',
    ownerId: DEFAULT_RESTAURANT_OWNER_ID,
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

const cleanBranch = (branch: Partial<RestaurantBranch>): RestaurantBranch => {
  const timestamp = nowIso();
  const cleanName = (branch.name || '').trim() || 'Chi nhánh chính';

  return {
    id: branch.id || createId('branch'),
    restaurantId: branch.restaurantId || DEFAULT_RESTAURANT_ID,
    name: cleanName,
    address: branch.address?.trim() || undefined,
    createdAt: branch.createdAt || timestamp,
    updatedAt: branch.updatedAt || timestamp,
  };
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
    createdAt: table.createdAt || timestamp,
    updatedAt: table.updatedAt || timestamp,
  };
};

export const loadRestaurantWorkspaces = async () => {
  const stored = await readArray<RestaurantWorkspace>(
    WORKSPACE_STORAGE_KEYS.restaurants,
  );
  const cleaned = stored.map(cleanWorkspace);

  if (cleaned.length > 0) {
    return cleaned;
  }

  const defaults = [getDefaultRestaurantWorkspace()];
  await writeArray(WORKSPACE_STORAGE_KEYS.restaurants, defaults);

  const branches = await readArray<RestaurantBranch>(
    WORKSPACE_STORAGE_KEYS.branches,
  );
  if (branches.length === 0) {
    await writeArray(WORKSPACE_STORAGE_KEYS.branches, [
      cleanBranch({
        restaurantId: DEFAULT_RESTAURANT_ID,
        name: 'Chi nhánh chính',
      }),
    ]);
  }

  return defaults;
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
      cleanBranch({restaurantId: nextWorkspace.id, name: 'Chi nhánh chính'}),
      ...branches,
    ]);
  }

  return nextWorkspace;
};


const resolveValidBranchForRestaurant = async (
  restaurantId: string,
  branchId?: string,
) => {
  const branches = (await readArray<RestaurantBranch>(
    WORKSPACE_STORAGE_KEYS.branches,
  )).map(cleanBranch);
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

  const tables = (await readArray<RestaurantTable>(
    WORKSPACE_STORAGE_KEYS.tables,
  )).map(cleanTable);

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
      source: parsed.value?.source || 'local-demo',
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
    tableNumber: table?.tableNumber || (tableIdWasProvided ? context.tableNumber : current.tableNumber),
    qrCodeToken: table?.qrCodeToken || (tableIdWasProvided ? context.qrCodeToken : current.qrCodeToken),
    source: context.source || current.source || 'local-demo',
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
  source: RestaurantMenuContext['source'] = 'local-demo',
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
    source,
    role: undefined,
    allowedRestaurantIds: undefined,
  });
};

export const loadRestaurantBranches = async (restaurantId?: string) => {
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

  const nextBranch = cleanBranch({
    id: payload.id,
    restaurantId,
    name,
    address: payload.address,
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

  const timestamp = nowIso();
  const next = current.map(branch =>
    branch.id === branchId
      ? cleanBranch({
          ...branch,
          restaurantId,
          name: cleanName,
          address: payload.address ?? branch.address,
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
  });
  await writeArray(WORKSPACE_STORAGE_KEYS.tables, [nextTable, ...current]);
  return nextTable;
};

export const resolveRestaurantTableToken = async (qrCodeToken: string) => {
  const cleanToken = qrCodeToken.trim();

  if (!cleanToken) {
    return null;
  }

  const [workspaces, tables] = await Promise.all([
    loadRestaurantWorkspaces(),
    readArray<RestaurantTable>(WORKSPACE_STORAGE_KEYS.tables),
  ]);
  const table = tables
    .map(cleanTable)
    .find(item => item.qrCodeToken === cleanToken);

  if (!table) {
    return null;
  }

  const workspace = workspaces.find(item => item.id === table.restaurantId);

  return {
    restaurantId: table.restaurantId,
    restaurantName: workspace?.name,
    branchId: table.branchId,
    tableId: table.id,
    tableNumber: table.tableNumber,
    qrCodeToken: table.qrCodeToken,
    source: 'customer' as const,
  };
};
