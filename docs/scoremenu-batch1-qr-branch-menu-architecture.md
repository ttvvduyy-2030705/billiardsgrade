# ScoreMenu Batch 1 - Kiến trúc QR quán/chi nhánh

## Mục tiêu batch

Batch 1 chốt lại định nghĩa QR cho luồng khách:

- QR giai đoạn 1 đại diện cho **nhà hàng/chi nhánh/menu**.
- Khách vẫn **nhập hoặc chọn số bàn trong giỏ hàng** trước khi gửi đơn.
- QR không thuộc về tài khoản admin. Admin chỉ là người tạo/quản lý QR của quán/chi nhánh.
- QR từng bàn vẫn được giữ như chế độ tương thích/nâng cấp sau, nhưng không còn là luồng chính.

## Quy tắc kiến trúc

### Luồng khách

```txt
Mở Menu
-> Quét/chọn QR quán hoặc chi nhánh
-> App resolve ra restaurantId + branchId
-> Vào menu đúng quán/chi nhánh
-> Khách thêm món
-> Khách nhập/chọn số bàn trong giỏ hàng
-> Backend validate bàn thuộc đúng branch
-> Tạo order đúng restaurant/branch/tableNumber
```

### Luồng admin

```txt
Đăng nhập admin
-> Chỉ thấy restaurant/branch được cấp quyền
-> Quản lý menu, đơn hàng, bàn và QR của chi nhánh
-> Logout admin không được xóa hoặc ghi đè customer menu session
```

## Tên gọi mới trong code

| Tên cũ | Tên ưu tiên từ Batch 1 | Ghi chú |
|---|---|---|
| `defaultTableToken` | `defaultMenuQrToken` | Tên cũ vẫn giữ để demo cũ không hỏng. |
| `resolveTableToken` | `resolveMenuQrToken` | Tên mới xem QR là menu/branch QR trước. |
| `enterCustomerTable` | `enterCustomerMenuQr` | Tên cũ vẫn là alias tương thích. |
| `qrCodeToken` | `menuQrToken` + `qrCodeToken` | `qrCodeToken` giữ cho table QR cũ, `menuQrToken` là tên luồng mới. |
| table QR | branch/menu QR | Table QR là nâng cấp tùy chọn sau này. |

## Thay đổi trong batch này

- Thêm `defaultMenuQrToken` và `getDefaultCustomerMenuQrToken()` trong `src/config/restaurantMenu.ts`.
- Thêm type `RestaurantQrTokenScope = 'BRANCH_MENU' | 'TABLE'`.
- Thêm field `menuQrToken` và `qrTokenScope` vào `RestaurantMenuContext`.
- Thêm method repository ưu tiên `resolveMenuQrToken(token)`.
- Giữ `resolveTableToken(token)` như alias cũ để không phá demo table QR hiện tại.
- Đổi màn menu dùng `enterCustomerMenuQr()` thay cho tên table-oriented cũ.
- Đổi thông báo lỗi từ “QR bàn” sang “QR menu/quán/chi nhánh”.

## Chưa làm trong Batch 1

Những phần này để sang các batch tiếp theo:

- Chưa tạo màn camera QR scanner landing.
- Chưa tạo branch/menu QR thật trong seed/backend.
- Chưa tách hẳn CustomerMenuSessionStore khỏi AdminSession.
- Chưa validate số bàn theo branch khi gửi order bằng branch/menu QR.

## Nghiệm thu Batch 1

- Source có thuật ngữ mới rõ ràng: `menuQrToken`, `resolveMenuQrToken`, `enterCustomerMenuQr`.
- Code cũ vẫn chạy được với QR table demo hiện tại.
- Không còn định nghĩa QR là QR của admin user.
- Chưa thay đổi UI lớn, chỉ sửa nền để Batch 2-7 triển khai đúng hướng.
