import sys,json,tempfile,contextlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app import create_app
from setup_demo import setup
with tempfile.TemporaryDirectory() as tmp:
 path=tmp+'/ui.db'
 with contextlib.redirect_stdout(sys.stderr):setup(path)
 app=create_app({'DATABASE':path,'SECRET_KEY':'dom-test-only','TESTING':True})
 clients={}
 for line in sys.stdin:
  try:
   d=json.loads(line);client=clients.setdefault(d['client'],app.test_client())
   r=client.open(d['url'],method=d.get('method','GET'),json=d.get('json'),headers=d.get('headers',{}))
   print(json.dumps({'id':d['id'],'status':r.status_code,'data':r.get_json()}),flush=True)
  except Exception as e: print(json.dumps({'id':d.get('id'),'error':str(e)}),flush=True)
