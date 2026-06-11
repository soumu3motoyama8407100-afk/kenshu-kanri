import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 日本時間で10:00〜16:59の間だけ送信する
function isWithinSendingHours(): boolean {
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC→JST
  const hour = nowJST.getUTCHours();
  return hour >= 10 && hour < 17;
}

async function sendPush(lineUserId: string, message: string): Promise<boolean> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: message }],
    }),
  });
  return res.ok;
}

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // POSTで新しい通知をキューに追加（アプリから呼ばれる）
  if (req.method === "POST") {
    try {
      const { notifications } = await req.json();
      // notifications: [{ lineUserId, message }]
      if (Array.isArray(notifications) && notifications.length > 0) {
        await supabase.from("line_notification_queue").insert(
          notifications.map((n: { lineUserId: string; message: string }) => ({
            line_user_id: n.lineUserId,
            message: n.message,
            status: "pending",
          }))
        );
      }
    } catch (_e) { /* キュー追加なしでも送信処理は続行 */ }
  }

  // 時間内なら送信待ちをすべて送信
  if (!isWithinSendingHours()) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "outside sending hours (10:00-17:00 JST)" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: pending } = await supabase
    .from("line_notification_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(100);

  let sent = 0;
  for (const item of pending ?? []) {
    const ok = await sendPush(item.line_user_id, item.message);
    await supabase
      .from("line_notification_queue")
      .update({ status: ok ? "sent" : "failed", sent_at: new Date().toISOString() })
      .eq("id", item.id);
    if (ok) sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
