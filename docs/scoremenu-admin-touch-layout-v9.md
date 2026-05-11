# ScoreMenu v9 - Sửa lỗi Admin bấm không hoạt động

## Vấn đề
Màn Admin có các lớp trang trí `glowTop/glowBottom` dạng absolute và layout tab/sidebar phụ thuộc nhiều vào chế độ rộng màn hình. Trên một số thiết bị Android/tablet/landscape, vùng trang trí hoặc vùng layout có thể phủ lên phần nội dung, làm các nút/tab bên dưới khó bấm hoặc nhìn như không hoạt động.

## Đã sửa
- Gắn `pointerEvents="none"` cho các lớp trang trí nền để không chặn thao tác chạm.
- Đặt `zIndex` rõ cho header/body và glow background.
- Chuyển điều hướng admin thành tab bar ngang luôn hiển thị ngay dưới header thay vì sidebar phụ thuộc width.
- Tăng vùng bấm cho tab bằng `hitSlop` và thêm Android ripple.

## File sửa
- `src/scenes/restaurant-admin-dashboard/index.tsx`
- `src/scenes/restaurant-admin-dashboard/styles.tsx`
- `src/scenes/restaurant-admin-dashboard/components/AdminSidebar.tsx`
