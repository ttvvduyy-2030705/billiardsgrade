#!/usr/bin/env node
/*
 * ScoreMenu Batch 25 - BillSession/TableBill acceptance smoke test.
 *
 * Requirements:
 *   1. Start backend first: npm run scoremenu:server
 *   2. Optional env:
 *      SCOREMENU_BASE_URL=http://localhost:4012
 *      SCOREMENU_SKIP_RESET=1
 */

const http = require('http');
const https = require('https');

const BASE_URL = (process.env.SCOREMENU_BASE_URL || 'http://localhost:4012').replace(/\/$/, '');
const SHOULD_RESET = process.env.SCOREMENU_SKIP_RESET !== '1';
const EXPECTED_SCHEMA_VERSION = 'scoremenu_backend_schema_v1_batch25';

const HAIDILAO_QR = 'qr_haidilao_main_menu';
const HAIDILAO_BRANCH2_QR = 'qr_haidilao_2_menu';
const APLUS_QR = 'qr_aplus_main_menu';
const HAIDILAO_RESTAURANT_ID = 'haidilao_demo';
const HAIDILAO_BRANCH_ID = 'haidilao_demo_main';
const HAIDILAO_BRANCH2_ID = 'haidilao_demo_2';
const APLUS_RESTAURANT_ID = 'aplus_billiards_hanoi';
const APLUS_BRANCH_ID = 'aplus_hanoi_main';
const HAIDILAO_TABLE_LOCKED = 'HDL 01';
const HAIDILAO_TABLE_FREE = 'HDL 02';
const HAIDILAO_BRANCH2_TABLE = 'HDL 201';
const APLUS_TABLE_LOCKED = 'Bàn 01';
const APLUS_TABLE_TRANSFER_TARGET = 'Bàn 02';
const HAIDILAO_ITEM = 'haidilao_beef_plate';
const HAIDILAO_ADDON_ITEM = 'haidilao_mushroom_hotpot';
const APLUS_ITEM = 'aplus_coca';
const APLUS_FRIES_ITEM = 'aplus_fries';
const APLUS_SEED_BILL_ID = 'seed_bill_aplus_ban01';
const HAIDILAO_SEED_BILL_ID = 'seed_bill_haidilao_hdl01';

const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const GUEST_HAIDILAO = `e2e_guest_batch25_haidilao_${uniqueSuffix}`;
const GUEST_HAIDILAO_BRANCH2 = `e2e_guest_batch25_haidilao_b2_${uniqueSuffix}`;
const GUEST_APLUS = `e2e_guest_batch25_aplus_${uniqueSuffix}`;

const state = {
  haidilaoToken: '',
  staffToken: '',
  adminToken: '',
  publicBillSessionId: '',
  publicOrderId: '',
  aplusPublicBillSessionId: '',
  branch2BillSessionId: '',
};

const results = [];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const requestJson = ({method = 'GET', path, body, token, expectedStatus}) => {
  const url = new URL(path, BASE_URL);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const client = url.protocol === 'https:' ? https : http;

  const headers = {Accept: 'application/json'};
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = client.request(url, {method, headers}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data = raw;
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch (_error) {
            // Keep raw body for easier backend/static file debugging.
          }
        }

        const response = {status: res.statusCode, headers: res.headers, data, raw};
        if (expectedStatus !== undefined) {
          const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
          if (!expected.includes(res.statusCode)) {
            const message = typeof data === 'object' && data?.message ? data.message : raw;
            reject(new Error(`${method} ${path} expected ${expected.join('/')} but got ${res.statusCode}: ${message}`));
            return;
          }
        } else if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = typeof data === 'object' && data?.message ? data.message : raw;
          reject(new Error(`${method} ${path} failed with ${res.statusCode}: ${message}`));
          return;
        }
        resolve(response);
      });
    });

    req.on('error', error => {
      reject(new Error(`${method} ${path} failed: ${error.message}. Is ScoreMenu backend running at ${BASE_URL}?`));
    });

    req.setTimeout(8000, () => {
      req.destroy(new Error(`${method} ${path} timed out after 8000ms`));
    });

    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const asArray = value => (Array.isArray(value) ? value : []);
