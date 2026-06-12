# -*- coding: utf-8 -*-
import json, urllib.request, sys
sys.stdout.reconfigure(encoding="utf-8")

URL = "https://nncousuugjntzovtmkvt.supabase.co/rest/v1/employees?select=id,name,dept,is_active,retire_date&order=id"
KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

req = urllib.request.Request(URL, headers=headers)
with urllib.request.urlopen(req) as res:
    rows = json.loads(res.read())

for r in rows:
    if not (r.get("dept") or "").strip():
        print("ID:", r["id"], "/ 氏名:", r["name"], "/ 部署:", repr(r.get("dept")), "/ 在籍:", r.get("is_active"), "/ 退職日:", r.get("retire_date"))
