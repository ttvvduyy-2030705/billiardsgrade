# ScoreMenu Batch 26 - Strict UI cleanup

Bản vá này dọn tiếp Batch 26 theo yêu cầu: app không còn hiển thị các shortcut/công cụ kiểm thử ở màn khách hoặc màn admin.

## Đã sửa

- Gỡ hẳn khối "Công cụ nội bộ" ở màn quét QR.
- Gỡ shortcut mở nhanh QR Haidilao/APlus khỏi màn quét QR.
- Gỡ ô nhập QR token thủ công khỏi màn quét QR.
- Gỡ badge môi trường khỏi màn quét QR để không lộ local/dev-api/prod.
- Camera fallback không còn gợi ý dùng công cụ phát triển.
- Gỡ khối tài khoản có sẵn ở màn đăng nhập Admin.
- Xóa tài khoản Admin mặc định cũ khỏi local storage khi app load lại.
- Local storage mới không tự seed lại các username cũ `admin`, `haidilao`, `staff`.
- Không dùng default QR/default restaurant hardcode cho app runtime.
- Admin UI không hiển thị payment method MOCK; dữ liệu cũ nếu có MOCK được map về Tiền mặt trên UI.
- Placeholder QR chi nhánh chuyển sang giá trị trung tính.
- Local workspace mặc định chuyển sang tên trung tính, đồng thời lọc entry Haidilao cũ khỏi workspace local.

## Ghi chú kiểm thử

Sau khi chép patch, nên gỡ app cũ hoặc clear app data để xóa cache UI/local storage cũ trên thiết bị:

```bat
adb shell pm clear com.aplus.score
```

Sau đó build lại app:

```bat
cd android
gradlew clean
cd ..
npx react-native run-android
```

Nếu đang giữ bản cài ký bằng key khác, uninstall trước:

```bat
adb uninstall com.aplus.score
```
