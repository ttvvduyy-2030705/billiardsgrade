# ScoreMenu Admin Logout Reset v12

## Mục tiêu
Sửa lỗi sau khi đăng xuất khỏi Admin thì màn đăng nhập bị giật/đơ hoặc tự điều hướng lại không ổn định.

## Nguyên nhân chính
- Admin đã tách thành nhiều trang riêng nên stack có thể còn các trang Admin phía sau.
- Logout trước đó dùng `replace` nên chỉ thay màn hiện tại, chưa xóa sạch stack Admin.
- Màn Login có cơ chế tự kiểm tra session cũ; khi vừa logout, cơ chế này có thể chạy cùng lúc với việc xóa session/đổi route.
- Hàm `reset` trong HOC đang gọi sai signature của React Navigation.

## Thay đổi
- Logout dùng `navigation.reset` để đưa stack về duy nhất màn Login.
- Route Login nhận `skipAutoSessionCheck` sau logout để không tự hydrate session cũ ngay lập tức.
- Thêm `loggingOutRef` để chặn polling/loadData/session check chạy tiếp sau khi bấm Đăng xuất.
- Sửa wrapper `reset` sang đúng dạng `navigation.reset({ index, routes })`.

## Test nhanh
1. Login Admin.
2. Mở Đơn hàng / Quản lý món / Bàn QR.
3. Bấm Đăng xuất từ bất kỳ trang nào.
4. App phải về màn đăng nhập, không tự nhảy lại dashboard, không giật/đơ.
5. Bấm tài khoản demo `admin / admin123`, đăng nhập lại bình thường.
