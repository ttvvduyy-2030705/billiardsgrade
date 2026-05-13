# ScoreMenu hotfix - Offline mode không cần backend/ngrok

Mục tiêu: app phải đăng ký/đăng nhập Admin, quét QR, mở menu, gọi món, cộng dồn hóa đơn và khóa bàn bằng dữ liệu local trên thiết bị, không yêu cầu backend/ngrok.

## Thay đổi chính

- Chuyển cấu hình mặc định của ScoreMenu sang `local` cho cả dev/staging/prod.
- Màn đăng nhập/đăng ký Admin không còn mục đổi địa chỉ API.
- Đăng ký Admin dùng AsyncStorage local thông qua `LocalRestaurantMenuRepository`.
- Customer QR/menu không bootstrap API trước khi resolve QR.
- Admin context không bootstrap API trước khi hydrate dữ liệu.
- App vẫn giữ `ApiRestaurantMenuRepository` trong source để dùng lại về sau, nhưng không còn là mặc định.
- QR dạng `qr_*` chưa có trong local storage sẽ được resolve vào nhà hàng/chi nhánh local hiện tại để app dùng được với QR thật đã in mà không cần registry backend.
- Build info không log base URL/ngrok.
- Một số text UI chuyển từ “server/API/backend” sang “lưu trên thiết bị”.

## Lưu ý vận hành

- Đây là offline-first/single-device mode: dữ liệu nằm trên thiết bị đang cài app.
- Nếu xoá app hoặc clear data thì tài khoản Admin/menu/order local cũng bị xoá.
- Muốn đồng bộ nhiều thiết bị hoặc dùng chung dữ liệu theo thời gian thực thì sau này mới bật lại API/server.

## Sau khi apply patch

Nên clear data để xoá URL API/ngrok và session cũ còn lưu từ bản trước:

```bat
adb shell pm clear com.aplus.score
cd android
gradlew clean
cd ..
npx react-native run-android
```
