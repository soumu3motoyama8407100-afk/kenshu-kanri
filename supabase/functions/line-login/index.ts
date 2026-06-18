import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// LINEログイン用チャネルID（IDトークンの検証に使用）
const LINE_LOGIN_CHANNEL_ID = "2010442697";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return new Response(JSON.stringify({ error: "no_id_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── LINEにIDトークンを検証してもらう（なりすまし防止）──
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: LINE_LOGIN_CHANNEL_ID }),
    });
    const verified = await verifyRes.json();

    if (!verifyRes.ok || !verified.sub) {
      return new Response(JSON.stringify({ error: "invalid_token", detail: verified }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const lineUserId = verified.sub; // LINEの利用者識別ID（名簿の line_user_id と一致するはず）

    // ── 名簿から該当職員を探す ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: emp } = await supabase
      .from("employees")
      .select("id, name, dept, is_manager, managed_depts, role_title, is_active, retire_date")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (!emp) {
      // 紐づけ未登録
      return new Response(JSON.stringify({ status: "not_linked" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 無効アカウント・退職者はログイン不可
    const retired = emp.retire_date && new Date(emp.retire_date) <= new Date();
    if (emp.is_active === false || retired) {
      return new Response(JSON.stringify({ status: "inactive" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ログイン許可：本人を特定できる最小限の情報だけ返す
    return new Response(JSON.stringify({
      status: "ok",
      employee: {
        id: emp.id,
        name: emp.name,
        dept: emp.dept || "",
        isManager: emp.is_manager || false,
        managedDepts: emp.managed_depts || [],
        roleTitle: emp.role_title || "",
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", message: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
