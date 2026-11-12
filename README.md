# FoodMatch

> **FoodMatch – Hôm nay ăn gì?** Ứng dụng web hỗ trợ khám phá món ăn và gợi ý món phù hợp dựa trên khẩu vị, bộ lọc cá nhân và lịch sử đặt món.

## Giới thiệu

FoodMatch là ứng dụng web được xây dựng bằng **Python Flask**. Người dùng có thể tạo tài khoản, khám phá thực đơn, lưu món yêu thích, thiết lập khẩu vị và nhận gợi ý món ăn được cá nhân hóa. Dữ liệu tài khoản và hoạt động được lưu bằng **SQLite**.

Dự án hiện có danh mục dữ liệu mẫu gồm **20 nhà hàng và 80 món ăn**. Đây là dữ liệu minh họa được khai báo trong mã nguồn, không phải danh sách nhà hàng đang xác nhận nhận đơn thực tế.

## Chức năng chính

- **Tài khoản:** đăng ký, đăng nhập và đăng xuất.
- **Khám phá thực đơn:** xem danh sách nhà hàng và món ăn từ danh mục có sẵn.
- **Cá nhân hóa khẩu vị:** thiết lập nhóm món yêu thích, chế độ ăn, mức độ cay và khoảng giá.
- **Gợi ý món ăn:** kết hợp lọc cộng tác theo người dùng, lịch sử đặt món, mức độ phổ biến và tùy chọn khẩu vị.
- **Món yêu thích:** thêm hoặc bỏ món khỏi danh sách yêu thích.
- **Đặt món mô phỏng:** lưu các món đã chọn và thông tin đơn vào cơ sở dữ liệu.
- **Lịch sử:** xem lịch sử đặt món và xuất dữ liệu lịch sử ra tệp CSV.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Python, Flask |
| Frontend | HTML, CSS, JavaScript |
| Cơ sở dữ liệu | SQLite |
| Gợi ý món ăn | Collaborative Filtering (Cosine Similarity), kết hợp lịch sử và bộ lọc khẩu vị |
| Kiểm thử | Python `unittest` |

## Cấu trúc dự án

```text
FoodMatchFlask/
├── app.py                  # Khởi tạo Flask và định nghĩa các API
├── catalog.py              # Danh mục nhà hàng, món ăn và bộ lọc khẩu vị
├── database.py             # Tạo và thao tác với cơ sở dữ liệu SQLite
├── recommender.py          # Thuật toán gợi ý món ăn
├── requirements.txt        # Các thư viện Python cần cài đặt
├── HUONG_DAN.md            # Hướng dẫn chạy nhanh
├── dist/                   # Giao diện frontend đã build
│   ├── index.html
│   ├── styles.css
│   ├── account.css
│   ├── app.js
│   ├── data.js
│   ├── engine.js
│   └── assets/              # Hình ảnh, font và tài nguyên giao diện
├── instance/                # Dữ liệu và khóa bí mật được tạo khi chạy
└── tests/                   # Các bài kiểm thử
```

> **Lưu ý:** `dist/` phải nằm trực tiếp trong thư mục gốc, cùng cấp với `app.py`. Flask đọc giao diện từ `dist/index.html`; không đặt thành `dist-.../dist/` hoặc lồng thêm một cấp thư mục.

## Yêu cầu

- Python **3.10 trở lên**.
- Trình duyệt web hiện đại như Google Chrome hoặc Microsoft Edge.
- Không cần cài Node.js để chạy phiên bản frontend đã có sẵn trong `dist/`.

## Cài đặt và chạy trên Windows

Mở Terminal hoặc Command Prompt tại thư mục dự án:

```bat
cd FoodMatchFlask
```

### 1. (Khuyến nghị) Tạo môi trường ảo

```bat
python -m venv .venv
.venv\Scripts\activate
```

### 2. Cài đặt thư viện

```bat
python -m pip install -r requirements.txt
```

### 3. Khởi chạy ứng dụng

```bat
python app.py
```

Khi Terminal hiển thị địa chỉ máy chủ, mở trình duyệt tại:

**http://127.0.0.1:5000**

Ở lần truy cập đầu tiên, người dùng có thể tự đăng ký tài khoản để sử dụng ứng dụng.

Để dừng máy chủ, quay lại Terminal và nhấn `Ctrl + C`.

## Cơ sở dữ liệu

FoodMatch sử dụng SQLite. Khi ứng dụng khởi tạo, dữ liệu được lưu trong thư mục `instance/`, với tệp cơ sở dữ liệu mặc định là:

