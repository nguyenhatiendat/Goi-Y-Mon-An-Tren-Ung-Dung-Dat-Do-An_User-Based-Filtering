"""Kiểm tra giao diện bằng Chromium cục bộ trên DB tạm.
Tùy chọn dành cho người phát triển: pip install playwright; cần Chromium.
Không ảnh hưởng instance/foodmatch_v2.db.
"""
import sys
import tempfile
import threading
import shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from werkzeug.serving import make_server
from playwright.sync_api import sync_playwright, expect
from app import create_app
from setup_demo import setup


def check():
    with tempfile.TemporaryDirectory() as folder:
        path=Path(folder)/'ui.db';setup(path)
        app=create_app({'DATABASE':str(path),'SECRET_KEY':'ui-only','TESTING':True})
        server=make_server('127.0.0.1',0,app,threaded=True)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
                errors=[]
                ctx=browser.new_context(viewport={'width':1440,'height':1000});customer=ctx.new_page();customer.on('pageerror',lambda e:errors.append(str(e)))
                customer.goto(base)
                customer.locator('[data-auth-mode="register"]').click()
                customer.locator('#authName').fill('Khách kiểm tra')
                customer.locator('#authEmail').fill('smoke@example.com')
                customer.locator('#authPassword').fill('password123')
                customer.locator('#authConfirm').fill('password123')
                customer.locator('#authSubmit').click()
                expect(customer.locator('#preferencesDialog')).to_be_visible()
                customer.locator('#skipPreferences').click()
                expect(customer.locator('#preferencesDialog')).not_to_be_visible()
                customer.locator('[data-view="restaurants"]').first.click()
                expect(customer.locator('.restaurant-card')).to_have_count(20)
                customer.locator('[data-restaurant="1"]').click()
                expect(customer.locator('.food-card')).to_have_count(4)
                customer.locator('[data-add="1"]').click()
                customer.locator('#cartButton').click()
                customer.locator('#checkoutButton').click()
                expect(customer.locator('#cartDialog')).not_to_be_visible()
                customer.locator('[data-view="history"]').first.click()
                expect(customer.locator('.data-table tbody')).to_contain_text('Chờ nhà hàng xác nhận')
                sellerctx=browser.new_context(viewport={'width':1366,'height':1000});seller=sellerctx.new_page();seller.on('pageerror',lambda e:errors.append(str(e)))
                seller.goto(base+'/merchant')
                seller.locator('#loginForm [name="email"]').fill('seller01@foodmatch.local')
                seller.locator('#loginForm [name="password"]').fill('FoodMatch@123')
                seller.locator('#loginForm button').click()
                expect(seller.locator('#orderList')).to_contain_text('Cơm tấm sườn bì')
                for status in ['accepted','preparing','ready','completed']:
                    seller.locator(f'[data-status="{status}"]').click()
                    expect(seller.locator('#orderList .pill')).to_contain_text({'accepted':'Đã xác nhận','preparing':'Đang chuẩn bị','ready':'Sẵn sàng giao','completed':'Hoàn tất'}[status])
                customer.reload()
                customer.locator('[data-view="history"]').first.click()
                expect(customer.locator('.data-table tbody')).to_contain_text('Hoàn tất')
                seller.locator('[data-tab="menu"]').click();seller.locator('#addFood').click()
                seller.locator('#foodForm [name="ten"]').fill('Cơm thử qua giao diện')
                seller.locator('#foodForm [name="gia"]').fill('41000')
                seller.locator('#foodForm button.primary').click()
                expect(seller.locator('#foodDialog')).not_to_be_visible()
                expect(seller.locator('#foodList')).to_contain_text('Cơm thử qua giao diện')
                new=seller.locator('#foodList article').filter(has_text='Cơm thử qua giao diện')
                new.locator('[data-edit]').click()
                seller.locator('#foodForm [name="gia"]').fill('43000')
                seller.locator('#foodForm button.primary').click()
                expect(new).to_contain_text('43.000đ')
                new.locator('[data-toggle]').click();expect(new).to_contain_text('Hết món / ẩn')
                customer.locator('[data-view="restaurants"]').first.click();customer.locator('[data-restaurant="1"]').click()
                item=customer.locator('.food-card').filter(has_text='Cơm thử qua giao diện')
                expect(item.locator('[data-add]')).to_be_disabled()
                new.locator('[data-toggle]').click();expect(new).to_contain_text('Đang bán')
                seller.locator('[data-tab="profile"]').click()
                seller.locator('#profileForm [name="is_open"]').select_option('0')
                seller.locator('#profileForm button').click()
                expect(seller.locator('#restaurant')).to_contain_text('Tạm đóng')
                customer.locator('[data-view="restaurants"]').first.click();customer.locator('[data-restaurant="1"]').click()
                expect(customer.locator('.food-card [data-add]:enabled')).to_have_count(0)
                # Hai phiên khác nhau để chứng minh khách và người bán dùng cùng dữ liệu máy chủ.
                seller.set_viewport_size({'width':390,'height':844})
                assert seller.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Merchant mobile overflow'
                customer.set_viewport_size({'width':390,'height':844})
                assert customer.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Customer mobile overflow'
                assert errors==[],errors
                browser.close()
                print('UI PASS: đăng ký, chọn khẩu vị, mở quán, đặt món, 4 bước xử lý đơn, lịch sử khách, thêm/sửa/ẩn/mở bán món, đóng cửa, mobile, không lỗi JavaScript.')
        finally: server.shutdown()


if __name__=='__main__':check()
