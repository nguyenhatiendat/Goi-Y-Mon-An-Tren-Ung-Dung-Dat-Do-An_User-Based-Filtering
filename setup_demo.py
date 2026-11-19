import argparse
import csv
import secrets
from pathlib import Path
from werkzeug.security import generate_password_hash
from database import DuLieu

ROOT=Path(__file__).resolve().parent
PASSWORD='FoodMatch@123'


def setup(path,history=False):
    db=DuLieu(path)
    def account(name,email,role,password):
        existing=db.conn.execute('SELECT id,role FROM nguoi_dung WHERE email=?',(email,)).fetchone()
        if existing:
            # Không nâng quyền tài khoản có sẵn khi chỉ trùng email mẫu.
            return existing['id'] if existing['role']==role else None
        uid=db.them_tai_khoan(name,email,generate_password_hash(password))
        with db.conn: db.conn.execute('UPDATE nguoi_dung SET role=?,onboarded=1 WHERE id=?',(role,uid))
        return uid
    try:
        account('Quản trị demo','admin@foodmatch.local','admin',PASSWORD)
        for r in db.conn.execute('SELECT id,ten FROM nha_hang').fetchall():
            uid=account('Chủ quán '+r['ten'],f"seller{r['id']:02d}@foodmatch.local",'merchant',PASSWORD)
            if uid:
                with db.conn: db.conn.execute('INSERT OR IGNORE INTO chu_nha_hang VALUES (?,?)',(uid,r['id']))
        if history:
            def read(name):
                with (ROOT/'data'/name).open(encoding='utf-8-sig',newline='') as f: return list(csv.DictReader(f))
            foods={f['id']:f for f in db.thuc_don()};mapping={}
            for u in read('users_demo.csv'):
                # Tài khoản dataset không có mật khẩu công khai.
                mapping[int(u['id'])]=account(u['ten'],f"dataset{int(u['id']):02d}@foodmatch.invalid",'customer',secrets.token_urlsafe(48))
            with db.conn:
                for e in read('interactions_demo.csv'):
                    uid=mapping[int(e['user_id'])];fid=int(e['food_id']);food=foods[fid];rid='demo-'+e['id']
                    if not uid or db.conn.execute('SELECT 1 FROM phieu_dat WHERE id=?',(rid,)).fetchone(): continue
                    db.conn.execute('INSERT INTO phieu_dat VALUES (?,?,?,?,?,?)',
                        (rid,uid,food['nha_hang_id'],e['ordered_at'],'completed',e['ordered_at']))
                    db.conn.execute('INSERT INTO don_hang(nguoi_dung_id,mon_an_id,so_luong,don_gia,ngay_dat,receipt_id,ten_mon) VALUES (?,?,?,?,?,?,?)',
                        (uid,fid,int(e['quantity']),int(e['unit_price']),e['ordered_at'],rid,food['ten']))
        print('Đã tạo tài khoản kiểm tra (bỏ qua tài khoản đã tồn tại).')
        print('Admin: admin@foodmatch.local | Nhà hàng 1: seller01@foodmatch.local')
        print('Mật khẩu tài khoản demo mới: '+PASSWORD)
        if history: print('Đã nạp 60 khách / 1.440 lượt đặt MÔ PHỎNG; không phải dữ liệu thực tế.')
    finally:
        db.dong()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',default=str(ROOT/'instance/foodmatch_v2.db'))
    parser.add_argument('--history',action='store_true')
    args=parser.parse_args();Path(args.database).parent.mkdir(parents=True,exist_ok=True)
    setup(args.database,args.history)
