# Sprint Contract

## 実装スコープ

- プランJSONに **複数の (currentState, proposedState) ペア** を持てる新フィールド `pairs: StatePair[]` を導入する
  - `StatePair` = `{ title: string, description?: string, currentState?: FlowState, proposedState?: FlowState }`
  - `title` は必須の string フィールド（空文字 `""` は許容。UI 側で空なら非表示）
  - `currentState` / `proposedState` はそれぞれ任意。両方未指定のペアはバリデーションでは通過させ、`normalizePlan` の時点で除外し UI には表示しない
  - `glossary` は Plan top-level のまま全ペア共通で参照される（ペアごとの glossary 分離はスコープ外）
- 既存の top-level `currentState` / `proposedState` 形式は後方互換として保持
  - 読み込み時の正規化ルール: `pairs` があればそれを使用。無ければ `{currentState, proposedState}` が存在するかチェックし、存在すれば単一ペア `[{ title: '', currentState, proposedState }]` として扱う
  - top-level と `pairs` の併用はエラーとする（曖昧さ排除）
- 型定義の拡張 (`plan-viewer/src/types.ts`)
  - `StatePair` インターフェース追加
  - `Plan` に `pairs?: StatePair[]` を追加
- UI (`plan-viewer/src/App.svelte`) を複数ペア表示に対応
  - 各ペアをひとつの `<section>` に包み、既存の `border-t border-gray-200` を踏襲して境界を表示
  - ペア内の見出し階層: `<h2>` にペア `title`（空なら出力しない）、任意 description、`<h3>` で「AS-IS（現状）」「TO-BE（変更後）」
  - 旧 App.svelte は AS-IS / TO-BE を `<h2>` にしていたが、ペア title を `<h2>` に昇格したため AS-IS / TO-BE は `<h3>` に格下げ
  - ペア内で diff 条件は従来通り（`currentState !== undefined` のときだけ TO-BE 側を diff 表示）
  - 辞書パネル (GlossaryPanel) は全ペア共通で最上部に1つ
  - Plan 正規化ロジックはユーティリティに切り出す（新規 `plan-viewer/src/utils/normalize.ts`）
- バリデーション拡張 (`.claude/skills/visual-planner/scripts/make_url.mjs`)
  - `pairs` が配列であること
  - `pairs[i]` が object、`pairs[i].title` が string 型（空文字は許容）であること
  - 各 `pairs[i].currentState.interactions[j]` / `pairs[i].proposedState.interactions[j]` の source/target が glossary id を指していること
  - エラーメッセージは `pairs[0].currentState.interactions[2].source` のような具体的パスを含む
  - `pairs` と top-level `currentState/proposedState` の併用をエラーに
  - 空 `pairs` 配列 (`[]`) をエラーに
  - **両方未指定のペアはエラーにしない**（viewer 側 `normalizePlan` が除外を担当）
  - リグレッション防止のため `validate()` を named export へリファクタリングしてテスト可能にする
- ドキュメント更新
  - `.claude/skills/visual-planner/SKILL.md`
    - 複数ペア形式の説明とスキーマ例
    - **「説明が複雑になる場合は pair を分けてシンプルにする」**ガイダンスを明記
    - Workflow セクションの「Gather the plan」にペア分割の判断基準を追加
  - `.claude/skills/visual-planner/reference/schema.md`
    - `StatePair` の型定義を追加
    - `pairs` vs 従来形式の選択方針（複雑なら pairs、単純なら従来形式でも可）
  - `plan-viewer/README.md`
    - JSON スキーマ節に `pairs` を追記
    - サンプル base64 URL を新形式 (`pairs` 利用) に差し替え
  - `plan-viewer/example.json`
    - 新形式 `pairs` に差し替え（README のサンプル URL がこれをエンコードしたもの）
    - 既存の認証フロー全体を 2〜3 ペアに分割した例にする（例: 「ログイン」「API 呼び出し」）
