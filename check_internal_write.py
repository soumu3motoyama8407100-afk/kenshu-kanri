# -*- coding: utf-8 -*-
import json, urllib.request, urllib.error, sys
sys.stdout.reconfigure(encoding="utf-8")

KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
BASE = "https://nncousuugjntzovtmkvt.supabase.co/rest/v1"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"}

# アプリと同じ全列でテスト書き込み
body = json.dumps({
    "id":"TTEST01","title":"テスト説明会","date":"2026-05-01","date2":"",
    "required":False,"required_emp_ids":[],"target_emp_ids":[],
    "video_url":"","description":"","location":"","start_time":"17:30","end_time":"18:30",
    "no_report":True
})
req = urllib.request.Request(f"{BASE}/internals?on_conflict=id", data=body.encode(), headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as res:
        print("書き込みOK:", res.status)
except urllib.error.HTTPError as e:
    print("書き込みエラー:", e.code, e.read().decode())

# 削除
req = urllib.request.Request(f"{BASE}/internals?id=eq.TTEST01", headers=headers, method="DELETE")
try:
    with urllib.request.urlopen(req) as res:
        print("テスト行削除OK")
except urllib.error.HTTPError as e:
    print("削除エラー:", e.code, e.read().decode())
