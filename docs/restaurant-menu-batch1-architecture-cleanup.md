# Restaurant Menu Batch 1 - Architecture Cleanup

## Mục tiêu

Batch 1 chốt lại một luồng Admin duy nhất cho module Restaurant Menu:

- `restaurant-menu` chỉ còn vai trò màn khách gọi món.
- Admin đăng nhập/đăng ký chỉ nằm trong `restaurant-admin-login`.
- Admin quản trị đơn, món và danh mục chỉ nằm trong `restaurant-admin-dashboard`.
- Nút Admin ở màn Menu chỉ làm nhiệm vụ route guard: có session thì vào Dashboard, chưa có session thì vào Login.

## Quy tắc kiến trúc sau Batch 1

### Customer menu

`src/scenes/restaurant-menu/index.tsx` chỉ được chứa:

- danh mục món;
- danh sách món;
- giỏ hàng;
- nhập số bàn/ghi chú;
- gửi đơn;
- nút mở khu Admin qua route guard.

File này không được chứa các mode Admin cũ như:

- `adminLogin`;
- `adminRegister`;
- `admin`;
- `renderAuthCard`;
- `renderAdminTabs`;
- `renderAdminMenu`;
- `renderAdminCategories`;
- `renderAdminOrders`.

### Admin login

`src/scenes/restaurant-admin-login/index.tsx` là nơi duy nhất xử lý form đăng nhập/đăng ký Admin local/API sau này.

### Admin dashboard

`src/scenes/restaurant-admin-dashboard/index.tsx` là nơi duy nhất xử lý quản trị:

- đơn hàng;
- món ăn;
- danh mục;
- trạng thái đơn/thanh toán;
- logout và session guard.

## Thay đổi chính

- Màn Menu không còn hiển thị 2 nút `Đăng nhập Admin` và `Đăng ký Admin` trực tiếp.
- Thay bằng một nút `Quản trị nhà hàng`.
- Khi bấm nút này:
  - nếu có Admin session hợp lệ, điều hướng sang `restaurantAdminDashboard`;
  - nếu chưa có session hoặc session hết hạn, điều hướng sang `restaurantAdminLogin`.

## Tiêu chí nghiệm thu

- Mở màn Menu chỉ thấy luồng khách: danh mục, danh sách món, giỏ hàng.
- Không có UI admin cũ nằm trong `restaurant-menu`.
- Admin chỉ đi qua route mới `restaurant-admin-login` hoặc `restaurant-admin-dashboard`.
- Nếu đã login Admin, bấm `Quản trị nhà hàng` đi thẳng vào Dashboard.
- Nếu chưa login Admin, bấm `Quản trị nhà hàng` đi tới màn đăng nhập.
