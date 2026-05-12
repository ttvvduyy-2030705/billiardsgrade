# ScoreMenu Batch 2 - QR Scanner Layout Fix v17

## Mục tiêu

Sửa lỗi panel bên phải của màn QR Scanner bị tràn/che mất phần "Nhập QR token" trên màn ngang thấp hoặc khi Android phóng font.

## Thay đổi

- Bọc khu vực bên phải bằng `ScrollView` để nội dung có thể cuộn khi chiều cao màn hình không đủ.
- Thêm `rightRailMaxHeight` theo chiều cao thiết bị.
- Thêm layout compact cho màn ngang thấp.
- Giảm padding/font size nhẹ ở panel phải khi `height < 520`.
- Tắt font scaling cục bộ trên các `Text` của màn QR Scanner.
- Tắt font scaling cho `TextInput` nhập QR token.

## Tiêu chí nghiệm thu

1. Vào Menu từ Home.
2. Màn QR Scanner hiển thị đủ 3 vùng: logo trái, camera giữa, thao tác phải.
3. Bên phải thấy được nút Đăng nhập Admin, QR demo và Nhập QR token.
4. Nếu màn nhỏ hoặc font Android lớn, khu vực bên phải có thể cuộn được, không bị che mất.
5. Bấm Demo Haidilao/Demo APlus vẫn mở menu đúng quán.
