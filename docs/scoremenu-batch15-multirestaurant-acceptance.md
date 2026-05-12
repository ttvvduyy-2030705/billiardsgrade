# ScoreMenu Batch 15 - Test nghiệm thu nhiều nhà hàng

## Mục tiêu

Batch 15 chốt bộ kiểm thử nghiệm thu cho mô hình mới:

```txt
QR quán/chi nhánh -> mở đúng menu -> khách nhập/chọn bàn trong giỏ hàng -> backend validate bàn -> admin đúng quán nhận đơn
```

Batch này không thêm UI lớn. Mục tiêu chính là có checklist và script smoke test để phát hiện lỗi lẫn dữ liệu trước khi đem app đi demo hoặc test ở nhà hàng thật.

## File được thêm/sửa

```txt
scripts/scoremenu-e2e-smoke.js
package.json
docs/scoremenu-batch15-multirestaurant-acceptance.md
```

## Lệnh test backend tự động

Chạy backend ở một CMD:

```cmd
set SCOREMENU_AUTH_GUARD=1
set SCOREMENU_TOKEN_SECRET=dev_secret
npm run scoremenu:server
```

Mở CMD khác và chạy:

```cmd
npm run scoremenu:test:e2e
```

Mặc định script gọi:

```txt
http://localhost:4012
```

Nếu backend ở URL khác:

```cmd
set SCOREMENU_BASE_URL=http://192.168.1.10:4012
npm run scoremenu:test:e2e
```

Nếu không muốn reset database demo trước khi test:

```cmd
set SCOREMENU_SKIP_RESET=1
npm run scoremenu:test:e2e
```

## Những case script tự kiểm tra

1. Backend `/health` còn sống và có ít nhất 2 nhà hàng seed.
2. Reset demo database bằng `/dev/reset`.
3. `qr_haidilao_main_menu` chỉ trả menu Haidilao.
4. `qr_aplus_main_menu` chỉ trả menu APlus.
5. Danh sách bàn public theo QR không lẫn giữa Haidilao và APlus.
6. Public order theo QR Haidilao tự gắn `restaurantId/branchId/tableNumber` đúng, dù client gửi fake scope.
7. Public order chặn bàn thuộc nhà hàng/chi nhánh khác.
8. `staff` APlus không truy cập được đơn Haidilao.
9. Admin Haidilao thấy đúng đơn Haidilao.
10. Workflow trạng thái chặn nhảy sai `NEW -> PREPARING`.
11. Workflow đúng `NEW -> ACCEPTED -> PREPARING -> COMPLETED` chạy được.
12. Thanh toán `PAID/BANK_TRANSFER` chạy được sau khi hoàn tất.
13. Khóa QR chi nhánh thì public menu bị chặn.
14. Upload ảnh món trả URL public và URL ảnh mở được.

## Checklist nghiệm thu app thủ công

### 1. QR Scanner

- Home -> Menu phải mở màn quét QR, không vào thẳng Haidilao.
- Demo Haidilao mở menu Haidilao.
- Demo APlus mở menu APlus.
- Nhập `qr_sai_123` phải hiện lỗi QR, không fallback menu mặc định.
- Nút `Home` ở góc trái quay về Home, không lỗi `GO_BACK`.
- Nút `Đăng nhập Admin` mở màn admin login.

### 2. Menu khách theo QR

- QR Haidilao chỉ thấy món Haidilao.
- QR APlus chỉ thấy món APlus.
- Đăng nhập admin tài khoản khác không làm menu khách đổi nhà hàng.
- Logout admin không xóa session QR khách.
- Đổi QR từ Haidilao sang APlus thì giỏ hàng cũ không bị dùng nhầm.

### 3. Giỏ hàng và bàn

- Giỏ hàng hiển thị nhà hàng/chi nhánh từ QR.
- Danh sách bàn chỉ thuộc chi nhánh đó.
- Nhập/chọn bàn đúng thì gửi đơn thành công.
- Nhập bàn nhà hàng khác phải bị chặn.
- Gửi đơn lỗi/mất mạng không làm mất giỏ hàng.

### 4. Admin scope

- `haidilao / admin123` chỉ thấy Haidilao.
- `staff / staff123` chỉ thấy APlus và không sửa được món/bàn/QR.
- `admin / admin123` có thể đổi giữa APlus và Haidilao.
- Đổi nhà hàng trong admin không còn dữ liệu cũ của nhà hàng trước.
- Logout A rồi login B không còn menu/order/bàn của A.

### 5. Đơn hàng

- Khách gửi đơn Haidilao thì admin Haidilao thấy trong trang Đơn hàng.
- Staff APlus không thấy đơn Haidilao.
- Admin nhận đơn mới sau vài giây khi mở trang Đơn hàng.
- Nút xử lý đơn đi đúng luồng: Mới -> Đã nhận -> Đang làm -> Hoàn tất.
- Đơn đã hủy không được đánh dấu đã thanh toán.

### 6. QR chi nhánh và bàn

- Admin xem được QR menu chi nhánh.
- Khóa QR chi nhánh thì khách không mở được menu bằng QR đó.
- Mở lại QR chi nhánh thì khách mở menu được.
- Khóa bàn thì khách không gửi đơn vào bàn đó.
- Ẩn bàn thì bàn không hiện trong danh sách chọn của khách.

### 7. Ảnh món server

- Chạy dev-api.
- Admin Haidilao đổi ảnh món.
- Menu khách Haidilao thấy ảnh URL server sau refresh.
- Máy khác cùng mạng mở URL ảnh được.
- Staff không có quyền không upload/sửa ảnh món được.

### 8. Offline/error/log

- Backend tắt trong dev-api: app báo lỗi backend, không fallback local.
- QR sai: app báo lỗi QR rõ ràng.
- Token admin hết hạn/sai: app về login và clear dữ liệu admin.
- Log dev có module `QR/API/MENU/CART/ADMIN/ORDER/AUTH`.
- Log không in password/token/base64 ảnh.

## Tiêu chí đạt Batch 15

Batch 15 đạt khi:

- `npm run scoremenu:test:e2e` pass toàn bộ.
- App chạy được checklist thủ công chính: QR Haidilao, QR APlus, đặt đơn, admin đúng quán nhận đơn, staff khác không thấy đơn.
- Không còn lỗi lẫn menu/order/bàn giữa Haidilao và APlus trong các luồng chính.
- Không có crash khi QR sai, backend tắt, logout/login user khác.

## Ghi chú

Script smoke test kiểm tra backend/API. Phần camera, navigation, layout, thao tác bấm nút trong app vẫn cần test thủ công trên Android vì phụ thuộc thiết bị, permission camera và React Native runtime.
