# ScoreMenu Batch 3 - Tách Customer Menu Session khỏi Admin Session

## Mục tiêu

Batch 3 tách luồng khách xem menu khỏi luồng quản trị. Menu khách không còn đọc trực tiếp `RestaurantContextStore` của admin nữa. Khi admin đăng nhập, đổi nhà hàng hoặc đăng xuất, QR/menu khách đang dùng không bị mất hoặc bị đổi theo tài khoản admin.

## Thay đổi chính

- Thêm `src/stores/CustomerMenuSessionStore.ts`.
- `RestaurantMenuScreen` đọc context từ `CustomerMenuSessionStore`.
- `CustomerMenuSessionStore` lưu riêng QR/session khách bằng AsyncStorage key `scoremenu_customer_menu_session_v1`.
- Admin logout gọi `resetRestaurantContextStore({resetScopedStores:false})` để không xóa menu/cart khách.
- `RestaurantContextStore` vẫn dùng cho admin context và giữ hàm customer cũ để tương thích, nhưng màn menu khách không dùng trực tiếp nữa.
- Cart submit bớt ràng buộc tableId bắt buộc trong customer flow; giai đoạn QR chi nhánh chỉ cần restaurantId + branchId, số bàn sẽ nhập/chọn trong giỏ hàng.
- API public order/cart gửi kèm `tableNumber` từ cart, không ghi đè bằng tableNumber rỗng trong context.

## Luồng sau Batch 3

1. Khách mở màn QR Scanner.
2. Quét/chọn QR menu quán hoặc chi nhánh.
3. `CustomerMenuSessionStore.enterCustomerMenuQr(qrToken)` resolve QR và lưu customer session riêng.
4. `RestaurantMenuScreen` load menu theo customer session.
5. Admin đăng nhập vào dashboard riêng.
6. Admin logout chỉ xóa admin session/context, không xóa customer QR session.
7. Quay lại menu khách vẫn khôi phục QR/session khách gần nhất.

## Test nghiệm thu

### Test 1 - Khách và admin không ăn theo nhau

1. Vào Home -> Menu.
2. Chọn demo Haidilao.
3. Menu hiển thị Haidilao.
4. Vào Admin, đăng nhập `staff / staff123`.
5. Admin thấy APlus/staff scope.
6. Đăng xuất admin.
7. Quay lại QR scanner hoặc mở lại menu Haidilao.
8. Menu khách không bị đổi sang APlus, không lỗi `GO_BACK`.

### Test 2 - Admin logout không xóa menu khách

1. Vào menu bằng QR demo Haidilao.
2. Thêm món vào giỏ.
3. Vào Admin rồi logout.
4. Quay lại menu khách.
5. Menu vẫn theo QR khách. Cart chỉ bị clear khi QR khách đổi sang quán/chi nhánh khác.

### Test 3 - Đổi QR khách mới reset menu/cart khách

1. Chọn demo Haidilao.
2. Thêm món.
3. Quay lại QR scanner, chọn demo APlus.
4. Menu đổi sang APlus.
5. Cart cũ của Haidilao không còn hiển thị trong session APlus.

## Ghi chú

Batch 3 chưa phải batch QR chi nhánh hoàn chỉnh. Batch 4 sẽ chuẩn hóa seed/backend để `qr_aplus_main_menu` và `qr_haidilao_main_menu` là token chi nhánh chính thức. Batch 6-7 sẽ hoàn thiện validate bàn trong giỏ hàng và public order theo `qrToken + tableNumber`.
