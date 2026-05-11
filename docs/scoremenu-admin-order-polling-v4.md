# ScoreMenu v4 - Admin tự cập nhật đơn hàng

## Thuộc phần nào trong checklist?

Phần v4 này thuộc nhóm **Admin nhận đơn realtime/polling** trong checklist việc cần làm:

- Sau khi khách gửi order bằng QR, admin phải thấy đơn mới mà không cần thoát app.
- MVP dùng polling 3 giây/lần để dễ test, ổn định và không cần cài thêm WebSocket/SSE ngay.
- Sau này có thể thay polling bằng WebSocket/SSE/Firebase Realtime mà vẫn giữ UI trạng thái đồng bộ hiện tại.

## Đã làm

1. Thêm hàm `loadAdminOrders()` trong `src/services/restaurantAdminStore.ts`.
2. Chuẩn hóa danh sách đơn admin luôn sort theo `createdAt` mới nhất trước.
3. Admin Dashboard tự gọi refresh đơn mỗi 3 giây khi đang ở tab **Đơn hàng**.
4. Khi chuyển qua tab **Menu**, polling tự tạm dừng để không gọi API thừa.
5. Thêm trạng thái đồng bộ ở màn đơn:
   - `Đang đồng bộ đơn...`
   - `Tự cập nhật mỗi 3 giây`
   - `Mất kết nối đơn hàng`
   - `Tạm dừng khi rời tab đơn`
6. Thêm nút **Làm mới đơn** để admin refresh thủ công.
7. Khi phát hiện order mới, màn admin hiển thị thông báo `x đơn mới vừa vào khu quản trị`.
8. Khi đổi trạng thái đơn/thanh toán, danh sách vẫn giữ thứ tự mới nhất trước.

## Cách test nhanh

1. Chạy backend:

```bash
npm run scoremenu:server
```

2. Mở app và đăng nhập admin.
3. Vào tab **Đơn hàng**.
4. Mở CMD khác và tạo order demo:

```bash
curl -X POST http://localhost:4012/public/menu/qr_haidilao_main_01/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"itemId":"haidilao_beef_plate","quantity":1}],"note":"Test đơn mới"}'
```

5. Chờ tối đa 3 giây. Admin phải thấy đơn mới tự xuất hiện.

## Lưu ý

- Đây là bước MVP để mô phỏng realtime bằng polling.
- Khi app ổn, bước kế tiếp nên nâng cấp sang WebSocket/SSE để admin nhận đơn tức thời hơn và giảm request lặp.
