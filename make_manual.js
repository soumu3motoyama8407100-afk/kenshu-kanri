const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, TableOfContents, HeadingLevel,
        LevelFormat, AlignmentType, BorderStyle, PageBreak, Header, Footer, PageNumber,
        Table, TableRow, TableCell, WidthType, ShadingType } = require("docx");

const GOLD = "C89A55";
const DARK = "4A3020";

// ---------- helpers ----------
const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text, size: 21, ...opts })],
});
const h1 = text => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(text)] });
const h2 = text => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const h3 = text => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
const step = text => new Paragraph({
  numbering: { reference: "steps", level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text, size: 21 })],
});
const bullet = text => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 60 },
  children: [new TextRun({ text, size: 21 })],
});
// スクリーンショット貼り付け枠
const shot = label => new Paragraph({
  spacing: { before: 120, after: 240 },
  alignment: AlignmentType.CENTER,
  border: {
    top: { style: BorderStyle.DASHED, size: 8, color: "9CA3AF", space: 8 },
    bottom: { style: BorderStyle.DASHED, size: 8, color: "9CA3AF", space: 8 },
    left: { style: BorderStyle.DASHED, size: 8, color: "9CA3AF", space: 8 },
    right: { style: BorderStyle.DASHED, size: 8, color: "9CA3AF", space: 8 },
  },
  children: [
    new TextRun({ text: "📷 スクリーンショット貼り付け欄", bold: true, color: "6B7280", size: 21, break: 1 }),
    new TextRun({ text: `（${label}）`, color: "9CA3AF", size: 19, break: 1 }),
    new TextRun({ text: "", break: 2 }),
  ],
});
const note = text => new Paragraph({
  spacing: { before: 60, after: 160 },
  shading: { fill: "FDF6EC", type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 16, color: GOLD, space: 4 } },
  children: [new TextRun({ text: `💡 ${text}`, size: 20, color: "92400E" })],
});
const warn = text => new Paragraph({
  spacing: { before: 60, after: 160 },
  shading: { fill: "FEF2F2", type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 16, color: "DC2626", space: 4 } },
  children: [new TextRun({ text: `⚠ ${text}`, size: 20, color: "7F1D1D" })],
});

