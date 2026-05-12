# ScoreMenu Batch 18 - CustomerMenuSession lưu BillSession

## Mục tiêu

Batch 18 nối phần backend BillSession của Batch 17 vào phiên khách trên app. QR vẫn là QR quán/chi nhánh; sau đơn đầu tiên app lưu `billSessionId`, `guestSessionId`, bàn đã khóa và trạng thái bill để các lần gọi thêm không phụ thuộc vào bàn do client nhập lại.

## Thay đổi chính

- `CustomerMenuSessionStore` lưu thêm:
  - `guestSessionId`
  - `billSessionId`
  - `lockedTableId`
  - `lockedTableNumber`
  - `billStatus`
  - `billTotal`
  - `billUpdatedAt`
- Thêm `ensureCustomerGuestSessionId()` để giữ guest session bền vững theo thiết bị/browser/app install.
- Thêm `restoreActiveBillSession()` để mở lại app hoặc quay lại menu thì gọi API/repository lấy bill hiện tại theo `billSessionId` hoặc `guestSessionId`.
- Thêm `syncCustomerBillSessionFromOrder()` để sau khi gửi order lần đầu, app ghi lại bill mới và bàn bị khóa.
- Khi quét QR khác nhà hàng/chi nhánh trong lúc có bill mở, CustomerMenuSession tách bill cũ khỏi phiên hiện tại và clear cart để tránh lẫn bill giữa chi nhánh.
- Logout admin chỉ clear admin session/context store, không gọi `clearCustomerMenuSession`, nên bill khách vẫn được giữ trong storage riêng của CustomerMenuSession.
- Local repository cũng có BillSession tối thiểu để local mode và API mode cùng hành vi ở luồng khách.

## Luồng sau Batch 18

1. Khách quét QR chi nhánh và gửi order lần đầu.
2. Backend/local repository trả order có `billSessionId`.
3. `RestaurantCartStore` gọi `syncCustomerBillSessionFromOrder()`.
4. Cart được clear item/note nhưng giữ metadata bill/table lock.
5. Khi mở lại menu/cart, `restoreActiveBillSession()` lấy lại bill đang mở và bàn khóa.
6. Order sau gửi kèm `guestSessionId + billSessionId`; backend lấy bàn từ BillSession, không tin bàn mới từ client.

## Nghiệm thu nhanh

- Gửi order lần 1 xong quay lại menu/cart vẫn có thông tin bill/bàn khóa.
- Đăng nhập/logout admin không xoá CustomerMenuSession/BillSession khách.
- Quét QR nhà hàng/chi nhánh khác không dùng nhầm `billSessionId` cũ.
- Local mode có BillSession demo tương đương API mode cho luồng khách cơ bản.
