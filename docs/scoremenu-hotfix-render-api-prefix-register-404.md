# Hotfix - Render register 404 / API prefix

## Vấn đề

App gọi `POST /auth/admin/register` nhưng backend Render trả 404. Trường hợp thường gặp là URL API được lưu/cấu hình có hậu tố `/api`, nên request thực tế thành `/api/auth/admin/register` trong khi backend ScoreMenu chạy route ở root.

## Sửa đổi

- Backend chấp nhận cả route root và route có prefix `/api`.
- App tự strip hậu tố `/api` khỏi `apiBaseUrl` cũ.
- Default Render URL được cập nhật về `https://billiardsgrade.onrender.com`.

## Sau khi apply

Commit/push lại, redeploy Render latest commit, rồi clear data app hoặc cài lại app để bỏ URL API cũ đã lưu.
