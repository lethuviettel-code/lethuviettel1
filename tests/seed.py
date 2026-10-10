"""Create fixtures only in a temporary DATA_DIR provided by the browser runner."""
import json
import os
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
from werkzeug.security import generate_password_hash
assert os.environ['DATA_DIR'].startswith('/tmp/viettel-browser-')
with server.database(True) as db:
    db.execute('INSERT INTO users(username,name,password,role) VALUES(?,?,?,?)',('test-owner','Chủ kiểm thử',generate_password_hash(os.environ['TEST_PASSWORD']),'owner'))
    db.execute('INSERT INTO users(username,name,password,role,branch) VALUES(?,?,?,?,?)',('test-staff','Nhân viên thử',generate_password_hash(os.environ['TEST_PASSWORD']),'staff','cs1'))
    for n in range(1000):
        db.execute('INSERT INTO sims(number,price,type,element,branch,status,description,featured,updated) VALUES(?,?,?,?,?,?,?,?,?)',
          ('0868'+str(n).zfill(6),1000000+n*10000,['Sim tứ quý','Sim lộc phát','Sim tam hoa'][n%3],['Kim','Mộc','Thủy','Hỏa','Thổ'][n%5],['cs1','cs2','cs3'][n%3],'available','Mô tả kiểm thử, không phải kho thực tế.',int(n<8),server.now()))
    cfg=server.settings(db)
    cfg.update(hours='08:00–20:00',registration_policy='Đăng ký theo quy định nhà mạng.',privacy_policy='Chính sách dữ liệu kiểm thử.')
    db.execute('UPDATE settings SET value=?',(json.dumps(cfg,ensure_ascii=False),))
