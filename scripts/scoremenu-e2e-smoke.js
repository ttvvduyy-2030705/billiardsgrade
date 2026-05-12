#!/usr/bin/env node
/*
 * ScoreMenu Batch 15 - Multi-restaurant smoke test.
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

const HAIDILAO_QR = 'qr_haidilao_main_menu';
const APLUS_QR = 'qr_aplus_main_menu';
const HAIDILAO_RESTAURANT_ID = 'haidilao_demo';
const HAIDILAO_BRANCH_ID = 'haidilao_demo_main';
const APLUS_RESTAURANT_ID = 'aplus_billiards_hanoi';
const APLUS_BRANCH_ID = 'aplus_hanoi_main';
const HAIDILAO_TABLE = 'HDL 01';
const APLUS_TABLE = 'Bàn 01';
const HAIDILAO_ITEM = 'haidilao_beef_plate';
const APLUS_ITEM = 'aplus_coca';

const state = {
  haidilaoToken: '',
  staffToken: '',
  adminToken: '',
  publicOrderId: '',
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const requestJson = ({method = 'GET', path, body, token, expectedStatus}) => {
  const url = new URL(path, BASE_URL);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const client = url.protocol === 'https:' ? https : http;

  const headers = {
    Accept: 'application/json',
  };
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
          } catch (error) {
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

const findById = (items, id) => asArray(items).find(item => item?.id === id || item?.itemId === id);

const login = async (username, password) => {
  const res = await requestJson({
    method: 'POST',
    path: '/auth/admin/login',
    body: {username, password},
  });
  assert(res.data?.token, `Login ${username} did not return token.`);
  return res.data.token;
};

const run = async (name, fn) => {
  const started = Date.now();
  try {
    await fn();
    console.log(`✓ ${name} (${Date.now() - started}ms)`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    process.exitCode = 1;
  }
};

const main = async () => {
  console.log(`ScoreMenu Batch 15 smoke test`);
  console.log(`Backend: ${BASE_URL}`);

  await run('Backend health is reachable', async () => {
    const res = await requestJson({path: '/health'});
    assert(res.data?.ok === true, 'Health response should be ok=true.');
    assert(Number(res.data?.restaurants) >= 2, 'Seed must contain at least 2 restaurants.');
  });

  if (SHOULD_RESET) {
    await run('Reset demo database', async () => {
      const res = await requestJson({method: 'POST', path: '/dev/reset'});
      assert(res.data?.ok === true, 'Database reset should return ok=true.');
    });
  } else {
    console.log('• Skipping /dev/reset because SCOREMENU_SKIP_RESET=1');
  }

  await run('Public QR Haidilao returns only Haidilao menu scope', async () => {
    const res = await requestJson({path: `/public/menu/${HAIDILAO_QR}`});
    assert(res.data?.context?.restaurantId === HAIDILAO_RESTAURANT_ID, 'Haidilao QR must resolve to haidilao_demo.');
    assert(res.data?.context?.branchId === HAIDILAO_BRANCH_ID, 'Haidilao QR must resolve to main branch.');
    assert(findById(res.data?.items, HAIDILAO_ITEM), 'Haidilao menu should include haidilao_beef_plate.');
    assert(!findById(res.data?.items, APLUS_ITEM), 'Haidilao menu must not include APlus items.');
  });

  await run('Public QR APlus returns only APlus menu scope', async () => {
    const res = await requestJson({path: `/public/menu/${APLUS_QR}`});
    assert(res.data?.context?.restaurantId === APLUS_RESTAURANT_ID, 'APlus QR must resolve to aplus_billiards_hanoi.');
    assert(res.data?.context?.branchId === APLUS_BRANCH_ID, 'APlus QR must resolve to main branch.');
    assert(findById(res.data?.items, APLUS_ITEM), 'APlus menu should include aplus_coca.');
    assert(!findById(res.data?.items, HAIDILAO_ITEM), 'APlus menu must not include Haidilao items.');
  });

  await run('Public tables are scoped by QR branch', async () => {
    const haidilaoTables = await requestJson({path: `/public/menu/${HAIDILAO_QR}/tables`});
    const aplusTables = await requestJson({path: `/public/menu/${APLUS_QR}/tables`});
    assert(asArray(haidilaoTables.data).some(table => table.tableNumber === HAIDILAO_TABLE), 'Haidilao tables should include HDL 01.');
    assert(!asArray(haidilaoTables.data).some(table => table.tableNumber === APLUS_TABLE), 'Haidilao table list must not include APlus 01.');
    assert(asArray(aplusTables.data).some(table => table.tableNumber === APLUS_TABLE), 'APlus tables should include APlus 01.');
    assert(!asArray(aplusTables.data).some(table => table.tableNumber === HAIDILAO_TABLE), 'APlus table list must not include HDL 01.');
  });

  await run('Public order ignores fake client scope and uses QR restaurant/branch/table', async () => {
    const res = await requestJson({
      method: 'POST',
      path: `/public/menu/${HAIDILAO_QR}/orders`,
      expectedStatus: 201,
      body: {
        restaurantId: 'fake_restaurant',
        branchId: 'fake_branch',
        tableNumber: HAIDILAO_TABLE,
        items: [{itemId: HAIDILAO_ITEM, quantity: 2, price: 1, name: 'FAKE PRICE'}],
        total: 2,
        note: 'Batch 15 smoke test order',
      },
    });
    const order = asArray(res.data)[0];
    assert(order, 'Public order response should return created order.');
    state.publicOrderId = order.id;
    assert(order.restaurantId === HAIDILAO_RESTAURANT_ID, 'Created order must use Haidilao restaurant from QR.');
    assert(order.branchId === HAIDILAO_BRANCH_ID, 'Created order must use Haidilao branch from QR.');
    assert(order.tableNumber === HAIDILAO_TABLE, 'Created order must use validated HDL 01 table.');
    assert(Number(order.total) === 258000, `Backend should recalculate total to 258000, got ${order.total}.`);
    assert(order.orderStatus === 'NEW', 'New public order should start with orderStatus NEW.');
    assert(order.paymentStatus === 'UNPAID', 'New public order should start with paymentStatus UNPAID.');
  });

  await run('Public order rejects table from another branch/restaurant', async () => {
    await requestJson({
      method: 'POST',
      path: `/public/menu/${HAIDILAO_QR}/orders`,
      expectedStatus: 400,
      body: {
        tableNumber: APLUS_TABLE,
        items: [{itemId: HAIDILAO_ITEM, quantity: 1}],
      },
    });
  });

  await run('Admin logins return scoped tokens', async () => {
    state.haidilaoToken = await login('haidilao', 'admin123');
    state.staffToken = await login('staff', 'staff123');
    state.adminToken = await login('admin', 'admin123');
  });

  await run('Staff APlus cannot access Haidilao admin orders', async () => {
    await requestJson({
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/orders`,
      token: state.staffToken,
      expectedStatus: 403,
    });
  });

  await run('Haidilao admin sees Haidilao public order', async () => {
    const res = await requestJson({
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/orders?branchId=${HAIDILAO_BRANCH_ID}`,
      token: state.haidilaoToken,
    });
    assert(asArray(res.data).some(order => order.id === state.publicOrderId), 'Haidilao admin should see the public order.');
  });

  await run('Order status workflow rejects invalid jump', async () => {
    await requestJson({
      method: 'PATCH',
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/orders/${state.publicOrderId}/status`,
      token: state.haidilaoToken,
      expectedStatus: 409,
      body: {orderStatus: 'PREPARING'},
    });
  });

  await run('Order status workflow accepts NEW -> ACCEPTED -> PREPARING -> COMPLETED', async () => {
    const steps = ['ACCEPTED', 'PREPARING', 'COMPLETED'];
    for (const orderStatus of steps) {
      const res = await requestJson({
        method: 'PATCH',
        path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/orders/${state.publicOrderId}/status`,
        token: state.haidilaoToken,
        body: {orderStatus},
      });
      assert(asArray(res.data).some(order => order.id === state.publicOrderId && order.orderStatus === orderStatus), `Order should update to ${orderStatus}.`);
      await sleep(50);
    }
  });

  await run('Payment can be marked paid with bank transfer after completed', async () => {
    const res = await requestJson({
      method: 'PATCH',
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/orders/${state.publicOrderId}/payment`,
      token: state.haidilaoToken,
      body: {paymentStatus: 'PAID', paymentMethod: 'BANK_TRANSFER'},
    });
    assert(asArray(res.data).some(order => order.id === state.publicOrderId && order.paymentStatus === 'PAID'), 'Order should be PAID.');
  });

  await run('Branch QR lock blocks public menu', async () => {
    await requestJson({
      method: 'PATCH',
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/branches/${HAIDILAO_BRANCH_ID}`,
      token: state.haidilaoToken,
      body: {name: 'Chi nhánh demo chính', menuQrToken: HAIDILAO_QR, status: 'LOCKED'},
    });
    await requestJson({
      path: `/public/menu/${HAIDILAO_QR}`,
      expectedStatus: 404,
    });
    await requestJson({
      method: 'PATCH',
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/branches/${HAIDILAO_BRANCH_ID}`,
      token: state.haidilaoToken,
      body: {name: 'Chi nhánh demo chính', menuQrToken: HAIDILAO_QR, status: 'ACTIVE'},
    });
  });

  await run('Server image upload returns a public image URL', async () => {
    const res = await requestJson({
      method: 'POST',
      path: `/restaurants/${HAIDILAO_RESTAURANT_ID}/menu/images`,
      token: state.haidilaoToken,
      expectedStatus: 201,
      body: {
        dishId: 'batch15_smoke_image',
        mimeType: 'image/png',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADklEQVQImWP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
      },
    });
    assert(res.data?.imageUrl, 'Image upload should return imageUrl.');
    const imagePath = new URL(res.data.imageUrl).pathname;
    const image = await requestJson({path: imagePath, expectedStatus: 200});
    assert(String(image.headers['content-type'] || '').includes('image/png'), 'Uploaded image should be served as image/png.');
  });

  console.log('\nBatch 15 smoke test finished.');
  if (process.exitCode) {
    console.log('Some checks failed. Fix blockers before restaurant demo.');
  } else {
    console.log('All checks passed. Backend multi-restaurant flow is ready for app/manual acceptance testing.');
  }
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
