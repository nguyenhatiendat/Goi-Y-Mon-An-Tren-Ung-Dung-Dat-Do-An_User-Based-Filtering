"""Danh mục thực đơn ban đầu: 80 món, 20 quán. Không có tài khoản/lịch sử giả."""

# (Tên quán, địa chỉ, loại quán, 4 món)
# Mỗi món: tên, nhóm, giá, độ cay 0/1/2, chay 0/1, mã ảnh minh họa.
RESTAURANTS = [
    ('Cơm Nhà 88','88 Nguyễn Văn Lượng, Gò Vấp','Cơm',[
        ('Cơm tấm sườn bì','Cơm',45000,0,0,1),('Cơm gà xối mỡ','Cơm',48000,0,0,2),
        ('Cơm bò lúc lắc','Cơm',55000,1,0,3),('Cơm sườn trứng','Cơm',50000,0,0,1)]),
    ('Cơm Văn Phòng Mộc','24 Phan Văn Trị, Bình Thạnh','Cơm',[
        ('Cơm cá kho tộ','Cơm',45000,1,0,1),('Cơm gà teriyaki','Cơm',49000,0,0,2),
        ('Cơm thịt kho trứng','Cơm',45000,0,0,1),('Cơm rau nấm','Cơm',39000,0,1,19)]),
    ('Bún & Phở Việt','25 Phan Văn Trị, Bình Thạnh','Bún / phở',[
        ('Phở bò tái','Bún / phở',50000,0,0,4),('Bún bò Huế','Bún / phở',50000,2,0,5),
        ('Bún thịt nướng','Bún / phở',42000,0,0,6),('Phở gà','Bún / phở',45000,0,0,4)]),
    ('Bún Bò O Hiền','112 Lê Quang Định, Bình Thạnh','Bún / phở',[
        ('Bún bò đặc biệt','Bún / phở',65000,2,0,5),('Bún bò nạm gân','Bún / phở',55000,1,0,5),
        ('Bún chả cá','Bún / phở',42000,1,0,4),('Bún riêu cua','Bún / phở',45000,0,0,5)]),
    ('Bếp Gà','12 Lê Văn Sỹ, Quận 3','Món gà',[
        ('Gà rán giòn','Món gà',59000,0,0,7),('Gà sốt cay','Món gà',65000,2,0,8),
        ('Gà nướng mật ong','Món gà',69000,0,0,9),('Gà nướng tiêu','Món gà',65000,1,0,9)]),
    ('Gà Rán Golden','35 Quang Trung, Gò Vấp','Món gà',[
        ('Gà sốt phô mai','Món gà',65000,0,0,7),('Gà sốt tỏi mật ong','Món gà',65000,1,0,9),
        ('Gà cay Hàn Quốc','Món gà',69000,2,0,8),('Khoai tây chiên Golden','Ăn vặt',29000,0,1,14)]),
    ('Pizza Corner','40 Nguyễn Gia Trí, Bình Thạnh','Món Âu',[
        ('Pizza hải sản','Món Âu',129000,0,0,10),('Pizza bò sốt tiêu','Món Âu',119000,1,0,10),
        ('Pizza phô mai','Món Âu',109000,0,1,10),('Mì Ý bò bằm','Món Âu',75000,0,0,11)]),
    ('Burger & More','63 Nguyễn Văn Đậu, Phú Nhuận','Món Âu',[
        ('Burger bò phô mai','Món Âu',65000,0,0,12),('Burger gà giòn','Món Âu',55000,0,0,12),
        ('Burger nấm chay','Món Âu',49000,0,1,12),('Khoai tây phủ phô mai','Ăn vặt',35000,0,1,14)]),
    ('Góc Ăn Vặt','16 Quang Trung, Gò Vấp','Ăn vặt',[
        ('Bánh tráng trộn','Ăn vặt',25000,1,0,13),('Cá viên chiên','Ăn vặt',30000,0,0,15),
        ('Trứng cút chiên','Ăn vặt',25000,0,0,15),('Khoai tây chiên','Ăn vặt',30000,0,1,14)]),
    ('Ăn Vặt Nhà Mít','19 Nguyễn Thái Sơn, Gò Vấp','Ăn vặt',[
        ('Bánh tráng cuốn','Ăn vặt',25000,1,0,13),('Cá viên sốt cay','Ăn vặt',35000,2,0,15),
        ('Nem chua rán','Ăn vặt',35000,1,0,15),('Khoai tây lắc phô mai','Ăn vặt',35000,0,1,14)]),
    ('Seoul Kitchen','72 Sư Vạn Hạnh, Quận 10','Món Hàn',[
        ('Cơm trộn Hàn Quốc','Món Hàn',65000,1,0,16),('Kimbap thịt','Món Hàn',45000,0,0,17),
        ('Tokbokki chay','Món Hàn',55000,2,1,18),('Canh kim chi thịt','Món Hàn',60000,2,0,18)]),
    ('Bếp Hàn Miso','95 Nguyễn Gia Trí, Bình Thạnh','Món Hàn',[
        ('Cơm bò bulgogi','Món Hàn',69000,0,0,16),('Kimbap rau củ','Món Hàn',42000,0,1,17),
        ('Mì cay Hàn Quốc','Món Hàn',65000,2,0,18),('Mandu thịt hấp','Món Hàn',45000,0,0,17)]),
    ('Bếp Xanh','10 Điện Biên Phủ, Bình Thạnh','Món chay',[
        ('Cơm chay nấm','Món chay',40000,0,1,19),('Bún chay','Món chay',38000,0,1,20),
        ('Salad rau củ','Món chay',45000,0,1,21),('Gỏi cuốn chay','Món chay',35000,0,1,21)]),
    ('Chay An Nhiên','21 Hoa Sứ, Phú Nhuận','Món chay',[
        ('Phở chay','Món chay',42000,0,1,20),('Cơm nấm đậu hũ','Món chay',45000,0,1,19),
        ('Đậu hũ sốt Tứ Xuyên chay','Món chay',39000,1,1,19),('Mì xào rau củ','Món chay',40000,0,1,20)]),
    ('Tea Cloud','36 Nguyễn Gia Trí, Bình Thạnh','Trà sữa',[
        ('Trà sữa trân châu Tea Cloud','Đồ uống',35000,0,1,22),('Trà sữa ô long kem sữa','Đồ uống',45000,0,1,22),
        ('Trà sữa Thái xanh','Đồ uống',39000,0,1,22),('Sữa tươi trân châu đường đen','Đồ uống',45000,0,1,22)]),
    ('Trà Sữa Mây','52 Lê Văn Thọ, Gò Vấp','Trà sữa',[
        ('Trà sữa truyền thống Mây','Đồ uống',32000,0,1,22),('Matcha latte Mây','Đồ uống',42000,0,1,22),
        ('Trà sữa ô long nướng','Đồ uống',45000,0,1,22),('Trà sữa đường đen Mây','Đồ uống',42000,0,1,22)]),
    ('Trà Sữa Lá Nhỏ','18 Hoa Lan, Phú Nhuận','Trà sữa',[
        ('Trà sữa lài Lá Nhỏ','Đồ uống',39000,0,1,22),('Trà sữa cacao','Đồ uống',42000,0,1,22),
        ('Trà sữa khoai môn','Đồ uống',42000,0,1,22),('Trà dâu nhiệt đới','Đồ uống',32000,0,1,23)]),
    ('Trà Trái Cây Nắng','77 Phạm Văn Đồng, Thủ Đức','Trà trái cây',[
        ('Trà đào cam sả','Đồ uống',32000,0,1,23),('Trà vải hoa lài','Đồ uống',32000,0,1,23),
        ('Trà chanh tươi','Đồ uống',25000,0,1,23),('Trà mận nhiệt đới','Đồ uống',35000,0,1,23)]),
    ('Cà Phê Góc Phố','15 Nguyễn Văn Đậu, Bình Thạnh','Cà phê',[
        ('Cà phê sữa đá','Đồ uống',25000,0,1,24),('Bạc xỉu','Đồ uống',29000,0,1,24),
        ('Cà phê đen đá','Đồ uống',22000,0,1,24),('Cold brew nguyên bản','Đồ uống',35000,0,1,24)]),
    ('Nhà Của Salad','28 Trường Sa, Phú Nhuận','Salad',[
        ('Salad gà nướng','Món Âu',55000,0,0,21),('Salad bơ rau xanh','Món chay',49000,0,1,21),
        ('Salad đậu hũ','Món chay',45000,0,1,21),('Salad cá ngừ','Món Âu',69000,0,0,21)]),
]


