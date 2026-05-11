# ScoreMenu v5 - Admin quản lý bàn / QR

Bản v5 bám theo checklist `P1.4 - Admin quản lý nhà hàng/chi nhánh/bàn/QR` và thứ tự triển khai khuyến nghị mục 7 trong file danh sách việc cần làm.

## Đã thêm

- Thêm tab **Bàn / QR** trong Admin Dashboard.
- Admin xem danh sách bàn theo chi nhánh hiện tại hoặc toàn bộ nhà hàng.
- Admin tạo bàn mới với `tableNumber`, `branchId`, `qrCodeToken`, `status`.
- Admin sửa bàn/QR đã có.
- Admin xoá bàn.
- Admin đổi nhanh trạng thái bàn:
  - `AVAILABLE` - đang dùng được.
  - `OCCUPIED` - đang có khách.
  - `LOCKED` - khoá đặt món qua QR.
  - `HIDDEN` - ẩn/không cho khách dùng QR.
- Backend thêm `PATCH /restaurants/:restaurantId/tables/:tableId`.
- Backend thêm `DELETE /restaurants/:restaurantId/tables/:tableId`.
- Local repository cũng có update/delete table để test không cần server.

## Liên quan tới checklist

- Hoàn thành phần chính của **P1.4 - Admin quản lý nhà hàng/chi nhánh/bàn/QR**.
- Bản v4 trước đó đã làm **4.1 - Admin nhận đơn mới bằng polling**.

## Cách test nhanh

1. Chạy backend:

```bash
npm run scoremenu:server
```

2. Chạy app:

```bash
npm start -- --reset-cache
npm run android
```

3. Vào Admin Dashboard.
4. Chọn tab **Bàn / QR**.
5. Tạo bàn mới, ví dụ:
   - Số bàn: `HDL 02`
   - QR token: `qr_haidilao_main_02`
   - Chi nhánh: `Haidilao Main`
   - Trạng thái: `Đang dùng`
6. Test public menu:

```bash
curl http://localhost:4012/public/menu/qr_haidilao_main_02
```

7. Đổi trạng thái bàn sang `LOCKED` rồi test lại. QR phải bị chặn hoặc không cho khách đặt món.

## Ghi chú

Bản này vẫn hiển thị QR token dạng chữ để dễ test. Bước sau có thể tạo ảnh QR thật để in/dán lên bàn.
