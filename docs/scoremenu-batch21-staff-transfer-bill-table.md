# ScoreMenu Batch 21 - Nhân viên đổi bàn và chuyển bill

## Phạm vi

Batch 21 bổ sung luồng nhân viên/admin chuyển `BillSession` sang bàn mới sau khi khách đã mở bill. Khách vẫn không có API/UI để đổi bàn; mọi order public tiếp theo dùng `billSessionId` sẽ lấy bàn từ BillSession hiện tại.

## Backend

- Thêm API `PATCH /restaurants/:restaurantId/bills/:billSessionId/table`.
- Chỉ role `OWNER`, `MANAGER`, `STAFF` trong phạm vi nhà hàng/chi nhánh được gọi API khi bật auth guard.
- Validate bàn đích thuộc đúng nhà hàng và chi nhánh mà tài khoản có quyền truy cập.
- Chặn chuyển bill nếu bill đã `PAID`, `CLOSED`, `CANCELLED`.
- Chặn chuyển sang bàn đích đang có BillSession mở để tránh gộp nhầm bill.
- Khi đổi bàn:
  - cập nhật `branchId`, `tableId`, `tableNumber` của BillSession;
  - cập nhật các order con trong bill để dashboard không bị lẫn bàn;
  - order public sau đó vẫn gửi `billSessionId` cũ nhưng backend dùng bàn mới từ BillSession;
  - ghi `tableChangeLogs` trong BillSession;
  - ghi `auditLogs` backend với người đổi, bàn cũ, bàn mới, lý do.

## App/Admin UI

- Màn Đơn hàng theo bàn có nút `Đổi bàn / chuyển bill` trên mỗi bill đang mở.
- Nhân viên chọn bàn đích trong cùng chi nhánh.
- Nếu bàn đích đang có bill mở, backend trả lỗi 409 và UI hiển thị lỗi.
- Fallback group “đơn lẻ chưa gắn BillSession” không cho đổi bàn.

## Local mode

- Bổ sung `updateRestaurantBillSessionTable` để local mode có cùng rule nghiệp vụ cơ bản.
- Local mode cũng chặn đổi bill đã đóng và chặn bàn đích đã có bill mở.

## Smoke test đề xuất

1. Khách mở bill ở `HDL 01`.
2. Admin gọi `PATCH /restaurants/haidilao_demo/bills/:id/table` sang `haidilao_table_02`.
3. Kiểm tra bill trả về `tableNumber = HDL 02` và có `tableChangeLogs`.
4. Khách gọi thêm bằng `billSessionId` cũ, order mới gắn `HDL 02`.
5. Tạo bill mở ở `HDL 03`, thử chuyển bill khác vào `HDL 03`, API phải trả 409.
