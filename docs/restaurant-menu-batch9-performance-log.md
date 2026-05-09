# Batch 9 - Performance/log

## Mục tiêu

Dọn log trong production path và tối ưu lại các điểm render nóng của module Restaurant Menu/Admin để danh sách món nhiều item vẫn mượt hơn.

## Thay đổi chính

- Thêm `src/utils/devLogger.ts` để gom log debug về một nơi, chỉ ghi log ở dev build.
- Thay các `console.warn` trong luồng Menu/Admin/ảnh/cart/storage bằng `devWarn` để production logcat sạch hơn.
- Giữ user-facing error message trên UI; chỉ bỏ log spam/debug khỏi production path.
- Memo hoá bước resolve ảnh trong `MenuDishImage` và `AdminMenuImage` để không resolve lại source ảnh nếu `imageValue/cacheKey/failed` không đổi.
- Giữ `FlatList` ở customer menu với key ổn định `item.id`, `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews`.
- Sửa lại đoạn `RestaurantDishCard` memo comparator để file parse ổn định sau các batch trước.

## Tiêu chí nghiệm thu

- Cuộn menu khách không spam log ảnh/món/cart trong production path.
- Ảnh lỗi vẫn fallback bình thường, nhưng log chỉ hiện khi dev build.
- Danh sách món khách vẫn dùng list ảo hoá, không render toàn bộ bằng `ScrollView.map`.
- Tăng/giảm số lượng vẫn chỉ cập nhật quantity hiển thị, không phá cart/input.
- Admin vẫn thấy lỗi bằng text UI nếu lưu/xoá/chọn ảnh lỗi, nhưng log debug không spam release build.

## Ghi chú

Batch này không đổi nghiệp vụ menu, cart, admin auth, order/payment hay xử lý ảnh đã chuẩn hoá ở Batch 7-8.
