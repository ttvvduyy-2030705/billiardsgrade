# ScoreMenu Batch 22 - Thanh toán và đóng hóa đơn

## Phạm vi

Batch 22 hoàn thiện luồng thanh toán BillSession/TableBill sau các batch hóa đơn cộng dồn:

- Admin/staff có thao tác **Yêu cầu thanh toán**, **Đã thanh toán**, **Đóng hóa đơn** trên từng bill bàn.
- Bill `PAID` hoặc `CLOSED` chặn khách gọi thêm vào `billSessionId` cũ.
- Tổng bill tính lại từ toàn bộ order con hợp lệ, order `CANCELLED` không cộng vào subtotal.
- Hỗ trợ `paymentMethod`: `CASH`, `BANK_TRANSFER`, `MOCK`.
- Bill response có `summary` phục vụ hiển thị/in hóa đơn: bàn, danh sách order con, subtotal, discount, service fee, total.

## Backend API

### PATCH `/restaurants/:restaurantId/bills/:billSessionId/payment`

Body mẫu yêu cầu thanh toán:

```json
{
  "status": "PAYMENT_REQUESTED"
}
```

Body mẫu đánh dấu đã thanh toán:

```json
{
  "status": "PAID",
  "paymentMethod": "CASH"
}
```

Quy tắc:

- `PAYMENT_REQUESTED` giữ bill trong phiên hiện tại, ghi `paymentRequestedAt`.
- `PAID` ghi `paidAt`, `paymentMethod`, đánh dấu các order con không bị hủy là `PAID`.
- Bill `CLOSED`/`CANCELLED` không được cập nhật thanh toán.

### PATCH `/restaurants/:restaurantId/bills/:billSessionId/close`

Body mẫu:

```json
{
  "note": "Nhân viên đóng hóa đơn từ dashboard"
}
```

Quy tắc:

- Chỉ đóng bill sau khi bill đã `PAID`.
- Khi đóng, status chuyển `CLOSED`, ghi `closedAt`.
- Khách gửi order tiếp bằng `billSessionId` cũ sẽ bị backend chặn.

## Bill summary

Mỗi bill trả về thêm `summary`:

```json
{
  "billSessionId": "bill_xxx",
  "tableNumber": "HDL 01",
  "status": "PAID",
  "orderCount": 2,
  "orders": [],
  "subtotal": 417000,
  "discountTotal": 0,
  "serviceFeeTotal": 0,
  "total": 417000,
  "paymentMethod": "CASH"
}
```

## Admin UI

Trong màn Đơn hàng theo bàn:

- Hiển thị tạm tính, giảm giá/phí dịch vụ, phương thức thanh toán.
- Bill `OPEN`: có nút **Yêu cầu thanh toán** và các nút **Đã thanh toán** theo từng phương thức.
- Bill `PAYMENT_REQUESTED`: có các nút **Đã thanh toán**.
- Bill `PAID`: có nút **Đóng hóa đơn**.
- Bill `CLOSED`: chỉ xem thông tin, không còn nút thao tác.

## Kiểm tra nhanh đã chạy

- `node --check backend/scoremenu-server/server.js`: pass.
- `node --check backend/scoremenu-server/data/seed.js`: pass.
- JSON schema/db parse: pass.
- TypeScript transpile syntax cho các file sửa: pass.
- Smoke test backend:
  - Order lần 1 tạo BillSession.
  - Order lần 2 gửi `billSessionId` nhưng cố đổi bàn sang `HDL 99`; backend vẫn giữ bàn `HDL 01`.
  - Bill total cộng dồn đúng `417000`.
  - `PATCH /payment` sang `PAYMENT_REQUESTED` trả đúng status.
  - `PATCH /payment` sang `PAID` với `CASH` đánh dấu các order con là `PAID`.
  - Khách gọi thêm vào bill `PAID` bị chặn HTTP 400.
  - `PATCH /close` chuyển bill sang `CLOSED` và có `closedAt`.
