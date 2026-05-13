# ScoreMenu hotfix - Admin register API URL

## Vấn đề

Màn đăng ký Admin gọi đúng endpoint `POST /auth/admin/register`, nhưng thiết bị không kết nối được backend/ngrok nên request timeout. Trước hotfix, màn đăng ký chỉ báo lỗi chung nên khó biết phải sửa địa chỉ API nào.

## Thay đổi

- Thêm cấu hình `Địa chỉ API` ngay trên màn đăng nhập/đăng ký Admin.
- Lưu API base URL vào AsyncStorage để dùng lại sau khi restart app.
- Áp dụng API base URL đã lưu cho cả Admin flow và Customer QR/menu flow.
- Khi đăng ký/đăng nhập lỗi network/timeout, UI hiển thị đúng message từ repository thay vì message chung.
- Thêm keyboard type `url` cho native input để nhập `http://...` hoặc `https://...` không bị auto-capitalize/autocorrect.

## Cách dùng nhanh

- Android emulator: nhập `http://10.0.2.2:4012`.
- Điện thoại thật cùng Wi-Fi: nhập IP LAN của máy chạy backend, ví dụ `http://192.168.1.10:4012`.
- Ngrok: nhập URL ngrok đang chạy, ví dụ `https://xxxx.ngrok-free.app`.

Sau khi đổi địa chỉ API, thử đăng ký/đăng nhập lại. Nếu vẫn timeout thì backend/ngrok chưa reachable từ thiết bị.
