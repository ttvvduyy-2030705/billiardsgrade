# ScoreMenu Hotfix - Android ML Kit QR Scanner

## Lỗi

Android log hiển thị:

```text
[unknown/unknown: MlKitContext has not been initialized]
```

Lỗi xảy ra ở màn quét QR dùng `react-native-vision-camera` + `useCodeScanner`.

## Nguyên nhân

Build Android chưa bật cấu hình Code Scanner của VisionCamera và ML Kit có thể chưa được khởi tạo trước khi native scanner gọi `BarcodeScanning.getClient()`.

## Sửa đổi

- Bật `VisionCamera_enableCodeScanner=true` trong `android/gradle.properties`.
- Thêm dependency `com.google.mlkit:common` để app có thể gọi `MlKit.initialize(...)` rõ ràng.
- Khởi tạo ML Kit trong `MainApplication.onCreate()` trước khi camera QR được mở.
- Thêm fallback UI ở màn QR scanner nếu native camera/scanner vẫn lỗi trên thiết bị cụ thể, để tester vẫn nhập token hoặc chọn QR demo.

## Cách test lại

```bat
cd android
gradlew clean
cd ..
npx react-native run-android
```

Nếu máy đang cài APK cũ khác chữ ký, uninstall trước:

```bat
adb uninstall com.aplus.score
npx react-native run-android
```
