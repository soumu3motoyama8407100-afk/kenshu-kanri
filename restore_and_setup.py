# -*- coding: utf-8 -*-
import json, urllib.request, urllib.error, sys
sys.stdout.reconfigure(encoding="utf-8")
KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
BASE = "https://nncousuugjntzovtmkvt.supabase.co/rest/v1"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def patch(emp_id, data):
    req = urllib.request.Request(f"{BASE}/employees?id=eq.{emp_id}", data=json.dumps(data).encode(), headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as res: return True
    except urllib.error.HTTPError as e:
        print("更新エラー", emp_id, e.read().decode()); return False

# 1. LINE紐づけ復元
with open("line_backup.json", encoding="utf-8") as f:
    links = json.load(f)
for l in links:
    ok = patch(l["id"], {"line_user_id": l["line_user_id"]})
    print("LINE復元:", l["id"], l["name"], "OK" if ok else "NG")

# 2. 部署長権限設定
print("340 → ホーム3F・4F:", "OK" if patch("340", {"is_manager": True, "managed_depts": ["ホーム3F","ホーム4F"]}) else "NG")
print("128 → ホーム1F・2F:", "OK" if patch("128", {"is_manager": True, "managed_depts": ["ホーム1F","ホーム2F"]}) else "NG")

# 3. 部署名一覧と340/128の確認
req = urllib.request.Request(f"{BASE}/employees?select=dept", headers=headers)
with urllib.request.urlopen(req) as res:
    depts = {}
    for r in json.loads(res.read()):
        d = r.get("dept") or "(空欄)"
        depts[d] = depts.get(d,0)+1
print("\n=== 部署一覧 ===")
for d,c in sorted(depts.items()): print(f"  [{d}] {c}名")

req = urllib.request.Request(f"{BASE}/employees?id=in.(340,128)&select=id,name,dept,role_title,is_manager,managed_depts", headers=headers)
with urllib.request.urlopen(req) as res:
    print("\n=== 権限確認 ===")
    for r in json.loads(res.read()): print(" ", r)
