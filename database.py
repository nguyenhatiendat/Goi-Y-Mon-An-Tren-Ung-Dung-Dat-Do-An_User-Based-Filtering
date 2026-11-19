"""SQLite, khởi tạo thực đơn từ CSV; lịch sử demo chỉ nạp qua setup_demo.py."""
import json
from pathlib import Path
from uuid import uuid4
import sqlite3
from datetime import datetime, timezone

from catalog import catalog, DEFAULT_PREFERENCES, validate_preferences


class DuLieu:
    def __init__(self, path):
        self.conn = sqlite3.connect(str(path))
        self.conn.row_factory = sqlite3.Row
        self.conn.execute('PRAGMA foreign_keys = ON')
        try:
            self.conn.executescript('''
                CREATE TABLE IF NOT EXISTS nguoi_dung (
                    id INTEGER PRIMARY KEY, ten TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    preferences TEXT NOT NULL DEFAULT '{}',
                    onboarded INTEGER NOT NULL DEFAULT 0 CHECK(onboarded IN (0,1))
                );
                CREATE TABLE IF NOT EXISTS nha_hang (
                    id INTEGER PRIMARY KEY, ten TEXT NOT NULL, dia_chi TEXT NOT NULL, loai TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS mon_an (
                    id INTEGER PRIMARY KEY, ten TEXT NOT NULL,
                    nha_hang_id INTEGER NOT NULL REFERENCES nha_hang(id),
                    nhom TEXT NOT NULL, gia INTEGER NOT NULL CHECK(gia>0),
                    cay INTEGER NOT NULL CHECK(cay IN (0,1,2)),
                    chay INTEGER NOT NULL CHECK(chay IN (0,1)), image TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS don_hang (
                    id INTEGER PRIMARY KEY,
                    nguoi_dung_id INTEGER NOT NULL REFERENCES nguoi_dung(id),
                    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id),
                    so_luong INTEGER NOT NULL CHECK(so_luong BETWEEN 1 AND 20),
                    don_gia INTEGER NOT NULL CHECK(don_gia>0), ngay_dat TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS yeu_thich (
                    nguoi_dung_id INTEGER NOT NULL REFERENCES nguoi_dung(id),
                    mon_an_id INTEGER NOT NULL REFERENCES mon_an(id),
                    PRIMARY KEY(nguoi_dung_id, mon_an_id)
                );
                CREATE TABLE IF NOT EXISTS phien_dang_nhap (
                    token_hash TEXT PRIMARY KEY,
                    nguoi_dung_id INTEGER NOT NULL REFERENCES nguoi_dung(id), expires INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS login_failures (
                    key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start INTEGER NOT NULL,
                    blocked_until INTEGER NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_history ON don_hang(nguoi_dung_id, mon_an_id);
            ''')
            from restaurant import migrate
            migrate(self.conn)
            from reviews import initialize_reviews_schema
            initialize_reviews_schema(self.conn)
            self.conn.executescript('''
                CREATE TABLE IF NOT EXISTS recommendation_revision(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL);
                INSERT OR IGNORE INTO recommendation_revision VALUES(1,0);
            ''')
            # Chỉ làm mất cache khi ma trận tương tác/tài khoản thay đổi.
            for table in ('nguoi_dung','don_hang','phieu_dat'):
                for operation in ('INSERT','UPDATE','DELETE'):
                    condition=" WHEN OLD.status IS NOT NEW.status" if table=='phieu_dat' and operation=='UPDATE' else ''
                    if table=='nguoi_dung' and operation=='UPDATE':continue
                    self.conn.execute(f'''CREATE TRIGGER IF NOT EXISTS rec_rev_{table}_{operation}
                      AFTER {operation} ON {table}{condition} BEGIN
                      UPDATE recommendation_revision SET revision=revision+1 WHERE id=1; END''')
            if not self.conn.execute('SELECT 1 FROM mon_an LIMIT 1').fetchone():
                restaurants, foods = catalog()
                with self.conn:
                    self.conn.executemany('INSERT OR IGNORE INTO nha_hang(id,ten,dia_chi,loai) VALUES (?,?,?,?)',
                        [(r['id'],r['ten'],r['dia_chi'],r['loai']) for r in restaurants])
                    self.conn.executemany('INSERT OR IGNORE INTO mon_an(id,ten,nha_hang_id,nhom,gia,cay,chay,image) VALUES (?,?,?,?,?,?,?,?)',
                        [(f['id'],f['ten'],f['nha_hang_id'],f['nhom'],f['gia'],f['cay'],f['chay'],f['image']) for f in foods])
            self.update_initial_photos()
        except Exception as e:
            self.conn.close()
            raise RuntimeError(f'Không tạo được dữ liệu: {type(e).__name__}: {e}') from e

    def update_initial_photos(self):
        """Chuyển ảnh stock cũ một lần; giữ ảnh/tên món do người bán đã sửa."""
        self.conn.execute('CREATE TABLE IF NOT EXISTS app_migrations(name TEXT PRIMARY KEY)')
        if self.conn.execute("SELECT 1 FROM app_migrations WHERE name='dish_photos_v1'").fetchone():return
        root=Path(__file__).resolve().parent;manifest=root/'data/dish_images.json'
        if not manifest.exists():return
        entries=json.loads(manifest.read_text(encoding='utf-8'))
        if not all((root/'dist'/entry['image']).is_file() for entry in entries):return
        with self.conn:
            for entry in entries:
                self.conn.execute('UPDATE mon_an SET image=? WHERE id=? AND ten=? AND image=?',
                    (entry['image'],entry['id'],entry['ten'],entry['old_image']))
            self.conn.execute("INSERT OR IGNORE INTO app_migrations VALUES ('dish_photos_v1')")

    def thuc_don(self):
        from reviews import food_statistics
        stats=food_statistics(self.conn)
        return [{**dict(r),'completed_orders':0,'sold_portions':0,'review_count':0,'rating_average':None,
                 **stats.get(r['id'],{})} for r in self.conn.execute('''SELECT m.*,n.ten AS nha_hang,
            n.dia_chi,n.loai AS loai_quan,n.is_open FROM mon_an m JOIN nha_hang n ON m.nha_hang_id=n.id ORDER BY m.id''')]

    def tai_khoan(self, user_id):
        return self.conn.execute('SELECT * FROM nguoi_dung WHERE id=?', (user_id,)).fetchone()

    def public_user(self, user_id):
        row = self.tai_khoan(user_id)
        return {'id':row['id'],'ten':row['ten'],'email':row['email'],'role':row['role'],'onboarded':bool(row['onboarded'])} if row else None

    def them_tai_khoan(self, name, email, password_hash):
        try:
            with self.conn:
                result = self.conn.execute('INSERT INTO nguoi_dung(ten,email,password_hash) VALUES (?,?,?)',
                    (name,email,password_hash))
            return result.lastrowid
        except sqlite3.IntegrityError as e:
            raise ValueError('Email này đã được đăng ký.') from e

    def preferences(self, user_id):
        row = self.tai_khoan(user_id)
        if row is None:
            raise ValueError('Tài khoản không tồn tại.')
        return validate_preferences({**DEFAULT_PREFERENCES, **json.loads(row['preferences'])})

    def save_preferences(self, user_id, prefs):
        prefs = validate_preferences(prefs)
        with self.conn:
            self.conn.execute('UPDATE nguoi_dung SET preferences=?,onboarded=1 WHERE id=?',
                              (json.dumps(prefs,ensure_ascii=False),user_id))
        return prefs

    def ma_tran(self):
        matrix = {r['id']:{} for r in self.conn.execute('SELECT id FROM nguoi_dung')}
        for row in self.conn.execute('''SELECT nguoi_dung_id,mon_an_id,COUNT(*) AS n
            FROM don_hang WHERE receipt_id IN (SELECT id FROM phieu_dat WHERE status='completed') GROUP BY nguoi_dung_id,mon_an_id'''):
            matrix[row['nguoi_dung_id']][row['mon_an_id']] = row['n']
        return matrix

    def lich_su(self, user_id):
        return [dict(r) for r in self.conn.execute('''SELECT d.*,COALESCE(d.ten_mon,m.ten) AS mon_an,n.ten AS nha_hang,p.status,
            d.so_luong*d.don_gia AS thanh_tien FROM don_hang d
            JOIN mon_an m ON m.id=d.mon_an_id JOIN nha_hang n ON n.id=m.nha_hang_id LEFT JOIN phieu_dat p ON p.id=d.receipt_id
            WHERE d.nguoi_dung_id=? ORDER BY d.ngay_dat DESC,d.id DESC''',(user_id,))]

    def favourite_map(self, user_id):
        ids = [r[0] for r in self.conn.execute('SELECT mon_an_id FROM yeu_thich WHERE nguoi_dung_id=? ORDER BY mon_an_id',(user_id,))]
        return {str(user_id):ids}

    def toggle_favourite(self, user_id, dish_id):
        if type(dish_id) is not int or self.conn.execute('SELECT 1 FROM mon_an WHERE id=?',(dish_id,)).fetchone() is None:
            raise ValueError('Món ăn không tồn tại.')
        with self.conn:
            present = self.conn.execute('SELECT 1 FROM yeu_thich WHERE nguoi_dung_id=? AND mon_an_id=?',(user_id,dish_id)).fetchone()
            if present:
                self.conn.execute('DELETE FROM yeu_thich WHERE nguoi_dung_id=? AND mon_an_id=?',(user_id,dish_id))
            else:
                self.conn.execute('INSERT INTO yeu_thich VALUES (?,?)',(user_id,dish_id))
        return self.favourite_map(user_id)

    def dat_gio(self, user_id, items):
        if not isinstance(items,list) or not 1<=len(items)<=80:
            raise ValueError('Giỏ món phải có từ 1 đến 80 loại món.')
        if self.tai_khoan(user_id) is None:
            raise ValueError('Tài khoản không tồn tại.')
        foods = {m['id']:m for m in self.thuc_don() if m['available'] and m['is_open']}
        seen, rows = set(), []
        for item in items:
            if not isinstance(item,dict):
                raise ValueError('Thông tin giỏ món không hợp lệ.')
            dish_id, quantity = item.get('dish_id'), item.get('quantity')
            if type(dish_id) is not int or dish_id not in foods or dish_id in seen:
                raise ValueError('Mã món không tồn tại hoặc bị trùng.')
            if type(quantity) is not int or not 1<=quantity<=20:
                raise ValueError('Mỗi món phải có số phần nguyên từ 1 đến 20.')
            seen.add(dish_id)
            rows.append((user_id,dish_id,quantity,foods[dish_id]['gia'],datetime.now(timezone.utc).isoformat(timespec='seconds')))
        with self.conn:
            groups={}
            for row in rows:
                restaurant_id=foods[row[1]]['nha_hang_id']
                if restaurant_id not in groups:
                    receipt_id=uuid4().hex
                    groups[restaurant_id]=receipt_id
                    self.conn.execute('INSERT INTO phieu_dat VALUES (?,?,?,?,?,?)',
                        (receipt_id,user_id,restaurant_id,row[4],'pending',row[4]))
                self.conn.execute('INSERT INTO don_hang(nguoi_dung_id,mon_an_id,so_luong,don_gia,ngay_dat,receipt_id,ten_mon) VALUES (?,?,?,?,?,?,?)',
                    (*row,groups[restaurant_id],foods[row[1]]['ten']))
        return sum(row[2]*row[3] for row in rows)

    def dong(self):
        self.conn.close()
