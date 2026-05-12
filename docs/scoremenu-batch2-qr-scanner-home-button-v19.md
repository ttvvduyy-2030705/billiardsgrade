# ScoreMenu - QR Scanner Home Button v19

## Mục tiêu

Thêm nút **Home** ở góc trên bên trái màn QR Scanner để người dùng có đường quay về màn Home rõ ràng, không phụ thuộc vào `goBack()` hoặc stack navigation.

## Thay đổi

- `src/scenes/restaurant-qr-scanner/index.tsx`
  - Thêm hàm `goHome()` dùng `reset(0, [{ name: screens.home }])` nếu có.
  - Thêm nút `← Home` ở góc trên bên trái.

- `src/scenes/restaurant-qr-scanner/styles.tsx`
  - Thêm style cho nút Home dạng absolute, zIndex/elevation cao để không bị camera/panel che.
  - Tăng padding top của rail trái để nút không đè logo quá nặng.

## Nghiệm thu

1. Vào Home -> Menu để mở QR Scanner.
2. Bấm nút `← Home` góc trên bên trái.
3. App phải về thẳng màn Home, không báo lỗi `GO_BACK`.
4. Bấm Menu lại vẫn mở QR Scanner bình thường.
