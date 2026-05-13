# ScoreMenu Batch 25 - Test nghiệm thu hóa đơn cộng dồn

## Mục tiêu

Batch 25 là batch nghiệm thu cuối cho luồng BillSession/TableBill đã triển khai từ Batch 16-24. Phạm vi chính:

- Khách gọi món lần đầu: chọn bàn, backend tạo `BillSession`, trả `billSessionId`.
- Khách gọi thêm lần hai: app/backend dùng `billSessionId`, bàn bị khóa, client cố gửi bàn khác vẫn bị bỏ qua.
- Admin dashboard: xem hóa đơn cộng dồn theo bàn, kèm order con `Order #1/#2/#3`.
- Nhân viên đổi bàn: order sau khi đổi bàn đi theo bàn mới và có audit log.
- Thanh toán/đóng bill: bill `PAID/CLOSED` không nhận order mới.
- Hai nhà hàng/hai chi nhánh không lẫn bill.
- Legacy order không có `billSessionId` vẫn được migrate về bill tạm để không mất dữ liệu.

## File test tự động

Script chính:

```bash
npm run scoremenu:test:e2e
```

Alias rõ nghĩa cho Batch 25:

```bash
npm run scoremenu:test:acceptance
```

Yêu cầu backend đang chạy:

```bash
npm run scoremenu:server
```

Có thể đổi base URL khi test ngrok/dev-api:

```bash
SCOREMENU_BASE_URL=https://your-ngrok-url npm run scoremenu:test:acceptance
```

Mặc định script sẽ gọi `/dev/reset` trước khi chạy để dữ liệu sạch. Nếu muốn test trên dữ liệu đang có:

```bash
SCOREMENU_SKIP_RESET=1 npm run scoremenu:test:acceptance
```

## Checklist được cover bởi script

| Nhóm | Case | Severity |
|---|---|---|
| Health/reset | `/health` đúng schema Batch 25, reset seed OK | blocker |
| Auth/scope | Admin/staff login có token scope đúng | blocker |
| QR/menu | QR Haidilao/APlus/branch 2 resolve đúng nhà hàng/chi nhánh | major |
| Order lần đầu | Public order tạo `BillSession`, khóa đúng bàn đã chọn | blocker |
| Order lần hai | Gửi `billSessionId`, backend bỏ qua `tableNumber` giả | blocker |
| Bill tổng | Current bill và admin bill list có 2 order con, tổng cộng dồn đúng | major |
| Đổi bàn | Staff chuyển bill APlus sang bàn mới, order sau đó đi theo bàn mới | major |
| Audit/chặn bàn bận | Có `tableChanged` audit log, chuyển sang bàn có bill mở bị `409` | minor |
| Thanh toán/đóng bill | `PAID/CLOSED` chặn khách gọi thêm | blocker |
| Không lẫn dữ liệu | APlus/Haidilao và Haidilao main/branch 2 không nhìn lẫn bill | blocker |
| Migration | Admin order cũ không có `billSessionId` được migrate sang bill tạm | major |

## Kết quả chạy trong batch này

Lệnh đã chạy khi đóng gói Batch 25:

```bash
SCOREMENU_BASE_URL=http://127.0.0.1:4126 node scripts/scoremenu-e2e-smoke.js
```

Kết quả:

```text
Batch 25 acceptance report
- Passed: 14/14
- Blocker: 0
- Major: 0
- Minor: 0

Result: READY - BillSession cumulative billing acceptance flow passed.
```

## Báo cáo lỗi

| Severity | Số lượng | Ghi chú |
|---|---:|---|
| Blocker | 0 | Không có lỗi chặn demo. |
| Major | 0 | Không có lỗi nghiệp vụ chính. |
| Minor | 0 | Không có lỗi phụ trong script nghiệm thu. |

## Ghi chú khi test thủ công

- Test trên app thật vẫn cần clear app data nếu đang giữ `CustomerMenuSession` cũ từ batch trước.
- Nếu test qua ngrok, đảm bảo app đang dùng đúng `apiBaseUrl` và backend đã reset seed.
- Nếu camera QR lỗi native, dùng hotfix ML Kit đã tách riêng hoặc chọn QR demo/nhập token thủ công để test nghiệp vụ bill.
