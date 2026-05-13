# ScoreMenu hotfix - API timeout + camera restricted fallback

## Vấn đề từ log

- `GET /menu/qr-tokens/...` bị timeout nhiều lần do màn menu gọi refresh ở cả mount và focus, cộng thêm retry API.
- `system/camera-is-restricted` xảy ra khi hệ điều hành/emulator/device policy chặn camera. Đây không phải lỗi QR token hay BillSession.
- Khi dùng ngrok free tunnel, request API cần header `ngrok-skip-browser-warning` để tránh bị chặn bởi trang cảnh báo của ngrok.

## Sửa đổi

- Bỏ refresh duplicate ở màn menu; `useFocusEffect` đã chạy ở lần mount đầu tiên.
- De-dupe `enterCustomerMenuQr` trong store khi cùng một QR token đang được resolve.
- Tắt retry mặc định cho API menu để một lỗi timeout không nhân đôi request.
- Giảm timeout mặc định còn 10 giây để fail nhanh hơn.
- Thêm header `ngrok-skip-browser-warning: true` cho request API.
- Cập nhật thông báo lỗi timeout rõ hơn: kiểm tra backend/ngrok/mạng/API address.
- Khi camera bị restricted, app không bị kẹt; hiện nút thử lại camera và ô nhập mã QR thật của quán/chi nhánh.

## Lưu ý vận hành

- Nếu vẫn timeout, backend hoặc ngrok đang không reachable từ thiết bị. Cần kiểm tra API base URL đang trỏ đúng máy/backend đang chạy.
- Với Android emulator dùng backend máy host: `http://10.0.2.2:4012`.
- Với điện thoại thật dùng backend LAN: dùng IP LAN của máy chạy backend, ví dụ `http://192.168.1.10:4012`, hoặc dùng ngrok còn live.
- `camera-is-restricted` thường do emulator/thiết bị chặn camera. Test trên máy thật hoặc bật camera trong emulator/device policy.
