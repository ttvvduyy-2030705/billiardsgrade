# Batch 7 - Chuẩn hoá ảnh local cho Menu

## Mục tiêu

Đưa toàn bộ xử lý ảnh món về một service duy nhất để Admin lưu ảnh thế nào thì Menu khách đọc đúng như vậy. Ảnh món mới dùng `imageUrl` làm field chuẩn, còn `imageUri` và các field legacy chỉ được đọc như fallback trong migration.

## File chính

- `src/services/restaurantMenuImage.ts`
- `src/services/restaurantMenuStorage.ts`
- `src/scenes/restaurant-admin-dashboard/components/AdminMenuManagementScreen.tsx`
- `src/scenes/restaurant-menu/index.tsx`

## Nguyên tắc sau Batch 7

1. `imageUrl` là nguồn dữ liệu ảnh duy nhất cho món mới.
2. Legacy `imageUri`, `image`, `thumbnail`, `photo`, `localUri`, `uri` chỉ được đọc qua `getMenuItemImageValue`.
3. Admin và Menu khách đều render ảnh qua `resolveRestaurantMenuImage` / `getRestaurantMenuImageSource`.
4. Ảnh local được cố gắng copy vào thư mục app quản lý: `DocumentDirectoryPath/restaurant-menu-images`.
5. Nếu picker trả `base64`, service ưu tiên ghi base64 thành file riêng để tránh mất quyền `content://` sau restart.
6. Nếu copy ảnh thất bại, service giữ URI gốc để không chặn admin lưu món; UI sẽ fallback logo nếu ảnh lỗi.
7. Khi đổi ảnh hoặc xoá món, ảnh managed cũ được dọn nếu không còn món nào dùng.

## Nghiệm thu

- Admin chọn ảnh từ máy, preview hiện ngay.
- Lưu món xong, menu khách hiển thị đúng ảnh vừa chọn.
- Restart app, ảnh đã persist vẫn hiển thị nếu file copy thành công.
- Ảnh lỗi/mất quyền không làm vỡ layout, tự fallback về logo nhỏ.
- Không còn logic tự normalize ảnh riêng trong màn admin/menu; màn chỉ gọi service ảnh chung.
