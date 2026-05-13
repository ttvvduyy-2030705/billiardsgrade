# ScoreMenu - Render hosting setup

Mục tiêu: app dùng được bên ngoài mà không cần localhost/ngrok. Backend ScoreMenu được deploy thành một Render Web Service, app mobile gọi thẳng URL Render.

## 1. Backend Render

Repo đã có `render.yaml` ở thư mục gốc. Trên Render:

1. New → Blueprint hoặc Web Service từ GitHub repo.
2. Service name nên để đúng `scoremenu-api` để URL khớp với app: `https://scoremenu-api.onrender.com`.
3. Render tự dùng `rootDir: backend/scoremenu-server`, `buildCommand: npm install`, `startCommand: npm start`.
4. Health check path: `/health`.
5. Env quan trọng:
   - `SCOREMENU_HOST=0.0.0.0`
   - `SCOREMENU_AUTH_GUARD=1`
   - `SCOREMENU_TOKEN_SECRET` do Render tự generate.
   - `SCOREMENU_DB_FILE=/var/data/scoremenu/db.json`
   - `SCOREMENU_UPLOAD_DIR=/var/data/scoremenu/uploads`

Server đã đọc `process.env.PORT`, đúng yêu cầu Render Web Service.

## 2. Dữ liệu lưu ở Render

Backend hiện dùng JSON file. Muốn dữ liệu không mất sau restart/redeploy thì gắn Render Persistent Disk mount path `/var/data`.

Nếu không gắn disk, Render filesystem là ephemeral: dữ liệu ghi vào file có thể mất khi service redeploy/restart.

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
