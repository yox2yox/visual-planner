# Sprint Contract: @xyflow/svelte v1.x アップグレードによる親ノード操作時のエッジ可視性修正

## Goal
`@xyflow/svelte` を v0.1.39 から v1.5.2 にアップグレードし、v1.0.0 で追加された `elevateNodesOnSelect={false}` prop を利用して、親ノードのクリック/ドラッグ時に子ノード間エッジがグループノードの裏に隠れる問題を根本的に解決する。

## 背景
- 現状バグは v0.1.x が `elevateNodesOnSelect` を SvelteFlow prop として公開していないことに起因
- v1.0.0 でこの prop が公開され、v1.5.0 ではより細かい制御の `zIndexMode` も追加
- プロジェクトは既に Svelte 5 + Runes を使用しているため、v1.x（Svelte 5 対応）への移行障壁は低い

## 影響範囲（調査済み）
`@xyflow/svelte` を import しているのは **`plan-viewer/src/components/InteractionFlow.svelte` 1 ファイルのみ**。
以下の v1.x 破壊的変更は、現在のコードでは **いずれも使用していない** ので影響なし:
- `on:connect` / `on:nodeclick` 等の古いイベント構文
- `node.computed` / `node.positionAbsolute` アクセス
- `node.parentNode`（既に `parentId` を使用済み）
- `screenToFlowCoordinate` 等のユーティリティ関数
- カスタム `NodeProps` 型使用

## 変更対象

### 1. `plan-viewer/package.json`
- `@xyflow/svelte`: `^0.1.24` → `^1.5.2`

### 2. `plan-viewer/src/components/InteractionFlow.svelte`

| 変更内容 | Before | After |
|---|---|---|
| nodes/edges ストア | `const nodesStore = writable<Node[]>([])` / `nodesStore.set(...)` | `let nodes = $state.raw<Node[]>([])` / `nodes = ...` |
| SvelteFlow props | `<SvelteFlow nodes={nodesStore} edges={edgesStore} fitView>` | `<SvelteFlow bind:nodes bind:edges fitView elevateNodesOnSelect={false}>` |
| `writable` import | `import { writable } from 'svelte/store'` | （削除） |
| group zIndex | `zIndex: -1` | `zIndex: -1`（**維持**） |
| CSS override | `:global(.svelte-flow__nodes) { z-index: auto !important }` | （維持 / ビルド後の動作確認で必要性を再判断） |
| コメント | 既存の calculateChildXYZ 説明 | v1.x の `elevateNodesOnSelect={false}` 前提に更新 |

### 3. npm install
- `cd plan-viewer && npm install` で lockfile 更新

## なぜ `zIndex: -1` を残すのか
- `elevateNodesOnSelect={false}` で選択時の +1000 ブーストは消えるが、**親グループのデフォルト z=0** とエッジのデフォルト z=0 が同値になる
- DOM 順序では EdgeRenderer → NodeRenderer の順で描画されるため、同 z-index では **ノードが上、エッジが下** に来る → グループ矩形がエッジを覆ってしまう
- 親グループに `zIndex: -1` を明示すると、`-1 < 0` でエッジ（z=0）の下に留まる
- 子ノードは `calculateChildXYZ` で `max(-1, 0) = 0` に clamp されるため、子ノード自体は従来どおり表示される

## 検証基準（受け入れ条件）
1. **機能要件**:
   - 親グループノードをクリックしても、グループ内の子ノード間エッジが可視のまま
   - 親グループノードをドラッグ中も、子ノード間エッジが可視のまま
   - 子ノードをクリック/ドラッグした際、操作自体が機能する（v1.x では選択時の自動浮上は無効化される点に注意）
   - 3階層（grandparent → parent → child）でも各階層のグループがエッジを覆わない
   - 親グループと子ノードを同時選択（複数選択）した場合も子ノード間エッジ可視
2. **ビルド/型**:
   - `cd plan-viewer && npm run build` が成功
   - `cd plan-viewer && npm run typecheck` が成功（または build の過程で型エラーが出ない）
3. **既存テスト**:
   - `cd plan-viewer && npm run test` で `utils/__tests__/*` の既存テストが pass
4. **リグレッション防止**:
   - エッジのラベル、アニメーション（diff 表示の added エッジ）、ストロークスタイルが従来どおり表示
   - ノード選択時のハイライト（ボックスシャドウ）が従来どおり表示
   - `fitView` が従来どおり機能

## Gate 2 で実行するコマンド（順次）
```bash
cd plan-viewer
npm install                # lockfile 更新
npm run build              # TypeScript + Svelte ビルド
npm run test               # Vitest（utils 配下のテストのみ、UI 非対象）
```

## リスク/代替案
- **リスク**: v1.x の微細なデフォルト挙動の違い（connection line type、pan behavior 等）が UX に影響する可能性。→ 検証基準 4 で目視確認。
- **代替案（不採用）**:
  - A. 現状維持で `zIndex: -1001` の hack → マジックナンバー依存、根本解決ではない
  - B. `zIndexMode='manual'` の利用 → より全面制御だが、子ノード選択時の自動浮上も失うため挙動変化が大きい。今回は最小変更の `elevateNodesOnSelect={false}` を優先

## Out of scope
- `zIndexMode` 等 v1.5.0+ の新機能の活用
- エッジデザインの変更
- グループノードの UI 再デザイン
- 他ファイルの不要なリファクタリング

## Next Owner
- review（Contract 検証）→ ユーザー確認 → generate（実装 + ビルド/テスト）
