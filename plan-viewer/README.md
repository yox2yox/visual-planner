# plan-viewer

AIが生成した実装プランのJSONをビジュアルに表示する静的Webアプリです。現在のviewerは、図だけでなく `kaisetsu` 型の読みやすさを重視し、メタファー、構成要素、設計説明、裏付け、対比表、ひと言まとめを図の前後に表示できます。

## セットアップ

```bash
npm install
npm run dev       # 開発サーバー起動
npm run build     # dist/ に静的ファイルをビルド
npm run preview   # ビルド成果物をプレビュー
npm run typecheck # TypeScript 型チェック
npm test          # ユニットテスト実行
```

## プランの渡し方

URLクエリパラメータ `?plan=<base64エンコードJSON>` でJSONを渡します。
`fetch` 不要・`file://` プロトコルでも動作します。

### エンコード方法

```js
const json = JSON.stringify(plan)
const encoded = btoa(unescape(encodeURIComponent(json)))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '')
const url = `http://localhost:4173/?plan=${encoded}`
```

### サンプルURL

`example.json` は新形式 `pairs` を使って **「ログイン時の認証境界」** と **「認証済み API の責務境界」** の2ペアに分割した実例です。`user-auth` 配下の `auth-validator` / `token-issuer` で **最大 3 階層** の表示も確認できます。

開発サーバーで確認する場合は `npm run dev` または `npm run preview` を起動し、上記のエンコード方法で `plan-viewer/example.json` を `?plan=` に渡してください。自己完結 HTML を作る場合は `.agents/skills/visual-planner/scripts/make_plan.mjs` を使います。

## URL長制限の注意

URLの最大長はブラウザ・サーバーによって異なりますが、一般的に **2,000〜8,000文字** 程度が安全な上限です。

- Chrome: 約2MB（実用上問題なし）
- Apache/Nginx デフォルト: 約8,000文字（`LimitRequestLine` / `large_client_header_buffers` で変更可）
- `file://` 利用時: ブラウザのURL長制限（数万文字）のみ

大きなプランJSONでは `base64` エンコード後のURLが長くなります（JSON 3KB → base64 約4KB）。
10KB超のJSONは別途ファイル配信を検討してください。

## JSONスキーマ

```jsonc
{
  "title": "プランタイトル",
  "description": "概要説明",
  "metaphor": {
    "title": "ホテルの受付と部屋キー",
    "description": "全体をどういう現実世界のたとえで読むか"
  },
  "takeaway": "ひと言で持ち帰る本質",
  "evidence": [
    { "path": "src/file.ts", "startLine": 10, "endLine": 20, "label": "主な実装" }
  ],
  "glossary": [
    {
      "id": "unique-id",
      "type": "term" | "client" | "server" | "cloud-service" | "class" | "function" | "db" | "table",
      "name": "表示名",
      "description": "説明文",
      "icon": "🔐",      // 省略時はtype別デフォルトを表示
      "parentId": "parent-id", // 省略可。親アイテムのidを指定すると階層構造で表示（最大3階層まで。それ以上は表示から除外）
      "persona": "受付係",      // 省略可。設計上の役割を人にたとえた名前
      "analogy": "チェックインカウンター", // 省略可。メタファー内での姿
      "responsibility": "本人確認をして鍵を渡す", // 省略可。担当
      "evidence": [...]
    }
  ],
  // 以下 A / B のどちらか一方のみを指定（併用はバリデーションエラー）

  // A) 複数ペア形式（推奨。アーキテクチャ図が大きい／複数の独立した設計観点を扱うときはこちら）
  "pairs": [
    {
      "title": "ペアのタイトル",            // 必須。空文字はヘッダ非表示
      "description": "ペアの説明",          // 省略可
      "currentState": { /* 下記と同じ */ }, // 省略可
      "proposedState": { /* 下記と同じ */ }, // 省略可
      "comparison": [
        { "label": "観点", "current": "現状", "proposed": "変更後", "note": "なぜ大事か" }
      ],
      "safeguards": ["細かいけど大事な防御や制約"],
      "takeaway": "この章をひと言で",
      "evidence": [...]
    }
    // currentState / proposedState が両方未指定のペアは viewer で非表示
  ],

  // B) 単一ペアの後方互換ショートカット
  "currentState": {   // 省略可
    "description": "現状の説明",
    "storyTitle": "現状の時系列ストーリー",
    "scenes": [
      {
        "title": "場面1: 受付係が依頼を受ける",
        "actor": "unique-id",
        "action": "誰が何をするか",
        "result": "その結果どうなるか",
        "edgeRefs": [1],
        "evidence": [...]
      }
    ],
    "takeaway": "この状態をひと言で",
    "architectureEdges": [
      { "order": 1, "source": "id1", "target": "id2", "label": "ラベル", "data": "データ名" }
    ]
  },
  "proposedState": {  // 省略可
    "description": "変更後の説明",
    "architectureEdges": [...]
  }
}
```

