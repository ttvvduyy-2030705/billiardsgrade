# Batch 12 - Backend Menu Server

## Trạng thái

Đã bổ sung backend Menu server MVP tại:

```text
backend/scoremenu-server
```

Batch này tập trung tạo server thật để app có thể chuyển từ `LocalRestaurantMenuRepository` sang `ApiRestaurantMenuRepository` ở batch 13 mà không phải đổi UI.

## Đã hoàn thành

### 1. Server backend MVP

- Node.js HTTP server không cần thêm dependency.
- Chạy bằng `node backend/scoremenu-server/server.js` hoặc `npm run scoremenu:server` ở root.
- Health check: `GET /health`.
- Schema endpoint: `GET /schema`.
- Reset seed data: `POST /dev/reset` hoặc `npm run reset` trong backend.

### 2. Module auth

- `POST /auth/admin/login`.
- `POST /auth/admin/register`.
- Trả về đúng format `RestaurantAdminCredentialResult` cho app:
  - `ok`
  - `message`
  - `token`
  - `userId`
  - `role`
  - `restaurantId`
  - `restaurantIds`

Tài khoản seed:

- `admin / admin123` - OWNER, thấy 2 nhà hàng.
- `staff / staff123` - STAFF, chỉ thấy `aplus_billiards_hanoi`.

### 3. Restaurant/branch/table

- `GET /restaurants`.
- `POST /restaurants`.
- `GET/POST /restaurants/:restaurantId/branches`.
- `PATCH/DELETE /restaurants/:restaurantId/branches/:branchId`.
- `GET/POST /restaurants/:restaurantId/tables`.
- `GET /menu/table-tokens/:qrToken`.
- `GET /public/menu/:qrToken`.

### 4. Menu category/dish

- `GET/POST /restaurants/:restaurantId/menu/categories`.
- `PATCH/DELETE /restaurants/:restaurantId/menu/categories/:categoryId`.
- `GET/POST /restaurants/:restaurantId/menu/items`.
- `PATCH/DELETE /restaurants/:restaurantId/menu/items/:itemId`.

Có validation:

- Không cho tên danh mục rỗng.
- Không cho trùng tên danh mục trong cùng nhà hàng.
- Không cho món thiếu tên, thiếu category hoặc giá âm.
- Không cho món dùng category của nhà hàng khác.

### 5. Order/payment/cart

- `GET/POST /restaurants/:restaurantId/orders`.
- `GET /restaurants/:restaurantId/orders?branchId=:branchId`.
- `PATCH /restaurants/:restaurantId/orders/:orderId/status`.
- `PATCH /restaurants/:restaurantId/orders/:orderId/payment`.
- `GET/PATCH/DELETE /restaurants/:restaurantId/menu/cart/current`.
- `GET/PATCH/DELETE /restaurants/:restaurantId/tables/:tableId/cart/current`.

Có validation:

- Đơn phải có ít nhất một món.
- Bàn phải thuộc đúng nhà hàng.
- Branch phải thuộc đúng nhà hàng.
- Không cho chuyển ngược đơn đã `COMPLETED` hoặc `CANCELLED`.
- Tổng tiền được tính lại ở server từ item snapshot.

### 6. Database/schema/seed

- Database JSON MVP tại `backend/scoremenu-server/data/db.json`.
- Schema mô tả tại `backend/scoremenu-server/data/schema.json`.
- Seed generator tại `backend/scoremenu-server/data/seed.js`.
- Có sẵn 2 nhà hàng, mỗi nhà hàng có 2 chi nhánh và nhiều bàn/QR để test cô lập dữ liệu.

## Cách test nhanh

```bash
cd backend/scoremenu-server
npm start
```

Mở terminal khác:

```bash
curl http://localhost:4012/health
curl http://localhost:4012/restaurants
curl http://localhost:4012/restaurants/aplus_billiards_hanoi/menu/categories
curl http://localhost:4012/restaurants/aplus_billiards_hanoi/menu/items
curl http://localhost:4012/menu/table-tokens/qr_aplus_main_01
```

Tạo đơn test:

```bash
curl -X POST http://localhost:4012/restaurants/aplus_billiards_hanoi/orders \
  -H "Content-Type: application/json" \
  -d '{"branchId":"aplus_hanoi_main","tableId":"aplus_main_table_01","items":[{"itemId":"aplus_coca","quantity":2}],"note":"ít đá"}'
```

## Ghi chú cho batch 13

Batch 12 đã chuẩn bị đủ endpoint để batch 13 chuyển app sang API thật. Việc cần làm ở batch 13:

- Bật `mode: 'api'` trong `src/config/restaurantMenu.ts` khi test server.
- Wire token admin session vào `ApiRestaurantMenuRepository` nếu bật `SCOREMENU_AUTH_GUARD=1`.
- Thêm loading/empty/error state sâu hơn ở các màn khi backend tắt hoặc lỗi mạng.
