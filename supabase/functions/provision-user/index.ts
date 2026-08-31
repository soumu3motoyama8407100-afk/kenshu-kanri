import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 職員の追加・パスワード変更・削除に合わせて、Supabase Auth のログインアカウントを作成/更新/削除する。
// 呼び出せるのは「ログイン済みの管理者」だけ（JWTを検証）。service_role はサーバー側のみ。
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AUTH_EMAIL_DOMAIN = "kenshu.thc-club.jp";
const idToEmail = (id: string) => String(id).trim().toLowerCase() + "@" + AUTH_EMAIL_DOMAIN;
// Supabase Authは最小6文字。短いパスワードでも通るよう固定接尾辞（アプリ/移行スクリプトと一致必須）
const PW_SUFFIX = "#thc-kenshu";
const toAuthPw = (pw: string) => String(pw) + PW_SUFFIX;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// email から Auth ユーザーを探す（listUsers をページ走査）
async function findUserByEmail(admin: any, email: string) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("listUsers: " + error.message);
    const users = data?.users || [];
    const hit = users.find((u: any) => (u.email || "").toLowerCase() === target);
    if (hit) return hit;
    if (users.length < 1000) break;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    // ── 呼び出し元が「ログイン済みの管理者」か確認 ──
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const callerEmail = (userData?.user?.email || "").toLowerCase();
    if (!callerEmail) return json({ error: "unauthorized" }, 401);
    const callerId = callerEmail.split("@")[0];
    let isAdmin = callerId === "admin";
    if (!isAdmin) {
      const { data: emp } = await admin.from("employees").select("is_admin").eq("id", callerId).maybeSingle();
      isAdmin = !!(emp && emp.is_admin);
    }
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    // ── 実行 ──
    const { action, id, password } = await req.json();
    if (!id) return json({ error: "no_id" }, 400);
    const email = idToEmail(id);
    const existing = await findUserByEmail(admin, email);

    if (action === "delete") {
      if (existing) {
        const { error } = await admin.auth.admin.deleteUser(existing.id);
        if (error) throw new Error("deleteUser: " + error.message);
      }
      return json({ status: "ok", deleted: !!existing });
    }

    // action=upsert（既定）：作成 or パスワード同期
    if (!password) return json({ error: "no_password" }, 400);
    const meta = { emp_id: String(id), name: "" };
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, { password: toAuthPw(password), email_confirm: true, user_metadata: { ...(existing.user_metadata || {}), emp_id: String(id) } });
      if (error) throw new Error("updateUser: " + error.message);
      return json({ status: "ok", updated: true });
    } else {
      const { error } = await admin.auth.admin.createUser({ email, password: toAuthPw(password), email_confirm: true, user_metadata: meta });
      if (error) throw new Error("createUser: " + error.message);
      return json({ status: "ok", created: true });
    }
  } catch (e) {
    return json({ error: "server_error", message: String((e as Error).message || e) }, 500);
  }
});
