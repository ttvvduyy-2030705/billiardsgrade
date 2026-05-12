# ScoreMenu Batch 17 - Backend BillSession API

## Phạm vi

Batch 17 triển khai phần backend cho BillSession/TableBill đã chốt ở Batch 16, giữ QR ở cấp quán/chi nhánh và khóa bàn sau lần gọi đầu.

## Luồng public order mới

### Lần đầu gửi order

`POST /public/menu/:qrToken/orders`

Client gửi `guestSessionId`, `tableId` hoặc `tableNumber`, `items`, `note`.

Backend xử lý:

1. Validate QR menu thuộc đúng restaurant/branch.
2. Validate bàn thuộc chi nhánh của QR.
3. Tạo `BillSession` trạng thái `OPEN`.
4. Tạo `Order` đầu tiên, gắn `billSessionId`, `tableId`, `tableNumber`, `guestSessionId`.
5. Tính lại tổng order và tổng bill từ dữ liệu menu server-side.
6. Trả về `billSessionId`, `order`, `billTotal`, `billSession` và danh sách `orders` trong bill.

### Gọi thêm món

`POST /public/menu/:qrToken/orders`

Client gửi `billSessionId`, `items`, `guestSessionId`. Nếu client vẫn gửi `tableNumber` khác, backend bỏ qua.

Backend xử lý:

1. Tìm `BillSession` theo `billSessionId`, restaurant và branch từ QR.
2. Chặn nếu bill đã ở `PAID`, `CLOSED`, `CANCELLED`.
3. Lấy bàn bị khóa từ `BillSession`, không tin `tableNumber` từ client.
4. Tạo order tiếp theo gắn cùng `billSessionId`.
5. Tính lại `orderIds`, `orderCount`, `subtotal`, `total` cho bill.

## API lấy bill hiện tại

### Theo billSessionId

`GET /public/menu/:qrToken/bills/:billSessionId`

Trả về BillSession hiện tại kèm `orders`, `orderSummaries`, `billTotal`.

### Theo guestSessionId

`GET /public/menu/:qrToken/bills/current?guestSessionId=:guestSessionId`

Trả về bill đang mở mới nhất của guest session trong đúng restaurant/branch của QR.

## Quy tắc bảo vệ dữ liệu

- `BillSession` luôn kiểm tra `restaurantId` và `branchId` theo QR hiện tại.
- Order mới sau lần đầu luôn lấy `tableId` và `tableNumber` từ `BillSession`.
- `tableNumber` client gửi ở order thêm món chỉ được xem là input rác và bị bỏ qua.
- Bill trạng thái `PAID`, `CLOSED`, `CANCELLED` không nhận thêm order.
- Khi trạng thái order đổi sang `CANCELLED`, tổng bill được tính lại, order hủy không cộng vào tổng.
- API public không cho khách đổi bàn, đổi nhà hàng hoặc đổi chi nhánh sau khi có `billSessionId`.

## Smoke test đã chạy

- Health check trả schema `scoremenu_backend_schema_v1_batch17`.
- Lần đầu order Haidilao `HDL 01` tạo `billSessionId` và `billTotal = 258000`.
- Lần hai cố gửi `tableNumber = HDL 201` nhưng backend vẫn khóa ở `HDL 01`, `billTotal = 417000`.
- `GET /public/menu/qr_haidilao_main_menu/bills/current?guestSessionId=...` trả đúng bill có 2 order.
- Đổi bill sang `PAID` trong database demo rồi gửi thêm order bị chặn HTTP 400.
