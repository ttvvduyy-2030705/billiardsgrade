# Batch 10 - Repository/API + multi-restaurant foundation

## Mục tiêu

Batch 10 chuẩn bị nền để Menu chuyển từ demo local sang server thật mà không phải sửa lại UI/store. Mọi contract dữ liệu quan trọng đều có hướng scope theo `restaurantId`, đồng thời app có lớp `RestaurantMenuRepository` để thay `LocalRestaurantMenuRepository` bằng `ApiRestaurantMenuRepository` ở các batch sau.

Batch này chưa ép luồng khách phải quét QR trước khi xem menu. Phần đó thuộc Batch 11 - Multi-restaurant context/isolation. Tuy nhiên từ Batch 10 trở đi, dữ liệu đã có các model nền để không bị thiết kế API global kiểu `/menu/items` hoặc `/orders`.

## File chính

- `src/repositories/RestaurantMenuRepository.ts`
- `src/repositories/LocalRestaurantMenuRepository.ts`
- `src/repositories/ApiRestaurantMenuRepository.ts`
- `src/services/restaurantMenuRepository.ts`
- `src/services/restaurantWorkspaceStorage.ts`

## Model nền đã có

- `RestaurantWorkspace`: nhà hàng/workspace chính.
- `RestaurantBranch`: chi nhánh của nhà hàng.
- `RestaurantTable`: bàn, có `qrCodeToken` để Batch 14 dùng cho QR/table join.
- `RestaurantMenuContext`: context active hiện tại gồm `restaurantId`, `branchId`, `tableId`, `tableNumber`, `source`.

## Repository contract

Repository hiện có các nhóm hàm:

- Active context: `getActiveContext`, `setActiveContext`.
- Restaurant/workspace: `listRestaurants`, `createRestaurant`.
- Branch: `listBranches`, `createBranch`, `updateBranch`, `deleteBranch`.
- Table/QR token: `listTables`, `createTable`, `resolveTableToken`.
- Menu: categories/items CRUD.
- Orders/payment: create order, update order status, update payment status.
- Cart: current cart load/save/clear.

## API contract chuẩn

Các endpoint server thật phải có scope nhà hàng:

```txt
GET    /restaurants
POST   /restaurants
GET    /restaurants/:restaurantId/branches
POST   /restaurants/:restaurantId/branches
PATCH  /restaurants/:restaurantId/branches/:branchId
DELETE /restaurants/:restaurantId/branches/:branchId
GET    /restaurants/:restaurantId/tables
POST   /restaurants/:restaurantId/tables
GET    /restaurants/:restaurantId/menu/categories
POST   /restaurants/:restaurantId/menu/categories
PATCH  /restaurants/:restaurantId/menu/categories/:categoryId
DELETE /restaurants/:restaurantId/menu/categories/:categoryId
GET    /restaurants/:restaurantId/menu/items
POST   /restaurants/:restaurantId/menu/items
PATCH  /restaurants/:restaurantId/menu/items/:itemId
DELETE /restaurants/:restaurantId/menu/items/:itemId
GET    /restaurants/:restaurantId/orders
POST   /restaurants/:restaurantId/orders
PATCH  /restaurants/:restaurantId/orders/:orderId/status
PATCH  /restaurants/:restaurantId/orders/:orderId/payment
GET    /menu/table-tokens/:token
```

Không dùng contract global kiểu:

```txt
GET /menu/items
POST /orders
```

## Nghiệm thu Batch 10

- App vẫn chạy bằng `LocalRestaurantMenuRepository`.
- Có thể đổi sang `ApiRestaurantMenuRepository` bằng `setRestaurantMenuRepository` mà UI/store không cần gọi AsyncStorage trực tiếp.
- Contract API đã có `restaurantId` ở path quan trọng.
- Có model `RestaurantWorkspace`, `RestaurantBranch`, `RestaurantTable`, `RestaurantMenuContext`.
- Local demo vẫn có `local_demo_restaurant` để không vỡ dữ liệu cũ.

## Chuẩn bị cho Batch 11

Batch 11 sẽ khóa UI theo context:

- Không có `restaurantId` hợp lệ thì không tải menu.
- Quét QR hoặc nhập mã bàn để resolve `RestaurantMenuContext`.
- Cart/cache/order tách theo `restaurantId`.
- Đổi nhà hàng thì reset hoặc xác nhận xoá cart cũ.
