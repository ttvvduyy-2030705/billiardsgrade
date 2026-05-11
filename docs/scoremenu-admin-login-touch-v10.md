# ScoreMenu v10 - Sửa đăng nhập Admin local và nút trong Dashboard

## Vấn đề
- App đang chạy `mode: local`, nên tài khoản seed của backend như `admin/admin123` không tự có trong AsyncStorage local.
- Khi người dùng đã từng đăng ký tài khoản riêng, danh sách tài khoản local không còn rỗng nên bản cũ không tự tạo tài khoản demo.
- Layout Admin trước đó đặt điều hướng và nội dung trong cùng luồng với ngữ cảnh vận hành, dễ làm người dùng tưởng nút không đổi màn hoặc nội dung bị đẩy xuống.

## Sửa trong v10
- Local storage luôn đảm bảo có các tài khoản demo:
  - `admin / admin123`
  - `haidilao / admin123`
  - `staff / staff123`
- Màn login có ô “Tài khoản demo có sẵn” để tự điền nhanh.
- Admin Dashboard đưa thanh tab lên khu điều hướng riêng, có nhãn “Đang mở: ...”.
- Nội dung tab hiển thị ngay dưới thanh điều hướng; phần ngữ cảnh vận hành được đưa xuống cuối nội dung để không che màn chính.
- Tăng `zIndex/elevation` và dùng `onPressIn` cho tab admin để phản hồi bấm rõ hơn trên Android.

## Test nhanh
1. Xóa cache app nếu trước đó đã đăng ký tài khoản linh tinh:
   `adb shell pm clear com.aplus.score`
2. Chạy lại app.
3. Vào Admin -> bấm `admin / admin123` -> Đăng nhập Admin.
4. Trong Dashboard bấm lần lượt:
   - Đơn hàng
   - Quản lý món
   - Bàn / QR
5. Mỗi lần bấm phải thấy dòng “Đang mở: ...” đổi theo tab và nội dung bên dưới thay đổi.
