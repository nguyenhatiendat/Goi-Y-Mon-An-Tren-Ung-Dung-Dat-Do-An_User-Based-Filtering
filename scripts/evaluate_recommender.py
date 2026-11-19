"""Đánh giá offline trên CSV mô phỏng, tách theo thời gian, không đọc test khi chọn hàng xóm."""
import csv
import json
import math
import sys
import time
from collections import defaultdict
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from catalog import catalog
from recommender import goi_y,UserBasedIndex

ROOT=Path(__file__).resolve().parents[1]


def evaluate(k=10):
    with (ROOT/'data/interactions_demo.csv').open(encoding='utf-8-sig') as f:events=list(csv.DictReader(f))
    train=defaultdict(dict);test=defaultdict(set)
    cutoff='2026-10-20T00:00:00+00:00'
    for e in events:
        uid,fid=int(e['user_id']),int(e['food_id'])
        if e['ordered_at']<cutoff:train[uid][fid]=train[uid].get(fid,0)+1
        else:test[uid].add(fid)
    targets={uid:ids-set(train.get(uid,{})) for uid,ids in test.items() if uid in train}
    targets={u:ids for u,ids in targets.items() if ids}
    foods=catalog()[1];report={'dataset':'SYNTHETIC demo CSV, not real-user quality','cutoff':cutoff,
        'training_events':sum(sum(v.values()) for v in train.values()),'test_events':sum(e['ordered_at']>=cutoff for e in events),
        'evaluated_users':len(targets),'k':k,'protocol':'Global temporal holdout; relevant items are held-out dishes unseen in training; no parameter tuning on this test.'}
    prepare=time.perf_counter();index=UserBasedIndex(dict(train));report['sparse_index_build_ms']=(time.perf_counter()-prepare)*1000
    prepare=time.perf_counter();experimental=UserBasedIndex(dict(train),regularized=True);report['experimental_index_build_ms']=(time.perf_counter()-prepare)*1000
    report['timing_note']='Optimized inference uses one prepared index, like the app cache; index build cost is reported separately.'
    for name in ['raw_cosine','sparse_user_based_default','normalized_shrinkage_experimental']:
        p=r=hit=ndcg=0;coverage=set();started=time.perf_counter()
        for uid,truth in sorted(targets.items()):
            if name=='raw_cosine':items=goi_y(uid,dict(train),foods,top_n=k)[0]
            else:items=(experimental if name=='normalized_shrinkage_experimental' else index).recommend(uid,foods,limit=k)[0]
            ids=[f['id'] for f in items if f['phuong_phap']=='Lọc cộng tác'][:k]
            hits=len(set(ids)&truth);p+=hits/k;r+=hits/len(truth);hit+=hits>0;coverage.update(ids)
            dcg=sum(1/math.log2(i+2) for i,fid in enumerate(ids) if fid in truth)
            ideal=sum(1/math.log2(i+2) for i in range(min(k,len(truth))))
            ndcg+=dcg/ideal
        n=len(targets) or 1
        report[name]={'precision_at_k':p/n,'recall_at_k':r/n,'hit_rate_at_k':hit/n,'ndcg_at_k':ndcg/n,
                      'catalog_coverage':len(coverage)/len(foods),'milliseconds_per_user':(time.perf_counter()-started)*1000/n}
    return report


if __name__=='__main__':
    result=evaluate();print(json.dumps(result,ensure_ascii=False,indent=2))
    (ROOT/'BAO_CAO_DANH_GIA_THUAT_TOAN.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
