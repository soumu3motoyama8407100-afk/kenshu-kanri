# -*- coding: utf-8 -*-
import json, urllib.request, sys
sys.stdout.reconfigure(encoding="utf-8")
KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
BASE = "https://nncousuugjntzovtmkvt.supabase.co/rest/v1"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# 1. LINE紐づけを退避
req = urllib.request.Request(f"{BASE}/employees?select=id,name,line_user_id&line_user_id=not.is.null", headers=headers)
with urllib.request.urlopen(req) as res:
    links = json.loads(res.read())
with open("line_backup.json", "w", encoding="utf-8") as f:
    json.dump(links, f, ensure_ascii=False, indent=2)
print("LINE紐づけ退避:", len(links), "件 → line_backup.json")
for l in links: print("  ", l["id"], l["name"])

# 2. 全職員削除
req = urllib.request.Request(f"{BASE}/employees?id=neq.__none__", headers=headers, method="DELETE")
with urllib.request.urlopen(req) as res:
    print("全職員を削除しました")

# 3. 確認
req = urllib.request.Request(f"{BASE}/employees?select=id", headers=headers)
with urllib.request.urlopen(req) as res:
    print("残り:", len(json.loads(res.read())), "件")
