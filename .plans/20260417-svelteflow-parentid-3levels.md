# Sprint Contract

## 実装スコープ

1. `utils/filter.ts` の `buildTree()` に**最大階層数制限**を追加する
   - シグネチャ: `buildTree(items, maxDepth?: number)` — デフォルト `maxDepth = 3`
   - `depth` は 0-indexed（ルート=0, 子=1, 孫=2）
   - `maxDepth = 3` のとき、depth 2 のノードは `children: []` で切り詰め、depth 3 以降のノードはツリーに含めない（**truncate 方式**）
   - 既存の循環検出・dangling parent 処理は維持
2. `InteractionFlow.svelte` のレイアウトロジックを Svelte Flow の `parentId` 方式に置き換える
   - **ルート親ノード**（子を持つ depth 0 ノード）: `parentId` なし、**絶対座標**で縦に並べる（既存のルート縦並びレイアウトを踏襲）
   - **ルート葉ノード**（子を持たない depth 0 ノード）: `parentId` なし、**絶対座標**で、グループ群の下段にグリッド配置する（既存の `rootLeaves` ロジックを踏襲）
   - **depth 1 / depth 2 ノード**（親を持つノード）: `parentId` に親の ID を設定、`position` は**親ノードからの相対座標**（親原点が `{0, 0}` の系）
   - ノード配列の順序は **DFS（親 → 子 → 孫）** を維持する（Svelte Flow が要求する「親が先」の制約を満たすため）
   - グループノードの width/height は現状どおり子要素から計算して `style` に埋め込む（Svelte Flow は自動リサイズしないため）
   - `featureGlossary` を `buildTree(items, 3)` に渡し、3階層超のノードを事前除外する
3. **エッジ参照の整合性保証**（`InteractionFlow.svelte` の `buildEdges` 書き換え）
   - エッジ ID セットを `flattenTree(tree)` から得た「ツリーに実際に含まれるノード ID 集合」に差し替える
   - truncate で除外された depth 3+ のノードを参照するエッジは、既存の `console.warn('Skipping edge...')` と同じパスで除外されるようにする
   - これにより「Svelte Flow ノードとして存在しない ID を source/target に持つエッジ」が UI に渡らない
4. テスト追加（`utils/__tests__/filter.test.ts`）
   - 4階層目のノード（depth 3 item）がツリーから除外され、`flattenTree(buildTree(items))` に含まれないことを検証
   - depth 2 ノードの `children` が空配列になることを検証（`.children.length === 0` を明示 assert）
   - `buildTree(items, 1)` で tree 全体が depth 0 のノードのみになる（`.every(n => n.children.length === 0)`）ことの境界検証
   - `buildTree(items, 2)` で depth 1 ノードの `children` が空になるカスタム maxDepth 検証
   - `maxDepth` 未指定時のデフォルト挙動（3階層）が既存の `builds hierarchy with parentId` テストと矛盾しないこと
   - 循環 parentId と maxDepth の併用時も無限再帰せず終了すること

## 検証基準

### filter.ts 側
- [ ] `buildTree(items)` が従来どおり 3 階層のツリーを生成し、既存テスト（`builds hierarchy with parentId` など）が全て PASS する
- [ ] 4 階層目のノード（`parentId` が depth 2 ノードを指す）を含む入力で、**`flattenTree(buildTree(items))` の結果 ID 集合にその item が含まれない**
- [ ] 上記入力の tree で、depth 2 ノードの `.children.length === 0`
- [ ] `buildTree(items, 1)` で tree 全体が depth 0 のノードのみになり、**全ノードの `.children.length === 0`**
- [ ] `buildTree(items, 2)` で depth 1 ノードの `children` が空になる（カスタム maxDepth の境界）
- [ ] `buildTree([])` は従来どおり `[]` を返す（空入力の回帰なし）
- [ ] 循環 parentId でも無限再帰せず終了する（既存テスト維持、maxDepth 併用時も同様）

### InteractionFlow.svelte 側
- [ ] 生成される Svelte Flow nodes 配列で、`parentId` を持つ子ノードがその親ノードより**後**に並んでいる（DFS 順、Svelte Flow の "Parent node not found" warning が出ない）
- [ ] **`parentId` が未設定のノード**：depth 0 のルート親ノードとルート葉ノードの両方で、`position` が絶対座標系の値（ページ全体の原点基準）になっている
- [ ] **`parentId` が設定されたノード**：`position` が親原点 `{0, 0}` からの相対座標（`GROUP_PAD_X` / `GROUP_HEADER + GROUP_PAD_Y` からの累積）になっている
- [ ] 実機のブラウザで、グループノード内に子ノードが正しくネスト表示される（`internals.positionAbsolute` が `親.positionAbsolute + 子.position` に一致。DOM 上の見た目で確認可）
- [ ] **depth 3+ の item を source/target に持つエッジ**が Svelte Flow に渡るエッジ配列から除外され、`console.warn('Skipping edge: unknown glossary id ...')` がコンソールに出る
- [ ] diff 表示（`isDiff=true` と `baseInteractions` 指定）でエッジの色・アニメーションが従来どおり適用される
- [ ] glossary 選択時のハイライト（`box-shadow`）が対象ノードにのみ出る（ルート・子・孫のどの階層でも機能する）
- [ ] ツリーに含まれる全ノード ID が従来のレイアウトでも一致し、有効なエッジの `source`/`target` 参照が壊れていない

