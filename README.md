# FoodMatch

**FoodMatch – Hôm nay ăn gì?** là ứng dụng web hỗ trợ khám phá món ăn và đề xuất lựa chọn phù hợp với khẩu vị, sở thích và lịch sử đặt món của người dùng.

---

## 1. Giới thiệu

FoodMatch được xây dựng bằng **Python Flask**, hướng đến việc hỗ trợ người dùng tìm món ăn phù hợp thay vì phải lựa chọn thủ công giữa nhiều món và nhà hàng.

Ứng dụng cung cấp các chức năng quản lý tài khoản, khám phá thực đơn, thiết lập sở thích ăn uống, lưu món yêu thích, đặt món mô phỏng và xem lịch sử hoạt động. Hệ thống sử dụng **User-based Collaborative Filtering** kết hợp với các tín hiệu về sở thích và mức độ phổ biến để tạo danh sách gợi ý.

Danh mục dữ liệu mẫu hiện có:

- **20 nhà hàng**
- **80 món ăn**

> **Phạm vi dữ liệu:** Danh mục trên là dữ liệu mẫu phục vụ mục đích học tập, minh họa và kiểm thử; không đại diện cho các nhà hàng đang hoạt động hoặc xác nhận nhận đơn ngoài thực tế.

## 2. Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Tài khoản người dùng | Đăng ký, đăng nhập và đăng xuất. |
| Khám phá món ăn | Xem danh sách món ăn và nhà hàng từ danh mục dữ liệu. |
| Thiết lập khẩu vị | Chọn nhóm món yêu thích, chế độ ăn, mức độ cay và khoảng giá. |
| Gợi ý cá nhân hóa | Đề xuất món ăn dựa trên mức độ tương đồng giữa người dùng, lịch sử đặt món và sở thích. |
| Món yêu thích | Thêm hoặc xóa món khỏi danh sách yêu thích. |
| Đặt món mô phỏng | Tạo đơn và lưu thông tin đặt món vào cơ sở dữ liệu. |
| Lịch sử hoạt động | Xem lịch sử đặt món và xuất dữ liệu lịch sử sang định dạng CSV. |

## 3. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ lập trình | Python |
| Backend | Flask |
| Frontend | HTML, CSS, JavaScript |
| Cơ sở dữ liệu | SQLite |
| Thuật toán gợi ý | User-based Collaborative Filtering, Cosine Similarity |
| Kiểm thử | Python `unittest` |

## 4. Cấu trúc thư mục

```text
FoodMatchFlask/
├── app.py                  # Khởi tạo Flask và định nghĩa API
├── catalog.py              # Dữ liệu nhà hàng, món ăn và bộ lọc khẩu vị
├── database.py             # Khởi tạo và thao tác với SQLite
├── recommender.py          # Thuật toán đề xuất món ăn
├── requirements.txt        # Danh sách thư viện Python
├── HUONG_DAN.md            # Hướng dẫn sử dụng và chạy ứng dụng
├── dist/                   # Giao diện frontend
│   ├── index.html
│   ├── styles.css
│   ├── account.css
│   ├── app.js
│   ├── data.js
│   ├── engine.js
│   └── assets/             # Hình ảnh, font và tài nguyên giao diện
├── instance/               # Cơ sở dữ liệu và khóa phiên được tạo khi chạy
└── tests/                  # Các bài kiểm thử
```

**Lưu ý về cấu trúc:** Thư mục `dist/` phải nằm trực tiếp trong thư mục gốc, cùng cấp với `app.py`. Flask sử dụng giao diện tại `dist/index.html`. Không đặt `dist/` lồng thêm một cấp thư mục.

## 5. Yêu cầu hệ thống

- Python **3.10 trở lên**.
- Google Chrome, Microsoft Edge hoặc trình duyệt hiện đại tương đương.
- Không cần Node.js để chạy phiên bản frontend đã được cung cấp sẵn trong `dist/`.

## 6. Cài đặt và khởi chạy

Các bước dưới đây dành cho Windows.

### Bước 1. Mở thư mục dự án

Mở Terminal hoặc Command Prompt tại thư mục chứa dự án:

```bat
cd FoodMatchFlask
```

### Bước 2. Tạo môi trường ảo

Khuyến nghị sử dụng môi trường ảo để tách biệt các thư viện của dự án:

```bat
python -m venv .venv
.venv\Scripts\activate
```

### Bước 3. Cài đặt thư viện

```bat
python -m pip install -r requirements.txt
```

### Bước 4. Khởi chạy ứng dụng

```bat
python app.py
```

Sau khi máy chủ khởi động, mở trình duyệt và truy cập:

**http://127.0.0.1:5000**

Người dùng có thể đăng ký tài khoản mới để bắt đầu sử dụng ứng dụng.

Để dừng máy chủ, quay lại cửa sổ Terminal và nhấn `Ctrl + C`.

## 7. Thuật toán gợi ý món ăn

FoodMatch sử dụng phương pháp **User-based Collaborative Filtering** (lọc cộng tác dựa trên người dùng).

Quy trình gợi ý tổng quát:

1. **Thu thập dữ liệu tương tác:** hệ thống sử dụng lịch sử đặt món của người dùng để xây dựng hồ sơ tương tác.
2. **Biểu diễn người dùng:** mỗi người dùng được biểu diễn bằng một vector thể hiện số lượt đặt các món ăn.
3. **Tính độ tương đồng:** sử dụng **Cosine Similarity** để đo mức độ tương đồng giữa vector của người dùng hiện tại và những người dùng khác.
4. **Tìm người dùng lân cận:** lựa chọn những người dùng có lịch sử tương tác tương đồng.
5. **Tạo danh sách đề xuất:** ưu tiên các món mà nhóm người dùng tương đồng đã đặt nhưng người dùng hiện tại chưa đặt.
6. **Kết hợp bộ lọc:** áp dụng thêm các điều kiện về khẩu vị, nhóm món, chế độ ăn và khoảng giá để cải thiện mức độ phù hợp.

