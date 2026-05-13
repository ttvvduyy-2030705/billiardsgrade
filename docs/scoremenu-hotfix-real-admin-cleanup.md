# ScoreMenu hotfix - bỏ tài khoản test Admin và sửa màn đăng ký

## Mục tiêu

- Không còn đăng nhập được bằng tài khoản dựng sẵn `admin/admin123`, `staff/staff123`, `haidilao/admin123`.
- Backend production tự loại bỏ các admin seed cũ khi khởi động hoặc khi đọc DB.
- Seed mặc định không tạo sẵn admin; chủ quán phải đăng ký tài khoản thật.
- Sau khi đăng xuất, người dùng bấm sang màn đăng ký và nhập thông tin không bị bật ngược về màn đăng nhập.

## Ghi chú triển khai Render

Sau khi deploy patch này, nếu service đang dùng DB file cũ, backend sẽ tự lọc các tài khoản seed nội bộ theo `id`/`passwordSalt` cũ. Tài khoản người dùng đã đăng ký thật sẽ được giữ lại.

Nếu người dùng từng tạo một username nhưng quên mật khẩu, hãy đăng ký bằng username khác hoặc reset DB thủ công. Patch này không tự đổi mật khẩu tài khoản thật vì lý do an toàn.

## Kiểm tra nhanh

```bash
node --check backend/scoremenu-server/server.js
node --check backend/scoremenu-server/data/seed.js
```

Test API sau deploy:

```bash
curl -X POST https://<render-url>/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Kết quả đúng: HTTP 401.

Sau đó đăng ký tài khoản thật từ app rồi đăng nhập bằng chính tài khoản đó.
