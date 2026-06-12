# -*- coding: utf-8 -*-
import json, urllib.request, sys
sys.stdout.reconfigure(encoding="utf-8")

KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"
headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

def get(path):
    req = urllib.request.Request(f"https://nncousuugjntzovtmkvt.supabase.co/rest/v1/{path}", headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

print("=== 内部研修一覧 ===")
for r in get("internals?select=id,title,date,video_url,target_emp_ids&order=date"):
    print(r["date"], "/", r["title"][:25], "/ 動画URL:", "あり" if r.get("video_url") else "なし", "/ 参加者指定:", r.get("target_emp_ids"))

print()
print("=== 職員158 ===")
for r in get("employees?id=eq.158&select=id,name,dept"):
    print(r)
