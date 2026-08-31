// LINEログインの心臓部（サーバーでmagiclinkトークン発行 → クライアントでverifyOtpしてセッション確立）を検証する。
// どの type（magiclink / email）でセッションが張れるかを判定して表示する。実行後、結果をClaudeに貼ってください。
//   cd C:\Users\heart42\kenshu-kanri
//   $env:SUPABASE_SECRET_KEY="（Secretキー）"; node scripts/test-magiclink.mjs; $env:SUPABASE_SECRET_KEY=""

import { createClient } from "@supabase/supabase-js";

const URL = "https://nncousuugjntzovtmkvt.supabase.co";
const ANON = "sb_publishable_vtuNEJnmkkZ3N5xTKbghEQ_RekJsS6m";
const SECRET = process.env.SUPABASE_SECRET_KEY;
const EMAIL = "158@kenshu.thc-club.jp"; // 既存の職員アカウントで検証

if (!SECRET) { console.error("SUPABASE_SECRET_KEY が未設定です。"); process.exit(1); }

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });

async function tryType(type) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: EMAIL });
  if (error) return "generateLink NG: " + error.message;
  const token_hash = data?.properties?.hashed_token;
  if (!token_hash) return "token_hash が取得できませんでした";
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const v = await anon.auth.verifyOtp({ token_hash, type });
  if (v.error) return "verifyOtp(" + type + ") NG: " + v.error.message;
  return "verifyOtp(" + type + ") OK → セッション成立 user=" + (v.data?.user?.email || "?");
}

console.log("― magiclink検証 ―");
console.log("type=magiclink :", await tryType("magiclink"));
console.log("type=email     :", await tryType("email"));
