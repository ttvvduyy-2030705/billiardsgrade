# ScoreMenu Batch 9 - API mode/env dev-api/staging/prod

## Mục tiêu

Batch 9 khóa lại cấu hình môi trường để khi test API thật, app không được âm thầm fallback sang local seed/AsyncStorage. Nếu đang chọn `api` mà backend tắt hoặc thiếu `baseUrl`, app phải báo lỗi API rõ ràng.

## Cấu hình mới

File chính:

```txt
src/config/restaurantMenu.ts
```

Có 4 môi trường:

| Env | Mode | Mục đích |
| --- | --- | --- |
| `local` | `local` | Demo trên 1 máy, dùng seed local |
| `dev-api` | `api` | Test backend trên máy dev, Android emulator dùng `http://10.0.2.2:4012` |
| `staging` | `api` | Test server staging/domain riêng |
| `prod` | `api` | Bản thực tế, không để default QR/token local |

Mặc định hiện tại vẫn là:

```ts
const DEFAULT_RESTAURANT_MENU_ENV_NAME = 'local';
```

Khi muốn test API thật, đổi thành:

```ts
const DEFAULT_RESTAURANT_MENU_ENV_NAME = 'dev-api';
```

Hoặc override bằng runtime/global env nếu build system hỗ trợ:

```ts
globalThis.__SCOREMENU_MENU_ENV__ = 'dev-api';
globalThis.__SCOREMENU_CONFIG__ = {
  apiBaseUrl: 'http://192.168.1.10:4012',
};
```

## Điểm thay đổi quan trọng

Trước Batch 9:

```txt
mode api + apiBaseUrl rỗng -> tự fallback local
```

Sau Batch 9:

```txt
mode api + apiBaseUrl rỗng -> giữ API mode và báo lỗi cấu hình khi gọi API
```

Điều này tránh tình huống demo tưởng đang lấy dữ liệu backend nhưng thực ra vẫn đọc dữ liệu local.

## Token admin

`ApiRestaurantMenuRepository` tiếp tục đọc token từ `restaurant_admin_session_v1` trong AsyncStorage. Khi admin đăng nhập API thành công, token được lưu trong AdminSession và tự gắn vào request admin:

```txt
Authorization: Bearer <token>
```

Các public endpoint như:

```txt
GET /public/menu/:qrToken
POST /public/menu/:qrToken/orders
```

không cần token admin.

## Cách test dev-api

### 1. Bật backend

Windows CMD:

```cmd
set SCOREMENU_AUTH_GUARD=1
set SCOREMENU_TOKEN_SECRET=dev_secret
npm run scoremenu:server
```

### 2. Đổi app sang dev-api

Trong `src/config/restaurantMenu.ts`:

```ts
const DEFAULT_RESTAURANT_MENU_ENV_NAME = 'dev-api';
```

Android emulator dùng sẵn:

```txt
http://10.0.2.2:4012
```

Máy thật cùng Wi-Fi thì override `apiBaseUrl` bằng IP LAN máy chạy backend.

### 3. Test scanner

Mở app -> Menu -> màn QR Scanner phải hiện badge môi trường:

```txt
dev-api · API · http://10.0.2.2:4012
```

Chọn Demo Haidilao hoặc nhập:

```txt
qr_haidilao_main_menu
```

Kết quả đúng: app gọi backend và load menu từ server.

### 4. Test backend tắt

Tắt CMD backend rồi quét QR lại.

Kết quả đúng: app báo lỗi kết nối API/backend, không tự hiện menu local.

### 5. Test admin API token

Đăng nhập:

```txt
haidilao / admin123
```

Vào Admin -> Quản lý món hoặc Bàn/QR. Request admin phải có token. Nếu bật `SCOREMENU_AUTH_GUARD=1` mà không có token, backend trả 401.

## Nghiệm thu Batch 9

- Chọn `local`: app dùng seed local như cũ.
- Chọn `dev-api`: app gọi backend thật.
- Backend tắt trong `dev-api`: app báo lỗi API, không fallback local.
- Admin đăng nhập API rồi thao tác menu/bàn/QR không bị 401 nếu token hợp lệ.
- Public menu/order vẫn không cần token admin.
