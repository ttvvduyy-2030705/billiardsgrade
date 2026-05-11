# ScoreMenu v7 - Siết scope nhà hàng/chi nhánh và auth guard

## Thuộc mục nào trong danh sách việc cần làm

Bản v7 tập trung vào nhóm P1:

- P1.1 - Siết scope restaurant/branch trên mọi request.
- P1.3 - Admin auth/session thật hơn.
- Một phần 4.4 - Audit log/debug cho thao tác nhạy cảm.

## Backend đã bổ sung

### 1. Token admin có chữ ký

Token admin không còn chỉ là base64 payload. Server tạo token dạng:

```txt
base64url(payload).hmacSignature
```

Payload có:

- userId
- username
- role
- restaurantIds
- branchIds
- iat
- exp
- nonce

Khi bật `SCOREMENU_AUTH_GUARD=1`, token cũ không có chữ ký sẽ bị từ chối.

### 2. Mật khẩu seed dùng hash

Seed admin mới không lưu password plain text nữa. Tài khoản demo:

| Username | Password | Quyền |
|---|---|---|
| admin | admin123 | OWNER, thấy APlus + Haidilao |
| staff | staff123 | STAFF, chỉ thấy APlus chi nhánh Cầu Giấy |
| haidilao | admin123 | OWNER, chỉ thấy Haidilao Demo |

Nếu db cũ còn password plain text, server vẫn cho login một lần rồi tự migrate sang hash.

### 3. `/restaurants` được lọc theo token

Khi bật auth guard:

- Không có token: `401`.
- Có token staff APlus: chỉ trả về APlus.
- Có token Haidilao: chỉ trả về Haidilao.

### 4. Scope chi nhánh

User có `branchIds` sẽ bị giới hạn theo chi nhánh đó:

- `GET /branches` chỉ trả chi nhánh được phép.
- `GET /tables` chỉ trả bàn được phép.
- `GET /orders` chỉ trả đơn trong chi nhánh được phép.
- Query sang branch khác trả `403`.

### 5. Phân quyền thao tác

| Chức năng | OWNER | MANAGER | STAFF |
|---|---:|---:|---:|
| Xem menu/order/bàn | Có | Có | Có, trong phạm vi branch |
| Tạo/sửa/xóa món | Có | Có | Không |
| Tạo/sửa/xóa danh mục | Có | Có | Không |
| Tạo/sửa/xóa bàn/QR | Có | Có | Không |
| Đổi trạng thái đơn | Có | Có | Có, trong phạm vi branch |
| Cập nhật thanh toán | Có | Có | Có, trong phạm vi branch |
| Tạo/xóa chi nhánh | Có | Không | Không |

### 6. Public order an toàn hơn

`POST /public/menu/:qrToken/orders` vẫn không cần token admin, nhưng server tự resolve `restaurantId`, `branchId`, `tableId` từ QR. Response chỉ trả order vừa tạo dạng array `[order]`, không trả toàn bộ đơn trong chi nhánh.

### 7. Audit log

Các thao tác nhạy cảm sẽ in log dạng:

```txt
[scoremenu-audit] {"action":"order.status.update", ...}
```

Có thể tắt bằng:

```bash
SCOREMENU_AUDIT_LOG=0 npm run scoremenu:server
```

## App đã bổ sung

- Session admin lưu thêm `branchIds` và `activeBranchId` nếu backend trả về.
- API mode OWNER không còn tự được xem mọi nhà hàng nếu backend chỉ cấp một số `restaurantIds`.
- Khi login API, app set cả `activeBranchId` vào RestaurantContext nếu có.

## Lệnh test nhanh

Bật auth guard:

```bash
SCOREMENU_AUTH_GUARD=1 SCOREMENU_TOKEN_SECRET=dev_secret npm run scoremenu:server
```

Login staff:

```bash
curl -X POST http://localhost:4012/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"staff","password":"staff123"}'
```

Dùng token staff gọi sang Haidilao phải bị 403:

```bash
curl http://localhost:4012/restaurants/haidilao_demo/tables \
  -H "Authorization: Bearer <STAFF_TOKEN>"
```

Staff thêm món phải bị 403:

```bash
curl -X POST http://localhost:4012/restaurants/aplus_billiards_hanoi/menu/items \
  -H "Authorization: Bearer <STAFF_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":1,"categoryId":"aplus_drink"}'
```

