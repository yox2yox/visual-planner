# Sprint Contract: 親ノード操作時の子ノード間エッジ可視性

## Goal
親ノード（グループノード）をクリックまたはドラッグしても、子ノード間のエッジがグループノードの背景矩形の裏に隠れないようにする。

## 問題の要約
- ライブラリ: `@xyflow/svelte` v0.1.24
- `elevateNodesOnSelect` のデフォルトが `true` で、選択/ドラッグ中のノードに `+1000` の zIndex ブーストが自動付与される
- このライブラリ版では `elevateNodesOnSelect` を SvelteFlow の prop として公開していない（内部デフォルト `true` 固定、`setOptions` も外部から到達不能）
- 現在グループノードは `zIndex: -1` でエッジ層の下に置かれているが、選択時 `-1 + 1000 = 999` となりエッジ（デフォルト z=0）を覆ってしまう

## 根本原因
`@xyflow/system/index.js` line 1593–1594 / 1607–1612:
```js
calculateZ(node) = zIndex + (selected ? 1000 : 0)
calculateChildXYZ → z = max(parentZ, childZ)
```
グループノードの zIndex が `-1` の場合、選択時に `+1000` ブーストで `999` になり、エッジ層の上に浮上する。

## Fix 方針（採用案）
**グループノードの `zIndex` を `-1001` に変更する。**

- 非選択時: group z = -1001 → エッジ（z=0）の下 ✓
- 選択時: group z = -1001 + 1000 = -1 → エッジ（z=0）の下 ✓
- 子ノード: `max(parentZ, childZ)` の式により、childZ=0（または選択時 1000）が勝つため、子ノード自体の描画層は変化しない ✓

この変更は 1 行（定数）の修正のみで、以下を維持する:
- グループのクリック/ドラッグ操作
- 子ノードの選択・ドラッグ時の浮上（selectedNodeZ=1000 が childZ に加算）
- 既存の `.svelte-flow__nodes { z-index: auto !important }` CSS オーバーライド

## 変更対象
- `plan-viewer/src/components/InteractionFlow.svelte`
  - line 127 付近: `zIndex: -1` → `zIndex: -1001`
  - line 118–120 のコメントを新しい値の根拠で更新

## 検証基準（受け入れ条件）
1. **機能**:
   - 親グループノードをクリックしても、そのグループ内の子ノード間エッジが可視のまま
   - 親グループノードをドラッグ中も、子ノード間エッジが可視のまま
   - 子ノードをクリック/ドラッグした際の挙動は変化しない（従来どおり前面に浮上）
   - 3階層（grandparent → parent → child）の場合でも、各階層のグループがエッジを覆わない
   - 親グループと子ノードを同時選択（複数選択）した場合でも、子ノード間エッジが可視
2. **コード品質**:
   - TypeScript 型チェック pass
   - 既存の Svelte ビルドが成功
3. **リグレッション防止**:
   - エッジのラベルが従来どおり表示される
   - ノード選択時のボックスシャドウ（選択ハイライト）が従来どおり表示される

## Gate 2 で実行するコマンド
- `cd plan-viewer && npm run build`（型チェック + ビルド）
- （テストスクリプトは現状未定義のため省略）

## リスク/代替案
- **リスク**: 将来 `@xyflow/svelte` が `selectedNodeZ` を 1000 以外に変更した場合、`-1001` が不十分になる可能性。低確率。
- **代替案 A**: エッジ全てに `zIndex: 1001` を設定 → 子ノードの前面に出てしまうためラベルの視認性低下の懸念あり（不採用）
- **代替案 B**: グループノードを `selectable: false, draggable: false` に → ユーザー要求「親をクリック/ドラッグしても」と矛盾（不採用）

## Out of scope
- @xyflow/svelte のバージョンアップ
- エッジの描画スタイル変更
- グループノードの UI 再デザイン

## Next Owner
- review（Contract 検証）→ ユーザー確認 → generate（実装）