### ビルド・テスト
- [ ] `npm run build` が警告なしで通る（型チェック含む）
- [ ] `npm test` が全 PASS（既存 + 新規テスト）

## 影響ファイル

- `plan-viewer/src/utils/filter.ts` — `buildTree` に `maxDepth` パラメータ追加、再帰打ち切りロジック追加
- `plan-viewer/src/utils/__tests__/filter.test.ts` — 3階層制限の境界テスト追加（truncate・maxDepth=1/2 境界・循環との併用）
- `plan-viewer/src/components/InteractionFlow.svelte` — `buildHierarchicalLayout` を `parentId` ベースに書き換え、`buildTree(..., 3)` を呼び出し、`buildEdges` に渡す有効 ID 集合を `flattenTree(tree)` 由来に差し替え

## リスク・制約

- **リスク1: ノード順序ミス**（子が親より前に配列に入ると Svelte Flow が warn して座標計算失敗）
  - 緩和: DFS で親を push してから子を push する実装を徹底。Sprint Contract 検証で順序チェックを明示。
- **リスク2: グループ width/height と子配置の整合性**（`parentId` を付けても Svelte Flow は親を自動リサイズしない）
  - 緩和: 現行と同じ「子レイアウト完了後に親の size を style に設定」方式を踏襲する。子の相対座標は `GROUP_PAD_X` / `GROUP_HEADER + GROUP_PAD_Y` から始まる既存の計算ロジックをそのまま再利用。
- **リスク3: `extent: 'parent'` を付けないため、将来ドラッグ対応時に子が親外に出る可能性**
  - 緩和: 非対象として明示。ドラッグ機能導入時に別タスクで対応。
- **リスク4: depth 3 の入力データが既存のサンプル（`plan-viewer/example/*.json` 等）に存在しないことの確認**
  - 緩和: 実装前にサンプル JSON を確認し、depth が 3 を超えるデータがないことを確認。あれば動作確認用に一時的に追加する。
- **リスク5: エッジが truncate ノードを参照するケースの silent 破損**
  - 緩和: `buildEdges` の有効 ID 集合を **`flattenTree(tree)` 由来**に差し替える。ツリーに含まれないノードを指すエッジは `console.warn('Skipping edge: unknown glossary id')` で除外される（既存のパスを再利用）。
- **制約**: `GlossaryItem.parentId` の型・意味論は変更しない（データモデル不変）

## 未解決の質問

- **Q1**: 4 階層目以降のノードは「完全に非表示」で良いか、それとも「3 階層目にフラット化して表示」が良いか？
  - 仮定: **完全に非表示（truncate）**。理由: 実装が単純で、データ側の間違い（深すぎる階層）を視覚的に検知しやすい。フラット化方式が必要なら別タスクで追加。
- **Q2**: `maxDepth` の設定値は定数 `3` を `buildTree` のデフォルト引数として埋め込むか、`InteractionFlow.svelte` 側から明示的に渡すか？
  - 仮定: **両方サポート**。`buildTree` にデフォルト `3` を設定しつつ、呼び出し側（`InteractionFlow.svelte`）でも明示的に `buildTree(items, 3)` と書いて意図を明確化する。

## 除外事項（スコープ外）

- ノードのドラッグ移動対応（`extent: 'parent'` の付与）
- グループの折りたたみ（expand/collapse）UI
- `GlossaryItem.parentId` のデータモデル変更（型・DB スキーマ等）
- `GlossaryPanel.svelte` の階層表示ロジック（サイドバー側は別コンポーネント）
- サンプル JSON データ側への 3 階層超ノードのバリデーション追加

## 実行モード判定（REQUIRED）

- モード: **逐次**
- 判定根拠: `filter.ts` の変更が `InteractionFlow.svelte` の入力を規定する依存関係があり、先に `buildTree` の制限を確定してから UI 側を書き換える必要がある。独立スコープが 1 つ（単一機能の実装）で、並列化のメリットが薄い。
- N（best-of-Nの場合）: N/A
- 分割単位（タスク分割の場合）: N/A

## 推奨事項

- **実装順**: (1) `buildTree` の maxDepth 拡張＋テスト → (2) `InteractionFlow.svelte` の parentId レイアウト書き換え＋エッジ ID 集合の差し替え → (3) ブラウザで実機確認
- **ノード配列構築時のインバリアント**: DFS で親を先に `push` してから再帰的に子を処理する。関数の戻り値に「このサブツリーの width / height」を返して、親がレイアウト計算に使う（現行の `layoutGroup` の戻り値をそのまま活用）。
- **子の相対座標**: 親配下のノードは、現行の `offsetX + GROUP_PAD_X + ...` から `offsetX / offsetY` を除いた**相対座標のみ**で配置する。ルート親・ルート葉のみ絶対座標。
- **有効ノード ID 集合**: `layout` 計算の副産物として `validIds = new Set(flattenTree(tree).map(n => n.item.id))` を返すか、`buildEdges` に `tree` を渡して内部で同等の集合を生成する。`buildEdges` は `featureGlossary` ではなくこの集合を照合に使う。
- **動作確認**: `plan-viewer/example/` の既存データを読み込み、サイドパネル選択・diff 表示の両モードで Background / ハイライト / エッジが従来通り描画されることをブラウザで確認する。加えて、4 階層目のダミーデータを一時的に注入して「depth 3+ item が画面に表示されず、対応するエッジもコンソール warn で除外される」ことを目視確認する。
