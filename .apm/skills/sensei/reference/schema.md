# Plan スキーマ — リファレンス

`viewer/` バンドルが読み込む JSON ペイロードの仕様。

## スキーマ本体

機械可読な定義は [`plan.schema.json`](./plan.schema.json) を参照（JSON Schema Draft 2020-12）。
`$defs` に以下のサブタイプを定義している：

| `$defs` キー       | 用途                                                   |
| ------------------- | ------------------------------------------------------ |
| `GlossaryItem`      | glossary[] の項目                                     |
| `StatePair`         | `pairs[]` の各ペア                                    |
| `State`             | `currentState` / `proposedState`                      |
| `ArchitectureEdge`  | `architectureEdges[]` の各辺                          |
| `DiagramOptions`    | `diagram` の手動レイアウト/描画ヒント                 |
| `Metaphor`          | `metaphor`                                            |
| `StoryScene`        | `scenes[]` の各シーン                                 |
| `ComparisonRow`     | `comparison[]` の各行                                 |
| `EvidenceRef`       | `evidence[]` のファイル/行参照                        |
| `CodeSnippet`       | `codeSnippets[]` のコード抜粋                         |

## ビューア挙動の補足

- `pairs` がある場合はそれを使う。表示すべき state・comparison・safeguard・takeaway・evidence・description のいずれも持たないペアは黙って捨てられる。
- そうでなく `currentState` または `proposedState` がある場合は、無題の単一ペアにラップされる。
- どちらも無い場合は glossary のみが描画される。
- 各 state のアーキテクチャ図には、その state の `architectureEdges[].source` / `.target` から参照される glossary ノードのみが描画される。未参照の glossary 項目はパネルには残るが、図中のノードとしては現れない。
- `pairs` とトップレベル `currentState`/`proposedState` を同時に定義するとバリデーションエラー（スキーマの `not` で表現）。

## JSON Schema では検査しきれない制約

以下は `scripts/lib/plan-schema.zod.mjs` の `validateReferences()` で別途検証される：

- すべての `glossary[].parentId` は別の `glossary[].id` を参照する（順序非依存）。
- `parentId` チェーンに循環があってはならない。
- glossary のネスト深さは 1〜3。深さ 4 以降はビューから捨てられる。
- すべての `architectureEdges[].source` / `.target` は `glossary[].id` のいずれかを指す。
- 各 `State` 内の `architectureEdges[].order` は `1` から始まる連番。
- すべての `scenes[].edgeRefs[]` は同じ state の `architectureEdges[].order` に存在する番号。
- `scenes[].actor` は `glossary[].id` を指す。
- `diagram.nodePositions` のキーは `glossary[].id` に存在する。
- `diagram.edges` のキーが `"source->target"` 形式なら両端が `glossary[].id` に存在、`"<order>"` 形式ならその order が同じ state に存在する。

## 検証方法

```bash
# 単体検証（exit 0=valid、exit 1=invalid を返す CLI）
node scripts/validate_plan.mjs path/to/plan.json

# HTML 生成（内部で validate_plan を呼ぶ）
node scripts/make_plan.mjs path/to/plan.json /abs/out/basename
```

## ペア vs トップレベル（分割の判断基準）

以下のいずれかに該当する場合は `pairs` を推奨：

- 1 つの state に約 10 本以上のアーキテクチャエッジが含まれる、または
- 1 つの state が約 10 個以上の glossary ノードに触れる、または
- プランが互いに独立した複数の設計関心事（認証境界・API 境界・永続化境界など）を扱い、それぞれ別の図にした方が分かりやすい。

各ペアは、`architectureEdges` がある場合、自身のヘッダの下に AS-IS / TO-BE のアーキテクチャ図を描画する。アーキテクチャ説明が不要なペアでは、state 図を省略し、説明は `description`・`comparison`・`safeguards`・`takeaway`・`evidence` に寄せる。

## 最小例（単一ペア、レガシー形式）

```json
{
  "title": "Hello plan",
  "description": "Tiny example.",
  "glossary": [
    { "id": "client", "type": "client", "name": "Client" },
    { "id": "server", "type": "server", "name": "Server" }
  ],
  "proposedState": {
    "description": "Client calls server.",
    "architectureEdges": [
      { "order": 1, "source": "client", "target": "server", "label": "HTTP GET", "data": "Request" }
    ]
  }
}
```

## 複数ペアの例

```json
{
  "title": "Hello plan",
  "description": "Two independent design concerns.",
  "glossary": [
    { "id": "client", "type": "client", "name": "Client" },
    { "id": "server", "type": "server", "name": "Server" },
    { "id": "db", "type": "db", "name": "DB" }
  ],
  "pairs": [
    {
      "title": "Read",
      "proposedState": {
        "architectureEdges": [
          { "order": 1, "source": "client", "target": "server", "label": "GET /item", "data": "ItemID" },
          { "order": 2, "source": "server", "target": "db", "label": "SELECT", "data": "ItemID" }
        ]
      }
    },
    {
      "title": "Write",
      "currentState": {
        "architectureEdges": [
          { "order": 1, "source": "client", "target": "server", "label": "POST /item", "data": "ItemBody" }
        ]
      },
      "proposedState": {
        "architectureEdges": [
          { "order": 1, "source": "client", "target": "server", "label": "PUT /item", "data": "ItemBody" },
          { "order": 2, "source": "server", "target": "db", "label": "UPSERT", "data": "ItemRow" }
        ]
      }
    }
  ]
}
```

## 完全な例

3 階層ネスト・両 state 入りの例（セッションベース認証 → JWT 移行）は、リポジトリルートの `plan-viewer/example.json` を参照。

## URL 用エンコード

ビューアは `?plan=<urlsafe-base64>` から入力を読む：

1. `JSON.stringify(plan)` — コンパクトに。
2. UTF-8 エンコード。
3. Base64 エンコード。
4. URL セーフ化：`+` → `-`、`/` → `_`。
5. `=` のパディングを除去。

`make_url.py` がこれらをすべてやってくれる。手動でデコードする場合は、長さが 4 の倍数になるまで `=` のパディングを戻してから標準の base64 デコーダに渡すこと。

## サイズの目安

- Chrome の `file://` URL 長制限は数万文字に達する。
- Base64 はバイト数を約 33% 膨らませる。6 KB の JSON はおおよそ 8 KB の URL になる。
- プランが 10 KB 近くに達したら、共有前に `description` フィールドを削ぐこと。
