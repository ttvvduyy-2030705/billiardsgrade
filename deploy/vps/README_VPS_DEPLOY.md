# ScoreMenu chạy trên VPS thay Render

Mục tiêu: backend chạy public trên VPS, app Android đăng nhập/thêm món/QR gọi về VPS thay vì Render.

## Nên dùng domain hay IP?

- Tốt nhất: dùng domain/subdomain, ví dụ `https://api.tenmiencuaban.com`.
- Tạm thời test: dùng IP VPS qua HTTP, ví dụ `http://123.123.123.123`.
- Nếu dùng HTTP IP, app hiện đã bật `android:usesCleartextTraffic="true"`, nên vẫn gọi được. Nhưng bản dùng thật nên dùng HTTPS.

## Chuẩn bị VPS

Khuyến nghị Ubuntu 22.04 hoặc 24.04, RAM tối thiểu 1GB. Đăng nhập bằng SSH.

```bash
ssh root@YOUR_VPS_IP
```

Upload source lên VPS, ví dụ dùng Git hoặc SCP. Sau đó vào thư mục source.

## Bước 1: Cài runtime VPS

```bash
sudo bash deploy/vps/01_prepare_vps_ubuntu.sh
```

Script này cài Node.js 20, Nginx, PM2, tạo user `scoremenu`, tạo thư mục dữ liệu:

```txt
/opt/scoremenu
/etc/scoremenu/scoremenu.env
/var/lib/scoremenu/db.json
/var/lib/scoremenu/uploads
/var/log/scoremenu
```

Dữ liệu đặt ở `/var/lib/scoremenu` để redeploy không bị mất database.

## Bước 2: Deploy backend

```bash
sudo bash deploy/vps/02_deploy_backend.sh
```

Test nội bộ VPS:

```bash
curl http://127.0.0.1:4012/health
```

## Bước 3: Cấu hình Nginx public

Nếu có domain:

```bash
sudo DOMAIN=api.tenmiencuaban.com bash deploy/vps/03_setup_nginx.sh
```

Nếu chưa có domain, test bằng IP trước:

```bash
sudo DOMAIN=_ bash deploy/vps/03_setup_nginx.sh
```

Test từ máy ngoài:

```bash
curl http://YOUR_VPS_IP/health
```

hoặc:

```bash
curl http://api.tenmiencuaban.com/health
```

## Bước 4: Bật HTTPS nếu có domain

Trỏ DNS A record của domain về IP VPS trước. Sau đó chạy:

```bash
sudo DOMAIN=api.tenmiencuaban.com EMAIL=you@example.com bash deploy/vps/04_enable_ssl_certbot.sh
```

Test:

```bash
curl https://api.tenmiencuaban.com/health
```

## Bước 5: Đổi app Android sang API VPS

Trên máy Windows/code, chạy từ thư mục project:

```bat
node scripts\set-scoremenu-api-url.js https://api.tenmiencuaban.com
```

Hoặc nếu test bằng IP HTTP:

```bat
node scripts\set-scoremenu-api-url.js http://YOUR_VPS_IP
```

Sau đó clean build release:

```bat
cd android
gradlew clean
gradlew assembleRelease
```

## Lệnh quản lý sau này

Xem log:

```bash
sudo -u scoremenu pm2 logs scoremenu-api
```

Restart backend:

```bash
sudo -u scoremenu pm2 restart scoremenu-api
```

Xem trạng thái:

```bash
sudo -u scoremenu pm2 status
```

Backup database:

```bash
sudo cp /var/lib/scoremenu/db.json /root/scoremenu-db-backup-$(date +%F-%H%M).json
```

## Checklist test sau khi chuyển VPS

1. Mở `https://api.tenmiencuaban.com/health` hoặc `http://YOUR_VPS_IP/health` thấy `ok: true`.
2. Build APK dùng URL VPS.
3. Đăng ký admin mới.
4. Đăng ký lại cùng tài khoản phải báo tài khoản đã tồn tại.
5. Đăng nhập admin.
6. Nhập tên quán và số bàn.
7. Vào QR thấy mã QR và copy được.
8. Thêm danh mục/món mới không lỗi.
9. Khách quét QR, chọn món, vào giỏ hàng thấy danh sách bàn.
10. Gửi đơn, admin thấy đơn mới.
