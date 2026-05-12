# ScoreMenu Batch 5 - Public menu theo QR quán/chi nhánh

## Mục tiêu

Batch 5 làm rõ luồng lấy menu công khai: app khách không tải menu bằng context local/admin nữa, mà tải trực tiếp bằng QR quán/chi nhánh.

Luồng chuẩn:

```txt
QR quán/chi nhánh -> GET /public/menu/:qrToken -> context + categories + items -> hiển thị menu khách
```

Số bàn chưa xử lý ở batch này. Số bàn sẽ được nhập/chọn trong giỏ hàng ở Batch 6 và validate khi tạo order ở Batch 7.

## Thay đổi chính

- Thêm `RestaurantPublicMenuPayload` trong repository interface.
- Thêm method `getPublicMenuByQrToken(token)`.
- `ApiRestaurantMenuRepository` gọi trực tiếp `GET /public/menu/:token`.
- `LocalRestaurantMenuRepository` resolve branch/menu QR rồi trả categories/items theo `restaurantId`.
- `RestaurantMenuStore` có `refreshPublicMenuData(qrToken)` để hydrate menu từ public payload.
- `RestaurantMenuScreen` ưu tiên dùng public menu khi đang ở customer QR session.

## Nghiệm thu

1. Từ QR Scanner chọn `qr_haidilao_main_menu` thì menu hiển thị món Haidilao.
2. Từ QR Scanner chọn `qr_aplus_main_menu` thì menu hiển thị món APlus.
3. Hai menu không lẫn category/item.
4. QR sai hiện lỗi, không fallback sang quán mặc định.
5. Admin login/logout không làm đổi public menu khách.

## Ghi chú

Batch này giữ tương thích QR bàn cũ. Nếu token cũ là QR bàn, repository vẫn resolve được, nhưng hướng chính từ đây là QR quán/chi nhánh.
