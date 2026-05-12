# ScoreMenu Batch 11 - Admin order workflow

## Mục tiêu

Hoàn thiện trang **Đơn hàng** để admin vận hành theo đúng luồng:

`NEW -> ACCEPTED -> PREPARING -> COMPLETED` hoặc `CANCELLED`.

Batch này tập trung vào trải nghiệm xử lý đơn và chống thao tác sai trạng thái, sau khi Batch 6-10 đã tách QR chi nhánh, bàn trong giỏ hàng, API env và admin scope.

## Đã làm

- Thêm bảng luồng trạng thái đơn ngay phía trên danh sách đơn.
- Thêm KPI doanh thu đã thu và tổng đơn chưa thanh toán.
- Thêm nút hành động chính trên từng đơn:
  - NEW: Nhận đơn.
  - ACCEPTED: Bắt đầu làm.
  - PREPARING: Hoàn thành.
- Đơn `COMPLETED` hoặc `CANCELLED` hiển thị thông báo terminal và không cho chuyển ngược.
- Local admin store ném lỗi rõ khi chuyển sai luồng, thay vì im lặng không đổi.
- Chặn đánh dấu `PAID` cho đơn đã huỷ ở app và backend.
- Dashboard bắt lỗi đổi trạng thái/thanh toán và hiển thị thông báo thay vì crash hoặc không phản hồi.

## Cách test nhanh

1. Khách vào QR Haidilao hoặc APlus, chọn bàn và gửi đơn.
2. Vào Admin đúng tài khoản nhà hàng.
3. Mở trang **Đơn hàng**.
4. Kiểm tra đơn mới nằm ở cột/bộ lọc `Mới`.
5. Bấm lần lượt:
   - Nhận đơn.
   - Bắt đầu làm.
   - Hoàn thành.
6. Sau khi hoàn thành, đơn không được chuyển ngược.
7. Tạo đơn khác, huỷ đơn, sau đó thử đánh dấu `Đã thanh toán`; app/backend phải chặn.

## Ghi chú

Batch này vẫn dùng polling đã có từ batch trước. Realtime WebSocket/SSE có thể làm sau khi workflow order ổn định.
