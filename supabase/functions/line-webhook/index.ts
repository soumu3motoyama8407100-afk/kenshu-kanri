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

async function replyMessage(replyToken: string, text: string, quickReplies?: {label: string, text: string}[]) {
  const message: Record<string, unknown> = { type: "text", text };
  if (quickReplies && quickReplies.length > 0) {
    message.quickReply = {
      items: quickReplies.map(q => ({
        type: "action",
        action: { type: "message", label: q.label, text: q.text }
      }))
    };
  }
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [message] }),
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

    // ─── 友だち追加 ───────────────────────────────────────────────────
    if (event.type === "follow" && event.source?.userId) {
      const lineUserId = event.source.userId;
      await supabase
        .from("pending_line_users")
        .upsert(
          { line_user_id: lineUserId, followed_at: new Date().toISOString(), pending_emp_id: null },
          { onConflict: "line_user_id" }
        );

      await replyMessage(
        event.replyToken,
        "※※初回登録※※\nこちらに職員番号を送信してください。\n\n例）003"
      );
    }

    // ─── テキストメッセージ受信 ────────────────────────────────────────
    if (event.type === "message" && event.message?.type === "text" && event.source?.userId) {
      const text = event.message.text.trim();
      const lineUserId = event.source.userId;

      // 確認待ち状態を取得
      const { data: pending } = await supabase
        .from("pending_line_users")
        .select("pending_emp_id")
        .eq("line_user_id", lineUserId)
        .single();

      const pendingEmpId = pending?.pending_emp_id || null;

      // ── 「はい」「いいえ」の返答待ち中 ──
      if (pendingEmpId) {
        if (text === "はい" || text === "YES" || text === "yes") {
          // 登録確定前に既登録チェック
          const { data: alreadyReg } = await supabase
            .from("employees")
            .select("id, name")
            .eq("line_user_id", lineUserId)
            .maybeSingle();

          if (alreadyReg) {
            await supabase.from("pending_line_users").update({ pending_emp_id: null }).eq("line_user_id", lineUserId);
            await replyMessage(
              event.replyToken,
              `✅ すでに「${alreadyReg.name}」さんとして登録済みです。\n\n登録内容の変更は管理者にお問い合わせください。`
            );
            continue;
          }

          // 登録確定
          await supabase
            .from("employees")
            .update({ line_user_id: lineUserId })
            .eq("id", pendingEmpId);

          await supabase
            .from("pending_line_users")
            .update({ pending_emp_id: null })
            .eq("line_user_id", lineUserId);

          const { data: emp } = await supabase
            .from("employees")
            .select("name")
            .eq("id", pendingEmpId)
            .single();

          await replyMessage(
            event.replyToken,
            `✅ 登録が完了しました！\n\n${emp?.name} さん、よろしくお願いします。\n\nこの公式LINEは、研修や法人からのお知らせをお届けするための専用公式アカウントです。\n\n・こちらへのメッセージ送信はお控えください\n・ブロックはせず、通知を止めたいときはLINEの通知オフ設定をご利用ください（災害時の連絡にも使います）\n\n詳しくはこちら↓\nhttps://kenshu-kanri.vercel.app/line-privacy.html`
          );

        } else if (text === "いいえ" || text === "NO" || text === "no") {
          // 登録キャンセル → 入力し直し
          await supabase
            .from("pending_line_users")
            .update({ pending_emp_id: null })
            .eq("line_user_id", lineUserId);

          await replyMessage(
            event.replyToken,
            "もう一度、職員番号を送信してください。\n\n例）E001\n\n※職員番号は管理者にご確認ください。"
          );

        } else {
          // はい／いいえ以外
          const { data: emp } = await supabase
            .from("employees")
            .select("name")
            .eq("id", pendingEmpId)
            .single();

          await replyMessage(
            event.replyToken,
            `${emp?.name} さんで合っていますか？\n\n下のボタンを押してください。`,
            [{ label: "✅ はい", text: "はい" }, { label: "❌ いいえ", text: "いいえ" }]
          );
        }
        continue;
      }

      // ── 職員番号の入力 ──
      // メッセージから職員番号の候補を抽出（「003」だけでなく「003です」「番号は003」等にも対応）
      const trimmed = text.replace(/\s/g, "");
      const candidates: string[] = [];
      if (/^[A-Za-z0-9]+$/.test(trimmed)) candidates.push(trimmed.toUpperCase()); // 文字列そのまま（E001等）
      for (const d of (text.match(/\d+/g) || [])) candidates.push(d);             // 文中の数字のかたまり
      const uniqCandidates = [...new Set(candidates)];

      if (uniqCandidates.length > 0) {
        // すでに登録済みの場合は上書きしない
        const { data: alreadyRegistered } = await supabase
          .from("employees")
          .select("id, name")
          .eq("line_user_id", lineUserId)
          .maybeSingle();

        if (alreadyRegistered) {
          await replyMessage(
            event.replyToken,
            `✅ すでに「${alreadyRegistered.name}」さんとして登録済みです。\n\n登録内容の変更は管理者にお問い合わせください。`
          );
          continue;
        }

        // 候補を順に照合し、最初に一致した職員を採用
        let emp: { id: string; name: string } | null = null;
        for (const c of uniqCandidates) {
          const { data } = await supabase
            .from("employees")
            .select("id, name")
            .eq("id", c)
            .maybeSingle();
          if (data) { emp = data; break; }
        }

        if (emp) {
          // 確認待ち状態を保存（名前で本人確認するので誤抽出は「いいえ」で止められる）
          await supabase
            .from("pending_line_users")
            .upsert(
              { line_user_id: lineUserId, pending_emp_id: emp.id },
              { onConflict: "line_user_id" }
            );

          await replyMessage(
            event.replyToken,
            `「${emp.name}」さんで合っていますか？`,
            [{ label: "✅ はい", text: "はい" }, { label: "❌ いいえ", text: "いいえ" }]
          );
        } else {
          await replyMessage(
            event.replyToken,
            `職員番号が確認できませんでした。\n\nお手数ですが、職員番号（数字）だけを送ってください。\n\n例）003`
          );
        }
      } else {
        // 数字が含まれていない
        await replyMessage(
          event.replyToken,
          "職員番号を送信してください。\n\n例）003"
        );
      }
    }
  }

  return new Response("OK", { status: 200 });
});
