# -*- coding: utf-8 -*-
import json, urllib.request, sys
sys.stdout.reconfigure(encoding="utf-8")

URL = "https://nncousuugjntzovtmkvt.supabase.co/rest/v1/employees?select=dept"
KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

req = urllib.request.Request(URL, headers=headers)
with urllib.request.urlopen(req) as res:
    rows = json.loads(res.read())

depts = {}
for r in rows:
    d = r.get("dept") or "(空欄)"
    depts[d] = depts.get(d, 0) + 1

for d, c in sorted(depts.items()):
    # 文字コードも表示して全角半角を判別
    codes = " ".join(f"U+{ord(ch):04X}" for ch in d)
    print(f"[{d}] {c}名  ({codes})")
