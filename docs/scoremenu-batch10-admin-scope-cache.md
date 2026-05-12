# ScoreMenu Batch 10 - Admin scope/cache isolation

Batch 10 siết luồng admin sau khi QR menu chi nhánh đã ổn:

- Admin page chỉ đọc dữ liệu theo Admin Session, không theo Customer QR Session.
- Khi login/switch nhà hàng/chi nhánh, context admin tự đưa về restaurant/branch mà tài khoản có quyền.
- Nếu tài khoản chỉ được cấp một chi nhánh, danh sách chi nhánh/bàn/đơn chỉ hiện trong phạm vi đó.
- Staff chỉ được xem/xử lý đơn; không được sửa menu, danh mục, bàn hoặc QR chi nhánh.
- Các hành động đổi trạng thái đơn/thanh toán sẽ kiểm tra order thuộc scope hiện tại trước khi cập nhật.
- Logout admin không xóa session/menu khách.

## Test chính

1. Vào QR Scanner -> Demo Haidilao -> thấy menu Haidilao.
2. Vào Admin -> login `staff / staff123`.
3. Staff chỉ thấy dữ liệu APlus/chi nhánh được cấp quyền, không thấy Haidilao.
4. Staff vào Quản lý món hoặc Bàn/QR thử sửa dữ liệu -> bị chặn quyền.
5. Logout staff -> quay về QR/menu khách -> customer menu Haidilao vẫn không bị đổi sang APlus.
6. Login `haidilao / admin123` -> chỉ thấy Haidilao, không thấy APlus.
7. Login `admin / admin123` -> được chuyển nhà hàng; khi đổi nhà hàng, đơn/bàn/menu của nhà hàng cũ không còn trong trang hiện tại.