- テスト追加
  - `plan-viewer/src/utils/__tests__/normalize.test.ts` を新規作成
    - 新形式 `pairs` → そのまま返す
    - 旧形式 `currentState/proposedState` → 単一ペアに正規化（後方互換）
    - 両方指定 → エラー
    - 空 `pairs: []` → エラー
    - ペアの currentState/proposedState が両方未指定 → そのペアは結果から除外（UI では非表示）
  - `.claude/skills/visual-planner/scripts/__tests__/make_url.test.mjs` を新規作成（vitest を skill 側から呼べるよう、またはテスト用 runner を plan-viewer 側に配置するなど実装時判断）
    - `pairs` が配列でない場合エラー
    - `pairs[i].title` が string 以外の場合エラー
    - `pairs[i].currentState.interactions[j].source` が未知 id の場合エラー（エラーメッセージに `pairs[0]` のパスが含まれる）
    - `pairs` と top-level `currentState` 併用でエラー
    - 空 `pairs: []` でエラー
    - 両方未指定ペアはバリデーション通過する
    - 成功ケース（新形式 pairs）で URL 文字列が返る

## 検証基準

- [ ] `pairs` を含む JSON を `make_url.mjs` に通すと URL が生成される（成功ケース）
- [ ] `pairs` と `currentState` を同時指定すると `make_url.mjs` がエラー終了する
- [ ] 空 `pairs: []` を指定すると `make_url.mjs` がエラー終了する
- [ ] 各 `pairs[i].currentState.interactions[j]` の source/target が glossary に無い id を指すとエラー終了する
- [ ] 旧形式（top-level `currentState/proposedState`）の JSON が引き続き正しく viewer に表示される（後方互換）
- [ ] 新形式の JSON を viewer で開くと、ペアごとに title と AS-IS / TO-BE セクションが表示される
- [ ] ペアの `title` が空文字の場合、title ヘッダは表示されない
- [ ] ペアの currentState / proposedState が両方未指定なら、そのペアは viewer に一切表示されない
- [ ] ペア内の diff（added/changed/removed）ハイライトが従来通り動作する
- [ ] 複数ペアをもつ JSON を viewer で開くと、各ペア間に `border-t` の区切り線が表示される
- [ ] `plan-viewer/README.md` のサンプル URL が新形式にデコードされ、viewer で正しく複数ペアが表示される
- [ ] `plan-viewer/example.json` が新形式 `pairs` で記述され、スキーマバリデーションを通過する
- [ ] make_url.mjs のエラーメッセージがバリデーション失敗時に `pairs[i]` を含む具体パスを出力する
- [ ] `npm run typecheck` が通る
- [ ] `npm test` が通る（新規 normalize.test.ts + make_url.test.mjs を含む）
- [ ] `npm run build` が `.claude/skills/visual-planner/viewer/` に成果物を出力する
- [ ] SKILL.md / schema.md に「複雑なら pair を分ける」ガイダンスが含まれる
- [ ] 実行モード判定の依存関係が正しいこと（下記「実行モード判定」参照）

## 影響ファイル

- `plan-viewer/src/types.ts` — `StatePair` 追加、`Plan` に `pairs?` 追加
- `plan-viewer/src/utils/normalize.ts` — 新規。Plan 正規化関数 `normalizePlan(plan): { pairs: StatePair[] }` を提供（両方未指定ペアは除外）
- `plan-viewer/src/utils/__tests__/normalize.test.ts` — 新規
- `plan-viewer/src/App.svelte` — `normalizePlan` 呼び出し、ペアを `{#each}` で描画
- `.claude/skills/visual-planner/scripts/make_url.mjs` — `pairs` バリデーション追加 + `validate()` を named export 化
- `.claude/skills/visual-planner/scripts/__tests__/make_url.test.mjs` — 新規。`validate()` のユニットテスト
- `.claude/skills/visual-planner/SKILL.md` — 複数ペア形式とガイダンス追加
- `.claude/skills/visual-planner/reference/schema.md` — `StatePair` 型・選択方針追加
- `plan-viewer/README.md` — JSON スキーマ節に `pairs` を追記 + サンプル URL を新形式に差し替え
- `plan-viewer/example.json` — 新形式 `pairs` に差し替え（複数ペアへの分割例）

