'use strict';

const crypto = require('crypto');

const now = '2026-05-09T00:00:00.000Z';

const clone = value => JSON.parse(JSON.stringify(value));

const hashPassword = (password, salt) =>
  crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');

const createSeedAdmin = ({id, username, password, role, restaurantIds, activeRestaurantId, branchIds = [], activeBranchId}) => {
  const salt = `${id}_salt`;
  return {
    id,
    username,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    role,
    restaurantIds,
    activeRestaurantId,
    branchIds,
    activeBranchId,
    createdAt: now,
    updatedAt: now,
  };
};


const buildDemoOrder = ({id, restaurantId, branchId, tableId, tableNumber, billSessionId, guestSessionId, items, note, createdAt, orderStatus = 'NEW', paymentStatus = 'UNPAID', paymentMethod = 'MOCK'}) => {
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  return {
    id,
    restaurantId,
    branchId,
    tableId,
    tableNumber,
    billSessionId,
    guestSessionId,
    orderSource: 'customer',
    items,
    note,
    total,
    orderStatus,
    paymentStatus,
    paymentMethod,
    createdAt,
    updatedAt: createdAt,
  };
};

const buildDemoBillSession = ({id, restaurantId, branchId, tableId, tableNumber, guestSessionId, orderIds, orders, openedAt, status = 'OPEN', note = ''}) => {
  const billOrders = orders.filter(order => orderIds.includes(order.id));
  const subtotal = billOrders.reduce(
    (sum, order) => order.orderStatus === 'CANCELLED' ? sum : sum + Number(order.total || 0),
    0,
  );
  return {
    id,
    restaurantId,
    branchId,
    tableId,
    tableNumber,
    guestSessionId,
    status,
    orderIds,
    orderCount: orderIds.length,
    subtotal,
    discountTotal: 0,
    serviceFeeTotal: 0,
    total: subtotal,
    paymentMethod: 'MOCK',
    note,
    tableChangeLogs: [],
    openedAt,
    createdAt: openedAt,
    updatedAt: openedAt,
  };
};

const addDemoBillSessions = db => {
  const haidilaoOrder1 = buildDemoOrder({
    id: 'seed_order_haidilao_001',
    restaurantId: 'haidilao_demo',
    branchId: 'haidilao_demo_main',
    tableId: 'haidilao_main_table_01',
    tableNumber: 'HDL 01',
    billSessionId: 'seed_bill_haidilao_hdl01',
    guestSessionId: 'seed_guest_haidilao_hdl01',
    createdAt: '2026-05-09T08:00:00.000Z',
    note: 'Seed demo: lần đầu gọi món',
    items: [
      {itemId: 'haidilao_beef_plate', name: 'Ba chỉ bò Mỹ', price: 129000, quantity: 2, note: 'Ít cay'},
    ],
  });
  const haidilaoOrder2 = buildDemoOrder({
    id: 'seed_order_haidilao_002',
    restaurantId: 'haidilao_demo',
    branchId: 'haidilao_demo_main',
    tableId: 'haidilao_main_table_01',
    tableNumber: 'HDL 01',
    billSessionId: 'seed_bill_haidilao_hdl01',
    guestSessionId: 'seed_guest_haidilao_hdl01',
    createdAt: '2026-05-09T08:08:00.000Z',
    note: 'Seed demo: gọi thêm món',
    items: [
      {itemId: 'haidilao_mushroom_hotpot', name: 'Lẩu nấm thanh ngọt', price: 159000, quantity: 1},
    ],
  });
  const aplusOrder1 = buildDemoOrder({
    id: 'seed_order_aplus_001',
    restaurantId: 'aplus_billiards_hanoi',
    branchId: 'aplus_hanoi_main',
    tableId: 'aplus_main_table_01',
    tableNumber: 'Bàn 01',
    billSessionId: 'seed_bill_aplus_ban01',
    guestSessionId: 'seed_guest_aplus_ban01',
    createdAt: '2026-05-09T08:12:00.000Z',
    note: 'Seed demo: nước + đồ ăn nhẹ',
    items: [
      {itemId: 'aplus_coca', name: 'Coca lạnh', price: 25000, quantity: 2},
      {itemId: 'aplus_fries', name: 'Khoai tây chiên', price: 45000, quantity: 1},
    ],
  });

  db.orders = [haidilaoOrder2, aplusOrder1, haidilaoOrder1];
  db.billSessions = [
    buildDemoBillSession({
      id: 'seed_bill_haidilao_hdl01',
      restaurantId: 'haidilao_demo',
      branchId: 'haidilao_demo_main',
      tableId: 'haidilao_main_table_01',
      tableNumber: 'HDL 01',
      guestSessionId: 'seed_guest_haidilao_hdl01',
      orderIds: ['seed_order_haidilao_001', 'seed_order_haidilao_002'],
      orders: db.orders,
      openedAt: '2026-05-09T08:00:00.000Z',
      note: 'Seed Batch 25: bill demo Haidilao cộng dồn 2 order.',
    }),
    buildDemoBillSession({
      id: 'seed_bill_aplus_ban01',
      restaurantId: 'aplus_billiards_hanoi',
      branchId: 'aplus_hanoi_main',
      tableId: 'aplus_main_table_01',
      tableNumber: 'Bàn 01',
      guestSessionId: 'seed_guest_aplus_ban01',
      orderIds: ['seed_order_aplus_001'],
      orders: db.orders,
      openedAt: '2026-05-09T08:12:00.000Z',
      note: 'Seed Batch 25: bill demo APlus.',
    }),
  ];
  db.auditLogs = [
    {
      id: 'seed_audit_bill_opened_haidilao',
      at: '2026-05-09T08:00:00.000Z',
      action: 'billOpened',
      restaurantId: 'haidilao_demo',
      branchId: 'haidilao_demo_main',
      targetId: 'seed_bill_haidilao_hdl01',
      details: {seed: true, orderIds: ['seed_order_haidilao_001', 'seed_order_haidilao_002'], tableNumber: 'HDL 01'},
    },
    {
      id: 'seed_audit_bill_opened_aplus',
      at: '2026-05-09T08:12:00.000Z',
      action: 'billOpened',
      restaurantId: 'aplus_billiards_hanoi',
      branchId: 'aplus_hanoi_main',
      targetId: 'seed_bill_aplus_ban01',
      details: {seed: true, orderIds: ['seed_order_aplus_001'], tableNumber: 'Bàn 01'},
    },
  ];
  db.tables = db.tables.map(table =>
    table.id === 'haidilao_main_table_01' || table.id === 'aplus_main_table_01'
      ? {...table, status: 'OCCUPIED', updatedAt: now}
      : table,
  );
  return db;
};

