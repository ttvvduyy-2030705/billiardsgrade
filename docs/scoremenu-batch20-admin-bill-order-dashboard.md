# ScoreMenu Batch 20 - Admin Bill/Order Dashboard

## Mục tiêu

Batch 20 chuyển trang **Đơn hàng** của admin từ danh sách order rời sang dashboard theo **BillSession/TableBill**. Mỗi bill đại diện cho một bàn trong một phiên ăn, bên trong vẫn xem và xử lý được từng order con.

## Backend

- Thêm API `GET /restaurants/:restaurantId/bills?branchId=` cho Admin/Staff lấy danh sách bill theo nhà hàng/chi nhánh.
- Thêm API `GET /restaurants/:restaurantId/bills/:billSessionId` để lấy chi tiết một bill.
- Mỗi bill trả về `orders`, `orderSummaries`, `orderCount`, `subtotal`, `total`, `status`, `tableId`, `tableNumber`, `branchId`.
- API kiểm tra quyền chi nhánh giống luồng orders/tables hiện tại, nên Staff APlus không thấy bill Haidilao và ngược lại.
- Khi order đổi trạng thái sang `CANCELLED`, tổng bill được tính lại và order huỷ không cộng tiền.

## Repository/App

- Bổ sung `getBillSessions()` vào `RestaurantMenuRepository`.
- `ApiRestaurantMenuRepository` gọi `/restaurants/:restaurantId/bills`.
- `LocalRestaurantMenuRepository` đọc bill sessions local để local mode có cùng mô hình hiển thị.
- `restaurantAdminStore` thêm `AdminBillSession`, label trạng thái bill và loader `loadAdminOrderDashboard()` để polling lấy cả orders + bills.

## UI Admin

- Trang **Đơn hàng** đổi section chính thành **Hóa đơn theo bàn**.
- Mỗi card bill hiển thị:
  - Bàn / BillSession ID.
  - Trạng thái bill.
  - Số order con.
  - Tổng bill cộng dồn.
  - Trạng thái order mới nhất.
- Bên trong bill vẫn render từng `OrderCard`, nên admin vẫn đổi trạng thái bếp và thanh toán từng order con như trước.
- Các order cũ chưa có `billSessionId` được gom vào nhóm “Đơn lẻ chưa gắn BillSession” để không mất dữ liệu cũ.
- Polling 3 giây hiện có được dùng để cập nhật cả order và bill total khi khách gọi thêm món.

## Kiểm tra nhanh đã chạy

- `node --check backend/scoremenu-server/server.js`: OK.
- JSON parse `schema.json` và `db.json`: OK.
- TypeScript syntax/transpile riêng các file sửa: OK.
- Smoke test backend:
  - Khách gọi lần 1 tạo BillSession.
  - Khách gọi lần 2 gửi `billSessionId` và cố đổi bàn sang `HDL 99`, backend vẫn giữ bàn `HDL 01`.
  - `GET /restaurants/haidilao_demo/bills?branchId=haidilao_demo_main` trả 1 bill có 2 order con và `total = 417000`.
