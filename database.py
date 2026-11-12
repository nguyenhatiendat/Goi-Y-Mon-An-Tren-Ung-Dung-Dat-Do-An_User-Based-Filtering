"""SQLite của bản có tài khoản. Chỉ khởi tạo thực đơn, không sinh người/đơn giả."""
import json
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
            if not self.conn.execute('SELECT 1 FROM mon_an LIMIT 1').fetchone():
                restaurants, foods = catalog()
                with self.conn:
                    self.conn.executemany('INSERT OR IGNORE INTO nha_hang VALUES (?,?,?,?)',
                        [(r['id'],r['ten'],r['dia_chi'],r['loai']) for r in restaurants])
                    self.conn.executemany('INSERT OR IGNORE INTO mon_an VALUES (?,?,?,?,?,?,?,?)',
                        [(f['id'],f['ten'],f['nha_hang_id'],f['nhom'],f['gia'],f['cay'],f['chay'],f['image']) for f in foods])
        except Exception as e:
            self.conn.close()
            raise RuntimeError(f'Không tạo được dữ liệu: {type(e).__name__}: {e}') from e

    def thuc_don(self):
        return [dict(r) for r in self.conn.execute('''SELECT m.*, n.ten AS nha_hang,
            n.dia_chi, n.loai AS loai_quan FROM mon_an m JOIN nha_hang n ON m.nha_hang_id=n.id ORDER BY m.id''')]

    def tai_khoan(self, user_id):
        return self.conn.execute('SELECT * FROM nguoi_dung WHERE id=?', (user_id,)).fetchone()

    def public_user(self, user_id):
        row = self.tai_khoan(user_id)
        return {'id':row['id'],'ten':row['ten'],'email':row['email'],'onboarded':bool(row['onboarded'])} if row else None

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
        return {**DEFAULT_PREFERENCES, **json.loads(row['preferences'])}

    def save_preferences(self, user_id, prefs):
        prefs = validate_preferences(prefs)
        with self.conn:
            self.conn.execute('UPDATE nguoi_dung SET preferences=?,onboarded=1 WHERE id=?',
                              (json.dumps(prefs,ensure_ascii=False),user_id))
        return prefs

    def ma_tran(self):
        matrix = {r['id']:{} for r in self.conn.execute('SELECT id FROM nguoi_dung')}
        for row in self.conn.execute('''SELECT nguoi_dung_id,mon_an_id,COUNT(*) AS n
            FROM don_hang GROUP BY nguoi_dung_id,mon_an_id'''):
            matrix[row['nguoi_dung_id']][row['mon_an_id']] = row['n']
        return matrix

    def lich_su(self, user_id):
        return [dict(r) for r in self.conn.execute('''SELECT d.*,m.ten AS mon_an,n.ten AS nha_hang,
            d.so_luong*d.don_gia AS thanh_tien FROM don_hang d
            JOIN mon_an m ON m.id=d.mon_an_id JOIN nha_hang n ON n.id=m.nha_hang_id
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
        foods = {m['id']:m for m in self.thuc_don()}
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
            self.conn.executemany('''INSERT INTO don_hang
                (nguoi_dung_id,mon_an_id,so_luong,don_gia,ngay_dat) VALUES (?,?,?,?,?)''',rows)
        return sum(row[2]*row[3] for row in rows)

    def dong(self):
        self.conn.close()