const createSeedDatabase = () => {
  const db = ({
  meta: {
    schemaVersion: 'scoremenu_backend_schema_v1_batch25',
    generatedAt: now,
  },
  restaurants: [
    {
      id: 'aplus_billiards_hanoi',
      name: 'APlus Billiards Hà Nội',
      ownerId: 'admin_aplus_owner',
      status: 'ACTIVE',
      logoUrl: '',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_demo',
      name: 'Haidilao Demo',
      ownerId: 'admin_demo_owner',
      status: 'ACTIVE',
      logoUrl: '',
      createdAt: now,
      updatedAt: now,
    },
  ],
  branches: [
    {
      id: 'aplus_hanoi_main',
      restaurantId: 'aplus_billiards_hanoi',
      name: 'Chi nhánh Cầu Giấy',
      address: 'Cầu Giấy, Hà Nội',
      menuQrToken: 'qr_aplus_main_menu',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'aplus_hanoi_vip',
      restaurantId: 'aplus_billiards_hanoi',
      name: 'Chi nhánh VIP Long Biên',
      address: 'Long Biên, Hà Nội',
      menuQrToken: 'qr_aplus_vip_menu',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_demo_main',
      restaurantId: 'haidilao_demo',
      name: 'Chi nhánh demo chính',
      address: 'Trung tâm thương mại demo',
      menuQrToken: 'qr_haidilao_main_menu',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_demo_2',
      restaurantId: 'haidilao_demo',
      name: 'Chi nhánh demo 2',
      address: 'Khu đô thị demo',
      menuQrToken: 'qr_haidilao_2_menu',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ],
  tables: [
    {
      id: 'aplus_main_table_01',
      restaurantId: 'aplus_billiards_hanoi',
      branchId: 'aplus_hanoi_main',
      tableNumber: 'Bàn 01',
      qrCodeToken: 'qr_aplus_main_01',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'aplus_main_table_02',
      restaurantId: 'aplus_billiards_hanoi',
      branchId: 'aplus_hanoi_main',
      tableNumber: 'Bàn 02',
      qrCodeToken: 'qr_aplus_main_02',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'aplus_vip_table_01',
      restaurantId: 'aplus_billiards_hanoi',
      branchId: 'aplus_hanoi_vip',
      tableNumber: 'VIP 01',
      qrCodeToken: 'qr_aplus_vip_01',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_main_table_01',
      restaurantId: 'haidilao_demo',
      branchId: 'haidilao_demo_main',
      tableNumber: 'HDL 01',
      qrCodeToken: 'qr_haidilao_main_01',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_main_table_02',
      restaurantId: 'haidilao_demo',
      branchId: 'haidilao_demo_main',
      tableNumber: 'HDL 02',
      qrCodeToken: 'qr_haidilao_main_02',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_2_table_01',
      restaurantId: 'haidilao_demo',
      branchId: 'haidilao_demo_2',
      tableNumber: 'HDL 201',
      qrCodeToken: 'qr_haidilao_2_01',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },
  ],
  categories: [
    {
      id: 'aplus_drink',
      restaurantId: 'aplus_billiards_hanoi',
      name: 'Đồ uống',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'aplus_snack',
      restaurantId: 'aplus_billiards_hanoi',
      name: 'Đồ ăn nhẹ',
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_hotpot',
      restaurantId: 'haidilao_demo',
      name: 'Lẩu',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_meat',
      restaurantId: 'haidilao_demo',
      name: 'Thịt nhúng',
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
  ],
  items: [
    {
      id: 'aplus_coca',
      restaurantId: 'aplus_billiards_hanoi',
      categoryId: 'aplus_drink',
      name: 'Coca lạnh',
      price: 25000,
      description: 'Coca-Cola lạnh phục vụ nhanh tại bàn.',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80',
      available: true,
      status: 'SELLING',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'aplus_pepsi',
      restaurantId: 'aplus_billiards_hanoi',
      categoryId: 'aplus_drink',
      name: 'Pepsi lạnh',
      price: 25000,
      description: 'Pepsi lạnh vị ga mạnh.',
      imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=80',
      available: true,
      status: 'SELLING',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'aplus_fries',
      restaurantId: 'aplus_billiards_hanoi',
      categoryId: 'aplus_snack',
      name: 'Khoai tây chiên',
      price: 45000,
      description: 'Khoai tây chiên giòn, ăn kèm sốt.',
      imageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=900&q=80',
      available: true,
      status: 'SELLING',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_mushroom_hotpot',
      restaurantId: 'haidilao_demo',
      categoryId: 'haidilao_hotpot',
      name: 'Lẩu nấm thanh ngọt',
      price: 159000,
      description: 'Nước lẩu nấm thanh nhẹ, phù hợp nhóm nhỏ.',
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
      available: true,
      status: 'SELLING',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'haidilao_beef_plate',
      restaurantId: 'haidilao_demo',
      categoryId: 'haidilao_meat',
      name: 'Ba chỉ bò Mỹ',
      price: 129000,
      description: 'Ba chỉ bò thái lát mỏng dùng cho lẩu.',
      imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=80',
      available: true,
      status: 'SELLING',
      createdAt: now,
      updatedAt: now,
    },
  ],
  orders: [],
  billSessions: [],
  auditLogs: [],
  publicOrderRateLimits: [],
  carts: {},
  imageUploads: [],
  adminUsers: [
    createSeedAdmin({
      id: 'admin_aplus_owner',
      username: 'admin',
      password: 'admin123',
      role: 'OWNER',
      restaurantIds: ['aplus_billiards_hanoi', 'haidilao_demo'],
      activeRestaurantId: 'aplus_billiards_hanoi',
    }),
    createSeedAdmin({
      id: 'admin_aplus_staff',
      username: 'staff',
      password: 'staff123',
      role: 'STAFF',
      restaurantIds: ['aplus_billiards_hanoi'],
      activeRestaurantId: 'aplus_billiards_hanoi',
      branchIds: ['aplus_hanoi_main'],
      activeBranchId: 'aplus_hanoi_main',
    }),
    createSeedAdmin({
      id: 'admin_haidilao_owner',
      username: 'haidilao',
      password: 'admin123',
      role: 'OWNER',
      restaurantIds: ['haidilao_demo'],
      activeRestaurantId: 'haidilao_demo',
    }),
  ],
});
  return addDemoBillSessions(db);
};

module.exports = {
  createSeedDatabase,
  seedDatabase: createSeedDatabase(),
  clone,
};