const findById = (items, id) => asArray(items).find(item => item?.id === id || item?.itemId === id || item?.orderId === id);
const getCreatedOrder = responseData => Array.isArray(responseData) ? responseData[0] : responseData?.order;
const severityLabel = severity => severity.toUpperCase().padEnd(7, ' ');

const login = async (username, password) => {
  const res = await requestJson({
    method: 'POST',
    path: '/auth/admin/login',
    body: {username, password},
  });
  assert(res.data?.token, `Login ${username} did not return token.`);
  return res.data.token;
};

const run = async (name, severity, fn) => {
  const started = Date.now();
  try {
    await fn();
    results.push({name, severity, status: 'PASS', durationMs: Date.now() - started});
    console.log(`✓ [${severityLabel(severity)}] ${name} (${Date.now() - started}ms)`);
  } catch (error) {
    results.push({name, severity, status: 'FAIL', durationMs: Date.now() - started, message: error.message});
    console.error(`✗ [${severityLabel(severity)}] ${name}`);
    console.error(`  ${error.message}`);
    process.exitCode = 1;
  }
};

const summarize = () => {
  const failed = results.filter(result => result.status === 'FAIL');
  const bySeverity = severity => failed.filter(result => result.severity === severity).length;
  const passed = results.length - failed.length;

  console.log('\nBatch 25 acceptance report');
  console.log(`- Passed: ${passed}/${results.length}`);
  console.log(`- Blocker: ${bySeverity('blocker')}`);
  console.log(`- Major: ${bySeverity('major')}`);
  console.log(`- Minor: ${bySeverity('minor')}`);

  if (failed.length > 0) {
    console.log('\nFailed checks:');
    failed.forEach(result => {
      console.log(`- [${result.severity}] ${result.name}: ${result.message}`);
    });
    console.log('\nResult: NOT READY - fix blocker/major/minor failures before restaurant demo.');
    return;
  }

  console.log('\nResult: READY - BillSession cumulative billing acceptance flow passed.');
};

