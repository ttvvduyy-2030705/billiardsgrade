# Quay lại dùng Render cho ScoreMenu

Bản source này giữ nguyên các fix mới nhất:

- Đăng ký trùng tài khoản Admin sẽ báo tài khoản đã tồn tại.
- Đăng nhập sai tài khoản/sai mật khẩu báo rõ lỗi.
- Admin mới có QR menu và mã QR nhập tay.
- Copy mã QR / copy link QR trong màn Admin QR.
- Nhập tên quán, nhập số bàn không bị mất sau khi bấm Xong.
- Số bàn được tạo đúng để khách chọn trong giỏ hàng.
- Quán mới có danh mục mặc định Đồ uống / Đồ ăn để thêm món được ngay.

## API app đang trỏ về Render

File:

```txt
src/config/restaurantMenu.ts
```

Giá trị hiện tại:

```ts
export const SCOREMENU_RENDER_API_BASE_URL = 'https://billiardsgrade.onrender.com';
```

## Render service

File `render.yaml` đã đặt service name là:

```yaml
name: billiardsgrade
```

Nếu Render của bạn đang dùng URL khác, hãy đổi lại URL trong `src/config/restaurantMenu.ts` cho khớp URL Render thật.

## Cách deploy lại backend lên Render

1. Đẩy source này lên GitHub.
2. Vào Render dashboard.
3. Chọn service backend `billiardsgrade`.
4. Bấm Manual Deploy / Deploy latest commit.
5. Test:

```txt
https://billiardsgrade.onrender.com/health
```

Nếu thấy `ok: true` là backend đã chạy.

## Build lại APK release

Do bản này có sửa native clipboard Android, nên clean build:

```bat
cd android
gradlew clean
gradlew assembleRelease
```

Sau khi cài APK, test lại các luồng:

1. Đăng ký Admin mới.
2. Đăng ký trùng tài khoản cũ phải báo tài khoản đã tồn tại.
3. Đăng nhập đúng tài khoản.
4. Nhập tên quán và số bàn.
5. Vào màn QR, copy mã QR và copy link QR.
6. Khách quét QR / nhập mã QR.
7. Thêm món mới.
8. Chọn món, vào giỏ hàng, chọn bàn.
