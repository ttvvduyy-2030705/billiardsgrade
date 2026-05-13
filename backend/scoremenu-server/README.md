# ScoreMenu Backend MVP - Batch 25

Backend này là server Menu/Admin MVP cho Batch 25. Mục tiêu là thay dữ liệu local/mock bằng API thật ở mức tối thiểu nhưng đủ kiểm thử nhiều nhà hàng: auth, restaurant, branch, table, category, dish, order, cart và BillSession/TableBill.

## Chạy server

Yêu cầu Node.js 18+.

```bash
cd backend/scoremenu-server
npm start
```

Mặc định server chạy ở:

```text
http://localhost:4012
```

Nếu app Android chạy trên emulator, dùng base URL:

```text
http://10.0.2.2:4012
```

Nếu test trên máy thật cùng mạng LAN, dùng IP máy tính đang chạy server, ví dụ:

```text
http://192.168.1.20:4012
```

## Reset dữ liệu seed

```bash
cd backend/scoremenu-server
npm run reset
```

Hoặc khi server đang chạy:

```bash
curl -X POST http://localhost:4012/dev/reset
```

## Tài khoản demo

| Username | Password | Role | Nhà hàng |
|---|---|---|---|
| `admin` | `admin123` | OWNER | `aplus_billiards_hanoi`, `haidilao_demo` |
| `staff` | `staff123` | STAFF | `aplus_billiards_hanoi` |

## Dữ liệu seed

Có sẵn 2 nhà hàng demo và BillSession/TableBill demo sau khi reset:

1. `aplus_billiards_hanoi`
   - `aplus_hanoi_main`
   - `aplus_hanoi_vip`
   - QR token: `qr_aplus_main_01`, `qr_aplus_main_02`, `qr_aplus_vip_01`

2. `haidilao_demo`
   - `haidilao_demo_main`
   - `haidilao_demo_2`
   - QR token: `qr_haidilao_main_01`, `qr_haidilao_2_01`

BillSession seed Batch 25:

| Nhà hàng | Bàn | BillSession | Tổng |
|---|---|---|---:|
| `haidilao_demo` | `HDL 01` | `seed_bill_haidilao_hdl01` | 417000 |
| `aplus_billiards_hanoi` | `Bàn 01` | `seed_bill_aplus_ban01` | 95000 |

Backend tự migrate order cũ chưa có `billSessionId` sang `bill_migrated_<hash>` khi load DB.

## Endpoint chính

### Health/schema

```text
GET  /health
GET  /schema
POST /dev/reset
```

### Auth

```text
POST /auth/admin/login
POST /auth/admin/register
```

Body login:

```json
{"username":"admin","password":"admin123"}
```

### Restaurant/branch/table

```text
GET  /restaurants
POST /restaurants
GET  /restaurants/:restaurantId/branches
POST /restaurants/:restaurantId/branches
PATCH /restaurants/:restaurantId/branches/:branchId
DELETE /restaurants/:restaurantId/branches/:branchId
GET  /restaurants/:restaurantId/tables
POST /restaurants/:restaurantId/tables
GET  /menu/table-tokens/:qrToken
GET  /public/menu/:qrToken
```

### Menu category/dish

```text
GET    /restaurants/:restaurantId/menu/categories
POST   /restaurants/:restaurantId/menu/categories
PATCH  /restaurants/:restaurantId/menu/categories/:categoryId
DELETE /restaurants/:restaurantId/menu/categories/:categoryId
GET    /restaurants/:restaurantId/menu/items
POST   /restaurants/:restaurantId/menu/items
PATCH  /restaurants/:restaurantId/menu/items/:itemId
DELETE /restaurants/:restaurantId/menu/items/:itemId
```

### Order/payment/cart

