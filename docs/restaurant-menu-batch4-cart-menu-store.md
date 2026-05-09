# Batch 4 - Cart/Menu Store

## Mục tiêu

Đưa state giỏ hàng và menu ra khỏi màn hình UI để tránh lỗi remount, reload màn, hot reload và nhập thông tin bị mất. Màn hình chỉ còn điều phối hiển thị; store chịu trách nhiệm giữ dữ liệu, hydrate, persist, loading và submit.

## Phạm vi đã xử lý

- `src/stores/RestaurantCartStore.ts`
- `src/stores/RestaurantMenuStore.ts`
- `src/scenes/restaurant-menu/index.tsx`
- `src/scenes/restaurant-cart/index.tsx`

## Thay đổi chính

### RestaurantCartStore

- Quản lý tập trung:
  - `cart.items`
  - `cart.tableNumber`
  - `cart.note`
  - `cartModalVisible`
  - `cartSubmitting`
  - `cartHydrated`
- `changeQuantity` tự cập nhật store và tự persist cart.
- `commitCartFields` lưu số bàn/ghi chú vào store và persist ngay.
- `submitCurrentCartOrder` xử lý validate, chống gửi trùng, tạo order, clear cart sau khi gửi thành công.
- Store giữ `menuItemSnapshot` để cart vẫn resolve được món sau khi màn menu render lại.
- Có `resetRestaurantCartStore` để dùng cho logout/chuyển nhà hàng ở các batch multi-restaurant sau.

### RestaurantMenuStore

- Chuyển từ state cục bộ trong hook sang store có snapshot/listener.
- Quản lý tập trung:
  - `categories`
  - `items`
  - `selectedCategoryId`
  - `loading`
  - `hydrated`
  - `errorMessage`
- `refreshMenuData` có request id để tránh request cũ ghi đè request mới.
- Có `resetRestaurantMenuStore` để dùng khi đổi nhà hàng hoặc logout.

### restaurant-menu / restaurant-cart

- Không còn tự gọi `createRestaurantOrder` trực tiếp trong màn.
- Không còn tự quản lý loading submit riêng trong màn.
- Không còn phụ thuộc màn để persist cart sau khi tăng/giảm món.
- Màn gọi store:
  - `commitCartFields`
  - `changeQuantity`
  - `submitCurrentCartOrder`

## Tiêu chí nghiệm thu

- Thêm/tăng/giảm/xoá món vẫn giữ sau khi mở lại menu.
- Nhập số bàn/ghi chú lưu vào store ngay, không phụ thuộc remount màn.
- Gửi đơn thành công thì cart clear.
- Bấm gửi liên tục không tạo nhiều đơn vì store quản lý `cartSubmitting`.
- Màn menu và màn cart dùng chung một nguồn state giỏ hàng.
- Không còn các biến session global trong `restaurant-menu` như `cartVisibleSession`, `cartSession`, `cartMutationVersion`, `cartHydrateRequestId`, `cartInputFocusedSession`.
