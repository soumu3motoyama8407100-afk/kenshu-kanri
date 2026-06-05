import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  // 軽いクエリを実行してプロジェクトをアクティブに保つ
  await supabase.from("employees").select("id").limit(1);
  return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
