# ScoreMenu Batch 14 - Offline, error handling và log

## Mục tiêu

Batch 14 giúp app chịu lỗi tốt hơn khi QR sai, backend tắt, mất mạng, timeout, hết phiên Admin hoặc gửi đơn lỗi. Trọng tâm là không crash, không mất giỏ hàng và log đủ ngữ cảnh để debug.

## Đã làm

### 1. Chuẩn hóa phân loại lỗi

Thêm `src/utils/scoremenuErrors.ts` với các loại lỗi chính:

- `QR_INVALID`
- `TABLE_INVALID`
- `NETWORK`
- `TIMEOUT`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `SERVER`
- `VALIDATION`
- `UNKNOWN`

Các màn gọi `getScoreMenuErrorMessage()` để hiển thị thông báo dễ hiểu thay vì chỉ in lỗi kỹ thuật.

### 2. Log an toàn theo module

Cập nhật `src/utils/devLogger.ts`:

- thêm tag `QR` và `STORAGE`;
- tự redact các key nhạy cảm như token, password, authorization, base64, dataUri;
- rút gọn chuỗi quá dài để không spam logcat.

Các log dùng tag:

- `MENU`
- `CART`
- `ADMIN`
- `ORDER`
- `API`
- `AUTH`
- `QR`

### 3. API error mapping rõ hơn

`ApiRestaurantMenuRepository` giờ log request theo:

- method;
- path;
- status;
- code;
- requestId nếu backend trả về;
- durationMs.

Khi API mode bật mà backend tắt, app báo lỗi API/mạng rõ và không fallback local.

### 4. Menu khách không crash khi QR/backend lỗi

`RestaurantMenuScreen` đã bọc luồng load QR/menu bằng try/catch:

- QR sai hoặc backend lỗi hiển thị thông báo trên màn;
- có nút `Thử lại`;
- không tự fallback sang quán mặc định;
- log có QR, restaurantId, branchId.

### 5. Giỏ hàng giữ nguyên khi gửi đơn lỗi

`RestaurantCartStore` giữ nguyên giỏ hàng khi submit lỗi. Thông báo gửi đơn sẽ cho biết lỗi mạng/timeout/server/validate và nhắc người dùng thử lại.

### 6. Admin hết phiên tự về login

Trang Admin Dashboard bắt lỗi `401`:

- clear Admin session;
- reset dữ liệu admin nhạy cảm;
- đưa về màn login;
- customer menu session không bị xóa.

### 7. Cart screen riêng cũng có error/log

`restaurant-cart` screen log lỗi load cart/menu/table, và hiển thị thông báo nếu không tải được giỏ hàng.

## Cách test

### Test backend tắt

1. Đổi app sang `dev-api`.
2. Không chạy backend.
3. Vào `Home -> Menu -> Demo Haidilao`.
4. Kết quả đúng: app báo không kết nối backend/menu server, không crash, không hiện data local giả.

### Test QR sai

1. Vào màn QR Scanner.
2. Nhập `qr_sai_123`.
3. Bấm mở menu.
4. Kết quả đúng: menu báo QR không hợp lệ/không tìm thấy, có nút thử lại.

### Test gửi đơn mất mạng

1. Chạy backend và mở menu bằng QR hợp lệ.
2. Thêm món, chọn bàn hợp lệ.
3. Tắt backend.
4. Bấm gửi đơn.
5. Kết quả đúng: app báo lỗi, giỏ hàng vẫn còn món để thử lại.

### Test hết phiên Admin

1. Chạy backend với `SCOREMENU_AUTH_GUARD=1`.
2. Đăng nhập Admin.
3. Xóa/sửa token hoặc restart với secret khác.
4. Vào Đơn hàng/Quản lý món/Bàn QR.
5. Kết quả đúng: app đưa về login và clear admin data, menu khách không mất.

## Ghi chú

Batch 14 chưa thay realtime bằng WebSocket. Polling Batch 12 vẫn giữ. Batch này chỉ làm lớp chịu lỗi/log để chuẩn bị Batch 15 nghiệm thu nhiều nhà hàng.
