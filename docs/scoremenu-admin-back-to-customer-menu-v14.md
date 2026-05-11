# ScoreMenu v14 - Sửa quay về menu khách sau logout admin

## Lỗi trước đó

Sau khi admin đăng xuất, navigation stack được reset về màn `restaurantAdminLogin`. Khi bấm nút `Quay lại menu`, màn login gọi `goBack()`. Vì lúc đó stack chỉ còn đúng màn login, React Navigation báo:

```txt
The action 'GO_BACK' was not handled by any navigator.
```

## Cách sửa

- Màn Admin Login không dùng `goBack()` cho nút về menu nữa.
- Nút này reset/replace thẳng sang `restaurantMenu`.
- Khi mở lại menu khách, app truyền lại `defaultTableToken` để màn menu tự resolve theo QR khách.
- `goBack` trong HOC cũng được chặn an toàn bằng `navigation.canGoBack()` để tránh warning tương tự ở màn khác.

## Lý do quan trọng

Menu khách và Admin là 2 luồng khác nhau:

- Menu khách phải đi theo QR/table token.
- Admin phải đi theo tài khoản/quyền quản trị.

Khi staff đăng nhập admin và context admin chuyển sang APlus, việc quay về menu khách vẫn phải mở lại bằng QR khách, ví dụ `qr_haidilao_local_01`, để menu khách không ăn theo context admin vừa dùng.

## Cách test

1. Reset app nếu cần: `adb shell pm clear com.aplus.score`.
2. Vào menu khách từ Home, kiểm tra đang là Haidilao.
3. Vào Admin, đăng nhập `staff / staff123`.
4. Staff thấy APlus là đúng vì tài khoản staff thuộc APlus.
5. Đăng xuất.
6. Ở màn đăng nhập Admin, bấm `Về menu khách`.
7. Kết quả đúng: không còn warning `GO_BACK`, app mở lại menu khách theo QR mặc định.
