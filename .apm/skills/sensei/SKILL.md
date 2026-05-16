---
name: sensei
description: 実装計画、アーキテクチャ変更、前後比較、機能のデータフロー図を可視化したいときに使います。plan-viewer 用の JSON と、JSON をインライン化した自己完結 HTML を生成し、ユーザーが URL・サーバー・ネットワークなしで任意のブラウザから計画図を開けるようにします。
---

# sensei

機能案や移行計画を **2 つのファイル**に変換します。`plan.json` と、自己完結した `plan.html`（plan-viewer バンドルに JSON をインライン化したもの）です。ユーザーは HTML ファイルを任意のブラウザで開けます。サーバー、インストール、ネットワーク、長い URL は不要です。

この viewer は単なる図のレンダラーではありません。プロジェクトのことを全く知らない人が見ても超わかりやすく理解できるような教えるプロの技をまとめたスキルになります。
1 つの一貫した現実世界の比喩、登場人物としてのコンポーネント、時系列のシーン、根拠リンク、前後比較、最後のひと言まとめを使います。詰め込まれた 1 枚のグラフより、読める物語を優先します。

レンダリングは、このスキルに同梱されたビルド済みの `viewer/` バンドルで行います。生成スクリプトは、HTML 内に用意されている `<script id="plan-data" type="application/json">…</script>` プレースホルダーへ計画 JSON を埋め込むだけです。

## 使うタイミング

ユーザーが次のような依頼をしたときに、このスキルを使います。

- 実装計画、提案、リファクタリングを可視化したい
- 現状と提案後のアーキテクチャを図解したい
- 機能におけるコンポーネント間のデータフローを示したい
- 「plan viewer」や「この計画をファイルとして共有できる形」を作りたい

対象外: コード生成、ドキュメント執筆、計画 JSON の生成に帰着しない作業。

## ワークフロー

1. **計画を整理する**
json schemaを確認し必要な情報をコードベースおよび与えられた計画から整理します。
- ここでは必要なデータを集めることに専念すること。詳細を描く必要はない。
2. 分割を考える
**計画が複雑な場合は複数の pair に分割します。** 
下記の場合に分割を検討します。
   - 1 つの state にアーキテクチャ辺が約 10 本を超える
   - 1 つの state が触れる glossary ノードが約 10 個を超える
   - 計画が複数の独立した設計関心（例: 「認証境界」「API 境界」「永続化境界」）を含み、ユーザーが別々に考えるべきである
3. 図解する
図はこのスキルの中心です。分かりやすい説明のために必要なアーキテクチャ図を用意しましょう。
図解が終わったら図解に必要なパーツ（クラス、関数など）を用意し、図を肉付けするための文章の説明を追加します。
**`architectureEdges` はアーキテクチャ図の辺として使います。** アーキテクチャ設計の説明に図が役立つ場合だけ含めます。各 edge は依存、呼び出し境界、データ受け渡し、所有境界、責務分担を明確にします。
網羅的な実行トレースより、設計を説明する edge を優先します。図は「どんな部品があり、どうつながり、なぜこの境界が重要なのか？」に答えるものです。アーキテクチャ説明が不要な話題では、図を作りません。
     viewer は、描画対象の state で `source` または `target` として現れる glossary ノードだけを描きます。アーキテクチャ辺は焦点を絞り、背景知識だけの用語は glossary に残します。
     **`diagram` は理解を助ける場合だけ使います。** 図は任意のアーキテクチャ説明補助であり、必須の payload ではありません。デフォルトの図が読みにくい場合は、state レベルの `diagram.nodePositions` や edge レベルの描画ヒント（`sourcePosition`, `targetPosition`, `edgeType`, `edgeStyle`, `animated`）を追加します。混雑した 1 枚の図を細かく調整する前に、まず複数の `pairs` へ分割します。
     **`scenes` でアーキテクチャ説明を読みやすくします。** 各 state には `storyTitle`、`scenes[]`、`takeaway` を含められます。scene は 1 つ以上の `edgeRefs` を人間向けに説明するものです。どのコンポーネントや役割が重要か、どの関係を説明しているか、その設計上の結果が何かを必ず書きます。scene の文章は具体的にし、比喩の一貫性を保ちます。
     **現在/提案後の両方の state がある pair では `comparison` を使います。** 比較表は「何が変わり、なぜ重要で、新しい形がなぜ理解しやすいのか」に答えるものです。
     **`safeguards` は、防御的設計、バリデーション、フォールバック動作、エッジケースで計画を壊さないための制約に使います。**

