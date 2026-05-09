# Batch 11 - Multi-restaurant context/isolation

## Mục tiêu đã xử lý

Batch 11 khóa ngữ cảnh nhiều nhà hàng/chi nhánh để tránh lẫn dữ liệu menu, đơn, bàn và cache khi admin chuyển workspace.

## File chính đã sửa/thêm

- `src/stores/RestaurantContextStore.ts` - store ngữ cảnh nhà hàng/chi nhánh mới.
- `src/scenes/restaurant-admin-dashboard/index.tsx` - gắn selector nhà hàng/chi nhánh vào Admin Dashboard.
- `src/scenes/restaurant-admin-dashboard/styles.tsx` - style panel context/isolation.
- `src/scenes/restaurant-menu/index.tsx` - menu khách hiển thị đúng restaurant/branch/table context.
- `src/repositories/LocalRestaurantMenuRepository.ts` - lọc đơn theo branch context, gắn context vào cart/order.
- `src/repositories/ApiRestaurantMenuRepository.ts` - sửa lỗi syntax, thêm query/filter branchId cho orders.
- `src/services/restaurantWorkspaceStorage.ts` - validate active restaurant/branch/table context, tự clear context không hợp lệ.
- `src/services/restaurantAdminAuthService.ts` - session lưu restaurantIds/activeRestaurantId và sync khi đổi nhà hàng.
- `src/services/restaurantMenuStorage.ts` - auth local trả metadata quyền/restaurantIds để Batch 11 có thể switch context.
- `src/services/restaurantMenuRepository.ts` - export thêm reset/active context helpers.

## Đầu ra Batch 11

- Có `RestaurantContextStore` quản lý:
  - active `restaurantId`
  - active `branchId`
  - active table context nếu có
  - danh sách nhà hàng được phép truy cập
  - danh sách chi nhánh/bàn theo nhà hàng hiện tại
  - trạng thái loading/error/permission message

- Admin Dashboard có panel “Ngữ cảnh vận hành”:
  - chọn/chuyển nhà hàng
  - chọn/chuyển chi nhánh
  - hiển thị trạng thái “Đã cô lập dữ liệu”
  - báo lỗi nếu tài khoản chưa có quyền hoặc context không hợp lệ

- Khi đổi nhà hàng/chi nhánh:
  - reset `RestaurantMenuStore`
  - reset `RestaurantCartStore`
  - clear cart cũ để không lộ dữ liệu bàn/chi nhánh trước
  - reload lại menu/orders theo context mới
  - session admin sync lại `activeRestaurantId/activeRestaurantName`

- Repository đã tự động scope:
  - menu/category/item theo `restaurantId`
  - order theo `restaurantId` và filter theo `branchId` nếu đang chọn chi nhánh
  - cart/order create gắn `restaurantId`, `branchId`, `tableId`
  - API orders gọi `/restaurants/:restaurantId/orders?branchId=:branchId` khi có branch context

- Active context được validate:
  - branch không thuộc restaurant hiện tại sẽ không được giữ lại
  - table không thuộc restaurant/branch hiện tại sẽ bị loại khỏi context
  - khi restaurant đổi, branch/table context cũ không bị giữ sai

## Kiểm tra nội bộ đã chạy

- Parse TypeScript/TSX các file đã sửa bằng TypeScript compiler API: OK.
- Type-check giới hạn các file đã sửa, bỏ qua lỗi môi trường do thiếu node_modules/types React Native: OK.
- Grep kiểm tra lỗi duplicate cũ:
  - không còn duplicate `onSubmit` trong cart overlay
  - không còn duplicate `throw new RestaurantMenuApiError`
  - không còn duplicate `deleteAdminMenuItem`
  - không còn duplicate `scopedRestaurantId`

## Checklist nghiệm thu thủ công đề xuất

1. Login admin.
2. Vào dashboard, kiểm tra panel “Ngữ cảnh vận hành” hiển thị nhà hàng và chi nhánh hiện tại.
3. Tạo hoặc có sẵn ít nhất 2 nhà hàng local.
4. Chuyển nhà hàng A/B, kiểm tra menu/orders không lẫn dữ liệu.
5. Chuyển chi nhánh, kiểm tra đơn hàng lọc theo chi nhánh.
6. Logout rồi login lại, kiểm tra admin không còn thấy dữ liệu cache cũ trước khi load context mới.
7. Mở menu khách, kiểm tra header hiển thị đúng tên nhà hàng/chi nhánh/bàn.
