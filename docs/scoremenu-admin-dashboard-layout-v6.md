# ScoreMenu Admin Dashboard Layout v6

## Mục tiêu

Bản v6 sửa bố cục Admin Dashboard để các tab quản trị không bị đẩy xuống dưới phần "Ngữ cảnh vận hành".

## Vấn đề trước đó

Trên một số màn hình ngang/thiết bị Android, card "Ngữ cảnh vận hành" chiếm quá nhiều chiều cao. Vì `AdminSidebar` và `contentPanel` nằm bên dưới card này nên người dùng nhìn thấy admin chỉ còn phần chọn nhà hàng/chi nhánh, còn các tab Đơn hàng, Quản lý món, Bàn/QR bị đẩy xuống dưới màn hình.

## Thay đổi chính

- Đưa `AdminSidebar` vào phần body chính ngay dưới header.
- Tạo `mainColumn` để chứa `workspacePanel` và nội dung tab.
- Giữ tab Đơn hàng / Quản lý món / Bàn QR luôn hiện sớm sau header.
- Thu gọn `workspacePanel`: giảm padding, giảm khoảng cách, xếp Nhà hàng và Chi nhánh cùng hàng trên màn rộng.
- Thêm `minHeight: 0` cho layout flex để `contentPanel` cuộn đúng trong không gian còn lại.

## Kiểm tra nghiệm thu

1. Vào Admin Dashboard.
2. Ngay sau header phải thấy khu điều hướng với 3 tab:
   - Đơn hàng
   - Quản lý món
   - Bàn / QR
3. Bấm từng tab phải đổi nội dung tương ứng.
4. Card "Ngữ cảnh vận hành" vẫn còn nhưng không được che hoặc đẩy mất các tab.
5. Trên màn nhỏ, tab hiển thị dạng hàng ngang/wrap; trên màn rộng, tab hiển thị dạng sidebar trái.
