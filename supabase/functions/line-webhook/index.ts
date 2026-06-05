import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET")!;
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifySignature(body: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LINE_CHANNEL_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}

async function replyMessage(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  const body = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  if (!(await verifySignature(body, signature))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const payload = JSON.parse(body);

  for (const event of payload.events ?? []) {

    // 友だち追加 → pending に一時保存して登録案内を送る
    if (event.type === "follow" && event.source?.userId) {
      const lineUserId = event.source.userId;
      await supabase
        .from("pending_line_users")
        .upsert({ line_user_id: lineUserId, followed_at: new Date().toISOString() }, { onConflict: "line_user_id" });

      await replyMessage(
        event.replyToken,
        "👋 ザ・ハートクラブ 職員通知サービスへようこそ！\n\n職員IDを以下の形式で送信して登録を完了してください。\n\n例）職員ID:E001\n\n※職員IDは管理者にご確認ください。"
      );
    }

    // テキストメッセージ受信 → 「職員ID:XXXX」形式で紐づけ
    if (event.type === "message" && event.message?.type === "text" && event.source?.userId) {
      const text = event.message.text.trim();
      const lineUserId = event.source.userId;

      const match = text.match(/^職員ID[:：]\s*([A-Za-z0-9]+)$/i);
      if (match) {
        const empId = match[1].toUpperCase();
        const { data: emp } = await supabase
          .from("employees")
          .select("id, name")
          .eq("id", empId)
          .single();

        if (emp) {
          await supabase
            .from("employees")
            .update({ line_user_id: lineUserId })
            .eq("id", empId);

          await replyMessage(
            event.replyToken,
            `✅ ${emp.name} さんの登録が完了しました！\n\n委員会の開催予定などをLINEでお知らせします。`
          );
        } else {
          await replyMessage(
            event.replyToken,
            `❌ 職員ID「${empId}」は見つかりませんでした。\n\n正しいIDを「職員ID:E001」の形式で送り直してください。`
          );
        }
      } else {
        // 形式が合わないとき
        await replyMessage(
          event.replyToken,
          "登録するには以下の形式で送ってください。\n\n例）職員ID:E001"
        );
      }
    }
  }

  return new Response("OK", { status: 200 });
});
