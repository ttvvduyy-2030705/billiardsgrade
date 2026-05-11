# ScoreMenu QR Order Implementation

Ngày cập nhật: 11/05/2026

## Mục tiêu đã triển khai

Bản cập nhật này bắt đầu chuyển luồng menu khách sang mô hình nhà hàng thực tế:

- Khách mở menu bằng `qrToken` của bàn.
- App resolve QR thành đúng `restaurantId`, `branchId`, `tableId`, `tableNumber`.
- Menu khách dùng public API theo QR, không cần token admin.
- Giỏ hàng khách được scope theo bàn QR.
- Gửi đơn dùng public endpoint theo QR; backend tự gắn nhà hàng/chi nhánh/bàn từ QR, không tin scope do client gửi.
- Ô số bàn trong giỏ hàng bị khóa khi vào từ QR để tránh khách sửa nhầm bàn.
- HOC navigation đã nhận lại route params mới để deep link/QR token không bị kẹt params cũ.

## Endpoint backend mới

### Lấy menu public theo QR

```http
GET /public/menu/:qrToken
```

Trả về:

```json
{
  "context": {
    "restaurantId": "haidilao_demo",
    "branchId": "haidilao_demo_main",
    "tableId": "haidilao_main_table_01",
    "tableNumber": "HDL 01",
    "qrCodeToken": "qr_haidilao_main_01",
    "source": "customer"
  },
  "categories": [],
  "items": []
}
```

### Lưu/đọc giỏ hàng public theo QR

```http
GET /public/menu/:qrToken/cart/current
PATCH /public/menu/:qrToken/cart/current
DELETE /public/menu/:qrToken/cart/current
```

Backend luôn dùng scope từ QR token.

### Tạo order public theo QR

```http
POST /public/menu/:qrToken/orders
```

Body chỉ cần gửi món và ghi chú:

```json
{
  "items": [
    {"itemId": "haidilao_beef_plate", "quantity": 2}
  ],
  "note": "Ít cay"
}
```

Backend tự gắn `restaurantId`, `branchId`, `tableId`, `tableNumber` từ QR.

## Cách test nhanh backend

```bash
npm run scoremenu:server
```

Seed QR có sẵn:

- `qr_haidilao_main_01`
- `qr_haidilao_2_01`
- `qr_aplus_main_01`
- `qr_aplus_main_02`
- `qr_aplus_vip_01`

Test lấy menu:

```bash
curl http://localhost:4012/public/menu/qr_haidilao_main_01
```

Test tạo order:

```bash
curl -X POST http://localhost:4012/public/menu/qr_haidilao_main_01/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"itemId":"haidilao_beef_plate","quantity":2}],"note":"Ít cay"}'
```

## Cách mở menu khách trong app

Màn `restaurantMenu` giờ nhận params:

```ts
props.navigate(screens.restaurantMenu, {
  qrToken: 'qr_haidilao_main_01',
});
```

Có thể dùng alias:

```ts
{ tableToken: 'qr_haidilao_main_01' }
{ tableQrToken: 'qr_haidilao_main_01' }
```

Trong production, params này nên đến từ QR/deep link.

## Gợi ý cấu hình API mode

File: `src/config/restaurantMenu.ts`

```ts
export const RESTAURANT_MENU_ENV_CONFIG = {
  mode: 'api',
  apiBaseUrl: 'http://10.0.2.2:4012',
  defaultRestaurantId: 'haidilao_demo',
  defaultTableToken: 'qr_haidilao_main_01',
};
```

Ghi chú:

- Android emulator dùng `http://10.0.2.2:4012`.
- Máy thật dùng LAN IP của máy chạy backend, ví dụ `http://192.168.1.10:4012`.
- `defaultTableToken` chỉ dùng để test mở Menu từ Home. Khi làm QR thật, nên truyền token từ deep link.

## Việc tiếp theo nên làm

1. Thêm deep link thật: `scoremenu://table/:qrToken` hoặc URL web tương ứng.
2. Thêm màn admin quản lý bàn và hiển thị/in QR từng bàn.
3. Thêm polling/realtime cho admin orders.
4. Bật `SCOREMENU_AUTH_GUARD=1` để test admin token và chống truy cập chéo.
5. Bổ sung test chống lẫn dữ liệu: QR nhà hàng A không được tạo order vào nhà hàng B.
