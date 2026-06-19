# -*- coding: utf-8 -*-
import json, urllib.request, sys
sys.stdout.reconfigure(encoding="utf-8")
KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
req = urllib.request.Request("https://nncousuugjntzovtmkvt.supabase.co/rest/v1/internals?select=id,title,date,no_report&order=date", headers=headers)
with urllib.request.urlopen(req) as res:
    for r in json.loads(res.read()):
        print(r["date"], "/", r["id"], "/", r["title"], "/ 復命書不要:", r.get("no_report"))
