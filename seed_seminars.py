# -*- coding: utf-8 -*-
import json, urllib.request

URL = "https://nncousuugjntzovtmkvt.supabase.co/rest/v1/seminars"
KEY = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m"

seminars = [
    {"id": "S260501", "title": "心を通わせるコミュニケーション ～第一印象から信頼へつなぐ3つのポイント～",
     "date": "2026-05-01", "organizer": "リブドゥ", "video_url": "",
     "description": "第一印象で信頼を築く「表情・挨拶・身だしなみ」の基本を習得。心地よい人間関係を育むコミュニケーション術。"},
    {"id": "S260502", "title": "福祉現場における“ケアする人”のセルフケア ～ひと呼吸おける心のゆとりがもてるように～",
     "date": "2026-05-01", "organizer": "リブドゥ", "video_url": "",
     "description": "感情労働の負担軽減とストレス対処法。交流分析やストレス診断で自分に合ったセルフケアを学ぶ。"},
    {"id": "S260601", "title": "手洗いだけじゃない！食事提供時に求められる衛生管理 ～見落としがちな感染リスク～",
     "date": "2026-06-01", "organizer": "リブドゥ", "video_url": "",
     "description": "食事を提供する際の手洗い・調理器具の清潔さなど、見落としがちな感染リスクと対策を紹介。"},
    {"id": "S260602", "title": "看護と介護の交差点 ～IADケア“おしりが赤い…”をどう伝える？～",
     "date": "2026-06-01", "organizer": "リブドゥ", "video_url": "",
     "description": "おむつ内スキントラブルの予防は最大の治療。看護と介護の連携・伝え方のコツを共通言語で学ぶ。"},
]

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

for s in seminars:
    req = urllib.request.Request(URL, data=json.dumps(s).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req) as res:
        print(s["id"], res.status)

# 確認
req = urllib.request.Request(URL + "?select=id,title,date&order=date", headers=headers)
with urllib.request.urlopen(req) as res:
    for row in json.loads(res.read()):
        print(row["date"], row["id"], row["title"][:30])