```text
instance/foodmatch_v2.db
```

Khóa dùng cho phiên đăng nhập được tạo tại `instance/secret.key` nếu chưa tồn tại. Không chia sẻ hoặc đưa khóa bí mật, cơ sở dữ liệu chứa thông tin tài khoản hay dữ liệu cá nhân lên kho mã nguồn công khai.

Nếu muốn làm mới dữ liệu trong quá trình phát triển, hãy sao lưu trước các tệp trong `instance/`. Xóa cơ sở dữ liệu có thể làm mất tài khoản, tùy chọn, món yêu thích và lịch sử đã lưu.

## API chính

| Phương thức | Đường dẫn | Chức năng |
|---|---|---|
| `GET` | `/api/session` | Lấy trạng thái phiên hiện tại |
| `POST` | `/api/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | Đăng nhập |
| `POST` | `/api/auth/logout` | Đăng xuất |
| `GET` | `/api/catalog` | Lấy danh mục nhà hàng và món ăn |
| `GET` | `/api/state` | Lấy dữ liệu cá nhân của tài khoản đang đăng nhập |
| `PUT` | `/api/me/preferences` | Cập nhật tùy chọn khẩu vị |
| `GET` | `/api/me/dashboard` | Lấy gợi ý, lịch sử và dữ liệu tổng quan |
| `POST` | `/api/me/favourites` | Thêm hoặc bỏ món yêu thích |
| `POST` | `/api/me/orders` | Lưu đơn đặt món mô phỏng |
| `GET` | `/api/me/history.csv` | Xuất lịch sử đặt món dạng CSV |

Các API thay đổi dữ liệu sử dụng CSRF token; những API thuộc `/api/me/` yêu cầu người dùng đăng nhập.

## Thuật toán gợi ý

FoodMatch sử dụng **lọc cộng tác theo người dùng (User-based Collaborative Filtering)**. Mức độ tương đồng giữa hai người dùng được tính bằng **Cosine Similarity** trên vector số lượt đặt món. Từ những người dùng có lịch sử tương tự, hệ thống xếp hạng các món mà tài khoản hiện tại chưa đặt.

Khi dữ liệu lịch sử còn ít hoặc chưa có người dùng tương đồng, hệ thống kết hợp các tín hiệu khác như nhóm món đã đặt, nhà hàng thường chọn, món phổ biến và tùy chọn khẩu vị. Các bộ lọc về giá, chế độ ăn và độ cay vẫn được áp dụng khi tạo danh sách gợi ý.

## Chạy kiểm thử

Tại thư mục gốc của dự án, chạy:

```bat
python -m unittest discover -s tests -v
```

Các bài kiểm thử nằm trong `tests/`, bao gồm kiểm tra thuật toán gợi ý, bộ lọc khẩu vị, dữ liệu danh mục và các chức năng ứng dụng.

## Một số lỗi thường gặp

**1. `FileNotFoundError: ... dist\index.html`**

Kiểm tra cấu trúc thư mục. Đường dẫn đúng phải là:

```text
FoodMatchFlask\dist\index.html
```

Nếu giải nén dự án tạo ra thư mục dạng `dist-...\dist\index.html`, hãy di chuyển thư mục `dist` ra thư mục gốc, cùng cấp với `app.py`.

**2. `ModuleNotFoundError` khi chạy ứng dụng**

Kích hoạt đúng môi trường Python (nếu đang dùng môi trường ảo), sau đó chạy lại:

```bat
python -m pip install -r requirements.txt
```

**3. Không truy cập được trang web**

Đảm bảo Terminal vẫn đang chạy `python app.py` và truy cập đúng địa chỉ `http://127.0.0.1:5000` trên cùng máy tính.

## Phạm vi và lưu ý

- Danh mục nhà hàng và món ăn hiện là dữ liệu mẫu phục vụ minh họa và kiểm thử.
- Chức năng đặt món hiện lưu **đơn mô phỏng** trong SQLite; dự án không tích hợp thanh toán trực tuyến hoặc xác nhận đơn với nhà hàng.
- Flask được chạy bằng máy chủ phát triển để phục vụ học tập và thử nghiệm cục bộ. Nếu triển khai công khai, cần cấu hình máy chủ WSGI, HTTPS, biến môi trường và các biện pháp bảo vệ phù hợp.

---

**FoodMatch** – Khám phá món ăn phù hợp với khẩu vị của bạn.
