# ScoreMenu Batch 16 - BillSession / TableBill model

## Mục tiêu

Batch 16 chốt lớp model/type cho hóa đơn cộng dồn theo bàn, chưa đổi UI lớn và chưa bắt buộc đổi luồng API public order trong batch này.

Luồng đích từ Batch 16+:

```txt
QR quán/chi nhánh -> khách chọn bàn ở lần gửi đầu -> mở BillSession/TableBill -> các lần gọi thêm cộng vào cùng bill -> khách không tự đổi bàn sau khi bill đã mở
```

## Quyết định kiến trúc

- QR menu vẫn là QR của quán/chi nhánh. QR không mặc định đại diện cho một bàn.
- Cart chỉ là giỏ tạm của một lần gọi món. Gửi xong cart có thể clear, nhưng BillSession vẫn sống.
- Order là một lần khách gửi món, ví dụ Order #1, #2, #3.
- BillSession/TableBill là hóa đơn cộng dồn của một bàn trong một phiên ăn.
- Khách chỉ được chọn/nhập bàn khi chưa có `billSessionId`.
- Khi đã có `billSessionId`, app khách phải hiển thị bàn dạng readonly bằng `lockedTableNumber`.
- Backend batch sau sẽ lấy bàn từ BillSession và bỏ qua `tableNumber` client cố gửi lên trong lần gọi thêm.
- Admin/staff là nhóm duy nhất được đổi bàn, đóng bill hoặc xử lý thanh toán ở các batch sau.

## Type chính phía app

Các type được đặt trong `src/services/restaurantMenuStorage.ts` để LocalRepository, ApiRepository và UI đang dùng cùng một nguồn dữ liệu.

### `RestaurantBillSessionStatus`

```ts
export type RestaurantBillSessionStatus =
  | "OPEN"
  | "PAYMENT_REQUESTED"
  | "PAID"
  | "CLOSED"
  | "CANCELLED";
```

Ý nghĩa:

- `OPEN`: bill đang mở, khách có thể gọi thêm món.
- `PAYMENT_REQUESTED`: đã yêu cầu thanh toán; hiện vẫn được xếp vào nhóm có thể nhận order để batch sau cấu hình chặn/mở linh hoạt.
- `PAID`: đã thanh toán.
- `CLOSED`: phiên bàn đã đóng, không nhận order mới.
- `CANCELLED`: bill bị hủy bởi nhân viên/admin.

### `RestaurantBillSession` / `RestaurantTableBill`

```ts
export type RestaurantBillSession = {
  id: string;
  restaurantId: string;
  branchId?: string;
  tableId?: string;
  tableNumber: string;
  guestSessionId?: string;
  status: RestaurantBillSessionStatus;
  orderIds: string[];
  orderCount: number;
  subtotal: number;
  discountTotal: number;
  serviceFeeTotal: number;
  total: number;
  paymentMethod?: RestaurantPaymentMethod;
  note?: string;
  openedAt: string;
  paymentRequestedAt?: string;
  paidAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantTableBill = RestaurantBillSession;
```

`RestaurantTableBill` là alias nghiệp vụ để admin/staff có thể đọc cùng model dưới góc nhìn hóa đơn của bàn.

### `RestaurantBillOrderSummary`

```ts
export type RestaurantBillOrderSummary = {
  orderId: string;
  orderNumber: number;
  orderStatus: RestaurantOrderStatus;
  paymentStatus: RestaurantPaymentStatus;
  itemCount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};
```

Model này dùng cho màn hình chi tiết bill/tổng hóa đơn ở Batch 20+ mà không cần render toàn bộ payload order lớn ở mọi nơi.

## Quan hệ với Cart, Order, Table và GuestSession

### Cart

`RestaurantCartState` đã được bổ sung:

```ts
guestSessionId?: string;
billSessionId?: string;
lockedTableId?: string;
lockedTableNumber?: string;
billStatus?: RestaurantBillSessionStatus;
```

Rule UI cho Batch 18-19:

- Chưa có `billSessionId`: cho chọn bàn từ danh sách hoặc nhập fallback.
- Có `billSessionId`: dùng `lockedTableNumber` để hiển thị bàn đã khóa, không cho khách sửa bàn.
- Gửi order xong: clear items/note của cart, nhưng giữ `billSessionId` và bàn khóa trong customer session.

### Order

`RestaurantOrder` đã được bổ sung:

```ts
billSessionId?: string;
guestSessionId?: string;
```

Rule backend cho Batch 17:

- Order đầu tiên tạo BillSession rồi gắn `billSessionId` vào order.
- Order gọi thêm phải gắn cùng `billSessionId`.
- Order `CANCELLED` không cộng vào subtotal bill.

### Table

BillSession lưu snapshot `tableId` và `tableNumber`.

- `tableId` giúp admin/staff đổi bàn chính xác.
- `tableNumber` giúp bill vẫn hiển thị đúng kể cả khi tên bàn bị chỉnh sau này.
- Nếu nhân viên đổi bàn ở Batch 21, BillSession là nguồn sự thật mới cho order sau đó.

### GuestSession

`guestSessionId` là định danh bền theo thiết bị/browser/app install, dùng ở Batch 23 để chống spam nhẹ và restore bill hiện tại.

Batch 16 chỉ chuẩn bị type. Batch sau mới chịu trách nhiệm tạo/persist `guestSessionId` thật.

## Helper đã chuẩn hóa

Trong `restaurantMenuStorage.ts`:

- `normaliseBillSessionStatus(status)`
- `canCustomerAddOrderToBillSession(status)`
- `isFinalBillSessionStatus(status)`
- `createBillOrderSummary(order, index)`
- `calculateRestaurantBillSubtotal(orders)`

Các helper này giúp Batch 17+ không rải logic trạng thái/tính tổng ở nhiều màn hình.

## Schema backend demo

`backend/scoremenu-server/data/schema.json` đã thêm bảng logical `billSessions` với các index chính:

```txt
restaurantId, branchId, tableId, guestSessionId, status, openedAt, updatedAt
```

`orders` cũng có thêm index:

```txt
billSessionId, guestSessionId
```

`seed.js` và `db.json` đã có `billSessions: []` để server JSON-file mode không lỗi khi nâng schema.

## Không đổi trong Batch 16

- Chưa đổi UI giỏ hàng.
- Chưa tạo endpoint BillSession mới.
- Chưa đổi response public order thành `{ billSessionId, order, billTotal }`.
- Chưa nhóm order theo bill ở admin dashboard.
- Chưa bật rule backend khóa bàn ở lần gọi thêm.

Các phần trên thuộc Batch 17-20 theo kế hoạch.

## Tiêu chí nghiệm thu Batch 16

- Type/model compile được.
- `RestaurantOrder` và `RestaurantCartState` đã có field liên kết BillSession/GuestSession.
- Backend schema/seed có `billSessions` rỗng để chuẩn bị lưu trữ ở Batch 17.
- Không xóa hoặc đổi hướng logic QR quán/chi nhánh đã có từ Batch 1-15.
- Không thay đổi UI lớn.
