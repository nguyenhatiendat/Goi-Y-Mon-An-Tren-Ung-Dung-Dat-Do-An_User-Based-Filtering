"""Quyền phản hồi đánh giá và tải ảnh theo đúng chủ quán."""
import io
import sqlite3
import unittest
from pathlib import Path
from PIL import Image
from tests import test_reviews as fixtures


class MerchantFeedbackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):fixtures.ReviewTests.setUpClass.__func__(cls)
    setUp=fixtures.ReviewTests.setUp
    tearDown=fixtures.ReviewTests.tearDown
    send=fixtures.ReviewTests.send
    order=fixtures.ReviewTests.order
    review=fixtures.ReviewTests.review
    public=fixtures.ReviewTests.public

    def sellers(self):
        with sqlite3.connect(self.path) as c:
            c.execute("UPDATE nguoi_dung SET role='merchant' WHERE id=1")
            c.execute('INSERT INTO chu_nha_hang VALUES (1,1)')
            c.execute("UPDATE nguoi_dung SET role='merchant' WHERE id=2")
            c.execute('INSERT INTO chu_nha_hang VALUES (2,2)')

    def test_owner_reply_edit_and_public_visibility_without_changing_stars(self):
        self.order(self.b);self.review(self.b,4,'Khách đã nhận món')
        rid=self.public().get_json()['reviews'][0]['id'];self.sellers()
        self.assertEqual(self.send(self.b,f'/api/merchant/reviews/{rid}/reply',{'comment':'Sai quán'}).status_code,403)
        self.assertEqual(self.send(self.a,f'/api/merchant/reviews/{rid}/reply',{'comment':'Cảm ơn bạn!'}).status_code,200)
        data=self.public().get_json()
        self.assertEqual(data['summary']['rating_average'],4);self.assertEqual(data['summary']['review_count'],1)
        self.assertEqual(data['reviews'][0]['reply']['comment'],'Cảm ơn bạn!')
        self.assertEqual(data['reviews'][0]['reply']['restaurant_name'],'Cơm Nhà 88')
        self.send(self.a,f'/api/merchant/reviews/{rid}/reply',{'comment':'Đã cập nhật phản hồi'})
        with sqlite3.connect(self.path) as c:self.assertEqual(c.execute('SELECT count(*) FROM phan_hoi_danh_gia').fetchone()[0],1)
        self.assertEqual(self.public().get_json()['reviews'][0]['reply']['comment'],'Đã cập nhật phản hồi')
        self.assertNotIn('nguoi_tra_loi_id',str(self.public().get_json()))

    def test_reply_validation_and_tenant_read_permissions(self):
        self.order(self.b);self.review(self.b)
        rid=self.public().get_json()['reviews'][0]['id']
        self.assertEqual(self.send(self.a,f'/api/merchant/reviews/{rid}/reply',{'comment':'Test'}).status_code,403)
        self.sellers()
        for text in ['', ' ','x'*2001,None,123,'abc\x00']:
            self.assertEqual(self.send(self.a,f'/api/merchant/reviews/{rid}/reply',{'comment':text}).status_code,400)
        self.assertEqual(self.send(self.a,'/api/merchant/reviews/99999/reply',{'comment':'Test'}).status_code,404)
        self.assertEqual(self.a.get('/api/merchant/reviews?restaurant_id=1').status_code,200)
        self.assertEqual(len(self.a.get('/api/merchant/reviews?restaurant_id=1').get_json()['reviews']),1)
        self.assertEqual(self.b.get('/api/merchant/reviews?restaurant_id=1').status_code,403)
        self.assertEqual(self.a.get('/api/merchant/reviews?restaurant_id=1&page=0').status_code,400)
        self.assertEqual(self.a.put(f'/api/merchant/reviews/{rid}/reply',json={'comment':'No CSRF'}).status_code,403)

    def upload(self,client,blob,fid=1,filename='photo.png'):
        token=client.get('/api/session').get_json()['csrf_token']
        return client.post(f'/api/merchant/foods/{fid}/image',data={'image':(io.BytesIO(blob),filename)},headers={'X-CSRF-Token':token},content_type='multipart/form-data')

    def test_photo_upload_decodes_image_checks_ownership_and_retains_on_menu_edit(self):
        self.sellers();buffer=io.BytesIO();Image.new('RGB',(240,180),'green').save(buffer,format='PNG')
        blob=buffer.getvalue();self.assertEqual(self.upload(self.b,blob).status_code,403)
        response=self.upload(self.a,blob,filename='../../anything.png');self.assertEqual(response.status_code,200)
        image=response.get_json()['image'];path=Path(__file__).resolve().parents[1]/'dist'/image
        try:
            self.assertRegex(image,r'^assets/uploads/[a-f0-9]{32}\.webp$')
            with Image.open(path) as photo:self.assertEqual(photo.format,'WEBP')
            food=self.a.get('/api/catalog').get_json()['foods'][0];self.assertEqual(food['image'],image)
            food['gia']=47000
            self.assertEqual(self.send(self.a,'/api/merchant/foods/1',food).status_code,200)
            self.assertEqual(self.a.get('/api/catalog').get_json()['foods'][0]['image'],image)
        finally:path.unlink(missing_ok=True)

    def test_old_stock_images_migrate_without_overwriting_merchant_edits(self):
        from database import DuLieu
        db=DuLieu(self.path)
        with db.conn:
            db.conn.execute("DELETE FROM app_migrations WHERE name='dish_photos_v1'")
            db.conn.execute("UPDATE mon_an SET image='assets/food-01.webp' WHERE id=1")
            db.conn.execute("UPDATE mon_an SET image='assets/food-07.webp' WHERE id=2")
            db.conn.execute("UPDATE mon_an SET ten='Tên món riêng',image='assets/food-03.webp' WHERE id=3")
        db.dong();db=DuLieu(self.path);foods={f['id']:f for f in db.thuc_don()}
        self.assertEqual(foods[1]['image'],'assets/dishes/dish-001.webp')
        self.assertEqual(foods[2]['image'],'assets/food-07.webp')
        self.assertEqual(foods[3]['ten'],'Tên món riêng');self.assertEqual(foods[3]['image'],'assets/food-03.webp')
        db.dong()

    def test_bad_or_oversize_images_are_rejected(self):
        self.sellers()
        for blob in [b'<svg><script/></svg>',b'not an image',b'x'*(5*1024*1024+1)]:
            self.assertEqual(self.upload(self.a,blob).status_code,400)
        tiny=io.BytesIO();Image.new('RGB',(10,10)).save(tiny,'PNG')
        self.assertEqual(self.upload(self.a,tiny.getvalue()).status_code,400)


if __name__=='__main__':unittest.main(verbosity=2)
