# Chạy FoodMatch

Giải nén, mở Terminal tại thư mục có app.py:

```bash
python -m pip install -r requirements.txt
python app.py
```

Trang khách: http://127.0.0.1:5000

Trang người bán: http://127.0.0.1:5000/merchant

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | admin@foodmatch.local | FoodMatch@123 |
| Chủ Cơm Nhà 88 | seller01@foodmatch.local | FoodMatch@123 |

Tài khoản cũ giữ mật khẩu cũ. Có đủ seller01 đến seller20. Dùng cửa sổ ẩn danh cho người bán, cửa sổ thường cho khách.

## Cập nhật mà giữ tài khoản/đơn

Dừng server, sao lưu instance và dist/assets/uploads nếu có. Chép gộp các file .py ở gốc, requirements.txt, thư mục dist và data vào dự án cũ. Giữ nguyên instance/foodmatch_v2.db trên máy bạn; không chép DB mẫu đè lên. Không xóa uploads cũ. Cài lại requirements, chạy app.py rồi Ctrl+F5.

## Thử chức năng mới

1. Khách đặt món tại Cơm Nhà 88; người bán xác nhận → chuẩn bị → sẵn sàng. Khách vào Lịch sử, bấm Xem đơn hoặc Đã nhận món để hoàn tất.
2. Khách vào lịch sử/chi tiết món, chấm sao và viết nhận xét.
3. Người bán vào Đánh giá khách hàng, trả lời nhận xét. Khách mở lại món để thấy phản hồi.
4. Người bán vào Thực đơn → Sửa món → tải ảnh món thực tế (JPEG/PNG/WebP, tối đa 5 MB).
5. Khám phá có phần Người cùng gu khi đủ lịch sử trùng với người khác. Giữ thứ tự điểm User-based CF; không lấy lượt xem/nhóm món cộng vào điểm CF. Nếu chưa đủ dữ liệu sẽ ghi rõ là dự phòng theo khẩu vị.

80 món đã có ảnh tham khảo riêng, chạy offline. 20 quán, 60 người và 1.440 lượt lịch sử mẫu là dữ liệu mô phỏng để minh họa, không phải đơn ngoài đời. Không tạo sao hay bình luận giả.

## Thuật toán

Dùng số đơn hoàn tất theo người/món → Cosine → top 5 người tương đồng → trung bình có trọng số → xếp điểm giảm dần. Xem món, thêm giỏ, đơn chờ/hủy không tăng lượt CF. Món tương tự khi bấm xem là gợi ý nội dung riêng.

Đã tối ưu bằng chỉ mục thưa, chuẩn vector tính sẵn và cache tự cập nhật khi đơn thay đổi. Bản log1p/shrinkage chỉ giữ trong công cụ thử nghiệm, không bật mặc định vì chưa vượt Cosine gốc trên tập kiểm tra.

Chi tiết công thức, kiểm thử và kết quả đo trong README.md và BAO_CAO_KIEM_TRA.md.


## Nếu chưa đánh giá được

Chỉ có đơn chờ thì chưa đánh giá được. Lịch sử giờ có nút Xem đơn và Xem món/đánh giá cho từng món. Khi quán chuẩn bị xong sẽ hiện Đã nhận món; khách xác nhận rồi nút Viết / xem đánh giá mở form sao/nhận xét. Không thể tự hoàn tất đơn còn chờ quán xác nhận.

Để thử nhanh, dùng cửa sổ ẩn danh đăng nhập /merchant bằng admin@foodmatch.local, mật khẩu FoodMatch@123. Chọn đúng nhà hàng, xác nhận và chuẩn bị đơn tới Sẵn sàng giao. Sau đó khách xác nhận Đã nhận món trong lịch sử.

Đã sửa yêu cầu chay: chỉ chọn Món chay (có thể kèm Đồ uống) sẽ bắt buộc loại món mặn trong toàn bộ gợi ý. Chọn chip Món chay cũng áp dụng cho các vùng gợi ý phụ. Danh sách tương tự của một món chay chỉ có món chay. Xóa bộ lọc tạm không tự tắt chế độ chay trong tài khoản.

Cập nhật cần các file Python và thư mục dist/data mới; giữ nguyên instance/foodmatch_v2.db và ảnh uploads của bạn. Không chép DB mẫu đè lên DB đang sử dụng.