`architectureEdges` はアーキテクチャ図の矢印として扱います。`order` は各 state 内で `1` から始まる連番で、構成要素間の依存、呼び出し、データ受け渡し、責務の境界を設計意図が読める順に並べます。処理手順を網羅するためのフローではなく、アーキテクチャ設計を説明するための図なので、設計説明に不要な項目では `architectureEdges` を省略してください。`glossary` はその図に必要な構成要素を、必要な粒度で定義します。

`glossary[].type` は曖昧な「機能」ではなく、アーキテクチャを説明するための層や構成要素を指定します。ユーザーが使う Web ブラウザなどは `client`、サーバー上の処理単位は `server`、S3 や Lambda などクラウドで用意するサービスは `cloud-service`、オブジェクト指向のクラスは `class`、関数やクラスメソッドは `function`、データベースは `db`、テーブルは `table`、それ以外の概念説明は `term` を使います。

説明は変更内容に必要なレイヤーだけで十分です。クラス内の変更だけなら関数同士の責務や依存を中心に書き、クライアント・サーバー・クラウドサービス・DB までまたがる変更なら、それらのレイヤーをまたいだ構造として説明してください。図がなくても比較表や設計説明だけで十分な章では、state や `architectureEdges` を置かずに prose-only の `pairs` として残せます。

### 説明文内の glossary リンク

説明用の文字列フィールドでは、glossary の項目を参照するリンク風テキストを埋め込めます。構文は次の完全一致のみです。

```html
<a href="#glossary:unique-id">表示ラベル</a>
```

`unique-id` は同じ plan 内の `glossary[].id` と完全一致する必要があります。クリックしてもページ内ジャンプや glossary カードへのスクロールは行わず、クリックまたはマウスをかざすと対象 glossary の概要をカード型チップとして表示します。クリックで表示したチップは右上の閉じるボタンを押すまで残り、ホバーで表示したチップはマウスが離れると消えます。存在しない ID や空 ID はリンクにならず、表示ラベルだけが通常のテキストとして表示されます。

安全のため、対応するのは小文字の `a`、小文字の `href`、ダブルクォート、`#glossary:` 接頭辞、対応する `</a>` を持つ構文だけです。その他の HTML や壊れた anchor は文字列としてそのまま表示され、ラベル内の `<` や `>` も HTML として解釈されません。

対象フィールドは、ヘッダーやペア、状態、ナラティブ、glossary カードなどの説明文全般です。具体的には `description` / `takeaway`、`metaphor.description`、`pairs[].comparison[].label|current|proposed|note`、`scenes[].title|action|result`、`pairs[].safeguards[]`、`glossary[].description|persona|analogy|responsibility` で利用できます。`architectureEdges[].label` / `architectureEdges[].data` は現時点では対象外です。

`scenes` は読者向けの設計説明です。`edgeRefs` で対応するアーキテクチャ図の矢印番号を指定すると、文章と図がつながります。`comparison` は修正前後の設計差分、`safeguards` は「なぜ単純な置き換えだけでは足りないか」や防御設計の説明に使います。

**ペアを分けるべき目安**: 単一ステートの `architectureEdges` が 10 本以上、または関係するノードが 10 個以上、もしくは独立した複数の設計観点（認証境界 / API 境界 / 永続化境界など）を扱う場合は `pairs` に分割するとアーキテクチャ図が読みやすく保てます。アーキテクチャ図で説明する必要がない観点は、図を作らず説明文・比較表・safeguards だけにしてください。
