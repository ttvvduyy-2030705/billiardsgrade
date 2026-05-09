# Batch 5 - Responsive Menu UI

## Mục tiêu

Đưa màn Menu khách về layout responsive rõ ràng:

- Phone/dọc: danh mục nằm ngang phía trên, danh sách món ở dưới.
- Tablet hoặc màn ngang đủ rộng: danh mục nằm bên trái, danh sách món bên phải.
- Cart bottom bar không đè nội dung cuối danh sách món.
- Cart modal vẫn là fullscreen overlay độc lập, không bị bó trong layout menu bên dưới.

## Thay đổi chính

### 1. Nhận diện layout theo cả chiều rộng và orientation

Trước đây màn Menu chủ yếu dựa vào `adaptive.width < 760`, nên một số màn ngang nhỏ vẫn bị coi như phone dọc. Batch 5 đổi sang logic:

```ts
const isMenuSidebarLayout =
  adaptive.width >= 760 ||
  (adaptive.width > adaptive.height && adaptive.width >= 640);
```

Kết quả:

- Phone dọc dùng layout stacked.
- Tablet/màn ngang đủ rộng dùng layout 2 vùng: category trái, menu phải.

### 2. Danh mục phone dọc nằm ngang phía trên

Khi `isCustomerStacked = true`, category list dùng `horizontal` và style riêng cho chip danh mục ngang.

Khi dùng sidebar layout, danh mục trở lại dạng cột trái và scroll dọc.

### 3. Tối ưu danh sách món theo kích thước màn

- Màn rộng lớn: 3 cột.
- Màn trung bình/màn ngang: 2 cột.
- Phone hẹp: 1 cột.

Danh sách vẫn dùng `FlatList`, giữ tối ưu từ Batch 9.

### 4. Chống cart bar đè item cuối

`menuGridContent.paddingBottom` giờ được tính theo chiều cao cart bar + safe area + khoảng cách đáy, thay vì dùng số nhân cố định. Item cuối có khoảng thở để không bị che bởi cart bottom bar.

### 5. Cart modal tiếp tục full-screen

Cart overlay vẫn render ngoài customer layout, dùng `absoluteFillObject` full-screen nên không bị phụ thuộc vào category/menu column.

## File đã sửa

- `src/scenes/restaurant-menu/index.tsx`
- `src/scenes/restaurant-menu/styles.tsx`

## Tiêu chí nghiệm thu

- Phone dọc: danh mục là hàng ngang phía trên, món ở dưới.
- Tablet/màn ngang: danh mục trái, món phải.
- Cuộn đến item cuối không bị cart bar che.
- Mở giỏ hàng vẫn full-screen thật sự.
- Nhập số bàn/ghi chú không bị ảnh hưởng lại bởi responsive change.
