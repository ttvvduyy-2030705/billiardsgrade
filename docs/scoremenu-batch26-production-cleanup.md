# ScoreMenu Batch 26 - Production cleanup / bỏ demo khỏi app

## Mục tiêu

Batch 26 dọn các điểm demo/test đang lộ trên app để chuẩn bị build thật, nhưng vẫn giữ dữ liệu seed và e2e cho môi trường phát triển.

## Thay đổi chính

- App release/prod không tự mở menu bằng QR token hardcode.
- Màn QR scanner production chỉ đi theo QR thật/deep link, không hiện shortcut nội bộ hay ô nhập token.
- Shortcut QR và tài khoản nội bộ chỉ hiện khi app chạy dev build và env không phải `prod`.
- Badge môi trường không hiển thị base URL/ngrok trên UI; release chỉ hiện trạng thái kết nối chung.
- Build log khởi động app chuyển sang `devLog`, không còn `console.warn`/`console.log` lộ `apiBaseUrl` trong production.
- Payment method `MOCK` không hiện trong admin production; chỉ còn `CASH` và `BANK_TRANSFER`.
- Local workspace mặc định được đổi tên hiển thị sạch hơn, không dùng chữ “Demo” trong tên quán/chi nhánh.
- Staging/prod không có `defaultRestaurantId` hoặc QR token mặc định, tránh fallback im lặng.

## Những phần vẫn giữ lại cho dev/test

- Backend seed demo trong `backend/scoremenu-server/data/seed.js` vẫn giữ để chạy acceptance/e2e.
- Script `scripts/scoremenu-e2e-smoke.js` vẫn dùng dữ liệu demo để test BillSession.
- Local repository vẫn tồn tại để dev/offline kiểm thử, nhưng release/prod không dùng local làm mặc định.

## Cách chạy dev sau Batch 26

Backend local:

```bash
npm run scoremenu:server
npm run android
```

Nếu test bằng máy thật, cấu hình `SCOREMENU_API_BASE_URL` hoặc `globalThis.__SCOREMENU_CONFIG__` theo backend LAN/ngrok trước khi build.

## Checklist nghiệm thu Batch 26

- Release/prod không hiện QR demo, nút Haidilao/APlus nội bộ, hoặc ô nhập token.
- Release/prod không log base URL/ngrok khi app start.
- Admin production không hiện tài khoản nội bộ có sẵn.
- Admin production không hiện phương thức thanh toán MOCK.
- Dev build vẫn có shortcut nội bộ để test nhanh.
- E2E Batch 25 vẫn có thể chạy với backend seed.
