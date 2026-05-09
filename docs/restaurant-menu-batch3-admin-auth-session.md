# Batch 3 - Admin Auth/Session

## Mục tiêu

Batch 3 tách nền đăng nhập quản trị thành service rõ ràng, dashboard có session guard và logout xoá sạch phiên quản trị. Màn khách chỉ điều hướng sang khu admin; quyền admin do `restaurantAdminAuthService` kiểm soát.

## Thay đổi chính

- `src/services/restaurantAdminAuthService.ts`
  - Chuẩn hoá `RestaurantAdminSession` với `version`, `userId`, `username`, `role`, `provider`, `token`, `signedInAt`, `expiresAt` và restaurant context hiện tại.
  - Export `isRestaurantAdminSessionValid` để dùng lại khi guard route hoặc khi chuyển sang API/backend.
  - `getRestaurantAdminSession()` tự xoá session hỏng/hết hạn.
  - `loginRestaurantAdmin()` tạo session hợp lệ sau khi verify tài khoản local.
  - `registerRestaurantAdminAccount()` giữ register local cho giai đoạn chưa có backend nhưng UI không lộ tài khoản test.
  - Export thêm object `RestaurantAdminAuthService` với các hàm `login`, `registerDemo/registerLocal`, `getSession`, `clearSession`, `refreshSession`, `isSessionValid`.

- `src/scenes/restaurant-admin-login/index.tsx`
  - Bỏ dòng test/demo hint ở UI chính.
  - Nếu màn login mở khi đã có session hợp lệ thì chuyển thẳng sang dashboard.
  - Đăng ký/đăng nhập dùng service auth, không xử lý trực tiếp trong UI.

- `src/scenes/restaurant-admin-dashboard/index.tsx`
  - Guard session khi mount bằng `getRestaurantAdminSession()`.
  - Nếu không có session/hết hạn thì reset dữ liệu nhạy cảm và chuyển về login.
  - Refresh dashboard cũng kiểm tra lại session trước khi load dữ liệu.
  - Logout xoá session, reset orders/menu/categories/filter/tab/username và chuyển về login.

## Tiêu chí nghiệm thu

- Không đăng nhập thì không vào được dashboard bằng route thông thường.
- Session hết hạn hoặc lỗi parse thì bị xoá và quay về login.
- Logout xong dashboard không giữ orders/menu/categories cũ trong state.
- Không còn hint tài khoản test hoặc mật khẩu demo trên màn login.
- Code auth nằm trong service riêng, sẵn sàng đổi sang backend/API token sau này.