```text
GET   /restaurants/:restaurantId/bills?branchId=:branchId
GET   /restaurants/:restaurantId/bills/:billSessionId
PATCH /restaurants/:restaurantId/bills/:billSessionId/table
PATCH /restaurants/:restaurantId/bills/:billSessionId/payment
PATCH /restaurants/:restaurantId/bills/:billSessionId/close
GET   /restaurants/:restaurantId/orders?branchId=:branchId
POST  /restaurants/:restaurantId/orders
PATCH /restaurants/:restaurantId/orders/:orderId/status
PATCH /restaurants/:restaurantId/orders/:orderId/payment
POST  /public/menu/:qrToken/orders
GET   /public/menu/:qrToken/bills/current?guestSessionId=:guestSessionId&billSessionId=:billSessionId
GET   /restaurants/:restaurantId/menu/cart/current
PATCH /restaurants/:restaurantId/menu/cart/current
DELETE /restaurants/:restaurantId/menu/cart/current
GET   /restaurants/:restaurantId/tables/:tableId/cart/current
PATCH /restaurants/:restaurantId/tables/:tableId/cart/current
DELETE /restaurants/:restaurantId/tables/:tableId/cart/current
```

## Bật auth guard

Batch 25 vẫn để auth guard tắt mặc định để app có thể test menu/API nhanh. Khi muốn ép quyền token:

```bash
SCOREMENU_AUTH_GUARD=1 npm start
```

Khi bật guard, các route scope theo nhà hàng sẽ cần header:

```text
Authorization: Bearer <token>
```

Token lấy từ `/auth/admin/login`.

## Cấu hình app dùng API

Trong app, điểm chuyển repository nằm ở:

```text
src/config/restaurantMenu.ts
```

Để test API trên Android emulator:

```ts
export const RESTAURANT_MENU_ENV_CONFIG = {
  mode: 'api',
  apiBaseUrl: 'http://10.0.2.2:4012',
  apiTimeoutMs: 15000,
  apiRetryCount: 1,
  defaultRestaurantId: 'aplus_billiards_hanoi',
};
```

Để quay về local:

```ts
mode: 'local'
```


## Batch 24-25 local/dev-api/staging/prod và nghiệm thu

Xem thêm `docs/scoremenu-batch24-local-api-migration-demo-data.md` và `docs/scoremenu-batch25-acceptance-test-report.md` ở root project.

- Local mode dùng AsyncStorage và seed BillSession demo khi chưa có dữ liệu.
- Dev API mode dùng backend này, mặc định `http://10.0.2.2:4012` cho Android emulator.
- Staging/prod phải cấu hình `SCOREMENU_API_BASE_URL`.
- API mode không fallback im lặng sang local; thiếu base URL sẽ báo lỗi cấu hình rõ ràng.

Smoke/acceptance test:

```bash
npm run scoremenu:server
npm run scoremenu:test:e2e
# hoặc
npm run scoremenu:test:acceptance
```

Batch 25 acceptance script kiểm tra tự động: order lần đầu tạo BillSession, order lần hai khóa bàn, admin dashboard thấy bill tổng/order con, staff chuyển bàn, bill PAID/CLOSED chặn gọi thêm, và dữ liệu không lẫn giữa APlus/Haidilao/chi nhánh.


## Deploy lên Render

Backend này có thể deploy trực tiếp bằng `render.yaml` ở repo root. Render Web Service nên dùng tên `scoremenu-api` để URL mặc định của app là `https://scoremenu-api.onrender.com`.

Cấu hình chính:

- Root Directory: `backend/scoremenu-server`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`
- Env: `SCOREMENU_HOST=0.0.0.0`, `SCOREMENU_AUTH_GUARD=1`, `SCOREMENU_TOKEN_SECRET` generated secret.

Nếu dùng JSON file làm database thật, hãy gắn Render Persistent Disk mount path `/var/data` và đặt:

- `SCOREMENU_DB_FILE=/var/data/scoremenu/db.json`
- `SCOREMENU_UPLOAD_DIR=/var/data/scoremenu/uploads`

Không gắn disk thì dữ liệu file có thể mất khi Render restart/redeploy.
