# -*- coding: utf-8 -*-
import json, urllib.request, urllib.error, sys
sys.stdout.reconfigure(encoding="utf-8")

KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
BASE = "https://nncousuugjntzovtmkvt.supabase.co/rest/v1"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# 1. i_statusesの既存データ件数
req = urllib.request.Request(f"{BASE}/i_statuses?select=emp_id,training_id,attendance,attended_session&limit=5", headers=headers)
try:
    with urllib.request.urlopen(req) as res:
        rows = json.loads(res.read())
        print("既存データ取得OK:", len(rows), "件（先頭5件）")
        for r in rows: print(" ", r)
except urllib.error.HTTPError as e:
    print("取得エラー:", e.code, e.read().decode())

# 2. テスト書き込み（upsert）
body = json.dumps({"emp_id":"TEST999","training_id":"TTEST","attendance":"参加済","report":"未提出","video":"未視聴","report_confirmed":False,"attended_session":""})
req = urllib.request.Request(f"{BASE}/i_statuses?on_conflict=emp_id,training_id", data=body.encode(), headers={**headers,"Prefer":"resolution=merge-duplicates"}, method="POST")
try:
    with urllib.request.urlopen(req) as res:
        print("書き込みテストOK:", res.status)
except urllib.error.HTTPError as e:
    print("書き込みエラー:", e.code, e.read().decode())

# 3. テスト行を削除
req = urllib.request.Request(f"{BASE}/i_statuses?emp_id=eq.TEST999", headers=headers, method="DELETE")
try:
    with urllib.request.urlopen(req) as res:
        print("テスト行削除OK")
except urllib.error.HTTPError as e:
    print("削除エラー:", e.code, e.read().decode())
