# ScoreMenu Batch 2 - QR Scanner Landing

## Mục tiêu

Batch 2 đổi luồng khách từ `Home -> Menu mặc định` sang:

```txt
Home/Menu -> QR Scanner Landing -> quét/chọn QR quán/chi nhánh -> Restaurant Menu
```

Màn này không phụ thuộc admin session. Admin đăng nhập/đăng xuất không được quyết định menu khách.

## UI đã thêm

Màn mới: `src/scenes/restaurant-qr-scanner`.

Layout ngang:

- Bên trái: logo APlus nhỏ và mô tả ngắn.
- Giữa: khung camera QR.
- Bên phải: nút `Đăng nhập Admin`, QR demo và ô nhập token thủ công.

## QR hiện hỗ trợ

Batch này vẫn giữ token demo cũ để source chạy được ngay:

- `qr_haidilao_local_01` -> menu Haidilao demo.
- `qr_local_main_01` -> menu APlus demo.

Batch sau sẽ đổi QR demo thành QR quán/chi nhánh thật, còn số bàn nhập/chọn trong giỏ hàng.

## Test nhanh

1. Mở app, bấm `Menu` ở Home.
2. App phải mở màn `Quét QR menu`, không nhảy thẳng vào Haidilao.
3. Bấm `Demo Haidilao` -> vào menu Haidilao.
4. Quay lại, bấm `Demo APlus` -> vào menu APlus.
5. Bấm `Đăng nhập Admin` ở rìa phải -> vào admin login.
6. Từ admin login bấm `Về menu khách` -> quay lại QR scanner, không quay thẳng menu mặc định.

## Ghi chú

Màn camera dùng `react-native-vision-camera` và `useCodeScanner`. Nếu máy chưa cấp quyền camera, vẫn có thể test bằng QR demo hoặc nhập token thủ công.