4. **`reference/schema.md` のスキーマに従って JSON を組み立てる**。作りながら検証します。
   - すべての `parentId` が既存の `id` を参照している
   - `architectureEdges` がある場合、すべての `architectureEdges[].source` / `.target` が既存の `id` を参照している
   - `architectureEdges` がある場合、すべての `architectureEdges[].order` がその state 内で `1` から始まる連番である
   - 任意の diagram position が既存の glossary id を参照している
   - 任意の edge position/type/style が `reference/schema.md` に記載された値を使っている
   - `type` が `term` | `client` | `server` | `cloud-service` | `class` | `function` | `db` | `table` のいずれかである
   - `pairs` とトップレベルの `currentState`/`proposedState` が同時に存在しない。どちらか一方を選ぶ
   - すべての `scenes[].edgeRefs[]` が同じ state の `architectureEdges[].order` にある既存のアーキテクチャ図 edge 番号を参照している
   - すべての `evidence[]` 項目に `path` がある。分かる場合は `startLine` / `endLine` も含める
   - `glossary[]` で定義された用語が本文に出る場合、glossary link をサポートしないフィールドを除き、`<a href="#glossary:ID">label</a>` でリンクする

## Kaisetsu 形式の執筆ルール

- 最初に比喩を 1 つ選び、最後まで保ちます。同じ計画の中で「レストラン」「工場」「郵便局」を混ぜません。
- glossary は乾いた辞書ではなく、登場人物リストにします。名前は技術用語のままで構いませんが、`persona`、`analogy`、`responsibility` では人間の役割に翻訳します。
- 各 glossary 項目には必ず **固有の `icon`（絵文字 1 文字）** を割り当てます。type デフォルトの汎用絵文字に任せず、その項目の役割・責務・比喩を象徴する絵文字を選んで視覚的な識別性を高めます。設定漏れがあると viewer で全部同じアイコンに見えてしまうので、JSON 完成前に glossary をざっと見直して icon が埋まっているか確認します。
- 本文で `glossary[]` 項目名、または明らかに同等の用語を使うときは、必ず正確な構文 `<a href="#glossary:ID">label</a>` で glossary 項目にリンクします。これは description、scene、comparison text、safeguards、takeaways、glossary card text など、glossary link をサポートするすべてのテキストフィールドに適用します。
- scene は時系列で書きます。「validation occurs」より「受付係がチケットを確認する」を優先します。
- 読者の頭の中では、グラフより先に物語を置きます。viewer は各図の上に narrative panel を表示するため、グラフは最初の障害ではなく確認材料になります。
- 変更を説明するときは、`comparison` 表を含めます。必要に応じて `comparison[].note` または `safeguards[]` に、「なぜ単純な代替案では不十分なのか」を少なくとも 1 つ書きます。
- glossary 項目が実コードに対応する場合は、`codeSnippets[]` に該当箇所の抜粋（関数定義、型/スキーマ、ペイロード形状など必要な箇所）を必ず一部でも記載します。本文に長文を貼らず、`label` / `path` / `startLine` / `endLine` で出典を示しつつ、20 行以内に絞り込みます。
- コードに基づく計画では evidence 参照を追加します。形式は `{ "path": "src/file.ts", "startLine": 10, "endLine": 25, "label": "..." }` です。正確な行番号が分からない場合は、ファイルパスを使い、広めの参照であることを示します。
- 計画全体と重要な pair は `takeaway` で締めます。1、2 行で比喩を保ちつつ本質を述べます。

