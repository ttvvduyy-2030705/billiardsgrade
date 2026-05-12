# ScoreMenu Batch 8 - Admin quản lý QR quán/chi nhánh và bàn

## Mục tiêu

Batch 8 đưa trang **Bàn / QR** trong Admin về đúng kiến trúc mới:

- QR chính là QR menu của quán/chi nhánh, không phải QR theo tài khoản admin.
- Khách quét QR chi nhánh để vào đúng menu.
- Khách nhập hoặc chọn số bàn trong giỏ hàng.
- Backend kiểm tra bàn thuộc đúng chi nhánh trước khi tạo đơn.

## Thay đổi chính

### 1. Khu vực QR menu chi nhánh

Trong trang **Admin -> Bàn / QR**, thêm khối **QR menu quán / chi nhánh**.

Admin có thể:

- chọn chi nhánh;
- xem QR token của chi nhánh;
- xem ảnh QR để in/dán;
- xem link QR dạng `scoremenu://menu?qrToken=...`;
- đổi QR token chi nhánh;
- đổi trạng thái QR chi nhánh: `ACTIVE`, `LOCKED`, `HIDDEN`.

### 2. Quản lý bàn vẫn giữ riêng

Bên dưới khu QR chi nhánh vẫn có khu quản lý bàn:

- tạo bàn;
- sửa bàn;
- khóa bàn;
- ẩn bàn;
- xóa bàn.

QR bàn được giữ là tùy chọn tương thích. Luồng chính của MVP là QR chi nhánh + khách chọn/nhập bàn.

### 3. Backend siết QR chi nhánh

Backend thêm kiểm tra:

- QR menu chi nhánh không được trùng với chi nhánh khác;
- trạng thái branch chỉ nhận `ACTIVE`, `LOCKED`, `HIDDEN`;
- branch `LOCKED` hoặc `HIDDEN` không mở được public menu;
- bàn `LOCKED` hoặc `HIDDEN` không tạo được order.

## Cách test nhanh

1. Vào Admin bằng `haidilao / admin123`.
2. Mở **Bàn / QR**.
3. Kiểm tra thấy QR chi nhánh Haidilao, ảnh QR và token `qr_haidilao_main_menu`.
4. Đổi trạng thái QR chi nhánh sang `LOCKED`, lưu.
5. Quay ra màn quét QR, nhập `qr_haidilao_main_menu`.
6. Kết quả đúng: không mở được menu Haidilao.
7. Vào lại Admin, đổi trạng thái QR chi nhánh về `ACTIVE`.
8. Quét lại QR, menu mở lại bình thường.
9. Khóa bàn `HDL 01`.
10. Vào menu Haidilao, thêm món, chọn/nhập `HDL 01`, gửi đơn.
11. Kết quả đúng: app/backend chặn đơn vì bàn bị khóa.

