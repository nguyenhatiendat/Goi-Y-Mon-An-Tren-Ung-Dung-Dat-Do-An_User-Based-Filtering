import csv
import hashlib
import hmac
import io
import os
import re
import secrets
import time
from datetime import timedelta
from pathlib import Path

from flask import Flask, Response, g, jsonify, request, session
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash, check_password_hash

from catalog import catalog, CATEGORIES, validate_preferences
from database import DuLieu
from recommender import goi_y_ca_nhan


def create_app(test_config=None):
    root = Path(__file__).resolve().parent
    app = Flask(__name__, static_folder=str(root/'dist'), static_url_path='')
    app.config.update(DATABASE=str(root/'instance/foodmatch_v2.db'), MAX_CONTENT_LENGTH=64*1024,
        SESSION_COOKIE_NAME='foodmatch_session_v2',SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',SESSION_COOKIE_SECURE=os.environ.get('FOODMATCH_HTTPS')=='1',
        PERMANENT_SESSION_LIFETIME=timedelta(hours=8),LOGIN_LIMIT=6)
    if test_config:
        app.config.update(test_config)
    if not app.config.get('SECRET_KEY'):
        key_dir=root/'instance'
        key_dir.mkdir(exist_ok=True)
        key_file=key_dir/'secret.key'
        try:
            with open(key_file,'xb') as f:
                os.chmod(key_file,0o600)
                f.write(secrets.token_bytes(64))
        except FileExistsError:
            pass
        app.config['SECRET_KEY']=key_file.read_bytes()
    Path(app.config['DATABASE']).parent.mkdir(parents=True,exist_ok=True)
    db=DuLieu(app.config['DATABASE']);db.dong()
    dummy_hash=generate_password_hash(secrets.token_urlsafe(32))

    def get_db():
        if 'db' not in g:
            g.db=DuLieu(app.config['DATABASE'])
        return g.db

    @app.teardown_appcontext
    def close_db(error=None):
        db=g.pop('db',None)
        if db is not None:
            db.dong()

    def body():
        data=request.get_json(silent=True)
        if not isinstance(data,dict):
            raise ValueError('Yêu cầu phải là một đối tượng JSON.')
        return data

    def csrf():
        if 'csrf_token' not in session:
            session['csrf_token']=secrets.token_urlsafe(32)
        return session['csrf_token']

    def require_user():
        if g.user is None:
            from werkzeug.exceptions import Unauthorized
            raise Unauthorized('Bạn cần đăng nhập để tiếp tục.')
        return g.user['id']

    def token_hash(value):
        return hashlib.sha256(value.encode()).hexdigest()

    def logout_current():
        token=session.get('sid')
        if token:
            with get_db().conn:
                get_db().conn.execute('DELETE FROM phien_dang_nhap WHERE token_hash=?',(token_hash(token),))
        session.clear()
        g.user=None

    def log_in(user_id):
        logout_current()
        sid=secrets.token_urlsafe(32)
        with get_db().conn:
            get_db().conn.execute('INSERT INTO phien_dang_nhap VALUES (?,?,?)',
                (token_hash(sid),user_id,int(time.time())+8*3600))
        session['sid']=sid
        session.permanent=True
        g.user=get_db().public_user(user_id)
        return auth_response()

    def auth_response():
        return {'user':g.user,'csrf_token':csrf(),
                'preferences':get_db().preferences(g.user['id']) if g.user else None}

    @app.before_request
    def guard():
        g.user=None
        if not request.path.startswith('/api/'):
            return
        sid=session.get('sid')
        if isinstance(sid,str):
            row=get_db().conn.execute('SELECT nguoi_dung_id FROM phien_dang_nhap WHERE token_hash=? AND expires>?',
                                     (token_hash(sid),int(time.time()))).fetchone()
            if row:
                g.user=get_db().public_user(row['nguoi_dung_id'])
            else:
                session.clear()
        if request.method not in ('GET','HEAD','OPTIONS'):
            if request.path.startswith('/api/me/') and g.user is None:
                return jsonify(error='Bạn cần đăng nhập để tiếp tục.'),401
            received=request.headers.get('X-CSRF-Token','')
            expected=session.get('csrf_token','')
            if not received or not expected or not hmac.compare_digest(received,expected):
                return jsonify(error='Phiên biểu mẫu đã hết hạn. Hãy tải lại trang.',error_type='CSRF'),403

    #2. GIAO DIỆN VÀ XÁC THỰC
    @app.get('/')
    @app.get('/index.html')
    def index():
        html=(root/'dist/index.html').read_text(encoding='utf-8').replace('data-runtime="browser"','data-runtime="flask"')
        return Response(html,mimetype='text/html')

    @app.get('/api/session')
    def current_session():
        return jsonify(auth_response())

    @app.post('/api/auth/register')
    def register():
        data=body()
        name,email,password,confirmation=(data.get(k) for k in ('name','email','password','confirm_password'))
        if not isinstance(name,str) or not 2<=len(name.strip())<=50 or any(ord(c)<32 for c in name):
            raise ValueError('Họ tên cần từ 2 đến 50 ký tự, không chứa ký tự điều khiển.')
        if not isinstance(email,str) or len(email)>254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email.strip()):
            raise ValueError('Email chưa hợp lệ.')
        if not isinstance(password,str) or not 8<=len(password)<=128:
            raise ValueError('Mật khẩu cần từ 8 đến 128 ký tự.')
        if confirmation!=password:
            raise ValueError('Hai mật khẩu chưa trùng nhau.')
        user_id=get_db().them_tai_khoan(name.strip(),email.strip().casefold(),generate_password_hash(password))
        return jsonify(log_in(user_id)),201

    @app.post('/api/auth/login')
    def login():
        data=body()
        email,password=data.get('email'),data.get('password')
        if not isinstance(email,str) or not isinstance(password,str) or len(email)>254 or len(password)>128:
            raise ValueError('Email hoặc mật khẩu chưa đúng.')
        email=email.strip().casefold()
        now=int(time.time())
        key=token_hash(email+'|'+str(request.remote_addr))
        db=get_db()
        attempt=db.conn.execute('SELECT * FROM login_failures WHERE key=?',(key,)).fetchone()
        if attempt and attempt['blocked_until']>now:
            return jsonify(error='Bạn nhập sai nhiều lần. Vui lòng thử lại sau 1 phút.'),429
        row=db.conn.execute('SELECT id,password_hash FROM nguoi_dung WHERE email=?',(email,)).fetchone()
        valid=check_password_hash(row['password_hash'] if row else dummy_hash,password)
        if not row or not valid:
            count=(attempt['count']+1) if attempt and now-attempt['window_start']<600 else 1
            start=attempt['window_start'] if attempt and now-attempt['window_start']<600 else now
            with db.conn:
                db.conn.execute('INSERT OR REPLACE INTO login_failures VALUES (?,?,?,?)',
                    (key,count,start,now+60 if count>=app.config['LOGIN_LIMIT'] else 0))
            return jsonify(error='Email hoặc mật khẩu chưa đúng.'),401
        with db.conn:
            db.conn.execute('DELETE FROM login_failures WHERE key=?',(key,))
        return jsonify(log_in(row['id']))

    @app.post('/api/auth/logout')
    def logout():
        logout_current()
        return jsonify(auth_response())

    #3. DỮ LIỆU RIÊNG CỦA TÀI KHOẢN ĐANG ĐĂNG NHẬP
    @app.get('/api/catalog')
    def public_catalog():
        restaurants,foods=catalog()
        return jsonify(restaurants=restaurants,foods=foods)

    @app.get('/api/state')
    def state():
        user_id=require_user()
        return jsonify(users=[g.user],foods=get_db().thuc_don(),favourites=get_db().favourite_map(user_id),
                       preferences=get_db().preferences(user_id))

    @app.put('/api/me/preferences')
    def preferences():
        user_id=require_user()
        prefs=get_db().save_preferences(user_id,body())
        g.user=get_db().public_user(user_id)
        return jsonify(preferences=prefs,user=g.user)

    @app.get('/api/me/dashboard')
    def dashboard():
        user_id=require_user()
        db=get_db();matrix=db.ma_tran();prefs=db.preferences(user_id)
        for key in ('min_price','max_price','spice','diet'):
            if key in request.args:
                value=request.args[key]
                if key in ('min_price','max_price'):
                    if value=='' and key=='max_price':
                        value=None
                    elif value.isascii() and value.isdigit():
                        value=int(value)
                    else:
                        raise ValueError('Mức giá không hợp lệ.')
                prefs[key]=value
        prefs=validate_preferences(prefs)
        items,neighbours=goi_y_ca_nhan(user_id,matrix,db.thuc_don(),prefs,request.args.get('category','Tất cả'))
        popular={m['id']:sum(v.get(m['id'],0) for v in matrix.values()) for m in db.thuc_don()}
        # Không trả email, tên hoặc toàn bộ lịch sử của tài khoản khác.
        return jsonify(recommendations=items,neighbours=neighbours,history=db.lich_su(user_id),
            matrix={str(user_id):matrix[user_id]},popularity=popular,
            neighbour_labels={str(n['ma_nguoi']):f"Người cùng gu #{i+1}" for i,n in enumerate(neighbours)},filters=prefs)

    @app.post('/api/me/favourites')
    def toggle_favourite():
        user_id=require_user()
        return jsonify(favourites=get_db().toggle_favourite(user_id,body().get('dish_id')))

    @app.post('/api/me/orders')
    def order():
        user_id=require_user()
        total=get_db().dat_gio(user_id,body().get('items'))
        return jsonify(message='Đã lưu đơn mô phỏng.',total=total),201

    @app.get('/api/me/history.csv')
    def export_history():
        user_id=require_user();text=io.StringIO(newline='');writer=csv.writer(text)
        writer.writerow(['Mã đơn','Ngày đặt','Món ăn','Nhà hàng','Số phần','Đơn giá','Thành tiền'])
        for row in get_db().lich_su(user_id):
            writer.writerow([row['id'],row['ngay_dat'],row['mon_an'],row['nha_hang'],row['so_luong'],row['don_gia'],row['thanh_tien']])
        return Response('\ufeff'+text.getvalue(),content_type='text/csv; charset=utf-8',
            headers={'Content-Disposition':'attachment; filename="lich_su_dat_mon.csv"'})

    #4. BÁO LỖI VÀ CÁC HEADER PHẢN HỒI
    @app.errorhandler(ValueError)
    def bad_input(e):
        return jsonify(error=str(e),error_type=type(e).__name__),400

    @app.errorhandler(Exception)
    def error(e):
        if isinstance(e,HTTPException):
            return jsonify(error=e.description,error_type=type(e).__name__),e.code
        app.logger.exception('Lỗi %s: %s',type(e).__name__,e)
        return jsonify(error='Không xử lý được yêu cầu. Hãy thử lại.',error_type=type(e).__name__),500

    @app.after_request
    def headers(response):
        if request.path.startswith('/api/'):
            response.headers['Cache-Control']='no-store'
        response.headers['X-Content-Type-Options']='nosniff'
        response.headers['X-Frame-Options']='SAMEORIGIN'
        response.headers['Referrer-Policy']='same-origin'
        return response

    return app


if __name__=='__main__':
    try:
        app=create_app()
        print('FoodMatch: mở http://127.0.0.1:5000 để tự đăng ký tài khoản.')
        app.run(host='127.0.0.1',port=5000,debug=False)
    except Exception as e:
        print(f'Lỗi {type(e).__name__}: {e}')
        raise SystemExit(1)
