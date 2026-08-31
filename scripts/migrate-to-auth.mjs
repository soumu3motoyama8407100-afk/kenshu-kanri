// 既存の職員（employees テーブル）を Supabase Auth の正式アカウントに登録する一回きりの移行スクリプト。
// ・本番アプリの動作には影響しません（この段階ではアプリは従来ログインのまま動きます）。
// ・べき等：何度実行しても安全（既にあれば作らず、パスワードだけ同期します）。
//
// 実行方法（Secretキーは画面/チャットに残さない形で。PowerShell の例）:
//   cd C:\Users\heart42\kenshu-kanri
//   $env:SUPABASE_SECRET_KEY="（Supabaseのservice_role/Secretキー）"; node scripts/migrate-to-auth.mjs
// 実行後は $env:SUPABASE_SECRET_KEY="" で消しておくと安心です。

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nncousuugjntzovtmkvt.supabase.co";
const SECRET = process.env.SUPABASE_SECRET_KEY;

// ★アプリのログインと必ず同じ変換を使うこと（App.js 側と一致させる）
const AUTH_DOMAIN = "kenshu.thc-club.jp";
const idToEmail = (id) => String(id).trim().toLowerCase() + "@" + AUTH_DOMAIN;

// 従来ログインの管理者アカウント（employees には無いので明示的に含める）
const ADMIN = { id: "ADMIN", password: "admin123", name: "管理者" };

if (!SECRET) {
  console.error("環境変数 SUPABASE_SECRET_KEY が設定されていません。Secret(service_role)キーを入れて実行してください。");
  process.exit(1);
}
if (!/^sb_secret_|service_role|^eyJ/.test(SECRET)) {
  console.warn("※ 念のため：これは Secret(service_role) キーですか？ publishable/anon キーでは動きません。");
}

const admin = createClient(SUPABASE_URL, SECRET, { auth: { autoRefreshToken: false, persistSession: false } });

// 既存の Auth ユーザーのメール一覧（重複作成を避ける）
async function loadExistingEmails() {
  const set = new Map();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("listUsers 失敗: " + error.message);
    const users = data?.users || [];
    for (const u of users) if (u.email) set.set(u.email.toLowerCase(), u.id);
    if (users.length < 1000) break;
  }
  return set;
}

async function main() {
  console.log("職員データを取得中…");
  const { data: emps, error } = await admin.from("employees").select("id,password,name");
  if (error) throw new Error("employees 取得失敗: " + error.message);

  const targets = [ADMIN, ...(emps || [])];
  console.log(`対象 ${targets.length} 件（ADMIN含む）。既存アカウントを確認中…`);
  const existing = await loadExistingEmails();

  let created = 0, updated = 0, skipped = 0, failed = 0;
  for (const e of targets) {
    const id = (e.id ?? "").toString().trim();
    const pw = (e.password ?? "").toString();
    if (!id || !pw) { skipped++; console.log(`  skip: id=${id || "(空)"} パスワード未設定`); continue; }
    const email = idToEmail(id);
    const meta = { emp_id: id, name: e.name || "" };
    try {
      const existId = existing.get(email);
      if (existId) {
        // 既にある：パスワードとメタ情報を同期
        const { error: uErr } = await admin.auth.admin.updateUserById(existId, { password: pw, user_metadata: meta, email_confirm: true });
        if (uErr) throw uErr;
        updated++;
      } else {
        const { error: cErr } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: meta });
        if (cErr) throw cErr;
        created++;
      }
    } catch (err) {
      failed++;
      console.log(`  失敗: id=${id} (${email}) → ${err.message || err}`);
    }
  }
  console.log("―――――――――――――――");
  console.log(`完了：新規 ${created} / 更新 ${updated} / スキップ ${skipped} / 失敗 ${failed}`);
  if (failed > 0) console.log("※ 失敗した職員はIDやパスワードをご確認ください（空白・記号など）。");
}

main().catch((e) => { console.error("エラー:", e.message || e); process.exit(1); });
