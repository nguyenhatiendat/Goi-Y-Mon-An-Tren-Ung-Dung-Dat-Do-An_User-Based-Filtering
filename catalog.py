"""Danh mục khởi tạo từ CSV và bộ lọc khẩu vị."""
def catalog():
    """Nạp dataset CSV; có thể xem/sửa dữ liệu mà không phải sửa Python."""
    import csv
    from pathlib import Path
    folder=Path(__file__).resolve().parent/'data'
    def read(name, integers):
        with (folder/name).open(encoding='utf-8-sig',newline='') as stream:
            rows=list(csv.DictReader(stream))
        for row in rows:
            for key in integers:
                row[key]=int(row[key])
        return rows
    restaurants=read('restaurants.csv',['id'])
    foods=read('foods.csv',['id','nha_hang_id','gia','cay','chay'])
    by_id={r['id']:r for r in restaurants}
    for food in foods:
        restaurant=by_id[food['nha_hang_id']]
        food.update(nha_hang=restaurant['ten'],dia_chi=restaurant['dia_chi'],loai_quan=restaurant['loai'])
    return restaurants,foods


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
    # Chỉ chọn nhóm Món chay (có thể kèm đồ uống) phải thực sự loại món mặn.
    if 'Món chay' in result['categories'] and set(result['categories'])<={'Món chay','Đồ uống'}:
        result['diet']='vegetarian'
    return result


def matches(food, prefs):
    if food['gia'] < prefs['min_price'] or (prefs['max_price'] is not None and food['gia'] > prefs['max_price']):
        return False
    diet=prefs['diet']
    categories=prefs.get('categories',[])
    if 'Món chay' in categories and set(categories)<={'Món chay','Đồ uống'}:
        diet='vegetarian'
    if food['nhom'] != 'Đồ uống':
        if diet=='vegetarian' and not food['chay']:
            return False
        if diet=='nonvegetarian' and food['chay']:
            return False
        if prefs['spice']=='none' and food['cay'] != 0:
            return False
        if prefs['spice']=='mild' and food['cay'] > 1:
            return False
        if prefs['spice']=='hot' and food['cay'] == 0:
            return False
    return True


def matches_category(food,category):
    # Chay là thuộc tính của món, không chỉ tên một nhóm trong dataset.
    if category=='Món chay':return bool(food['chay']) and food['nhom']!='Đồ uống'
    return category=='Tất cả' or food['nhom']==category
