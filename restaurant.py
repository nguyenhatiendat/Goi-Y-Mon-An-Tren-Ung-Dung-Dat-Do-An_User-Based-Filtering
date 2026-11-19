"""Quản lý nhà hàng; quyền sở hữu luôn được kiểm tra ở máy chủ."""
from datetime import datetime, timezone
from uuid import uuid4
import io
import re
from PIL import Image, ImageOps, UnidentifiedImageError
from flask import jsonify, request, Response
from werkzeug.exceptions import Forbidden, NotFound, Conflict
from catalog import CATEGORIES

STATUS = {'pending':'Chờ xác nhận','accepted':'Đã xác nhận','preparing':'Đang chuẩn bị',
          'ready':'Sẵn sàng giao','completed':'Hoàn tất','cancelled':'Đã hủy'}
NEXT = {'pending':['accepted','cancelled'],'accepted':['preparing','cancelled'],
        'preparing':['ready'],'ready':['completed'],'completed':[],'cancelled':[]}


def migrate(conn):
    # Bổ sung cột khi mở DB cũ, không xóa tài khoản hay lịch sử.
    additions = {'nguoi_dung': [('role',"TEXT NOT NULL DEFAULT 'customer'")],
                 'nha_hang': [('is_open','INTEGER NOT NULL DEFAULT 1')],
                 'mon_an': [('available','INTEGER NOT NULL DEFAULT 1')],
                 'don_hang': [('receipt_id','TEXT'),('ten_mon','TEXT')]}
    with conn:
        for table, columns in additions.items():
            current={r[1] for r in conn.execute(f'PRAGMA table_info({table})')}
            for name, spec in columns:
                if name not in current:
                    conn.execute(f'ALTER TABLE {table} ADD COLUMN {name} {spec}')
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS chu_nha_hang (
                nguoi_dung_id INTEGER NOT NULL REFERENCES nguoi_dung(id),
                nha_hang_id INTEGER NOT NULL REFERENCES nha_hang(id),
                PRIMARY KEY (nguoi_dung_id,nha_hang_id));
            CREATE TABLE IF NOT EXISTS phieu_dat (
                id TEXT PRIMARY KEY, nguoi_dung_id INTEGER NOT NULL REFERENCES nguoi_dung(id),
                nha_hang_id INTEGER NOT NULL REFERENCES nha_hang(id), ngay_dat TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending', updated_at TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS idx_receipts_restaurant ON phieu_dat(nha_hang_id,status);
            CREATE INDEX IF NOT EXISTS idx_order_receipt ON don_hang(receipt_id);
        ''')
        # Mỗi dòng lịch sử cũ trở thành một phiếu hoàn tất riêng.
        for row in conn.execute('SELECT d.*,m.nha_hang_id,m.ten FROM don_hang d JOIN mon_an m ON m.id=d.mon_an_id WHERE receipt_id IS NULL').fetchall():
            rid='legacy-'+str(row['id'])
            conn.execute('INSERT OR IGNORE INTO phieu_dat VALUES (?,?,?,?,?,?)',
                         (rid,row['nguoi_dung_id'],row['nha_hang_id'],row['ngay_dat'],'completed',row['ngay_dat']))
            conn.execute('UPDATE don_hang SET receipt_id=?,ten_mon=? WHERE id=?',(rid,row['ten'],row['id']))


def receipts(db, restaurant_ids=None, user_id=None):
    query='''SELECT p.*,n.ten AS nha_hang,u.ten AS khach_hang FROM phieu_dat p
             JOIN nha_hang n ON n.id=p.nha_hang_id JOIN nguoi_dung u ON u.id=p.nguoi_dung_id'''
    params=[]
    if user_id is not None:
        query+=' WHERE p.nguoi_dung_id=?';params=[user_id]
    elif restaurant_ids:
        query+=' WHERE p.nha_hang_id IN ('+','.join('?' for _ in restaurant_ids)+')';params=list(restaurant_ids)
    else:
        return []
    result=[]
    for row in db.conn.execute(query+' ORDER BY p.ngay_dat DESC,p.id DESC',params):
        order=dict(row)
        order['items']=[dict(r) for r in db.conn.execute('''SELECT d.id,d.mon_an_id,
            COALESCE(d.ten_mon,m.ten) AS ten,d.so_luong,d.don_gia,d.so_luong*d.don_gia AS thanh_tien
            FROM don_hang d JOIN mon_an m ON m.id=d.mon_an_id WHERE receipt_id=?''',(row['id'],))]
        order['total']=sum(x['thanh_tien'] for x in order['items'])
        order['status_label']=STATUS[order['status']]
        order['next_statuses']=NEXT[order['status']]
        result.append(order)
    return result


def register_restaurant_routes(app, get_db, require_user, body, root):
    def operator():
        uid=require_user();db=get_db();account=db.tai_khoan(uid)
        if account['role'] not in ('merchant','admin'):
            raise Forbidden('Tài khoản chưa được cấp quyền quản lý nhà hàng.')
        if account['role']=='admin':
            ids=[r[0] for r in db.conn.execute('SELECT id FROM nha_hang')]
        else:
            ids=[r[0] for r in db.conn.execute('SELECT nha_hang_id FROM chu_nha_hang WHERE nguoi_dung_id=?',(uid,))]
        return db,ids

    def own(ids,rid):
        if rid not in ids:
            raise Forbidden('Bạn không được quản lý nhà hàng này.')

    @app.get('/merchant')
    def merchant_page():
        return Response((root/'dist/merchant.html').read_text(encoding='utf-8'),mimetype='text/html')

    @app.get('/api/merchant/dashboard')
    def merchant_dashboard():
        db,ids=operator()
        restaurants=[dict(r) for r in db.conn.execute('SELECT * FROM nha_hang') if r['id'] in ids]
        orders=receipts(db,ids)
        return jsonify(restaurants=restaurants,foods=[f for f in db.thuc_don() if f['nha_hang_id'] in ids],
            orders=orders,statuses=STATUS,categories=CATEGORIES,
            summary={'pending':sum(o['status']=='pending' for o in orders),
                     'completed':sum(o['status']=='completed' for o in orders),
                     'revenue':sum(o['total'] for o in orders if o['status']=='completed')})

    @app.patch('/api/merchant/orders/<receipt_id>')
    def update_order(receipt_id):
        db,ids=operator();new=body().get('status')
        with db.conn:
            row=db.conn.execute('SELECT * FROM phieu_dat WHERE id=?',(receipt_id,)).fetchone()
            if row is None: raise NotFound('Không có đơn này.')
            own(ids,row['nha_hang_id'])
            if not isinstance(new,str) or new not in NEXT[row['status']]:
                raise ValueError('Không được chuyển sang trạng thái này.')
            count=db.conn.execute('UPDATE phieu_dat SET status=?,updated_at=? WHERE id=? AND status=?',
                (new,datetime.now(timezone.utc).isoformat(timespec='seconds'),receipt_id,row['status'])).rowcount
            if count!=1: raise Conflict('Đơn đã được cập nhật. Hãy tải lại danh sách.')
        return jsonify(message='Đã cập nhật đơn.',status=new)

    def validate_food(data):
        for key in ('ten','nhom','gia','cay','chay'):
            if key not in data: raise ValueError('Cần nhập đầy đủ thông tin món.')
        if not isinstance(data['ten'],str) or not 2<=len(data['ten'].strip())<=100:
            raise ValueError('Tên món cần từ 2 đến 100 ký tự.')
        if data['nhom'] not in CATEGORIES: raise ValueError('Nhóm món không hợp lệ.')
        if type(data['gia']) is not int or not 1000<=data['gia']<=10000000:
            raise ValueError('Giá món cần từ 1.000 đến 10.000.000 đồng.')
        if type(data['cay']) is not int or data['cay'] not in (0,1,2) or type(data['chay']) is not int or data['chay'] not in (0,1):
            raise ValueError('Độ cay hoặc chế độ ăn không hợp lệ.')
        image=data.get('image','assets/food-01.webp')
        if not isinstance(image,str) or not re.fullmatch(r'assets/(?:food-[0-9]{2}\.webp|dishes/dish-[0-9]{3}\.webp|uploads/[a-f0-9]{32}\.webp)',image) or not (root/'dist'/image).is_file():
            raise ValueError('Chọn một ảnh minh họa có sẵn.')
        available=data.get('available',1)
        if type(available) is not int or available not in (0,1): raise ValueError('Trạng thái món không hợp lệ.')
        return (data['ten'].strip(),data['nhom'],data['gia'],data['cay'],data['chay'],image,available)

    @app.post('/api/merchant/restaurants/<int:rid>/foods')
    def add_food(rid):
        db,ids=operator();own(ids,rid);values=validate_food(body())
        with db.conn:
            result=db.conn.execute('INSERT INTO mon_an(ten,nhom,gia,cay,chay,image,available,nha_hang_id) VALUES (?,?,?,?,?,?,?,?)',(*values,rid))
        return jsonify(id=result.lastrowid,message='Đã thêm món.'),201

    @app.put('/api/merchant/foods/<int:fid>')
    @app.delete('/api/merchant/foods/<int:fid>')
    def edit_food(fid):
        db,ids=operator();row=db.conn.execute('SELECT * FROM mon_an WHERE id=?',(fid,)).fetchone()
        if row is None: raise NotFound('Món không tồn tại.')
        own(ids,row['nha_hang_id'])
        with db.conn:
            if request.method=='DELETE':
                db.conn.execute('UPDATE mon_an SET available=0 WHERE id=?',(fid,))
            else:
                values=validate_food(body())
                db.conn.execute('UPDATE mon_an SET ten=?,nhom=?,gia=?,cay=?,chay=?,image=?,available=? WHERE id=?',(*values,fid))
        return jsonify(message='Đã lưu thực đơn.')

    @app.post('/api/merchant/foods/<int:fid>/image')
    def upload_food_image(fid):
        db,ids=operator();row=db.conn.execute('SELECT nha_hang_id FROM mon_an WHERE id=?',(fid,)).fetchone()
        if row is None:raise NotFound('Món không tồn tại.')
        own(ids,row['nha_hang_id'])
        upload=request.files.get('image')
        if upload is None:raise ValueError('Chọn ảnh JPEG, PNG hoặc WebP.')
        blob=upload.read(5*1024*1024+1)
        if len(blob)>5*1024*1024:raise ValueError('Ảnh tối đa 5 MB.')
        try:
            with Image.open(io.BytesIO(blob)) as source:
                if source.format not in ('JPEG','PNG','WEBP') or source.width*source.height>24000000 or min(source.size)<160:
                    raise ValueError('Chọn ảnh JPEG/PNG/WebP, tối thiểu 160 px, tối đa 24 megapixel.')
                source.load();photo=ImageOps.exif_transpose(source).convert('RGB');photo.thumbnail((1200,1200))
        except (UnidentifiedImageError,OSError,Image.DecompressionBombError) as e:
            raise ValueError('Tệp không phải ảnh hợp lệ.') from e
        filename=uuid4().hex+'.webp'
        folder=root/'dist/assets/uploads';folder.mkdir(parents=True,exist_ok=True)
        path=folder/filename;photo.save(path,'WEBP',quality=88)
        image='assets/uploads/'+filename
        try:
            with db.conn:db.conn.execute('UPDATE mon_an SET image=? WHERE id=?',(image,fid))
        except Exception:
            path.unlink(missing_ok=True);raise
        return jsonify(image=image,message='Đã cập nhật ảnh món ăn.')

    @app.put('/api/merchant/restaurants/<int:rid>')
    def edit_restaurant(rid):
        db,ids=operator();own(ids,rid);data=body()
        for key in ('ten','dia_chi'):
            if not isinstance(data.get(key),str) or not 2<=len(data[key].strip())<=200:
                raise ValueError('Tên và địa chỉ cần từ 2 đến 200 ký tự.')
        opened=data.get('is_open')
        if type(opened) is not int or opened not in (0,1): raise ValueError('Trạng thái mở cửa không hợp lệ.')
        with db.conn:
            db.conn.execute('UPDATE nha_hang SET ten=?,dia_chi=?,is_open=? WHERE id=?',
                            (data['ten'].strip(),data['dia_chi'].strip(),opened,rid))
        return jsonify(message='Đã cập nhật nhà hàng.')

    @app.get('/api/admin/users')
    def admin_users():
        require_user()
        if get_db().tai_khoan(require_user())['role']!='admin': raise Forbidden('Cần quyền quản trị.')
        db=get_db()
        return jsonify(users=[dict(r) for r in db.conn.execute('SELECT id,ten,email,role FROM nguoi_dung')],
                       ownership=[dict(r) for r in db.conn.execute('SELECT * FROM chu_nha_hang')])

    @app.put('/api/admin/users/<int:uid>/role')
    def grant_role(uid):
        actor=require_user();db=get_db()
        if db.tai_khoan(actor)['role']!='admin': raise Forbidden('Cần quyền quản trị.')
        if uid==actor: raise ValueError('Không đổi quyền của chính tài khoản quản trị đang dùng.')
        data=body();role=data.get('role');ids=data.get('restaurant_ids',[])
        if role not in ('customer','merchant','admin') or not isinstance(ids,list) or any(type(x) is not int for x in ids):
            raise ValueError('Quyền hoặc danh sách nhà hàng không hợp lệ.')
        if not db.tai_khoan(uid): raise NotFound('Tài khoản không tồn tại.')
        if role=='merchant' and not ids: raise ValueError('Chọn ít nhất một nhà hàng.')
        valid={r[0] for r in db.conn.execute('SELECT id FROM nha_hang')}
        if any(x not in valid for x in ids): raise ValueError('Nhà hàng không tồn tại.')
        with db.conn:
            db.conn.execute('UPDATE nguoi_dung SET role=? WHERE id=?',(role,uid))
            db.conn.execute('DELETE FROM chu_nha_hang WHERE nguoi_dung_id=?',(uid,))
            if role=='merchant':
                db.conn.executemany('INSERT INTO chu_nha_hang VALUES (?,?)',[(uid,rid) for rid in set(ids)])
        return jsonify(message='Đã cập nhật quyền.')