5. **ヘルパースクリプトに JSON を渡してファイルを生成する**。JSON ファイルのパスまたは stdin と、出力 basename を渡します。
   ```bash
   node <skill-dir>/scripts/make_plan.mjs path/to/plan.json /abs/path/to/output-basename
   ```
   または stdin を使います。
   ```bash
   echo "$PLAN_JSON" | node <skill-dir>/scripts/make_plan.mjs - /abs/path/to/output-basename
   ```
   スクリプトは計画を検証し（型、一意な id、parentId/architecture edge 参照など）、次を出力します。
   - `<output-basename>.json` — 整形済みの検証済み計画
   - `<output-basename>.html` — viewer バンドルのコピー。計画 JSON は安全にエスケープされ、`<script id="plan-data" type="application/json">…</script>` にインライン化されます
     絶対パスは stdout に 1 行ずつ出力されます。Node.js が必要ですが、このリポジトリの依存関係として既に使えるため、インストール手順は不要です。
4. **生成したファイルパスをユーザーに渡す**。ユーザーは `.html` を任意のブラウザで直接開けます（`file://` で動き、`npm install` や dev server は不要です）。HTML は自己完結していることを伝えます。隣の `.json` は再編集用であり、viewer が実行時に読み込むものではありません。

## 出力スタイル

- 説明文は短くします。計画そのものが成果物です。
- パスを返すときは、端末がリンク化しやすいように 1 行に 1 つずつ置きます。
- HTML が大きい場合（計画が約 1 MB 超）はユーザーに警告し、説明文の削減を提案します。

## 既存計画の編集

- ユーザーが既存の plan `.json` ファイルを提供した場合は、そのファイルを直接編集し、同じ出力 basename で `make_plan.mjs` を再実行して HTML を再生成します。
- ユーザーが以前の実行で生成した HTML ファイルだけを持っている場合は、`<script id="plan-data" type="application/json">…</script>` ブロックから JSON を抽出します（`<` は `<` としてエスケープされたプレーン JSON で、`JSON.parse` がそのまま扱えます）。その後、生成スクリプトを再実行します。

## 失敗モードと修正

- `viewer/index.html not found`: バンドルがありません。ユーザーに `plan-viewer/` 内で `npm run build` を実行してもらいます。このスキルリポジトリにはビルド済み `viewer/` が同梱されているはずなので、このエラーは削除されたか、リポジトリが通常と異なる状態であることを意味します。
- `viewer HTML does not contain <script id="plan-data">…</script>`: 同梱 HTML が古いソースからビルドされ、プレースホルダーを持っていません。`plan-viewer/` 内で `npm run build` して再ビルドします。`plan-viewer/index.html` はプレースホルダーを宣言し、`viteSingleFile` がそれを保持します。
- Invalid plan JSON: スクリプトが具体的な検証エラーを stderr に出力します。計画を修正して再試行します。
- HTML ファイルが想定よりかなり大きい: viewer バンドル自体は約 250 KB です。それを大きく超える場合は、説明文が長すぎることが多いので削ります。

## スキーマ早見表

完全なスキーマと例は `reference/schema.md` を参照します。

最小構成の計画（単一 pair ショートカット）:

```json
{
  "title": "…",
  "description": "…",
  "glossary": [
    { "id": "a", "type": "client", "name": "A" },
    { "id": "b", "type": "server", "name": "B" }
  ],
  "proposedState": {
    "description": "…",
    "architectureEdges": [
      {
        "order": 1,
        "source": "a",
        "target": "b",
        "label": "calls",
        "data": "Payload"
      }
    ]
  }
}
```

複数 pair の計画（1 つの図が混みすぎる場合はこちらを使う）:

```json
{
  "title": "…",
  "description": "…",
  "glossary": [
    /* … */
  ],
  "pairs": [
    {
      "title": "ログイン",
      "description": "…",
      "currentState": {
        "architectureEdges": [
          /* … */
        ]
      },
      "proposedState": {
        "architectureEdges": [
          /* … */
        ]
      }
    },
    {
      "title": "API 呼び出し",
      "proposedState": {
        "architectureEdges": [
          /* … */
        ]
      }
    }
  ]
}
```

`pairs` とトップレベルの `currentState`/`proposedState` は同時に使えません。どちらの state も持たない pair は viewer によって静かに無視されます。
