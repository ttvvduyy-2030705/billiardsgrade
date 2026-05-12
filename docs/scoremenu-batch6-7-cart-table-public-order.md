# ScoreMenu Batch 6-7 - Giỏ hàng chọn bàn và public order theo QR chi nhánh

## Batch 6 - Giỏ hàng nhập/chọn bàn theo chi nhánh

Mục tiêu: QR chỉ xác định nhà hàng/chi nhánh/menu. Khách chọn hoặc nhập số bàn trong giỏ hàng trước khi gửi đơn.

Đã làm:
- Cart overlay của màn menu hiển thị nhà hàng/chi nhánh đang gọi từ QR.
- Cart overlay có danh sách bàn của chi nhánh để chọn nhanh.
- Màn giỏ hàng riêng cũng hiển thị nhà hàng/chi nhánh và danh sách bàn.
- Trường số bàn vẫn cho nhập tay để phù hợp vận hành thực tế.
- Trước khi submit, app kiểm tra bàn thuộc đúng chi nhánh và không bị LOCKED/HIDDEN.
- Nếu bàn sai/khóa, giỏ hàng vẫn được giữ nguyên và hiển thị lỗi rõ.

## Batch 7 - Backend public order theo QR chi nhánh + tableNumber

Mục tiêu: Server tự lấy restaurantId/branchId từ QR và validate số bàn từ payload.

Đã làm:
- Thêm public endpoint lấy bàn theo QR chi nhánh:
  - `GET /public/menu/:qrToken/tables`
- `POST /public/menu/:qrToken/orders` nhận `tableNumber` hoặc `tableId`.
- Server tự resolve `restaurantId/branchId` từ QR.
- Server tìm bàn trong đúng chi nhánh theo `tableNumber/tableId`.
- Bàn không tồn tại, khác chi nhánh, LOCKED hoặc HIDDEN sẽ bị chặn.
- Client gửi `restaurantId/branchId` giả không ảnh hưởng.
- Server vẫn tự tính total và snapshot tên/giá món.

## Test nhanh

```bash
npm run scoremenu:server
curl http://localhost:4012/public/menu/qr_haidilao_main_menu/tables
curl -X POST http://localhost:4012/public/menu/qr_haidilao_main_menu/orders \
  -H "Content-Type: application/json" \
  -d '{"tableNumber":"HDL 01","items":[{"itemId":"haidilao_beef_plate","quantity":1}],"restaurantId":"fake"}'
```

Kết quả đúng:
- Order có `restaurantId=haidilao_demo`.
- Order có `branchId=haidilao_demo_main`.
- Order có `tableNumber=HDL 01`.
- `restaurantId` giả từ client bị bỏ qua.

Test bàn sai:

```bash
curl -i -X POST http://localhost:4012/public/menu/qr_haidilao_main_menu/orders \
  -H "Content-Type: application/json" \
  -d '{"tableNumber":"APlus 01","items":[{"itemId":"haidilao_beef_plate","quantity":1}]}'
```

Kết quả đúng: HTTP 400 và báo số bàn không tồn tại trong chi nhánh này.
