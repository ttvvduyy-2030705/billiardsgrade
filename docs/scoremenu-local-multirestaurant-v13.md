# ScoreMenu v13 - Local demo tách tài khoản admin/haidilao

Mục tiêu: khi chạy app ở `mode: local`, tài khoản `admin` và `haidilao` không còn nhìn cùng một menu/bàn QR mặc định.

## Thay đổi chính

- Thêm workspace local riêng cho Haidilao: `haidilao_local_demo`.
- Thêm chi nhánh local riêng: `haidilao_local_main_branch`.
- Thêm bàn/QR riêng: `HDL 01`, token `qr_haidilao_local_01`.
- Seed menu Haidilao riêng gồm nước lẩu, thịt nhúng, rau/món kèm.
- Tài khoản local demo được cập nhật lại:
  - `admin / admin123`: thấy APlus Billiards Demo và Haidilao Demo, mặc định vào APlus.
  - `haidilao / admin123`: chỉ thấy Haidilao Demo.
  - `staff / staff123`: chỉ thấy APlus Billiards Demo.
- Home/Menu local mặc định mở QR Haidilao để đúng hướng app menu kiểu Haidilao.

## Cách test nhanh

1. Reset app để seed local mới nếu máy đang giữ dữ liệu cũ:

```cmd
adb shell pm clear com.aplus.score
```

2. Chạy lại Metro và app:

```cmd
npm start -- --reset-cache
npm run android
```

3. Vào Menu từ Home:

- Phải thấy nhà hàng Haidilao Demo.
- Bàn phải là `HDL 01`.
- Menu phải là món lẩu, không phải chỉ 4 món nước ngọt.

4. Vào Admin và login:

- `haidilao / admin123`: chỉ thấy Haidilao Demo, menu Haidilao, QR `qr_haidilao_local_01`.
- `admin / admin123`: mặc định vào APlus Billiards Demo, nhưng có quyền chuyển sang Haidilao Demo.
- `staff / staff123`: chỉ thấy APlus Billiards Demo.

## Ghi chú

Nếu không clear app data, code vẫn tự nâng cấp các tài khoản demo đã tồn tại trong AsyncStorage. Tuy nhiên dữ liệu menu cũ của nhà hàng cũ có thể vẫn còn. Khi cần kiểm tra sạch nhất, dùng `adb shell pm clear com.aplus.score`.
