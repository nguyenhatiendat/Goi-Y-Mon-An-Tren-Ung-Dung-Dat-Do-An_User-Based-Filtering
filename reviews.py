"""Đánh giá món bởi người mua; thống kê đơn hoàn tất và số phần đã bán."""
from datetime import datetime, timezone

from flask import g, jsonify, request
from werkzeug.exceptions import Forbidden, NotFound


# Phiếu demo chỉ phục vụ minh họa CF, không phải doanh số hay người mua thật.
COMPLETED_PURCHASE = "p.status='completed' AND p.id NOT LIKE 'demo-%'"
REVIEW_ELIGIBLE = """EXISTS (SELECT 1 FROM phieu_dat p JOIN don_hang d ON d.receipt_id=p.id
    WHERE p.id=r.receipt_id AND p.nguoi_dung_id=r.nguoi_dung_id
      AND d.mon_an_id=r.mon_an_id AND """ + COMPLETED_PURCHASE + ')'
PAGE_SIZE = 10


def initialize_reviews_schema(conn):
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS danh_gia (
            id INTEGER PRIMARY KEY,
            nguoi_dung_id INTEGER NOT NULL REFERENCES nguoi_dung(id),
            mon_an_id INTEGER NOT NULL REFERENCES mon_an(id),
            receipt_id TEXT NOT NULL REFERENCES phieu_dat(id),
            so_sao INTEGER NOT NULL CHECK (so_sao BETWEEN 1 AND 5),
            binh_luan TEXT NOT NULL DEFAULT '' CHECK (length(binh_luan)<=1000),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (nguoi_dung_id,mon_an_id)
        );
        CREATE TABLE IF NOT EXISTS phan_hoi_danh_gia (
            danh_gia_id INTEGER PRIMARY KEY REFERENCES danh_gia(id),
            nguoi_tra_loi_id INTEGER NOT NULL REFERENCES nguoi_dung(id),
            noi_dung TEXT NOT NULL CHECK(length(noi_dung) BETWEEN 1 AND 2000),
            created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_reviews_food ON danh_gia(mon_an_id,updated_at DESC,id DESC);
    ''')


def food_statistics(conn):
    """Một đơn chứa 3 phần: completed_orders +1, sold_portions +3."""
    result={}
    for row in conn.execute('''SELECT d.mon_an_id,COUNT(DISTINCT p.id) AS completed_orders,
            SUM(d.so_luong) AS sold_portions FROM don_hang d
            JOIN phieu_dat p ON p.id=d.receipt_id WHERE '''+COMPLETED_PURCHASE+'''
            GROUP BY d.mon_an_id'''):
        result[row['mon_an_id']]={'completed_orders':row['completed_orders'],'sold_portions':row['sold_portions']}
    for row in conn.execute('''SELECT r.mon_an_id,COUNT(*) AS review_count,AVG(r.so_sao) AS rating_average
            FROM danh_gia r WHERE '''+REVIEW_ELIGIBLE+''' GROUP BY r.mon_an_id'''):
        result.setdefault(row['mon_an_id'],{}).update(review_count=row['review_count'],rating_average=row['rating_average'])
    return result


def completed_receipt(conn,user_id,dish_id):
    return conn.execute('''SELECT p.id FROM phieu_dat p JOIN don_hang d ON d.receipt_id=p.id
        WHERE p.nguoi_dung_id=? AND d.mon_an_id=? AND '''+COMPLETED_PURCHASE+'''
        ORDER BY p.ngay_dat DESC,p.id DESC LIMIT 1''',(user_id,dish_id)).fetchone()


def public_review(row):
    review=dict(row)
    reply_text=review.pop('reply_text',None);reply_date=review.pop('reply_updated_at',None)
    restaurant_name=review.pop('restaurant_name',None)
    review['reply']={'comment':reply_text,'updated_at':reply_date,'restaurant_name':restaurant_name} if reply_text else None
    return review


def register_review_routes(app,get_db,require_user,body):
    def check_food(conn,dish_id):
        if not conn.execute('SELECT 1 FROM mon_an WHERE id=?',(dish_id,)).fetchone():
            raise NotFound('Món ăn không tồn tại.')

    @app.get('/api/foods/<int:dish_id>/reviews')
    def list_reviews(dish_id):
        conn=get_db().conn;check_food(conn,dish_id)
        raw=request.args.get('page','1')
        if not raw.isascii() or not raw.isdigit() or not 1<=int(raw)<=100000:
            raise ValueError('Trang đánh giá không hợp lệ.')
        page=int(raw)
        stats={'completed_orders':0,'sold_portions':0,'review_count':0,'rating_average':None,
               **food_statistics(conn).get(dish_id,{})}
        histogram={str(i):0 for i in range(1,6)}
        for row in conn.execute('''SELECT r.so_sao,COUNT(*) AS n FROM danh_gia r
                WHERE r.mon_an_id=? AND '''+REVIEW_ELIGIBLE+' GROUP BY r.so_sao',(dish_id,)):
            histogram[str(row['so_sao'])]=row['n']
        rows=conn.execute('''SELECT r.id,r.so_sao AS rating,r.binh_luan AS comment,
                r.created_at,r.updated_at,u.ten AS author,h.noi_dung AS reply_text,h.updated_at AS reply_updated_at,n.ten AS restaurant_name FROM danh_gia r
                JOIN nguoi_dung u ON u.id=r.nguoi_dung_id JOIN mon_an m ON m.id=r.mon_an_id
                JOIN nha_hang n ON n.id=m.nha_hang_id LEFT JOIN phan_hoi_danh_gia h ON h.danh_gia_id=r.id
                WHERE r.mon_an_id=? AND '''+REVIEW_ELIGIBLE+'''
                ORDER BY r.updated_at DESC,r.id DESC LIMIT ? OFFSET ?''',
                (dish_id,PAGE_SIZE,(page-1)*PAGE_SIZE)).fetchall()
        mine=None;can_review=False
        if g.user:
            uid=g.user['id'];can_review=completed_receipt(conn,uid,dish_id) is not None
            row=conn.execute('''SELECT so_sao AS rating,binh_luan AS comment FROM danh_gia
                WHERE nguoi_dung_id=? AND mon_an_id=?''',(uid,dish_id)).fetchone()
            if row:mine=dict(row)
        return jsonify(dish_id=dish_id,summary=stats,histogram=histogram,reviews=[public_review(r) for r in rows],
                       page=page,has_more=page*PAGE_SIZE<stats['review_count'],mine=mine,can_review=can_review)

    @app.put('/api/me/foods/<int:dish_id>/review')
    def save_review(dish_id):
        uid=require_user();conn=get_db().conn;check_food(conn,dish_id);data=body()
        rating,comment=data.get('rating'),data.get('comment','')
        if type(rating) is not int or rating not in range(1,6):
            raise ValueError('Chọn số sao nguyên từ 1 đến 5.')
        if not isinstance(comment,str) or len(comment)>1000 or any(ord(c)<32 and c not in '\n\r\t' for c in comment):
            raise ValueError('Nhận xét tối đa 1.000 ký tự và không chứa ký tự điều khiển.')
        # Quyền đánh giá lấy từ phiên và đơn ở DB, không tin user_id/receipt_id từ trình duyệt.
        with conn:
            receipt=completed_receipt(conn,uid,dish_id)
            if receipt is None:
                raise Forbidden('Bạn chỉ có thể đánh giá sau khi đơn chứa món này đã hoàn tất.')
            now=datetime.now(timezone.utc).isoformat(timespec='microseconds')
            conn.execute('''INSERT INTO danh_gia(nguoi_dung_id,mon_an_id,receipt_id,so_sao,binh_luan,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?) ON CONFLICT(nguoi_dung_id,mon_an_id) DO UPDATE SET
                receipt_id=excluded.receipt_id,so_sao=excluded.so_sao,binh_luan=excluded.binh_luan,updated_at=excluded.updated_at''',
                (uid,dish_id,receipt['id'],rating,comment.strip(),now,now))
        return jsonify(message='Đã lưu đánh giá của bạn.')


    def manager_restaurants():
        uid=require_user();conn=get_db().conn;account=conn.execute('SELECT role FROM nguoi_dung WHERE id=?',(uid,)).fetchone()
        if account['role']=='admin':return uid,{r[0] for r in conn.execute('SELECT id FROM nha_hang')}
        if account['role']!='merchant':raise Forbidden('Cần quyền quản lý nhà hàng.')
        return uid,{r[0] for r in conn.execute('SELECT nha_hang_id FROM chu_nha_hang WHERE nguoi_dung_id=?',(uid,))}

    @app.get('/api/merchant/reviews')
    def merchant_reviews():
        _,owned=manager_restaurants();raw=request.args.get('restaurant_id','');page_raw=request.args.get('page','1')
        if not raw.isascii() or not raw.isdigit() or not page_raw.isascii() or not page_raw.isdigit() or not 1<=int(page_raw)<=100000:
            raise ValueError('Nhà hàng hoặc trang đánh giá không hợp lệ.')
        rid,page=int(raw),int(page_raw)
        if rid not in owned:raise Forbidden('Bạn không được xem đánh giá của quán này.')
        conn=get_db().conn
        base=''' FROM danh_gia r JOIN mon_an m ON m.id=r.mon_an_id JOIN nha_hang n ON n.id=m.nha_hang_id
          JOIN nguoi_dung u ON u.id=r.nguoi_dung_id LEFT JOIN phan_hoi_danh_gia h ON h.danh_gia_id=r.id
          WHERE m.nha_hang_id=? AND '''+REVIEW_ELIGIBLE
        total=conn.execute('SELECT COUNT(*)'+base,(rid,)).fetchone()[0]
        rows=conn.execute('''SELECT r.id,r.mon_an_id AS dish_id,m.ten AS dish_name,r.so_sao AS rating,
          r.binh_luan AS comment,r.created_at,r.updated_at,u.ten AS author,n.ten AS restaurant_name,
          h.noi_dung AS reply_text,h.updated_at AS reply_updated_at'''+base+
          ' ORDER BY r.updated_at DESC,r.id DESC LIMIT 10 OFFSET ?',(rid,(page-1)*10)).fetchall()
        return jsonify(reviews=[public_review(r) for r in rows],page=page,has_more=page*10<total,total=total)

    @app.put('/api/merchant/reviews/<int:review_id>/reply')
    def save_reply(review_id):
        uid,owned=manager_restaurants();conn=get_db().conn
        row=conn.execute('''SELECT m.nha_hang_id FROM danh_gia r JOIN mon_an m ON m.id=r.mon_an_id
          WHERE r.id=? AND '''+REVIEW_ELIGIBLE,(review_id,)).fetchone()
        if row is None:raise NotFound('Không tìm thấy đánh giá từ người mua hợp lệ.')
        if row['nha_hang_id'] not in owned:raise Forbidden('Bạn không được trả lời đánh giá của quán này.')
        text=body().get('comment')
        if not isinstance(text,str) or not 1<=len(text.strip())<=2000 or any(ord(c)<32 and c not in '\n\r\t' for c in text):
            raise ValueError('Phản hồi cần từ 1 đến 2.000 ký tự và không chứa ký tự điều khiển.')
        now=datetime.now(timezone.utc).isoformat(timespec='microseconds')
        with conn:
            conn.execute('''INSERT INTO phan_hoi_danh_gia VALUES (?,?,?,?,?) ON CONFLICT(danh_gia_id)
              DO UPDATE SET nguoi_tra_loi_id=excluded.nguoi_tra_loi_id,noi_dung=excluded.noi_dung,updated_at=excluded.updated_at''',
              (review_id,uid,text.strip(),now,now))
        return jsonify(message='Đã lưu phản hồi của nhà hàng.')
