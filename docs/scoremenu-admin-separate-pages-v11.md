# ScoreMenu v11 - Tách Admin thành các trang riêng

## Mục tiêu

Màn Admin Dashboard trước đó gom Đơn hàng, Quản lý món và Bàn/QR trong cùng một màn. Trên Android màn nhỏ, layout dễ bị co ngang, font/nút đè nhau hoặc không nhìn hết nội dung.

Bản v11 tách từng khu vực admin thành route riêng:

- `restaurantAdminOrders`: trang Đơn hàng.
- `restaurantAdminMenuManagement`: trang Quản lý món.
- `restaurantAdminTables`: trang Bàn / QR.

Dashboard chính chỉ còn là trang chọn khu vực quản trị và đổi ngữ cảnh nhà hàng/chi nhánh.

## Cách kiểm tra

1. Đăng nhập Admin.
2. Ở dashboard chính, bấm thẻ `Đơn hàng`.
3. Kiểm tra route mở trang riêng với tiêu đề `Đơn hàng` và có nút `← Admin`.
4. Bấm `← Admin`, sau đó mở `Quản lý món`.
5. Bấm `← Admin`, sau đó mở `Bàn / QR`.
6. Kiểm tra các nút trong từng trang không còn bị phần điều hướng hoặc ngữ cảnh vận hành chèn lên.

## Ghi chú

Các trang mới vẫn dùng chung logic load dữ liệu, session, auth guard và permission từ `restaurant-admin-dashboard` để tránh nhân đôi code.