## リスク・制約

- **後方互換**: 既存の埋め込み URL（旧形式）が壊れないこと。`normalizePlan` が旧形式を吸収する。後方互換の実証は `normalize.test.ts` のユニットテスト（旧形式 → 単一ペア正規化のケース）で担保し、サンプル資産（`example.json` / `plan-viewer/README.md` のサンプル URL）は新形式に差し替える。
- **URL 長の肥大化**: 複数ペア化により interactions が重複するケースでは base64 URL が膨らむ。新 `example.json` を作成する際、URL 長が 10KB を超える場合は各ペアの `description` を簡潔化する（SKILL.md の size guidance に従う）。
- **`viewer/` バンドル再生成の忘れ**: skill 側の `viewer/` は plan-viewer の `dist` を出力先にしている (`vite.config.ts`) ため、ビルドを走らせないと skill の挙動が更新されない。実装完了時に `npm run build` 実行を明示する。
- **Svelte 5 Runes 互換**: App.svelte は既に Runes 構文 (`$state`, `$derived`, `$effect`) を使用済み。`{#each pairs}` ブロック内での `isDiff`/`baseInteractions` 算出が正しく各ペアごとに独立すること。
- **`selectedGlossaryId` ストアの共有**: 複数ペアが1つのグローバル selectedId ストアを共有するため、1箇所クリックすれば全ペアで同期選択される。これは現状の挙動と整合するので維持（変更しない）。
- **diff 集計のペア独立性**: `computeDiffEdges` は `baseInteractions` と `interactions` を受け取る純関数なのでペアごとに呼び出せば独立して動作する。

## 確定事項（ユーザー確認済み）

- **Q1 → 確定**: `plan-viewer/README.md` のサンプル base64 URL を新形式に差し替える。`example.json` も新形式に更新する。
- **Q2 → 確定**: `pairs[i].title` は空文字を許容（UI 側で空なら非表示）。
- **Q3 → 確定**: `pairs[i]` の `currentState` と `proposedState` が両方未指定の場合、そのペアは viewer に一切表示しない（`normalizePlan` の時点で除外）。バリデーションではエラーにしない。

## 除外事項（スコープ外）

- UI デザインの大幅刷新（ペアタイトルの単純追加のみ）
- ペアの並び替え・折りたたみ UI
- 新しい図種の追加
- orchestration skill 自体の変更

## 実行モード判定（REQUIRED）

- モード: **タスク分割**
- 判定根拠: 実装スコープに依存関係が薄い独立グループが2つ以上ある（コード変更群とドキュメント更新群）。ただし code 内部は `types → normalize → App.svelte & make_url.mjs & test` の順で軽い依存あり。
- 分割単位:
  - **グループA（コア実装）**: types.ts → normalize.ts → normalize.test.ts → App.svelte → make_url.mjs — 依存: グループ内逐次
  - **グループB（ドキュメント）**: SKILL.md, reference/schema.md, plan-viewer/README.md — 依存: なし（グループAと並行可）
  - **グループC（検証）**: `npm run typecheck` / `npm test` / `npm run build` — 依存: グループA完了後

## 推奨事項

- コード実装はまず型と normalize を固め、その純粋関数に単体テストを通してから App.svelte / make_url.mjs に伝搬させる（正規化ロジックを1箇所に集約してテスト可能に）
- `normalizePlan` の戻り値は常に `{ pairs: StatePair[] }` に統一し、App.svelte 側は if 分岐を持たないようにする（描画の単純化）
- SKILL.md の「複雑なら分ける」ガイダンスは Workflow 手順1に組み込む。閾値の目安（例: 「ノード 10 個以上 or 相互作用 15 本以上なら分割検討」）を添える
- `make_url.mjs` のバリデーションエラーメッセージは `pairs[i].interactions[j].source` のようなパスを含めてデバッグ容易にする
- 実装完了後、必ず `plan-viewer/` 配下で `npm run build` を実行し `.claude/skills/visual-planner/viewer/` を最新化する（忘れると skill が旧挙動のまま）
