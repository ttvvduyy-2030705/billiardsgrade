# Backend OAuth mẫu cho livestream

Đây là backend mẫu để app React Native của bạn:
- mở trang đăng nhập YouTube / Facebook / TikTok bằng trình duyệt
- đăng nhập xong sẽ tự redirect về app qua deep link `aplusscore://oauth/callback`
- lưu token demo vào file cục bộ `backend/data/tokens.json`

## Điều quan trọng

- Bạn phải dùng **HTTPS public URL** cho backend callback, ví dụ domain thật hoặc ngrok/Cloudflare Tunnel.
- TikTok Login Kit cho web redirect yêu cầu redirect URI bắt đầu bằng `https`.
- File `tokens.json` chỉ để thử nhanh trên máy dev, không nên dùng cho production.

## Chạy nhanh

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Các endpoint chính

- `GET /auth/google/start`
- `GET /auth/google/callback`
- `GET /auth/facebook/start`
- `GET /auth/facebook/callback`
- `GET /auth/tiktok/start`
- `GET /auth/tiktok/callback`
- `GET /health`

## Kết quả callback về app

Backend sẽ redirect về app theo dạng:

```text
aplusscore://oauth/callback?platform=youtube&status=success&accountName=Your%20Channel
```

hoặc nếu lỗi:

```text
aplusscore://oauth/callback?platform=facebook&status=error&errorMessage=...
```

## Bước tiếp theo

Sau khi login web + quay lại app chạy ổn, bước tiếp sẽ là:
1. gọi backend tạo phiên live thật
2. lấy ingest URL / stream key
3. gắn publisher vào camera pipeline đang có trong app
