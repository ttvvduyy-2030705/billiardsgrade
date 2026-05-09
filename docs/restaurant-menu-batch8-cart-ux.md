# Batch 8 - UX giỏ hàng

## Mục tiêu

Hoàn thiện trải nghiệm giỏ hàng để khách nhập thông tin bàn/ghi chú ổn định, gửi đơn có khóa loading chống gửi trùng, lỗi hiển thị rõ và không còn thông báo hard-code theo tên món cụ thể.

## Phạm vi đã xử lý

- Chuẩn hóa validate số bàn trong `RestaurantCartStore`.
- Số bàn cho phép các dạng thực tế như `Bàn 08`, `VIP1`, `A12`, `#12`, `Tầng 2 / Bàn 5`, nhưng chặn ký tự nguy hiểm và giới hạn độ dài.
- Android dùng native input dialog cho cả cart modal trong Menu và màn `restaurant-cart`, tránh lỗi TextInput mất focus khi keyboard bật.
- Ghi chú hỗ trợ multiline qua native dialog Android và TextInput multiline trên iOS.
- Submit order được khóa bằng `cartSubmitting`, tránh gửi trùng đơn.
- Khi submit, các nút tăng/giảm món và input bàn/ghi chú bị khóa tạm thời.
- Cart rỗng hiển thị lỗi chung: `Giỏ hàng đang trống. Vui lòng chọn món trước khi gửi đơn.`
- Nếu món đã hết hàng, bị ẩn hoặc không còn tồn tại trong menu, submit bị chặn và báo lỗi chung, không hard-code món cụ thể.
- Thông báo thành công hiển thị mã đơn rút gọn nếu có.
- Màn `restaurant-cart` độc lập giữ thông báo thành công trên màn thay vì back ngay lập tức khiến người dùng không kịp thấy.

## Tiêu chí nghiệm thu

- Nhập số bàn/ghi chú trên Android không flicker, không mất focus.
- Bấm gửi liên tục không tạo nhiều đơn trùng.
- Không có số bàn thì báo lỗi dưới ô số bàn.
- Số bàn chứa ký tự không hợp lệ thì báo lỗi dưới ô số bàn.
- Giỏ rỗng báo lỗi chung, không nhắc tên món cụ thể.
- Món hết hàng/ẩn/mất khỏi menu trong lúc còn trong giỏ sẽ bị chặn khi gửi đơn.
- Gửi đơn thành công đóng modal Menu và hiện thông báo có mã đơn nếu server/local tạo được id.
