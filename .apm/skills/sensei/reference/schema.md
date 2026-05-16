# Plan スキーマ — リファレンス

`viewer/` バンドルが読み込む JSON ペイロードの仕様。

## スキーマ本体

機械可読な定義は [`plan.schema.json`](./plan.schema.json) を参照

## 検証方法

```bash
# 単体検証（exit 0=valid、exit 1=invalid を返す CLI）
node scripts/validate_plan.mjs path/to/plan.json

# HTML 生成（内部で validate_plan を呼ぶ）
node scripts/make_plan.mjs path/to/plan.json /abs/out/basename
```

## 完全な例

3 階層ネスト・両 state 入りの例（セッションベース認証 → JWT 移行）は、リポジトリルートの `plan-viewer/example.json` を参照。
