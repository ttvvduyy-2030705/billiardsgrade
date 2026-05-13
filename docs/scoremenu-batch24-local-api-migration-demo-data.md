# ScoreMenu Batch 24 - Local/API migration và dữ liệu demo

## Mục tiêu

Batch 24 chuẩn hóa dữ liệu demo và migration cho mô hình BillSession/TableBill đã làm từ Batch 16-23:

- Reset backend/API có sẵn BillSession demo cho APlus và Haidilao.
- Local mode cũng seed BillSession demo tương ứng khi AsyncStorage chưa có order/bill.
- Order cũ chưa có `billSessionId` được migrate sang BillSession tạm theo `restaurantId + branchId + tableId/tableNumber + guestSessionId`.
- Script smoke test được cập nhật để kiểm tra seed bill, bill cộng dồn, khóa bàn, migration và phân quyền nhiều nhà hàng.
- API mode không fallback im lặng sang local. Nếu thiếu `apiBaseUrl`, ApiRepository ném lỗi cấu hình rõ ràng.

## Dữ liệu demo sau reset backend

Sau khi chạy:

```bash
npm run scoremenu:server:reset
npm run scoremenu:server
```

hoặc:

```bash
curl -X POST http://localhost:4012/dev/reset
```

backend seed `scoremenu_backend_schema_v1_batch24` gồm:

| Nhà hàng | Chi nhánh | Bàn | BillSession | Order con | Tổng |
|---|---|---|---|---:|---:|
| Haidilao Demo | `haidilao_demo_main` | `HDL 01` | `seed_bill_haidilao_hdl01` | 2 | 417000 |
| APlus Billiards Hà Nội | `aplus_hanoi_main` | `Bàn 01` | `seed_bill_aplus_ban01` | 1 | 95000 |

Có thêm `HDL 02` để test tạo BillSession mới mà không đụng bill seed đang mở ở `HDL 01`.

## Migration order cũ

Backend tự chạy migration nhẹ khi load database:

1. Tìm order có `restaurantId` nhưng chưa có `billSessionId`.
2. Chuẩn hóa `orderStatus`, `paymentStatus`, `paymentMethod`, `total` nếu thiếu/sai định dạng.
3. Gom nhóm theo `restaurantId`, `branchId`, `tableId/tableNumber`, `guestSessionId`.
4. Tạo BillSession tạm dạng `bill_migrated_<hash>`.
5. Gán `billSessionId` ngược lại cho order cũ.
6. Ghi audit event `legacyOrdersMigratedToBillSessions`.

Migration chỉ chạy khi thật sự có order legacy, không đè BillSession đã có.

## Local mode

Local mode vẫn dùng AsyncStorage nhưng đã có parity tối thiểu với API mode:

- `loadBillSessions()` seed bill demo khi restaurant local chưa có order/bill.
- `bootstrap()` gọi `loadBillSessions()` cho cả APlus local và Haidilao local để reset app xong có demo sạch.
- Order local cũ chưa có `billSessionId` được gom vào BillSession tạm giống backend.

## Dev API mode

Chạy backend:

```bash
npm run scoremenu:server
```

Chạy app Android emulator với preset `dev-api`:

```bash
SCOREMENU_MENU_ENV=dev-api npm run android
```

Preset `dev-api` dùng:

```text
http://10.0.2.2:4012
```

Máy thật cùng LAN cần override:

```bash
SCOREMENU_MENU_ENV=dev-api SCOREMENU_API_BASE_URL=http://<LAN-IP>:4012 npm run android
```

## Staging/prod

`staging` và `prod` là API mode, không có fallback local. Bắt buộc cấu hình:

```bash
SCOREMENU_MENU_ENV=staging SCOREMENU_API_BASE_URL=https://staging.example.com npm run android
SCOREMENU_MENU_ENV=prod SCOREMENU_API_BASE_URL=https://api.example.com npm run android
```

Nếu `apiBaseUrl` rỗng trong API mode, app sẽ báo lỗi cấu hình từ `ApiRestaurantMenuRepository` thay vì đọc local seed im lặng.

## Smoke test

Chạy:

```bash
npm run scoremenu:server
npm run scoremenu:test:e2e
```

Script Batch 24 kiểm tra:

- `/health` trả schema `scoremenu_backend_schema_v1_batch24`.
- Reset DB seed có BillSession APlus/Haidilao.
- QR public vẫn scope đúng nhà hàng/chi nhánh.
- Lần đầu gọi món tạo `billSessionId`.
- Lần hai gửi `billSessionId` và cố đổi bàn bị backend bỏ qua.
- Current bill trả đủ order con và tổng cộng dồn.
- Order legacy admin không có `billSessionId` được migrate sang BillSession tạm.
- Staff APlus không xem được bill Haidilao.

## Ghi chú nghiệm thu

Batch này không thay đổi UI lớn. Trọng tâm là dữ liệu demo, migration và parity local/API để các batch 25 test nghiệm thu có nền dữ liệu ổn định.
