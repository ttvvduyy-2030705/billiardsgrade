# ScoreMenu Batch 12 - Admin nhận đơn mới bằng polling/realtime MVP

## Mục tiêu

Admin đang mở trang **Đơn hàng** sẽ thấy đơn mới trong khoảng 3 giây sau khi khách gửi order từ QR menu của đúng quán/chi nhánh.

Batch này vẫn dùng polling 3 giây cho MVP. Realtime thật bằng WebSocket/SSE/Firebase có thể thay sau, nhưng không được làm lẫn dữ liệu giữa nhà hàng.

## Nguyên tắc đã áp dụng

- Chỉ polling khi màn Đơn hàng admin đang được focus.
- Không polling ở màn Admin Home, Quản lý món, Bàn/QR, màn login hoặc sau logout.
- Khi logout, request nền không được tiếp tục set state vào dashboard cũ.
- Danh sách đơn được dedupe theo order id để tránh nhân đôi khi refresh nhanh.
- Đơn mới chỉ thông báo khi snapshot trước đó đã có dữ liệu và xuất hiện id mới.

## File chính

- `src/scenes/restaurant-admin-dashboard/index.tsx`
- `src/scenes/restaurant-admin-dashboard/components/AdminOrdersScreen.tsx`
- `src/types/navigation.tsx`

## Test nghiệm thu

1. Mở Admin -> Đơn hàng bằng admin đúng quán.
2. Khách gửi order từ QR chi nhánh cùng quán.
3. Trong tối đa 3 giây, đơn mới xuất hiện và có thông báo `1 đơn mới vừa vào khu quản trị`.
4. Chuyển sang Quản lý món hoặc Bàn/QR, trạng thái đồng bộ chuyển sang tạm dừng.
5. Logout admin, không còn polling nền và không bị warning setState sau logout.
6. Admin quán khác không nhìn thấy đơn.

## Ghi chú nâng cấp realtime

Sau MVP có thể thay polling bằng:

- WebSocket: channel theo `restaurantId:branchId`.
- SSE: server push event `order.created`, `order.updated`.
- Firebase/Supabase Realtime.

Dù dùng kênh nào, server vẫn phải lọc theo quyền admin và branch scope.
