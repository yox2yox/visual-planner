# Plan JSON スキーマ

`viewer/` バンドルが `?plan=<base64url>` クエリパラメータ経由で読み込む JSON ペイロードの仕様。
以下は JSON Schema (Draft 2020-12) による形式定義。

## スキーマ本体

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://sensei.local/plan.schema.json",
  "title": "Plan",
  "type": "object",
  "required": ["title", "description", "glossary"],
  "additionalProperties": false,
  "properties": {
    "title":        { "type": "string", "description": "ページ見出しとして表示される" },
    "description":  { "type": "string", "description": "タイトル直下に表示される一段落の概要" },
    "metaphor":     { "$ref": "#/$defs/Metaphor", "description": "任意だが強く推奨" },
    "takeaway":     { "type": "string", "description": "任意の一文「ひと言で」サマリー" },
    "evidence":     { "type": "array", "items": { "$ref": "#/$defs/EvidenceRef" } },
    "glossary": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/GlossaryItem" }
    },
    "pairs": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/StatePair" },
      "description": "複数ペア形式（推奨）。指定する場合は currentState/proposedState を併用不可"
    },
    "currentState":  { "$ref": "#/$defs/State", "description": "レガシー単一ペア形式の before" },
    "proposedState": { "$ref": "#/$defs/State", "description": "レガシー単一ペア形式の after" }
  },
  "not": {
    "anyOf": [
      { "required": ["pairs", "currentState"] },
      { "required": ["pairs", "proposedState"] }
    ]
  },

  "$defs": {
    "GlossaryItem": {
      "type": "object",
      "required": ["id", "type", "name"],
      "additionalProperties": false,
      "properties": {
        "id":   { "type": "string", "description": "glossary[] 内で一意。parentId と architectureEdges から参照される" },
        "type": {
          "type": "string",
          "enum": ["term", "client", "server", "cloud-service", "class", "function", "db", "table"]
        },
        "name":           { "type": "string", "description": "ノードに表示される短いラベル" },
        "description":    { "type": "string", "description": "クリック時に詳細パネルに表示される" },
        "icon":           { "type": "string", "description": "絵文字または1文字のグリフ。type ごとのデフォルトあり" },
        "parentId":       { "type": "string", "description": "別の glossary 項目 id。最大3階層までネスト可（4階層以降は表示で捨てられる）" },
        "persona":        { "type": "string", "description": "解説スタイルの役割名（人物）" },
        "analogy":        { "type": "string", "description": "メタファー世界での対応物" },
        "responsibility": { "type": "string", "description": "平易な言葉での責務" },
        "evidence":       { "type": "array", "items": { "$ref": "#/$defs/EvidenceRef" } },
        "codeSnippets":   { "type": "array", "items": { "$ref": "#/$defs/CodeSnippet" } }
      }
    },
    "StatePair": {
      "type": "object",
      "required": ["title"],
      "additionalProperties": false,
      "properties": {
        "title":         { "type": "string", "description": "セクションヘッダ。空文字 '' でヘッダを非表示にできる" },
        "description":   { "type": "string", "description": "タイトル下に表示される段落" },
        "currentState":  { "$ref": "#/$defs/State" },
        "proposedState": { "$ref": "#/$defs/State" },
        "comparison":    { "type": "array", "items": { "$ref": "#/$defs/ComparisonRow" } },
        "safeguards":    { "type": "array", "items": { "type": "string" } },
        "takeaway":      { "type": "string", "description": "ペアレベル「ひと言で」" },
        "evidence":      { "type": "array", "items": { "$ref": "#/$defs/EvidenceRef" } }
      }
    },
    "State": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "description":       { "type": "string", "description": "このスナップショットを説明する段落" },
        "architectureEdges": { "type": "array", "items": { "$ref": "#/$defs/ArchitectureEdge" } },
        "diagram":           { "$ref": "#/$defs/DiagramOptions" },
        "storyTitle":        { "type": "string", "description": "時系列解説のタイトル" },
        "scenes":            { "type": "array", "items": { "$ref": "#/$defs/StoryScene" } },
        "takeaway":          { "type": "string", "description": "state レベル一行サマリー" }
      }
    },
    "ArchitectureEdge": {
      "type": "object",
      "required": ["order", "source", "target", "label", "data"],
      "additionalProperties": false,
      "properties": {
        "order":  { "type": "integer", "minimum": 1, "description": "state 内のエッジ番号。1 から始まり 1 ずつ増加" },
        "source": { "type": "string", "description": "起点となる glossary id" },
        "target": { "type": "string", "description": "受け側の glossary id" },
        "label":  { "type": "string", "description": "短い関係/動作の語句（例：'validates token'）" },
        "data":   { "type": "string", "description": "payload・エンティティ・契約・結果（例：'AuthToken'）" },
        "sourcePosition": { "type": "string", "enum": ["top", "right", "bottom", "left"] },
        "targetPosition": { "type": "string", "enum": ["top", "right", "bottom", "left"] },
        "edgeType":       { "type": "string", "enum": ["default", "straight", "step", "smoothstep"] },
        "edgeStyle":      { "type": "string", "enum": ["solid", "dashed", "dotted", "bold"] },
        "animated":       { "type": "boolean" }
      }
    },
    "DiagramOptions": {
      "type": "object",
      "additionalProperties": false,
      "description": "アーキテクチャ図の可読性チューニング専用。デフォルトで十分なら省略する",
      "properties": {
        "nodePositions": {
          "type": "object",
          "description": "キーは glossary id。値は図のピクセル座標",
          "additionalProperties": {
            "type": "object",
            "required": ["x", "y"],
            "additionalProperties": false,
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" }
            }
          }
        },
        "edges": {
          "type": "object",
          "description": "キーはエッジ order の文字列（例：'1'）または 'source->target'。同じノード間で複数エッジがある場合は order キーを推奨",
          "additionalProperties": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "sourcePosition": { "type": "string", "enum": ["top", "right", "bottom", "left"] },
              "targetPosition": { "type": "string", "enum": ["top", "right", "bottom", "left"] },
              "type":     { "type": "string", "enum": ["default", "straight", "step", "smoothstep"] },
              "style":    { "type": "string", "enum": ["solid", "dashed", "dotted", "bold"] },
              "animated": { "type": "boolean" }
            }
          }
        }
      }
    },
    "Metaphor": {
      "type": "object",
      "required": ["title", "description"],
      "additionalProperties": false,
      "properties": {
        "title":       { "type": "string", "description": "現実世界のメタファーの短いラベル" },
        "description": { "type": "string", "description": "そのメタファーを通してプラン全体をどう読むか" }
      }
    },
    "StoryScene": {
      "type": "object",
      "required": ["title", "action"],
      "additionalProperties": false,
      "properties": {
        "title":    { "type": "string", "description": "場面の見出し。例：'場面1: 受付係が注文を受ける'" },
        "actor":    { "type": "string", "description": "主役の glossary id" },
        "action":   { "type": "string", "description": "主役が何をするかを平易な言葉で" },
        "result":   { "type": "string", "description": "場面の結果" },
        "edgeRefs": {
          "type": "array",
          "items": { "type": "integer", "minimum": 1 },
          "description": "同じ state の architectureEdges に存在する order を参照する"
        },
        "evidence": { "type": "array", "items": { "$ref": "#/$defs/EvidenceRef" } }
      }
    },
    "ComparisonRow": {
      "type": "object",
      "required": ["label", "current", "proposed"],
      "additionalProperties": false,
      "properties": {
        "label":    { "type": "string", "description": "観点。例：'認証情報の置き場所'" },
        "current":  { "type": "string", "description": "現在の挙動" },
        "proposed": { "type": "string", "description": "提案する挙動" },
        "note":     { "type": "string", "description": "なぜ重要か。代替案への注意も有用なら含める" }
      }
    },
    "EvidenceRef": {
      "type": "object",
      "required": ["path"],
      "additionalProperties": false,
      "properties": {
        "path":      { "type": "string", "description": "ファイルパスまたはソース名" },
        "startLine": { "type": "integer", "minimum": 1 },
        "endLine":   { "type": "integer", "minimum": 1 },
        "label":     { "type": "string", "description": "任意の説明" }
      }
    },
    "CodeSnippet": {
      "type": "object",
      "required": ["code"],
      "additionalProperties": false,
      "properties": {
        "language": {
          "type": "string",
          "description": "Prism 言語 id（ts, js, tsx, py, go, rust, json, sql, ...）"
        },
        "code": {
          "description": "必須。配列要素は '\\n' で連結される。共通先頭インデントは自動デデント。CRLF とタブは正規化される",
          "oneOf": [
            { "type": "string" },
            { "type": "array", "items": { "type": "string" } }
          ]
        },
        "label":     { "type": "string", "description": "任意のヘッダ文字列" },
        "path":      { "type": "string", "description": "任意。ヘッダに表示されるソースファイルパス" },
        "startLine": { "type": "integer", "minimum": 1 },
        "endLine":   { "type": "integer", "minimum": 1 }
      }
    }
  }
}
```

## ビューア挙動の補足（スキーマ外）

- `pairs` がある場合はそれを使う。表示すべき state・comparison・safeguard・takeaway・evidence・description のいずれも持たないペアは黙って捨てられる。
- そうでなく `currentState` または `proposedState` がある場合は、無題の単一ペアにラップされる。
- どちらも無い場合は glossary のみが描画される。
- 各 state のアーキテクチャ図には、その state の `architectureEdges[].source` / `.target` から参照される glossary ノードのみが描画される。未参照の glossary 項目はパネルには残るが、図中のノードとしては現れない。
- `pairs` とトップレベル `currentState`/`proposedState` を同時に定義するとバリデーションエラー。

## 追加の制約（JSON Schema では表現できないもの）

スキーマ上は型のみを検証する。生成スクリプト側で以下の参照整合性を別途検証する：

- すべての `glossary[].parentId` は別の `glossary[].id` を参照する（順序非依存）。
- `parentId` チェーンに循環があってはならない。
- glossary のネスト深さは 1〜3。深さ 4 以降のノードはビューから捨てられる。
- すべての `architectureEdges[].source` / `.target` は `glossary[].id` のいずれかを指す。
- 各 `State` 内の `architectureEdges[].order` は `1` から始まる連番。
- すべての `scenes[].edgeRefs[]` は同じ state の `architectureEdges[].order` に存在する番号。
- `diagram.nodePositions` のキーは `glossary[].id` に存在する。
- `diagram.edges` のキーが `"source->target"` 形式なら、両端が `glossary[].id` に存在する。`"<order>"` 形式なら、その order が同じ state に存在する。
- トップレベル `pairs` と `currentState`/`proposedState` の併用は不可（スキーマの `not` でも表現済み）。

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

1. `JSON.stringify(plan)` — コンパクトに（余分な空白を入れないと URL が短くなる）。
2. UTF-8 エンコード。
3. Base64 エンコード。
4. URL セーフ化：`+` → `-`、`/` → `_`。
5. `=` のパディングを除去。

`make_url.py` がこれらをすべてやってくれる。手動でデコードする場合は、長さが 4 の倍数になるまで `=` のパディングを戻してから標準の base64 デコーダに渡すこと。

## サイズの目安

- Chrome の `file://` URL 長制限は数万文字に達する。
- Base64 はバイト数を約 33% 膨らませる。6 KB の JSON はおおよそ 8 KB の URL になる。
- プランが 10 KB 近くに達したら、共有前に `description` フィールドを削ぐこと。
