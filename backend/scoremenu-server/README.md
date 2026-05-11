# ScoreMenu Backend MVP - Batch 12

Backend này là server Menu/Admin MVP cho batch 12. Mục tiêu là thay dữ liệu local/mock bằng API thật ở mức tối thiểu nhưng đủ kiểm thử nhiều nhà hàng: auth, restaurant, branch, table, category, dish, order và cart.

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

Có sẵn 2 nhà hàng demo:

1. `aplus_billiards_hanoi`
   - `aplus_hanoi_main`
   - `aplus_hanoi_vip`
   - QR token: `qr_aplus_main_01`, `qr_aplus_main_02`, `qr_aplus_vip_01`

2. `haidilao_demo`
   - `haidilao_demo_main`
   - `haidilao_demo_2`
   - QR token: `qr_haidilao_main_01`, `qr_haidilao_2_01`

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
GET   /restaurants/:restaurantId/orders?branchId=:branchId
POST  /restaurants/:restaurantId/orders
PATCH /restaurants/:restaurantId/orders/:orderId/status
PATCH /restaurants/:restaurantId/orders/:orderId/payment
GET   /restaurants/:restaurantId/menu/cart/current
PATCH /restaurants/:restaurantId/menu/cart/current
DELETE /restaurants/:restaurantId/menu/cart/current
GET   /restaurants/:restaurantId/tables/:tableId/cart/current
PATCH /restaurants/:restaurantId/tables/:tableId/cart/current
DELETE /restaurants/:restaurantId/tables/:tableId/cart/current
```

## Bật auth guard

Batch 12 để auth guard tắt mặc định để app có thể test menu/API nhanh. Khi muốn ép quyền token:

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
