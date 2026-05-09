# Batch 6 - CRUD món ăn/danh mục

## Mục tiêu

Hoàn thiện phần quản trị menu để Admin có thể quản lý món và danh mục ở mức dùng thử thực tế: thêm, sửa, xoá, tìm kiếm, lọc, sắp xếp và quản lý trạng thái món rõ ràng.

## Nội dung đã làm

- Giữ luồng quản lý món trong `restaurant-admin-dashboard/components/AdminMenuManagementScreen.tsx`.
- Danh sách món có tìm kiếm theo tên, mô tả, mã món, mã danh mục và tên danh mục.
- Danh sách món có lọc theo danh mục và trạng thái.
- Danh sách món có sắp xếp theo mới nhất, tên A-Z, giá thấp-cao, giá cao-thấp và trạng thái.
- Thêm thống kê nhanh số món theo trạng thái `SELLING`, `OUT_OF_STOCK`, `HIDDEN` để Admin nhìn được tình trạng menu trước khi lọc.
- Xoá món luôn có confirm trước khi xoá.
- Xoá danh mục luôn có confirm, kể cả danh mục đang rỗng.
- Nếu xoá danh mục đang có món, món được chuyển sang danh mục thay thế để không tạo orphan item.
- Fix lỗi cú pháp ở dashboard do sót `return (` trùng, tránh build vỡ trước khi vào màn Admin.

## Quy tắc trạng thái món

- `SELLING`: hiện ở menu khách và cho đặt.
- `OUT_OF_STOCK`: vẫn hiện ở menu khách nhưng nút đặt bị disable.
- `HIDDEN`: không hiện ở menu khách.

## File liên quan

- `src/scenes/restaurant-admin-dashboard/components/AdminMenuManagementScreen.tsx`
- `src/scenes/restaurant-admin-dashboard/index.tsx`
- `src/scenes/restaurant-admin-dashboard/styles.tsx`
- `src/services/restaurantMenuStorage.ts`
- `src/services/restaurantAdminStore.ts`

## Checklist nghiệm thu

- Admin thêm món mới được.
- Admin sửa tên/giá/danh mục/mô tả/ảnh/trạng thái món được.
- Admin xoá món có confirm.
- Admin tìm kiếm/lọc/sắp xếp món được.
- `OUT_OF_STOCK` hiện với khách nhưng không cho đặt thêm.
- `HIDDEN` không xuất hiện ở menu khách.
- Admin thêm/sửa/xoá danh mục được.
- Xoá danh mục đang có món không làm crash; món được chuyển sang danh mục khác.
