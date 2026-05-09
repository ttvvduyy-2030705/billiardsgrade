# Batch 11 - Multi-restaurant Context & Isolation

## Mục tiêu

Batch này khóa luồng Menu theo `restaurantId` để tránh hiện lẫn menu/đơn/giỏ hàng giữa nhiều nhà hàng.

Luật chính:

- Chưa có active restaurant context thì màn Menu không tải món.
- Có `restaurantId` nào thì chỉ tải danh mục, món, giỏ hàng và đơn của đúng nhà hàng đó.
- Đổi nhà hàng sẽ xoá giỏ hàng hiện tại để tránh gửi nhầm đơn.
- Local demo cũng mô phỏng cách tách dữ liệu theo `restaurantId`, không chờ tới server.

## Thay đổi chính

### Customer Menu

- Thêm màn chọn context khi chưa có nhà hàng active:
  - Nhập mã nhà hàng / mã bàn / QR token.
  - Chọn nhà hàng đã có trong máy.
  - Dùng nhà hàng demo local.
- Header Menu luôn hiển thị nhà hàng hiện tại và số bàn nếu có.
- Có nút Đổi nhà hàng, kèm cảnh báo xoá giỏ.

### Store

- `RestaurantMenuStore` có thêm:
  - `activeContext`
  - `contextStatus`
  - `refreshActiveContext`
  - `activateRestaurantContext`
  - `clearRestaurantContext`
- Khi context đổi, store reset menu data và request id để tránh request cũ ghi đè dữ liệu mới.

### Local repository/storage

- Local categories/items/orders/cart được scope theo `restaurantId` bằng key dạng:
  - `menu_categories:<restaurantId>`
  - `menu_items:<restaurantId>`
  - `restaurant_orders:<restaurantId>`
  - `current_cart:<restaurantId>`
- Dữ liệu legacy không có `restaurantId` chỉ được xem là dữ liệu của `local_demo_restaurant`.
- Dữ liệu nhà hàng khác không lấy nhầm legacy/global.

### Cart

- Cart screen riêng cũng kiểm tra active restaurant context.
- Nếu chưa có context, cart không cho gửi đơn và yêu cầu quay lại Menu để chọn/quét nhà hàng.

## Tiêu chí nghiệm thu

- Mở Menu lần đầu mà chưa chọn nhà hàng: không hiện món.
- Chọn nhà hàng demo local: menu mới hiện.
- Đổi nhà hàng: app hỏi xác nhận và xoá giỏ.
- Dữ liệu món/danh mục/đơn/giỏ local được tách theo `restaurantId`.
- Không có API/repository call global kiểu load menu mà không có restaurant context ở customer flow.

## Ghi chú

Batch 14 sẽ nối QR camera thật. Batch 11 chỉ làm phần context resolver nền bằng nhập token/mã và local workspace list.
