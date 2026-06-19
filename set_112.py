# -*- coding: utf-8 -*-
import json, urllib.request, sys
sys.stdout.reconfigure(encoding="utf-8")
KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
BASE = "https://nncousuugjntzovtmkvt.supabase.co/rest/v1"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

data = {"is_manager": True, "managed_depts": ["ホーム1F","ホーム2F","ホーム3F","ホーム4F"]}
req = urllib.request.Request(f"{BASE}/employees?id=eq.112", data=json.dumps(data).encode(), headers=headers, method="PATCH")
with urllib.request.urlopen(req) as res: pass

req = urllib.request.Request(f"{BASE}/employees?id=eq.112&select=id,name,dept,role_title,is_manager,managed_depts", headers=headers)
with urllib.request.urlopen(req) as res:
    for r in json.loads(res.read()): print(r)
