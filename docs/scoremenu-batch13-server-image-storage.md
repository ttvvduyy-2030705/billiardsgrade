# ScoreMenu Batch 13 - Ảnh món qua server/storage

## Mục tiêu

Batch 13 chuyển luồng ảnh món từ local-only sang server-hosted URL khi app chạy `api` mode. Admin chọn ảnh trong app, ảnh được upload lên backend ScoreMenu, backend lưu file vào thư mục upload và trả `imageUrl` dạng HTTP để mọi thiết bị khách/admin cùng xem được.

## Luồng mới

1. Admin mở Quản lý món.
2. Chọn/đổi ảnh món.
3. Nếu app đang ở `api` mode, app gửi ảnh base64 lên:
   `POST /restaurants/:restaurantId/menu/images`.
4. Backend lưu ảnh vào:
   `backend/scoremenu-server/data/uploads/<restaurantId>/...`.
5. Backend trả `imageUrl` dạng:
   `http://<host>:4012/uploads/menu-images/<restaurantId>/<file>`.
6. App lưu URL này vào field `imageUrl` khi lưu món.
7. Menu khách đọc cùng field `imageUrl`, nên thiết bị khác cũng thấy ảnh.

## Endpoint mới

### POST /restaurants/:restaurantId/menu/images

Yêu cầu token admin và role `OWNER` hoặc `MANAGER`.

Body JSON:

```json
{
  "dishId": "haidilao_beef_plate",
  "mimeType": "image/png",
  "base64": "..."
}
```

Response:

```json
{
  "ok": true,
  "restaurantId": "haidilao_demo",
  "dishId": "haidilao_beef_plate",
  "imageUrl": "http://10.0.2.2:4012/uploads/menu-images/haidilao_demo/...png",
  "publicUrl": "http://10.0.2.2:4012/uploads/menu-images/haidilao_demo/...png",
  "storagePath": "menu-images/haidilao_demo/...png",
  "mimeType": "image/png",
  "size": 12345
}
```

## Static file

Backend phục vụ ảnh qua:

```txt
GET /uploads/menu-images/:restaurantId/:fileName
```

Endpoint này không cần token để menu khách tải ảnh được.

## Local mode

Local mode vẫn giữ cơ chế cũ: ảnh được copy vào private app file bằng `RNFS`. Như vậy demo local vẫn chạy được khi không có backend.

## Cách test nhanh backend

```cmd
set SCOREMENU_AUTH_GUARD=1
set SCOREMENU_TOKEN_SECRET=dev_secret
npm run scoremenu:server
```

Login:

```cmd
curl -X POST http://localhost:4012/auth/admin/login -H "Content-Type: application/json" -d "{\"username\":\"haidilao\",\"password\":\"admin123\"}"
```

Upload ảnh base64:

```cmd
curl -X POST http://localhost:4012/restaurants/haidilao_demo/menu/images ^
  -H "Authorization: Bearer TOKEN_DA_COPY" ^
  -H "Content-Type: application/json" ^
  -d "{\"dishId\":\"test_item\",\"mimeType\":\"image/png\",\"base64\":\"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADklEQVQImWP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC\"}"
```

Mở `imageUrl` trong response. Kết quả đúng là HTTP 200 và `Content-Type: image/png`.

## Cách test app

1. Đổi env sang `dev-api` trong `src/config/restaurantMenu.ts`.
2. Chạy backend.
3. Đăng nhập admin `haidilao / admin123`.
4. Vào Quản lý món.
5. Chọn ảnh cho một món.
6. Lưu món.
7. Mở menu khách bằng `qr_haidilao_main_menu`.
8. Ảnh món phải hiện từ URL server.

## Tiêu chí nghiệm thu

- Upload ảnh trả về URL HTTP, không phải `file://` hoặc `content://`, khi app ở API mode.
- Thiết bị khác mở menu cùng QR vẫn thấy ảnh.
- Staff không có quyền manager không upload/sửa ảnh được.
- Ảnh của nhà hàng này lưu trong thư mục scope theo `restaurantId`, không dùng nhầm cho nhà hàng khác.
- Local mode vẫn dùng được cơ chế ảnh cũ để demo nhanh.
