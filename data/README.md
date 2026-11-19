# Dataset FoodMatch

Toàn bộ dữ liệu trong thư mục này là dữ liệu MÔ PHỎNG phục vụ đồ án, không được thu thập từ khách hàng/nhà hàng thực tế. Không dùng kết quả trên bộ này để tuyên bố độ chính xác thực tế.

| Tệp | Số dòng dữ liệu | Nội dung |
|---|---:|---|
| restaurants.csv | 20 | id, ten, dia_chi, loai; có 3 quán trà sữa |
| foods.csv | 80 | id, ten, nha_hang_id, nhom, gia (VND), cay (0/1/2), chay (0/1), image |
| users_demo.csv | 60 | id mô phỏng, tên giả, nhóm ưa thích phân cách bằng dấu `|` |
| interactions_demo.csv | 1440 | id sự kiện, user_id, food_id, quantity, unit_price (VND), ordered_at (ISO 8601 UTC) |

Seed cố định 20261117. Mỗi khách mô phỏng có 24 lượt đặt, theo một trong bốn nhóm khẩu vị. Các tương tác là lượt đặt, KHÔNG phải điểm sao. Vector CF đếm số sự kiện theo user_id và food_id; quantity không nhân vào số lượt. Bộ dữ liệu này dùng kiểm tra quy trình, có thiên lệch do quy tắc sinh dữ liệu.

Khi DB chưa có thực đơn, ứng dụng đọc restaurants.csv và foods.csv để khởi tạo. Khi DB đã có dữ liệu, mọi thay đổi của người bán được giữ trong SQLite, không bị CSV ghi đè mỗi lần chạy. Ảnh minh họa có sẵn tại dist/assets, không cần tải mạng.

`python setup_demo.py` tạo tài khoản quản trị và 20 người bán. Thêm `--history` để nạp bộ lịch sử mô phỏng. Có thể dùng `--database instance/demo.db` để tạo DB tách biệt. Chạy lặp lại không nhân đôi lịch sử hoặc đổi mật khẩu tài khoản đã có.

Tài khoản dataset có email `datasetXX@foodmatch.invalid`, mật khẩu ngẫu nhiên không công khai. Không xuất dữ liệu cá nhân hoặc password_hash của tài khoản sẵn có ra CSV.

Bản ZIP đã nạp sẵn các CSV vào DB để chạy ngay. Tài khoản cá nhân và người bán nằm trong SQLite, không xuất vào dataset.

## Ảnh và thuật toán hiện hành
foods.csv đã trỏ đến 80 ảnh riêng trong dist/assets/dishes. photo_sources.json lưu nguồn ảnh tham khảo; dish_images.json dùng chuyển ảnh stock của DB cũ một lần, không thay ảnh/tên do người bán sửa. Ảnh không xác nhận món của nhà hàng mô phỏng ngoài đời.

Ma trận User-based CF chỉ dùng phiếu hoàn tất, đếm lượt theo người/món. Cosine và trung bình có trọng số top 5 là mặc định; không tính số phần, lượt xem hoặc sao thành lượt đặt. Lịch sử mô phỏng dùng cho minh họa CF, không tính vào doanh số/đánh giá người mua thật.
