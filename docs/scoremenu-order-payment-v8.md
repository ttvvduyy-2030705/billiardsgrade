# ScoreMenu v8 - Chuẩn hóa Order/Payment

Bản v8 bám theo mục P1.2 trong checklist: chuẩn hóa vòng đời đơn, trạng thái thanh toán, phương thức thanh toán và cách tính tổng tiền.

## Đã sửa

1. Backend không tin `price`, `name` hoặc `total` do client gửi khi tạo đơn.
   - Client chỉ cần gửi `itemId`, `quantity`, `note`.
   - Server tự lấy tên món và giá hiện tại từ menu của đúng `restaurantId`.
   - Server tự tính lại `total`.

2. Order item có snapshot ổn định.
   - Mỗi item trong order lưu `itemId`, `name`, `price`, `quantity`, `note`.
   - Nếu sau này admin đổi giá món, đơn cũ vẫn giữ giá snapshot tại thời điểm đặt.

3. Chuẩn vòng đời đơn.
   - `NEW -> ACCEPTED -> PREPARING -> COMPLETED`
   - Có thể chuyển sang `CANCELLED` trước khi hoàn tất.
   - `COMPLETED` và `CANCELLED` không được chuyển ngược.

4. Chuẩn thanh toán.
   - `paymentStatus`: `UNPAID`, `PAID`.
   - `paymentMethod`: `CASH`, `BANK_TRANSFER`, `MOCK`.
   - Admin có thể đổi trạng thái thanh toán và phương thức thanh toán trên card đơn hàng.

5. UI admin hạn chế bấm trạng thái sai luồng.
   - Các trạng thái không được phép chuyển sẽ bị mờ/disable.
   - Tránh lỗi bấm nhảy từ đơn mới sang hoàn tất hoặc chuyển ngược đơn đã xong.

## File đã sửa chính

- `backend/scoremenu-server/server.js`
- `src/services/restaurantMenuStorage.ts`
- `src/repositories/RestaurantMenuRepository.ts`
- `src/repositories/ApiRestaurantMenuRepository.ts`
- `src/repositories/LocalRestaurantMenuRepository.ts`
- `src/services/restaurantMenuRepository.ts`
- `src/services/restaurantAdminStore.ts`
- `src/scenes/restaurant-admin-dashboard/index.tsx`
- `src/scenes/restaurant-admin-dashboard/components/AdminOrdersScreen.tsx`
- `src/scenes/restaurant-admin-dashboard/components/OrderCard.tsx`
- `src/scenes/restaurant-admin-dashboard/styles.tsx`

## Test nhanh backend

Tạo đơn bằng public QR nhưng cố tình gửi sai giá:

```bash
curl -X POST http://localhost:4012/public/menu/qr_haidilao_main_01/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"itemId":"haidilao_beef_plate","quantity":2,"price":1,"name":"GIÁ GIẢ"}],"total":2,"note":"Test backend tự tính giá"}'
```

Kết quả đúng:

- `items[0].name` vẫn là tên món thật trong menu.
- `items[0].price` vẫn là giá thật trong menu.
- `total` bằng `price thật * quantity`, không phải `2`.

Test trạng thái:

- Từ `NEW` đổi sang `PREPARING` phải bị từ chối.
- Từ `NEW` đổi sang `ACCEPTED` được.
- Từ `ACCEPTED` đổi sang `PREPARING` được.
- Từ `PREPARING` đổi sang `COMPLETED` được.
- Sau `COMPLETED`, đổi ngược về `NEW` phải bị từ chối.