Khi dữ liệu tương tác chưa đủ, hệ thống có thể sử dụng thêm tín hiệu về mức độ phổ biến và sở thích đã thiết lập để hỗ trợ quá trình đề xuất.

> **Lưu ý:** Chất lượng của Collaborative Filtering phụ thuộc vào lượng dữ liệu tương tác. Khi số lượng người dùng hoặc lịch sử đặt món còn hạn chế, kết quả gợi ý có thể chưa phản ánh đầy đủ sở thích thực tế.

## 8. Các API chính

| Phương thức | Endpoint | Chức năng |
|---|---|---|
| `GET` | `/api/session` | Lấy trạng thái phiên đăng nhập hiện tại. |
| `POST` | `/api/auth/register` | Đăng ký tài khoản. |
| `POST` | `/api/auth/login` | Đăng nhập. |
| `POST` | `/api/auth/logout` | Đăng xuất. |
| `GET` | `/api/catalog` | Lấy danh mục nhà hàng và món ăn. |
| `GET` | `/api/state` | Lấy dữ liệu cá nhân của người dùng đang đăng nhập. |
| `PUT` | `/api/me/preferences` | Cập nhật tùy chọn khẩu vị. |
| `GET` | `/api/me/dashboard` | Lấy dữ liệu tổng quan, lịch sử và gợi ý. |
| `POST` | `/api/me/favourites` | Thêm hoặc xóa món yêu thích. |
| `POST` | `/api/me/orders` | Tạo đơn đặt món mô phỏng. |
| `GET` | `/api/me/history.csv` | Xuất lịch sử đặt món dưới dạng CSV. |

Các API làm thay đổi dữ liệu sử dụng CSRF token. Những API thuộc nhóm `/api/me/` yêu cầu người dùng đăng nhập.

## 9. Cơ sở dữ liệu và dữ liệu cục bộ

Ứng dụng sử dụng **SQLite**. Các tệp dữ liệu được lưu trong thư mục `instance/`.

Cấu trúc tệp mặc định:

```text
instance/
├── foodmatch_v2.db
└── secret.key
```

- `foodmatch_v2.db`: lưu dữ liệu ứng dụng, bao gồm thông tin tài khoản và hoạt động của người dùng.
- `secret.key`: khóa được sử dụng cho phiên đăng nhập; ứng dụng tạo tệp này nếu chưa tồn tại.

**Lưu ý quan trọng:**

- Không chia sẻ `secret.key` hoặc đưa khóa này lên kho mã nguồn công khai.
- Không công khai cơ sở dữ liệu nếu trong đó có thông tin tài khoản hoặc dữ liệu cá nhân.
- Sao lưu thư mục `instance/` trước khi thực hiện thao tác làm mới dữ liệu.
- Xóa cơ sở dữ liệu có thể làm mất tài khoản, tùy chọn, danh sách yêu thích và lịch sử đã lưu.

## 10. Chạy kiểm thử

Tại thư mục gốc của dự án, chạy lệnh:

```bat
python -m unittest discover -s tests -v
```

Các bài kiểm thử trong `tests/` bao gồm những phần như thuật toán gợi ý, bộ lọc khẩu vị, dữ liệu danh mục và chức năng ứng dụng.

## 11. Xử lý một số lỗi thường gặp

### Lỗi không tìm thấy `dist/index.html`

Ví dụ:

```text
FileNotFoundError: ... dist\index.html
```

Kiểm tra lại cấu trúc thư mục. Đường dẫn cần có dạng:

```text
FoodMatchFlask/
├── app.py
└── dist/
    └── index.html
```

Nếu thư mục `dist/` đang nằm bên trong một thư mục khác, hãy đưa nó về cùng cấp với `app.py`.

### Lỗi `ModuleNotFoundError`

Lỗi này thường xảy ra khi các thư viện chưa được cài đặt trong môi trường Python đang chạy ứng dụng.

Kích hoạt môi trường ảo (nếu có), sau đó chạy:

```bat
python -m pip install -r requirements.txt
```

### Không truy cập được ứng dụng

- Kiểm tra Terminal xem Flask có đang chạy hay không.
- Đảm bảo truy cập đúng địa chỉ `http://127.0.0.1:5000`.
- Nếu vừa chỉnh sửa mã nguồn, khởi động lại ứng dụng và tải lại trang.

## 12. Giới hạn của phiên bản

- Danh mục nhà hàng và món ăn là dữ liệu mẫu phục vụ học tập, minh họa và kiểm thử.
- Chức năng đặt món hiện lưu **đơn mô phỏng** trong SQLite.
- Ứng dụng chưa tích hợp thanh toán trực tuyến hoặc kết nối xác nhận đơn với hệ thống nhà hàng thực tế.
- Flask đang được sử dụng với máy chủ phát triển, phù hợp cho quá trình học tập và chạy thử cục bộ. Nếu triển khai công khai, cần cấu hình máy chủ WSGI, HTTPS, biến môi trường và các biện pháp bảo mật phù hợp.

---

<p align="center">
  <strong>FoodMatch</strong><br>
  Khám phá món ăn phù hợp với khẩu vị của bạn.
</p>
