# ScoreMenu Batch 23 - Chống lạm dụng nhẹ theo guest session

## Phạm vi

Batch 23 bổ sung lớp bảo vệ nhẹ cho luồng public order theo kế hoạch BillSession/TableBill:

- Giữ `guestSessionId` bền vững theo thiết bị/browser/app install ở `CustomerMenuSessionStore`.
- Rate limit `POST /public/menu/:qrToken/orders` theo cặp `guestSessionId + QR hash`.
- Ghi nhận lỗi public order lặp lại, đặc biệt các lỗi chọn sai bàn/validation, rồi chặn tạm thiết bị đó.
- Ghi event trace chuẩn cho bill/order/table/abuse.
- Không ghi token thô, password, authorization, base64/data URI ảnh vào audit log.

## Backend

### Rate limit public order

`server.js` có các biến môi trường tùy chỉnh:

- `SCOREMENU_PUBLIC_ORDER_RATE_LIMIT_WINDOW_MS`, mặc định 60 giây.
- `SCOREMENU_PUBLIC_ORDER_RATE_LIMIT_MAX`, mặc định 8 request/window.
- `SCOREMENU_PUBLIC_ORDER_ERROR_LIMIT_WINDOW_MS`, mặc định 5 phút.
- `SCOREMENU_PUBLIC_ORDER_ERROR_LIMIT_MAX`, mặc định 5 lỗi/window.
- `SCOREMENU_PUBLIC_ORDER_BLOCK_MS`, mặc định 5 phút.
- `SCOREMENU_PUBLIC_ORDER_RATE_LIMIT_STORE_MAX`, mặc định giữ 2000 bucket gần nhất.
- `SCOREMENU_AUDIT_LOG_STORE_MAX`, mặc định giữ 1000 audit log gần nhất.

Khi khách gửi order public:

1. Backend tạo guard từ `guestSessionId`, QR hiện tại, `restaurantId`, `branchId`.
2. QR không được lưu thô trong log; backend chỉ lưu `qrHash`.
3. Nếu vượt ngưỡng request hoặc đang trong thời gian block, trả HTTP `429` với lỗi rõ ràng.
4. Nếu order lỗi nhiều lần trong window, backend ghi `abuseDetected` và block tạm.

### Event log

Các event chính được lưu trong `auditLogs`:

- `billOpened`: mở BillSession lần đầu.
- `orderAdded`: gọi thêm món vào BillSession hiện có.
- `tableChanged`: nhân viên đổi bàn cho bill.
- `billClosed`: đóng hóa đơn.
- `abuseDetected`: phát hiện gửi quá nhanh hoặc lỗi public order lặp lại.

Các event cũ như `order.create.public`, `bill.payment.requested`, `bill.payment.paid` vẫn được giữ để trace nghiệp vụ chi tiết.

### API audit log cho admin/staff

Thêm endpoint:

```http
GET /restaurants/:restaurantId/audit-logs?branchId=&action=&limit=
```

Endpoint này kiểm tra quyền restaurant/branch như các API admin khác. Có thể lọc theo `branchId`, `action`, và giới hạn số dòng bằng `limit`.

## App khách

`CustomerMenuSessionStore` chuẩn hóa `guestSessionId`:

- Sinh id dạng `guest_<time>_<random>`.
- Lưu riêng trong `AsyncStorage` key `scoremenu_customer_guest_session_id_v1`.
- Không bị xóa khi clear riêng CustomerMenuSession; lần sau sẽ đọc lại từ key bền vững.
- Chỉ chấp nhận id sạch bắt đầu bằng `guest_`, tối đa 80 ký tự.

## Schema

Schema backend nâng lên:

```txt
scoremenu_backend_schema_v1_batch23
```

Thêm collection/table JSON:

- `publicOrderRateLimits`
- `auditLogs` được chuẩn hóa index/action cho các event Batch 23.

## Nghiệm thu

- Một thiết bị gửi quá nhanh sẽ bị HTTP `429`, không crash backend.
- Một thiết bị nhập sai bàn/lỗi validation nhiều lần sẽ bị block tạm và có log `abuseDetected`.
- Public order thành công vẫn tạo/cộng BillSession như Batch 17-22.
- Order lần 2 cố gửi `tableNumber` khác vẫn bị backend bỏ qua và giữ bàn khóa theo BillSession.
- Audit log có đủ trace `billOpened`, `orderAdded`, `billClosed`, `tableChanged`, `abuseDetected`.
- Audit log không chứa QR token thô, password, authorization, base64/data URI ảnh.
