# Batch 2 - Chuẩn hoá Order/Payment

## Mục tiêu

Batch 2 tách rõ trạng thái xử lý đơn và trạng thái thanh toán để tránh lỗi coi `PAID` là một bước xử lý đơn.

## Model chuẩn sau Batch 2

```ts
export type RestaurantOrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'COMPLETED'
  | 'CANCELLED';

export type RestaurantPaymentStatus = 'UNPAID' | 'PAID';
```

`RestaurantOrder` dùng field canonical:

```ts
orderStatus: RestaurantOrderStatus;
paymentStatus: RestaurantPaymentStatus;
```

`status` chỉ còn là alias UI trong AdminOrder để không phải đổi quá nhiều component hiển thị. Storage/repository/API không dùng `paid` làm order status nữa.

## Migration dữ liệu cũ

Dữ liệu cũ vẫn đọc được:

- `new` -> `NEW`
- `accepted` -> `ACCEPTED`
- `preparing` -> `PREPARING`
- `served` hoặc `completed` -> `COMPLETED`
- `cancelled` -> `CANCELLED`
- legacy `status: 'paid'` -> `paymentStatus: 'PAID'`, `orderStatus: 'NEW'`

Quy tắc quan trọng: legacy `paid` không bị map mù quáng sang `COMPLETED`, vì thanh toán không đồng nghĩa đơn đã hoàn tất bếp/phục vụ.

## API contract

Khi cập nhật tiến trình đơn, app gửi:

```json
{"orderStatus": "PREPARING"}
```

Khi cập nhật thanh toán, app gửi:

```json
{"paymentStatus": "PAID"}
```

Server sau này phải giữ hai field này độc lập.

## Nghiệm thu

- Đơn mới luôn tạo với `orderStatus: 'NEW'` và `paymentStatus: 'UNPAID'`.
- Admin đổi trạng thái đơn không đổi `paymentStatus`.
- Admin đánh dấu thanh toán không đổi `orderStatus`.
- Dữ liệu cũ dùng `paid` vẫn đọc được nhưng không tự biến thành `COMPLETED`.