const main = async () => {
  console.log('ScoreMenu Batch 25 acceptance smoke test');
  console.log(`Backend: ${BASE_URL}`);

  await run('Backend health is reachable and exposes Batch 25 schema', 'blocker', async () => {
    const res = await requestJson({path: '/health'});
    assert(res.data?.ok === true, 'Health response should be ok=true.');
    assert(res.data?.schemaVersion === EXPECTED_SCHEMA_VERSION, `Expected ${EXPECTED_SCHEMA_VERSION}, got ${res.data?.schemaVersion}`);
    assert(asArray(res.data?.billSessionStatuses).includes('OPEN'), 'Health should expose BillSession statuses.');
  });

  if (SHOULD_RESET) {
    await run('Reset demo database before acceptance checks', 'blocker', async () => {
      const res = await requestJson({method: 'POST', path: '/dev/reset'});
      assert(res.data?.ok === true, 'Database reset should return ok=true.');
      assert(res.data?.schemaVersion === EXPECTED_SCHEMA_VERSION, 'Reset should seed Batch 25 schema.');
    });
  } else {
    console.log('• Skipping /dev/reset because SCOREMENU_SKIP_RESET=1');
  }

  await run('Admin logins return scoped tokens', 'blocker', async () => {
    state.haidilaoToken = await login('haidilao', 'admin123');
    state.staffToken = await login('staff', 'staff123');
    state.adminToken = await login('admin', 'admin123');
  });

  await run('Seed database contains demo BillSessions for Haidilao and APlus', 'minor', async () => {
    const haidilao = await requestJson({
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/bills?branchId=${HAIDILAO_BRANCH_ID}`,
      token: state.haidilaoToken,
    });
    const aplus = await requestJson({
      path: `/restaurants/${APLUS_RESTAURANT_ID}/bills?branchId=${APLUS_BRANCH_ID}`,
      token: state.adminToken,
    });
    const haidilaoSeedBill = asArray(haidilao.data).find(bill => bill.id === HAIDILAO_SEED_BILL_ID);
    const aplusSeedBill = asArray(aplus.data).find(bill => bill.id === APLUS_SEED_BILL_ID);
    assert(haidilaoSeedBill, 'Haidilao seed bill should exist.');
    assert(aplusSeedBill, 'APlus seed bill should exist.');
    assert(haidilaoSeedBill.tableNumber === HAIDILAO_TABLE_LOCKED, 'Haidilao seed bill should lock HDL 01.');
    assert(Number(haidilaoSeedBill.total) === 417000, `Haidilao seed bill total should be 417000, got ${haidilaoSeedBill.total}.`);
    assert(Number(aplusSeedBill.total) === 95000, `APlus seed bill total should be 95000, got ${aplusSeedBill.total}.`);
  });

  await run('Public QR scopes menu and table choices by restaurant/branch', 'major', async () => {
    const haidilaoMenu = await requestJson({path: `/public/menu/${HAIDILAO_QR}`});
    const aplusMenu = await requestJson({path: `/public/menu/${APLUS_QR}`});
    const haidilaoBranch2Menu = await requestJson({path: `/public/menu/${HAIDILAO_BRANCH2_QR}`});
    const haidilaoTables = await requestJson({path: `/public/menu/${HAIDILAO_QR}/tables`});
    assert(haidilaoMenu.data?.context?.restaurantId === HAIDILAO_RESTAURANT_ID, 'Haidilao QR must resolve to haidilao_demo.');
    assert(haidilaoMenu.data?.context?.branchId === HAIDILAO_BRANCH_ID, 'Haidilao main QR must resolve to main branch.');
    assert(haidilaoBranch2Menu.data?.context?.branchId === HAIDILAO_BRANCH2_ID, 'Haidilao branch 2 QR must resolve to branch 2.');
    assert(aplusMenu.data?.context?.restaurantId === APLUS_RESTAURANT_ID, 'APlus QR must resolve to aplus_billiards_hanoi.');
    assert(findById(haidilaoMenu.data?.items, HAIDILAO_ITEM), 'Haidilao menu should include beef plate.');
    assert(!findById(haidilaoMenu.data?.items, APLUS_ITEM), 'Haidilao menu must not include APlus items.');
    assert(asArray(haidilaoTables.data).some(table => table.tableNumber === HAIDILAO_TABLE_FREE), 'Haidilao tables should include HDL 02.');
    assert(!asArray(haidilaoTables.data).some(table => table.tableNumber === APLUS_TABLE_LOCKED), 'Haidilao table list must not include APlus tables.');
  });

  await run('First customer order creates BillSession and locks selected table', 'blocker', async () => {
    const res = await requestJson({
      method: 'POST',
      path: `/public/menu/${HAIDILAO_QR}/orders`,
      expectedStatus: 201,
      body: {
        guestSessionId: GUEST_HAIDILAO,
        tableNumber: HAIDILAO_TABLE_FREE,
        items: [{itemId: HAIDILAO_ITEM, quantity: 2, price: 1, name: 'FAKE PRICE'}],
        total: 2,
        note: 'Batch 25 acceptance order #1',
      },
    });
    const order = getCreatedOrder(res.data);
    assert(order, 'Public order response should return created order.');
    assert(res.data?.billSessionId, 'Public order response should return billSessionId.');
    state.publicBillSessionId = res.data.billSessionId;
    state.publicOrderId = order.id;
    assert(order.restaurantId === HAIDILAO_RESTAURANT_ID, 'Created order must use restaurant from QR.');
    assert(order.branchId === HAIDILAO_BRANCH_ID, 'Created order must use branch from QR.');
    assert(order.tableNumber === HAIDILAO_TABLE_FREE, 'First order must use selected HDL 02 table.');
    assert(order.billSessionId === state.publicBillSessionId, 'Order must attach to created BillSession.');
    assert(Number(order.total) === 258000, `Backend should recalculate total to 258000, got ${order.total}.`);
    assert(Number(res.data.billTotal) === 258000, `Bill total should start at 258000, got ${res.data.billTotal}.`);
  });

  await run('Second customer order uses locked BillSession table and ignores fake tableNumber', 'blocker', async () => {
    const res = await requestJson({
      method: 'POST',
      path: `/public/menu/${HAIDILAO_QR}/orders`,
      expectedStatus: 201,
      body: {
        guestSessionId: GUEST_HAIDILAO,
        billSessionId: state.publicBillSessionId,
        tableNumber: 'HDL 99',
        items: [{itemId: HAIDILAO_ADDON_ITEM, quantity: 1}],
        note: 'Batch 25 acceptance order #2 fake table must be ignored',
      },
    });
    const order = getCreatedOrder(res.data);
    assert(order?.billSessionId === state.publicBillSessionId, 'Second order should attach to the first billSessionId.');
    assert(order?.tableNumber === HAIDILAO_TABLE_FREE, 'Backend must ignore fake tableNumber after bill lock.');
    assert(Number(res.data?.billTotal) === 417000, `Bill total should accumulate to 417000, got ${res.data?.billTotal}.`);
  });

  await run('Admin dashboard API groups order children under one BillSession/table', 'major', async () => {
    const list = await requestJson({
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/bills?branchId=${HAIDILAO_BRANCH_ID}`,
      token: state.haidilaoToken,
    });
    const bill = asArray(list.data).find(item => item.id === state.publicBillSessionId);
    assert(bill, 'Admin bill list should include the public BillSession.');
    assert(bill.tableNumber === HAIDILAO_TABLE_FREE, 'Admin bill should keep locked table HDL 02.');
    assert(Number(bill.total) === 417000, `Admin bill total should be 417000, got ${bill?.total}.`);
    assert(Number(bill.orderCount) === 2, `Admin bill should have two orders, got ${bill?.orderCount}.`);
    assert(asArray(bill.orders).length === 2, 'Admin bill should include two order children.');
    assert(asArray(bill.orderSummaries).length === 2, 'Admin bill should include two order summaries.');
    assert(asArray(bill.orderSummaries).map(summary => summary.orderNumber).join(',') === '1,2', 'Order summaries should keep order #1/#2 numbering.');
  });

  await run('Customer current bill endpoint returns cumulative bill summary', 'major', async () => {
    const res = await requestJson({
      path: `/public/menu/${HAIDILAO_QR}/bills/current?guestSessionId=${encodeURIComponent(GUEST_HAIDILAO)}&billSessionId=${encodeURIComponent(state.publicBillSessionId)}`,
    });
    assert(res.data?.id === state.publicBillSessionId, 'Current bill should match public billSessionId.');
    assert(asArray(res.data?.orders).length === 2, 'Current bill should contain two order children.');
    assert(Number(res.data?.total) === 417000, `Current bill total should be 417000, got ${res.data?.total}.`);
  });

  await run('Staff can transfer an open APlus bill and future orders follow the new table', 'major', async () => {
    const transferred = await requestJson({
      method: 'PATCH',
      path: `/restaurants/${APLUS_RESTAURANT_ID}/bills/${APLUS_SEED_BILL_ID}/table`,
      token: state.staffToken,
      body: {
        tableNumber: APLUS_TABLE_TRANSFER_TARGET,
        reason: 'Batch 25 acceptance transfer test',
      },
    });
    assert(transferred.data?.tableNumber === APLUS_TABLE_TRANSFER_TARGET, 'Transferred bill should move to Bàn 02.');
    assert(asArray(transferred.data?.tableChangeLogs).length >= 1, 'Transferred bill should keep tableChangeLogs.');

    const added = await requestJson({
      method: 'POST',
      path: `/public/menu/${APLUS_QR}/orders`,
      expectedStatus: 201,
      body: {
        guestSessionId: 'seed_guest_aplus_ban01',
        billSessionId: APLUS_SEED_BILL_ID,
        tableNumber: 'Bàn 99',
        items: [{itemId: APLUS_ITEM, quantity: 1}],
        note: 'Batch 25 order after staff transfer',
      },
    });
    const order = getCreatedOrder(added.data);
    assert(order?.tableNumber === APLUS_TABLE_TRANSFER_TARGET, 'Order after transfer must follow Bàn 02, not fake client table.');
    assert(Number(added.data?.billTotal) === 120000, `APlus seed bill should increase to 120000, got ${added.data?.billTotal}.`);
  });

  await run('Transfer action writes audit log and occupied-table transfer is blocked', 'minor', async () => {
    const logs = await requestJson({
      path: `/restaurants/${APLUS_RESTAURANT_ID}/audit-logs?branchId=${APLUS_BRANCH_ID}&action=tableChanged&limit=10`,
      token: state.staffToken,
    });
    assert(asArray(logs.data).some(log => log.targetId === APLUS_SEED_BILL_ID), 'tableChanged audit log should include transferred APlus bill.');

    await requestJson({
      method: 'PATCH',
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/bills/${state.publicBillSessionId}/table`,
      token: state.haidilaoToken,
      expectedStatus: 409,
      body: {
        tableNumber: HAIDILAO_TABLE_LOCKED,
        reason: 'Batch 25 should block moving to occupied seed bill table',
      },
    });
  });

  await run('Paid/closed bill blocks customer from adding more orders', 'blocker', async () => {
    const paid = await requestJson({
      method: 'PATCH',
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/bills/${state.publicBillSessionId}/payment`,
      token: state.haidilaoToken,
      body: {
        status: 'PAID',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        note: 'Batch 25 mark bill paid',
      },
    });
    assert(paid.data?.status === 'PAID', 'Bill should become PAID.');
    assert(paid.data?.paymentMethod === 'CASH', 'Payment method should be CASH.');

    await requestJson({
      method: 'POST',
      path: `/public/menu/${HAIDILAO_QR}/orders`,
      expectedStatus: 400,
      body: {
        guestSessionId: GUEST_HAIDILAO,
        billSessionId: state.publicBillSessionId,
        tableNumber: HAIDILAO_TABLE_FREE,
        items: [{itemId: HAIDILAO_ITEM, quantity: 1}],
        note: 'Batch 25 should be rejected because bill is PAID',
      },
    });

    const closed = await requestJson({
      method: 'PATCH',
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/bills/${state.publicBillSessionId}/close`,
      token: state.haidilaoToken,
      body: {note: 'Batch 25 close bill'},
    });
    assert(closed.data?.status === 'CLOSED', 'Bill should become CLOSED.');
    assert(closed.data?.closedAt, 'Closed bill should include closedAt.');

    await requestJson({
      method: 'POST',
      path: `/public/menu/${HAIDILAO_QR}/orders`,
      expectedStatus: 400,
      body: {
        guestSessionId: GUEST_HAIDILAO,
        billSessionId: state.publicBillSessionId,
        tableNumber: HAIDILAO_TABLE_FREE,
        items: [{itemId: HAIDILAO_ITEM, quantity: 1}],
        note: 'Batch 25 should be rejected because bill is CLOSED',
      },
    });
  });

  await run('Two restaurants and two branches do not leak bills into each other', 'blocker', async () => {
    const branch2Order = await requestJson({
      method: 'POST',
      path: `/public/menu/${HAIDILAO_BRANCH2_QR}/orders`,
      expectedStatus: 201,
      body: {
        guestSessionId: GUEST_HAIDILAO_BRANCH2,
        tableNumber: HAIDILAO_BRANCH2_TABLE,
        items: [{itemId: HAIDILAO_ITEM, quantity: 1}],
        note: 'Batch 25 branch isolation order',
      },
    });
    state.branch2BillSessionId = branch2Order.data?.billSessionId;
    assert(branch2Order.data?.billSession?.branchId === HAIDILAO_BRANCH2_ID, 'Branch 2 order should create bill in branch 2.');

    const aplusOrder = await requestJson({
      method: 'POST',
      path: `/public/menu/${APLUS_QR}/orders`,
      expectedStatus: 201,
      body: {
        guestSessionId: GUEST_APLUS,
        tableNumber: APLUS_TABLE_LOCKED,
        items: [{itemId: APLUS_FRIES_ITEM, quantity: 1}],
        note: 'Batch 25 APlus isolation order',
      },
    });
    state.aplusPublicBillSessionId = aplusOrder.data?.billSessionId;
    assert(aplusOrder.data?.billSession?.restaurantId === APLUS_RESTAURANT_ID, 'APlus order should create APlus bill.');

    const haidilaoMainBills = await requestJson({
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/bills?branchId=${HAIDILAO_BRANCH_ID}`,
      token: state.haidilaoToken,
    });
    assert(!asArray(haidilaoMainBills.data).some(bill => bill.id === state.branch2BillSessionId), 'Haidilao main branch list must not include branch 2 bill.');
    assert(!asArray(haidilaoMainBills.data).some(bill => bill.id === state.aplusPublicBillSessionId), 'Haidilao list must not include APlus bill.');

    const haidilaoBranch2Bills = await requestJson({
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/bills?branchId=${HAIDILAO_BRANCH2_ID}`,
      token: state.haidilaoToken,
    });
    assert(asArray(haidilaoBranch2Bills.data).some(bill => bill.id === state.branch2BillSessionId), 'Haidilao branch 2 list should include branch 2 bill.');

    const aplusBills = await requestJson({
      path: `/restaurants/${APLUS_RESTAURANT_ID}/bills?branchId=${APLUS_BRANCH_ID}`,
      token: state.staffToken,
    });
    assert(asArray(aplusBills.data).every(bill => bill.restaurantId === APLUS_RESTAURANT_ID), 'APlus staff bill list should only contain APlus bills.');
    assert(!asArray(aplusBills.data).some(bill => bill.id === state.publicBillSessionId || bill.id === state.branch2BillSessionId), 'APlus staff should not see Haidilao bills.');

    await requestJson({
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/bills?branchId=${HAIDILAO_BRANCH_ID}`,
      token: state.staffToken,
      expectedStatus: 403,
    });
  });

  await run('Legacy admin order without billSessionId is migrated to a temporary BillSession', 'major', async () => {
    const created = await requestJson({
      method: 'POST',
      path: `/restaurants/${APLUS_RESTAURANT_ID}/orders`,
      token: state.adminToken,
      expectedStatus: [200, 201],
      body: {
        branchId: APLUS_BRANCH_ID,
        tableNumber: APLUS_TABLE_LOCKED,
        items: [{itemId: APLUS_ITEM, quantity: 1}],
        note: 'Batch 25 legacy migration acceptance order',
      },
    });
    const legacyOrder = getCreatedOrder(created.data) || asArray(created.data).find(order => order?.note === 'Batch 25 legacy migration acceptance order');
    assert(legacyOrder?.id, 'Admin legacy order should be created.');
    await sleep(50);
    const bills = await requestJson({
      path: `/restaurants/${APLUS_RESTAURANT_ID}/bills?branchId=${APLUS_BRANCH_ID}`,
      token: state.adminToken,
    });
    const migratedBill = asArray(bills.data).find(bill =>
      String(bill.id || '').startsWith('bill_migrated_') &&
      asArray(bill.orders).some(order => order.id === legacyOrder.id),
    );
    assert(migratedBill, 'Legacy order should be grouped into a migrated temporary BillSession.');
    assert(Number(migratedBill.total) === 25000, `Migrated bill total should be 25000, got ${migratedBill?.total}.`);
  });

  summarize();
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
