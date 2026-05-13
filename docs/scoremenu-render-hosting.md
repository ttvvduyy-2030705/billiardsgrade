# ScoreMenu - Render hosting setup

Mục tiêu: app dùng được bên ngoài mà không cần localhost/ngrok. Backend ScoreMenu được deploy thành một Render Web Service, app mobile gọi thẳng URL Render.

## 1. Backend Render

Repo đã có `render.yaml` ở thư mục gốc. Trên Render:

1. New → Blueprint hoặc Web Service từ GitHub repo.
2. Service name nên để đúng `scoremenu-api` để URL khớp với app: `https://scoremenu-api.onrender.com`.
3. Render tự dùng `rootDir: backend/scoremenu-server`, `buildCommand: npm install`, `startCommand: npm start`.
4. Health check path: `/health`.
5. Env quan trọng:
   - `NODE_ENV=production`
   - `SCOREMENU_HOST=0.0.0.0`
   - `SCOREMENU_AUTH_GUARD=1`
   - `SCOREMENU_TOKEN_SECRET` do Render tự generate.
   - `SCOREMENU_DB_FILE=data/db.json`
   - `SCOREMENU_UPLOAD_DIR=data/uploads`

Server đã đọc `process.env.PORT`, đúng yêu cầu Render Web Service.

## 2. Dữ liệu lưu ở Render

Backend hiện dùng JSON file. Cấu hình mặc định trong `render.yaml` dùng đường dẫn tương đối `data/db.json` để chạy được trên Render Free, không cần gắn disk.

Lưu ý: nếu không gắn Persistent Disk, dữ liệu có thể mất sau redeploy/restart. Khi nâng cấp sang gói có disk, có thể đổi lại env như sau và mount disk đúng path:

```text
SCOREMENU_DB_FILE=/var/data/scoremenu/db.json
SCOREMENU_UPLOAD_DIR=/var/data/scoremenu/uploads
Disk mount path=/var/data
```

Server có fallback an toàn: nếu đường dẫn env không ghi được, backend sẽ tự quay về `data/db.json` và `data/uploads` thay vì crash.

## 3. App mobile

App mặc định gọi:

```ts
https://scoremenu-api.onrender.com
```

Cấu hình nằm ở:

```ts
src/config/restaurantMenu.ts
```

Nếu Render cấp URL khác, sửa `SCOREMENU_RENDER_API_BASE_URL`, build lại app.

## 4. Test nhanh sau deploy

Mở URL:

```text
https://scoremenu-api.onrender.com/health
```

Kết quả đúng là JSON có `ok: true`.

Chạy e2e bằng URL Render:

```bash
SCOREMENU_BASE_URL=https://scoremenu-api.onrender.com node scripts/scoremenu-e2e-smoke.js
```

Trên Windows PowerShell:

```powershell
$env:SCOREMENU_BASE_URL="https://scoremenu-api.onrender.com"; node scripts/scoremenu-e2e-smoke.js
```

## 5. Lưu ý bản miễn phí

Render free service có thể sleep khi không dùng. Lần gọi đầu sau khi sleep có thể chậm hơn bình thường. App đã giữ timeout 30 giây cho API Render để chịu được cold start tốt hơn.

## 6. Lỗi thường gặp

### `EACCES: permission denied, mkdir '/var/data/scoremenu'`

Nguyên nhân: service đang trỏ DB/upload vào `/var/data`, nhưng Render chưa có Persistent Disk mount tại `/var/data`.

Cách fix nhanh cho Free plan:

```text
SCOREMENU_DB_FILE=data/db.json
SCOREMENU_UPLOAD_DIR=data/uploads
```

Sau đó redeploy service.

Cách fix khi dùng paid disk:

```text
Disk mount path=/var/data
SCOREMENU_DB_FILE=/var/data/scoremenu/db.json
SCOREMENU_UPLOAD_DIR=/var/data/scoremenu/uploads
```