// ---------- content ----------
const children = [
  // 表紙
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "研修管理システム", bold: true, size: 56, color: DARK })] }),
  new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "操作マニュアル", bold: true, size: 44, color: GOLD })] }),
  new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "社会福祉法人　ザ・ハート・クラブ", size: 28, color: DARK })] }),
  new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "第1版　2026年6月", size: 22, color: "6B7280" })] }),
  new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "https://kenshu-kanri.vercel.app", size: 24, color: "2563EB", underline: {} })] }),
  new Paragraph({ children: [new PageBreak()] }),

  // 目次
  new Paragraph({ children: [new TextRun({ text: "目　次", bold: true, size: 32 })], spacing: { after: 240 } }),
  new TableOfContents("目次", { hyperlink: true, headingStyleRange: "1-2" }),

  // ===== 第1章 =====
  h1("第1章　はじめに"),
  h2("1-1　このシステムでできること"),
  bullet("内部研修・外部研修・オンラインセミナーの参加管理"),
  bullet("研修動画の視聴と視聴チェック"),
  bullet("復命書の提出状況の管理"),
  bullet("委員会の開催予定・お知らせの確認"),
  bullet("LINE公式アカウントによる自動お知らせ配信"),
  h2("1-2　利用環境"),
  p("スマートフォン・タブレット・パソコンのブラウザ（Chrome、Safari、Edge など）から利用できます。アプリのインストールは不要です。"),
  p("URL：https://kenshu-kanri.vercel.app"),
  note("スマートフォンのホーム画面に追加しておくと、アプリのようにワンタップで開けて便利です。"),

  // ===== 第2章 =====
  h1("第2章　ログイン"),
  step("ブラウザで https://kenshu-kanri.vercel.app を開く"),
  step("「従業員ID」にタイムカードの横に書かれている職員番号を入力する（例：101）"),
  step("パスワードを入力する（初期パスワードは総務にお問い合わせください）"),
  step("「ログイン」ボタンを押す"),
  shot("ログイン画面"),
  warn("IDまたはパスワードを間違えるとエラーが表示されます。退職・無効化されたアカウントではログインできません。"),

  // ===== 第3章 =====
  h1("第3章　職員の操作"),
  h2("3-1　研修タブ（内部研修・外部研修）"),
  p("ログイン直後の「📚 研修」タブに、自分が対象の研修が一覧表示されます。研修カードをタップすると詳細が開きます。"),
  shot("研修タブの一覧画面"),
  h3("研修への参加登録"),
  step("研修当日、会場に掲示されたQRコードをスマートフォンで読み取る"),
  step("ログインすると自動で「参加済」になる"),
  p("2回開催の研修（同じ内容を2日程で実施）の場合は、「① ○月○日に参加」「② ○月○日に参加」のボタンでどちらに参加したかを選びます。"),
  shot("研修カードを開いた画面（参加ボタン・動画・復命書）"),
  h3("動画でのフォロー"),
  p("当日欠席した場合は、研修動画を視聴して「視聴済」にすることでフォローできます。画面右下の「▶動画」ボタンからも動画一覧を開けます。"),
  h3("復命書の提出"),
  step("研修に参加（または動画視聴）すると復命書の提出ボタンが押せるようになる"),
  step("復命書（紙）を提出したら「復命書を提出する」ボタンを押す"),
  step("管理者が確認すると「✅ 提出済（管理者確認済）」になる"),
  warn("復命書は原則、研修のあった当月中に提出してください。"),
  h2("3-2　セミナータブ（リブドゥ オンラインセミナー）"),
  step("「📺 セミナー」タブを開く"),
  step("「▶ 視聴ページを開く」からリブドゥのページで動画を視聴する"),
  step("今月の配信動画リストで、視聴した動画の「📺 視聴済みにする」を押す"),
  step("復命書を提出した場合は「📄 復命書を提出した」も押す（任意）"),
  shot("セミナータブ（今月の動画リスト）"),
  note("その月の動画をすべて視聴するとスタンプが付き、連続視聴記録が伸びていきます。"),
  h2("3-3　実績の確認"),
  p("画面上部の実績ボタンから、復命書提出ポイント・月別の提出状況・バッジ・セミナー視聴スタンプを確認できます。"),
  shot("実績画面"),
  h2("3-4　LINE登録（初回のみ）"),
  step("配布されたQRコードから公式LINEアカウントを友だち追加する"),
  step("トークに「初回登録のお願い」が届く"),
  step("タイムカードの横に書かれている職員番号をそのまま送信する（例：101）"),
  step("自分の名前が表示されたら「✅ はい」ボタンを押す"),
  step("「登録が完了しました！」と届けば完了"),
  shot("LINEの登録のやりとり"),
  warn("一度登録すると別の番号では上書きできません。間違えて登録した場合は総務へ連絡してください。"),

  // ===== 第4章 =====
  h1("第4章　部署長の操作"),
  p("部署長に設定された職員は「📋 部署管理」タブが表示され、担当部署の職員の研修状況を確認できます。"),
  bullet("内部研修：担当部署の職員の参加・復命書の状況確認、参加登録・復命書確認"),
  bullet("外部研修：受講・復命書の状況確認"),
  bullet("セミナー：月ごとの視聴・提出状況の確認"),
  shot("部署管理タブ"),

  // ===== 第5章 =====
  h1("第5章　管理者の操作"),
  p("管理者アカウント（ADMIN）でログインすると、管理者ダッシュボードが表示されます。"),
  shot("管理者ダッシュボード（タブ一覧）"),

  h2("5-1　職員管理"),
  h3("職員の追加・編集"),
  step("「👥 職員管理」タブを開く"),
  step("「＋ 職員を追加」または各職員の「編集」ボタンを押す（編集はその場でポップアップが開く）"),
  step("氏名・部署・役職・職員区分などを入力して保存"),
  bullet("「部署長にする」にチェック＋管理部署を選ぶと部署管理タブが使えるようになります"),
  bullet("「🌙 休職中」にチェックすると研修・お知らせ・LINE配信の対象から外れます"),
  bullet("退職日を入力すると、その日以降ログインできなくなります"),
  shot("職員編集ポップアップ"),
  h3("CSVインポート・出力"),
  p("名簿はCSVで一括管理できます。列の並びは次の14列です："),
  p("職員ID／パスワード／姓／名前／入社日／役職名／職員区分／所属／管理部署／保有資格／認定研修／部署長／在籍状態／委員会", { bold: true }),
  bullet("複数の値（委員会・資格など）は「|」で区切ります"),
  bullet("委員会列に委員会名を書いてインポートすると、委員会メンバーが自動設定されます"),
  bullet("インポート時、CSVに含まれない既存職員を削除するか確認が出ます（完全上書きが可能）"),
  warn("ファイルは「CSV UTF-8（コンマ区切り）」形式で保存してください。委員会名はアプリの委員会管理タブの名前と完全一致させてください。"),
  shot("CSVインポート・出力ボタン"),

  h2("5-2　内部研修の登録（📚 内部研修管理）"),
  step("「＋ 研修を追加」を押す"),
  step("研修名・開催日①（必須）を入力する。同じ内容を2回開催する場合は開催日②も入力"),
  step("開始・終了時間（初期値 17:30〜18:30）、場所をボタンで選択"),
  step("必要に応じて動画URL・説明を入力（YouTubeのURLはそのまま貼り付けでOK）"),
  step("「保存する」を押す"),
  bullet("👥 参加者を指定：チェックなしの場合は用務を除く全職員が対象。特定の職員だけに見せたい場合にチェック"),
  bullet("📋 復命書不要：参加のみ記録する説明会などにチェック"),
  bullet("📋 復命書必須の対象者を指定：欠席でも復命書が必要な職員を指定"),
  shot("研修登録フォーム"),

  h2("5-3　研修の進捗管理（📊 内部研修）"),
  p("研修ごとの参加・動画視聴・復命書の状況を確認し、参加登録や復命書確認を行います。"),
  h3("一括登録モード（過去の研修実績の取り込みに便利）"),
  step("研修を選び「☑ 一括登録モード」を押す"),
  step("職員カードをタップして選択（複数可・部署ごとに表示）"),
  step("上のバーの「✅ 参加済にする」「▶ 視聴済にする」「📋 復命書確認済にする」を押す"),
  shot("一括登録モード"),
  h3("QRコードの発行"),
  p("研修カードの「QR生成」ボタンで、当日の会場掲示用QRコードを印刷できます。"),
  h3("実績の出力"),
  bullet("📥 研修実績をExcel出力：研修ごとにシートが分かれ、参加率・参加/不参加・動画視聴・復命書の状況が一覧できます"),
  bullet("📊 研修履歴出力：全職員の年間研修履歴（印刷用）"),
  shot("Excel出力の例"),

  h2("5-4　外部研修の登録（✏️ 外部研修管理）"),
  step("「＋ 外部研修を申し込み登録」を押す"),
  step("研修名・実施日・主催団体・場所を入力"),
  step("研修要綱PDFをアップロード（任意）"),
  step("対象者を選択して保存"),
  shot("外部研修登録フォーム"),

  h2("5-5　セミナーの登録（📺 セミナー）"),
  bullet("🚪 入口：リブドゥの視聴ページURLを「入口」として1件だけ登録"),
  bullet("毎月の動画：タイトル＋配信月（例：6月配信→6/1）で1本ずつ登録"),
  p("職員のセミナータブには、入口の視聴ボタンと今月の動画リストが自動で表示されます。"),
  shot("セミナー管理画面"),

  h2("5-6　お知らせの配信（📢 お知らせ）"),
  step("カテゴリを選ぶ（事務連絡／研修のお知らせ／アンケート／各種お知らせ／委員会）"),
  step("「＋ お知らせを投稿」を押し、タイトル・内容・添付PDF（任意）を入力"),
  step("📱 LINE配信日時を必ず指定する（指定しないと投稿できません）"),
  step("職員を指定しない場合は全職員に配信。「👥 職員を指定」で対象を絞れる（正職員一括選択なども可能）"),
  step("「投稿する」を押す"),
  warn("LINEの配信は10:00〜17:00の間のみ行われます。夜間を指定した場合は翌日の10時以降に配信されます。"),
  shot("お知らせ投稿フォーム"),

  h2("5-7　委員会の管理（🏛 委員会管理）"),
  bullet("委員会の新規作成・編集・削除、委員長の指定、テーマカラー設定"),
  bullet("📅 開催予定：登録すると委員メンバーにLINEで自動通知（10〜17時制限あり）"),
  bullet("📢 お知らせ：委員会ごとのお知らせ投稿"),
  bullet("👥 メンバー：部署を選んで職員をチェックして保存（CSVインポートでも自動設定可）"),
  shot("委員会管理画面"),

  // ===== 第6章 =====
  h1("第6章　LINE通知の仕組み"),
  bullet("通知は全員一斉ではなく、対象者に個別に届きます"),
  bullet("配信時間は10:00〜17:00。時間外の登録分は翌日10時以降に自動配信されます"),
  bullet("通知が届くのは、LINE登録（職員番号の紐づけ）が完了している職員のみです"),
  bullet("休職中の職員には届きません"),
  p("LINEで通知される内容：委員会の開催予定、お知らせ（事務連絡・研修・アンケートなど）"),

  // ===== 第7章 =====
  h1("第7章　よくある質問"),
  h3("Q. パスワードを忘れた"),
  p("A. 総務（管理者）に連絡してください。職員管理画面で確認・再設定できます。"),
  h3("Q. LINEに通知が来ない"),
  p("A. ①LINE登録（職員番号の送信）が完了しているか、②公式アカウントをブロックしていないか確認してください。"),
  h3("Q. 研修が自分の画面に表示されない"),
  p("A. その研修の「参加者指定」の対象外になっている可能性があります。管理者に確認してください。"),
  h3("Q. 間違えて「視聴済」にしてしまった"),
  p("A. もう一度ボタンを押すと取り消せます。"),
  h3("Q. 復命書を提出したのに「未提出」のまま"),
  p("A. アプリ上の「復命書を提出する」ボタンを押したか確認してください。紙の提出と合わせてボタン操作が必要です。"),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: "游ゴシック", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "游ゴシック", color: "FFFFFF" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0,
          shading: { fill: GOLD, type: ShadingType.CLEAR },
          indent: { left: 120 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "游ゴシック", color: DARK },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1,
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 2 } } } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: "游ゴシック", color: "A07840" },
        paragraph: { spacing: { before: 160, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
      { reference: "steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } },
    },
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "研修管理システム 操作マニュアル", size: 16, color: "9CA3AF" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "9CA3AF" })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = "C:\\Users\\heart42\\Desktop\\研修管理システム操作マニュアル.docx";
  fs.writeFileSync(out, buf);
  console.log("saved:", out);
});
