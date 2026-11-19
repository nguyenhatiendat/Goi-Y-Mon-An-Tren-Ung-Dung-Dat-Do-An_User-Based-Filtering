"""Bộ số chỉ nằm trong kiểm thử, không dùng làm lịch sử giả trong chương trình."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path
from catalog import catalog, CATEGORIES
from recommender import goi_y_ca_nhan


class BrowserParityTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'),'Node chỉ dùng để kiểm thử bản xem trước')
    def test_preferences_and_collaborative_parity(self):
        foods=catalog()[1]
        matrix={1:{1:3,9:2},2:{1:2,9:2,10:3,57:2},3:{49:3,57:1},4:{},
                5:{3:1,4:1,5:1,6:1,7:1,41:1,42:1,43:1,44:2,47:1,48:1,
                   57:1,59:1,60:1,62:1,64:1,70:1,71:1}}
        cases=[]
        for uid in matrix:
            for spice in ['any','none','mild','hot']:
                for diet in ['any','vegetarian','nonvegetarian']:
                    for max_price in [None,40000,60000]:
                        for category in ['Tất cả']+CATEGORIES:
                            prefs={'min_price':0,'max_price':max_price,'spice':spice,'diet':diet,'categories':['Món chay','Đồ uống']}
                            result,neighbours=goi_y_ca_nhan(uid,matrix,foods,prefs,category)
                            cases.append({'id':uid,'prefs':prefs,'category':category,
                                'ids':[f['id'] for f in result],'scores':[f['diem'] for f in result],
                                'history_scores':[f['diem_lich_su'] for f in result],
                                'ranking_scores':[f['diem_xep_hang'] for f in result],
                                'reasons':[f['reason'] for f in result],
                                'methods':[f['phuong_phap'] for f in result],
                                'neighbours':[x['ma_nguoi'] for x in neighbours]})
        script='''
          const fs=require('node:fs'),assert=require('node:assert/strict');
          const engine=require(process.argv[1]),data=JSON.parse(fs.readFileSync(0,'utf8'));
          for(const c of data.cases){
            const result=engine.personalised(c.id,data.matrix,data.foods,c.prefs,c.category);
            assert.deepEqual(result.recommendations.map(f=>f.id),c.ids);
            assert.deepEqual(result.recommendations.map(f=>f.phuong_phap),c.methods);
            assert.deepEqual(result.recommendations.map(f=>f.reason),c.reasons);
            assert.deepEqual(result.neighbours.map(n=>n.ma_nguoi),c.neighbours);
            result.recommendations.forEach((f,i)=>assert.ok(Math.abs(f.diem-c.scores[i])<1e-10));
            result.recommendations.forEach((f,i)=>assert.ok(Math.abs(f.diem_lich_su-c.history_scores[i])<1e-10));
            result.recommendations.forEach((f,i)=>assert.ok(Math.abs(f.diem_xep_hang-c.ranking_scores[i])<1e-10));
          }
          console.log(data.cases.length+' cases passed');
        '''
        result=subprocess.run(['node','-e',script,str(Path(__file__).parents[1]/'dist/engine.js')],
            input=json.dumps({'matrix':matrix,'foods':foods,'cases':cases}),text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertIn('1620 cases passed',result.stdout)
