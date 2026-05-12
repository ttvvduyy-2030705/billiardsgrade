# ScoreMenu Batch 19 - Cart UI khóa bàn sau lần đầu

## Mục tiêu

Batch 19 hoàn thiện UI giỏ hàng cho mô hình BillSession/TableBill:

- Lần đầu gọi món: khách được chọn nhanh bàn trong chi nhánh hoặc nhập số bàn fallback.
- Sau khi backend trả `billSessionId`: bàn chuyển sang trạng thái readonly “Bàn đã khóa”.
- Giỏ hàng hiển thị rõ “Hóa đơn đang mở”, tổng tạm tính hiện tại, món đang gọi thêm và tổng dự kiến sau lần gửi mới.
- Gửi order thành công vẫn clear món/ghi chú trong cart nhưng giữ `billSessionId`, `lockedTableNumber`, `billStatus` trong CustomerMenuSession/CartStore.
- Khi cart trống mà bill vẫn mở, UI hiển thị CTA “Gọi thêm món” để quay lại/chọn món tiếp.

## File thay đổi

- `src/scenes/restaurant-cart/index.tsx`
- `src/scenes/restaurant-cart/styles.tsx`
- `src/scenes/restaurant-menu/index.tsx`
- `src/scenes/restaurant-menu/styles.tsx`

## Luồng UI chính

### Chưa có BillSession

- Cart hiển thị danh sách bàn trong chi nhánh nếu backend/local có dữ liệu bàn public.
- Khách vẫn có ô nhập số bàn fallback.
- Footer dùng nút “Gửi đơn”.
- Tổng tiền hiển thị là “Tổng món trong giỏ”.

### Đã có BillSession

- Cart không còn picker bàn và không cho sửa số bàn.
- UI hiển thị card “BÀN ĐÃ KHÓA”.
- Hiển thị card “HÓA ĐƠN ĐANG MỞ” gồm:
  - Tạm tính hiện tại của bill.
  - Tổng món đang gọi thêm trong cart.
  - Tổng dự kiến sau đơn mới.
- Footer đổi thành “Gửi món gọi thêm”.
- Nếu cart trống, CTA đổi thành “Gọi thêm món”.

## Ghi chú kỹ thuật

- Batch này không đổi backend API.
- Không xóa logic QR quán/chi nhánh và không làm lại flow CustomerMenuSession từ Batch 18.
- UI đọc `billSessionId`, `lockedTableNumber`, `billStatus`, `billTotal` từ `CustomerMenuSessionStore` và cart đã persist sau submit.
