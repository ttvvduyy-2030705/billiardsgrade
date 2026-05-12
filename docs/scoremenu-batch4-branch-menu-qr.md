# ScoreMenu Batch 4 - Chuẩn hóa QR quán/chi nhánh

## Mục tiêu

Batch 4 chuyển QR khách từ tư duy “QR bàn là luồng chính” sang “QR quán/chi nhánh là luồng chính”. QR chỉ cần xác định đúng nhà hàng/chi nhánh/menu. Số bàn sẽ được nhập hoặc chọn trong giỏ hàng ở các batch sau và backend sẽ validate trước khi tạo đơn.

## Token demo mới

- APlus chi nhánh chính: `qr_aplus_main_menu`
- Haidilao chi nhánh chính: `qr_haidilao_main_menu`

Các QR bàn cũ vẫn được giữ để tương thích:

- APlus bàn 01: `qr_local_main_01` hoặc API seed `qr_aplus_main_01`
- Haidilao bàn 01: `qr_haidilao_local_01` hoặc API seed `qr_haidilao_main_01`

## Thay đổi chính

- `RestaurantBranch` có thêm `menuQrToken` và `status`.
- Local seed tạo sẵn `qr_aplus_main_menu` và `qr_haidilao_main_menu` cho chi nhánh.
- Local resolver `resolveRestaurantMenuQrToken()` ưu tiên branch/menu QR, sau đó mới fallback sang table QR cũ.
- Backend seed thêm `menuQrToken` cho từng chi nhánh demo.
- Backend thêm resolver `/menu/qr-tokens/:token` và vẫn giữ `/menu/table-tokens/:token` để tương thích.
- Public menu `/public/menu/:token` nhận được cả branch/menu QR và table QR.
- QR Scanner demo chuyển sang dùng branch/menu QR mới.

## Tiêu chí nghiệm thu

1. Nhập hoặc chọn `qr_haidilao_main_menu` ở màn QR Scanner phải mở menu Haidilao.
2. Nhập hoặc chọn `qr_aplus_main_menu` phải mở menu APlus.
3. Context trả về khi resolve branch QR không bắt buộc có `tableId` hoặc `tableNumber`.
4. QR bàn cũ vẫn mở được menu để không phá demo cũ.
5. QR sai phải báo lỗi, không fallback sang quán mặc định.

## Ghi chú cho batch sau

Batch 5 sẽ chuẩn hóa repository/API public menu theo QR. Batch 6-7 sẽ xử lý giỏ hàng nhập/chọn bàn và backend validate bàn thuộc đúng chi nhánh trước khi tạo order.