def catalog():
    restaurants, foods = [], []
    for restaurant_id, (name, address, kind, menu) in enumerate(RESTAURANTS, 1):
        restaurants.append({'id':restaurant_id,'ten':name,'dia_chi':address,'loai':kind})
        for title, category, price, spice, vegetarian, image in menu:
            foods.append({'id':len(foods)+1,'ten':title,'nha_hang_id':restaurant_id,
                'nhom':category,'gia':price,'cay':spice,'chay':vegetarian,
                'image':f'assets/food-{image:02d}.webp','nha_hang':name,'dia_chi':address,
                'loai_quan':kind})
    return restaurants, foods


CATEGORIES = ['Cơm','Bún / phở','Món gà','Món Âu','Ăn vặt','Món Hàn','Món chay','Đồ uống']
DEFAULT_PREFERENCES = {'min_price':0,'max_price':None,'spice':'any','diet':'any','categories':[]}


def validate_preferences(data):
    if not isinstance(data, dict):
        raise ValueError('Khẩu vị phải là một đối tượng JSON.')
    result = {key:data.get(key, value) for key, value in DEFAULT_PREFERENCES.items()}
    low, high = result['min_price'], result['max_price']
    if type(low) is not int or not 0 <= low <= 100000000:
        raise ValueError('Giá tối thiểu phải từ 0 đến 100.000.000 đồng.')
    if high is not None and (type(high) is not int or not low <= high <= 100000000):
        raise ValueError('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.')
    if result['spice'] not in ('any','none','mild','hot') or result['diet'] not in ('any','vegetarian','nonvegetarian'):
        raise ValueError('Lựa chọn độ cay hoặc chế độ ăn không hợp lệ.')
    categories = result['categories']
    if not isinstance(categories, list) or len(categories) > len(CATEGORIES) or any(c not in CATEGORIES for c in categories):
        raise ValueError('Nhóm món yêu thích không hợp lệ.')
    result['categories'] = list(dict.fromkeys(categories))
    return result


def matches(food, prefs):
    if food['gia'] < prefs['min_price'] or (prefs['max_price'] is not None and food['gia'] > prefs['max_price']):
        return False
    if food['nhom'] != 'Đồ uống':
        if prefs['diet']=='vegetarian' and not food['chay']:
            return False
        if prefs['diet']=='nonvegetarian' and food['chay']:
            return False
        if prefs['spice']=='none' and food['cay'] != 0:
            return False
        if prefs['spice']=='mild' and food['cay'] > 1:
            return False
        if prefs['spice']=='hot' and food['cay'] == 0:
            return False
    return True
