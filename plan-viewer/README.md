# plan-viewer

AIが生成した実装プランのJSONをビジュアルに表示する静的Webアプリです。現在のviewerは、図だけでなく `kaisetsu` 型の読みやすさを重視し、メタファー、登場人物、時系列ストーリー、裏付け、対比表、ひと言まとめを図の前後に表示できます。

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

`example.json` をエンコードしたサンプルURL。`npm run build` で生成される `.claude/skills/visual-planner/viewer/index.html` を直接ブラウザで開くか、`npm run preview` 経由で開けます。

`example.json` は新形式 `pairs` を使って **「ログインフロー」** と **「認証済み API 呼び出し」** の2ペアに分割した実例です。`user-auth` 配下の `auth-validator` / `token-issuer` で **最大 3 階層** の表示も確認できます:

```
http://localhost:4173/?plan=eyJ0aXRsZSI6IuiqjeiovOOCt-OCueODhuODoOWIt-aWsOODl-ODqeODsyIsImRlc2NyaXB0aW9uIjoi44K744OD44K344On44Oz44OZ44O844K544GL44KJSldU6KqN6Ki844G444Gu56e76KGM44CC6KSH6ZuR44Gq44OV44Ot44O85YWo5L2T44KS44CM44Ot44Kw44Kk44Oz44CN44CMQVBJIOWRvOOBs-WHuuOBl-OAjeOBrjLjg5rjgqLjgavliIblibLjgZfjgabooajnpLrjgZnjgovjgZPjgajjgafjgIHlkITjg4DjgqTjgqLjgrDjg6njg6DjgpLoqq3jgb_jgoTjgZnjgY_kv53jgaTjgIIiLCJnbG9zc2FyeSI6W3siaWQiOiJiYWNrZW5kIiwidHlwZSI6ImZlYXR1cmUiLCJuYW1lIjoi44OQ44OD44Kv44Ko44Oz44OJIiwiZGVzY3JpcHRpb24iOiLjgrXjg7zjg5Djg7zjgrXjgqTjg4njga7lh6bnkIbjgpLmi4XlvZPjgZnjgovjg6zjgqTjg6Tjg7wiLCJpY29uIjoi8J-Wpe-4jyJ9LHsiaWQiOiJ1c2VyLWF1dGgiLCJ0eXBlIjoiZmVhdHVyZSIsIm5hbWUiOiLjg6bjg7zjgrbjg7zoqo3oqLwiLCJkZXNjcmlwdGlvbiI6IuODreOCsOOCpOODs-ODu-ODreOCsOOCouOCpuODiOODu-ODkeOCueODr-ODvOODieODquOCu-ODg-ODiOOCkuaLheW9k-OBmeOCi-ODouOCuOODpeODvOODqyIsImljb24iOiLwn5SQIiwicGFyZW50SWQiOiJiYWNrZW5kIn0seyJpZCI6ImF1dGgtdmFsaWRhdG9yIiwidHlwZSI6ImZlYXR1cmUiLCJuYW1lIjoi6LOH5qC85oOF5aCx5qSc6Ki8IiwiZGVzY3JpcHRpb24iOiLjg5Hjgrnjg6_jg7zjg4njg4_jg4Pjgrfjg6Xjga7nhaflkIjjgarjganjgIHjgq_jg6zjg4fjg7Pjgrfjg6Pjg6vjga7mpJzoqLzjgpLlsILku7vjgafooYzjgYbjgrXjg5bjg6Ljgrjjg6Xjg7zjg6vvvIgz6ZqO5bGk55uu44Gu6KGo56S65L6L77yJIiwiaWNvbiI6IuKchSIsInBhcmVudElkIjoidXNlci1hdXRoIn0seyJpZCI6InRva2VuLWlzc3VlciIsInR5cGUiOiJmZWF0dXJlIiwibmFtZSI6IuODiOODvOOCr-ODs-eZuuihjCIsImRlc2NyaXB0aW9uIjoi5qSc6Ki85riI44G_44Om44O844K244O844Gr5a--44GX44GmIEpXVCDjgpLnmbrooYzjgZnjgovjgrXjg5bjg6Ljgrjjg6Xjg7zjg6vvvIgz6ZqO5bGk55uu44Gu6KGo56S65L6L77yJIiwiaWNvbiI6IvCfjp_vuI8iLCJwYXJlbnRJZCI6InVzZXItYXV0aCJ9LHsiaWQiOiJ1c2VyLXNlcnZpY2UiLCJ0eXBlIjoiZmVhdHVyZSIsIm5hbWUiOiLjg6bjg7zjgrbjg7zjgrXjg7zjg5PjgrkiLCJkZXNjcmlwdGlvbiI6IuODpuODvOOCtuODvOaDheWgseOBrkNSVUTjgpLmj5DkvpvjgZnjgovjg57jgqTjgq_jg63jgrXjg7zjg5PjgrkiLCJwYXJlbnRJZCI6ImJhY2tlbmQifSx7ImlkIjoiYXBpLWdhdGV3YXkiLCJ0eXBlIjoiZmVhdHVyZSIsIm5hbWUiOiJBUEnjgrLjg7zjg4jjgqbjgqfjgqQiLCJkZXNjcmlwdGlvbiI6IuWklumDqOOBi-OCieOBruODquOCr-OCqOOCueODiOOCkuWPl-OBkeS7mOOBkeOAgeWGhemDqOOCteODvOODk-OCueOBq-ODq-ODvOODhuOCo-ODs-OCsOOBmeOCiyIsImljb24iOiLwn4yQIiwicGFyZW50SWQiOiJiYWNrZW5kIn0seyJpZCI6InRva2VuLXZlcmlmaWVyIiwidHlwZSI6ImZlYXR1cmUiLCJuYW1lIjoi44OI44O844Kv44Oz5qSc6Ki8IiwiZGVzY3JpcHRpb24iOiLlj5fkv6Hjg6rjgq_jgqjjgrnjg4jjgavku5jkuI7jgZXjgozjgZ_oqo3oqLzjg4jjg7zjgq_jg7PjgpLmpJzoqLzjgZnjgosiLCJpY29uIjoi8J-UjiIsInBhcmVudElkIjoiYXBpLWdhdGV3YXkifSx7ImlkIjoiZnJvbnRlbmQiLCJ0eXBlIjoiZmVhdHVyZSIsIm5hbWUiOiLjg5Xjg63jg7Pjg4jjgqjjg7Pjg4kiLCJkZXNjcmlwdGlvbiI6IuODluODqeOCpuOCtuS4iuOBp-WLleS9nOOBmeOCi-ODpuODvOOCtuODvOWQkeOBkeOCouODl-ODquOCseODvOOCt-ODp-ODsyIsImljb24iOiLwn5K7In0seyJpZCI6ImxvZ2luLXBhZ2UiLCJ0eXBlIjoiZmVhdHVyZSIsIm5hbWUiOiLjg63jgrDjgqTjg7Pjg5rjg7zjgrgiLCJkZXNjcmlwdGlvbiI6IuODpuODvOOCtuODvOOBjOizh-agvOaDheWgseOCkuWFpeWKm-OBmeOCi-eUu-mdoiIsImljb24iOiLwn5SRIiwicGFyZW50SWQiOiJmcm9udGVuZCJ9LHsiaWQiOiJkYXNoYm9hcmQiLCJ0eXBlIjoiZmVhdHVyZSIsIm5hbWUiOiLjg4Djg4Pjgrfjg6Xjg5zjg7zjg4kiLCJkZXNjcmlwdGlvbiI6IuODreOCsOOCpOODs-W-jOOBruODiOODg-ODl-eUu-mdouOAguWQhOeorkFQSeOCkuWRvOOBs-WHuuOBl-OBpuaDheWgseOCkuihqOekuuOBmeOCiyIsImljb24iOiLwn5OKIiwicGFyZW50SWQiOiJmcm9udGVuZCJ9LHsiaWQiOiJodHRwLWNsaWVudCIsInR5cGUiOiJmZWF0dXJlIiwibmFtZSI6IkhUVFDjgq_jg6njgqTjgqLjg7Pjg4giLCJkZXNjcmlwdGlvbiI6IuODkOODg-OCr-OCqOODs-ODieOBuOOBruODquOCr-OCqOOCueODiOmAgeWPl-S_oeOCkue1seaLrOOBmeOCi1NES-WxpCIsImljb24iOiLwn5OhIiwicGFyZW50SWQiOiJmcm9udGVuZCJ9LHsiaWQiOiJkYXRhLWxheWVyIiwidHlwZSI6ImRhdGEiLCJuYW1lIjoi44OH44O844K_44K544OI44KiIiwiZGVzY3JpcHRpb24iOiLmsLjntprljJbjgZXjgozjgovjg4fjg7zjgr_jga7nrqHnkIbjg6zjgqTjg6Tjg7wiLCJpY29uIjoi8J-SviJ9LHsiaWQiOiJzZXNzaW9uIiwidHlwZSI6ImRhdGEiLCJuYW1lIjoi44K744OD44K344On44OzIiwiZGVzY3JpcHRpb24iOiLjgrXjg7zjg5Djg7zjgrXjgqTjg4njgafnrqHnkIbjgZnjgovjg6bjg7zjgrbjg7zjgrvjg4Pjgrfjg6fjg7Pmg4XloLEiLCJpY29uIjoi8J-Xgu-4jyIsInBhcmVudElkIjoiZGF0YS1sYXllciJ9LHsiaWQiOiJqd3QtdG9rZW4iLCJ0eXBlIjoiZGF0YSIsIm5hbWUiOiJKV1Tjg4jjg7zjgq_jg7MiLCJkZXNjcmlwdGlvbiI6IuOCr-ODqeOCpOOCouODs-ODiOOCteOCpOODieOBp-S_neaMgeOBmeOCi0pTT07jgqbjgqfjg5bjg4jjg7zjgq_jg7MiLCJpY29uIjoi8J-OqyIsInBhcmVudElkIjoiZGF0YS1sYXllciJ9XSwicGFpcnMiOlt7InRpdGxlIjoi44Ot44Kw44Kk44Oz44OV44Ot44O8IiwiZGVzY3JpcHRpb24iOiLos4fmoLzmg4XloLHjgpLmpJzoqLzjgZfjgIHoqo3oqLzjg4jjg7zjgq_jg7PjgpLnmbrooYzjgZfjgabjgq_jg6njgqTjgqLjg7Pjg4jjgbjphY3kv6HjgZnjgovjgb7jgafjgIIiLCJjdXJyZW50U3RhdGUiOnsiZGVzY3JpcHRpb24iOiLjgrXjg7zjg5Djg7zjgrXjgqTjg4njgrvjg4Pjgrfjg6fjg7PjgpLkvb_nlKjjgIJDb29raWUg57WM55Sx44Gn44K744OD44K344On44OzIElEIOOCkumFjeW4g-OBmeOCi-OAgiIsImludGVyYWN0aW9ucyI6W3sic291cmNlIjoibG9naW4tcGFnZSIsInRhcmdldCI6ImFwaS1nYXRld2F5IiwibGFiZWwiOiLjg63jgrDjgqTjg7PopoHmsYIiLCJkYXRhIjoiQ3JlZGVudGlhbHMifSx7InNvdXJjZSI6ImFwaS1nYXRld2F5IiwidGFyZ2V0IjoidXNlci1hdXRoIiwibGFiZWwiOiLoqo3oqLzlp5TorbIiLCJkYXRhIjoiQ3JlZGVudGlhbHMifSx7InNvdXJjZSI6InVzZXItYXV0aCIsInRhcmdldCI6ImF1dGgtdmFsaWRhdG9yIiwibGFiZWwiOiLos4fmoLzmpJzoqLwiLCJkYXRhIjoiQ3JlZGVudGlhbHMifSx7InNvdXJjZSI6InVzZXItYXV0aCIsInRhcmdldCI6InVzZXItc2VydmljZSIsImxhYmVsIjoi44Om44O844K244O85Y-W5b6XIiwiZGF0YSI6IlVzZXJJRCJ9LHsic291cmNlIjoidXNlci1hdXRoIiwidGFyZ2V0IjoiYXBpLWdhdGV3YXkiLCJsYWJlbCI6IuOCu-ODg-OCt-ODp-ODs-eZuuihjCIsImRhdGEiOiJTZXNzaW9uSUQifSx7InNvdXJjZSI6ImFwaS1nYXRld2F5IiwidGFyZ2V0IjoiaHR0cC1jbGllbnQiLCJsYWJlbCI6IkNvb2tpZeioreWumiIsImRhdGEiOiJTZXNzaW9uSUQifV19LCJwcm9wb3NlZFN0YXRlIjp7ImRlc2NyaXB0aW9uIjoiSldUIOeZuuihjOOBq-WkieabtOOAguiqjeiovOODouOCuOODpeODvOODq-WGheOBqyBWYWxpZGF0b3IgLyBJc3N1ZXIg44KS5YiG6Zui44CCIiwiaW50ZXJhY3Rpb25zIjpbeyJzb3VyY2UiOiJsb2dpbi1wYWdlIiwidGFyZ2V0IjoiYXBpLWdhdGV3YXkiLCJsYWJlbCI6IuODreOCsOOCpOODs-imgeaxgiIsImRhdGEiOiJDcmVkZW50aWFscyJ9LHsic291cmNlIjoiYXBpLWdhdGV3YXkiLCJ0YXJnZXQiOiJ1c2VyLWF1dGgiLCJsYWJlbCI6IuiqjeiovOWnlOitsiIsImRhdGEiOiJDcmVkZW50aWFscyJ9LHsic291cmNlIjoidXNlci1hdXRoIiwidGFyZ2V0IjoiYXV0aC12YWxpZGF0b3IiLCJsYWJlbCI6Iuizh-agvOaknOiovCIsImRhdGEiOiJDcmVkZW50aWFscyJ9LHsic291cmNlIjoidXNlci1hdXRoIiwidGFyZ2V0IjoidXNlci1zZXJ2aWNlIiwibGFiZWwiOiLjg6bjg7zjgrbjg7zmpJzntKIiLCJkYXRhIjoiRW1haWwifSx7InNvdXJjZSI6InVzZXItYXV0aCIsInRhcmdldCI6InRva2VuLWlzc3VlciIsImxhYmVsIjoi55m66KGM6KaB5rGCIiwiZGF0YSI6IlVzZXJJRCJ9LHsic291cmNlIjoidXNlci1hdXRoIiwidGFyZ2V0IjoiYXBpLWdhdGV3YXkiLCJsYWJlbCI6IkpXVOi_lOWNtCIsImRhdGEiOiJBdXRoVG9rZW4ifSx7InNvdXJjZSI6ImFwaS1nYXRld2F5IiwidGFyZ2V0IjoiaHR0cC1jbGllbnQiLCJsYWJlbCI6IkpXVOmFjeS_oSIsImRhdGEiOiJBdXRoVG9rZW4ifV19fSx7InRpdGxlIjoi6KqN6Ki85riI44G_IEFQSSDlkbzjgbPlh7rjgZciLCJkZXNjcmlwdGlvbiI6IuODreOCsOOCpOODs-W-jOOBq-ODgOODg-OCt-ODpeODnOODvOODieOBjCBBUEkg44KS5ZG844Gz5Ye644GZ44Go44GN44Gu6KqN6Ki844OY44OD44OA44CCIiwiY3VycmVudFN0YXRlIjp7ImRlc2NyaXB0aW9uIjoi44OW44Op44Km44K244GM6Ieq5YuV6YCB5L-h44GZ44KLIENvb2tpZSDjgafjgrXjg7zjg5Djg7zjgYzjgrvjg4Pjgrfjg6fjg7PjgpLlj4LnhafjgZnjgovjgIIiLCJpbnRlcmFjdGlvbnMiOlt7InNvdXJjZSI6ImRhc2hib2FyZCIsInRhcmdldCI6ImFwaS1nYXRld2F5IiwibGFiZWwiOiJBUEnlkbzjgbPlh7rjgZciLCJkYXRhIjoiQ29va2llIn0seyJzb3VyY2UiOiJhcGktZ2F0ZXdheSIsInRhcmdldCI6InNlc3Npb24iLCJsYWJlbCI6IuOCu-ODg-OCt-ODp-ODs-WPgueFpyIsImRhdGEiOiJTZXNzaW9uSUQifSx7InNvdXJjZSI6ImFwaS1nYXRld2F5IiwidGFyZ2V0IjoidXNlci1zZXJ2aWNlIiwibGFiZWwiOiLjg4fjg7zjgr_lj5blvpciLCJkYXRhIjoiVXNlcklEIn1dfSwicHJvcG9zZWRTdGF0ZSI6eyJkZXNjcmlwdGlvbiI6IkF1dGhvcml6YXRpb24g44OY44OD44OA44GrIEpXVCDjgpLovInjgZvjgabpgIHkv6HjgZfjgIHjgrLjg7zjg4jjgqbjgqfjgqTjgYznvbLlkI3mpJzoqLzjgZnjgovjgIIiLCJpbnRlcmFjdGlvbnMiOlt7InNvdXJjZSI6ImRhc2hib2FyZCIsInRhcmdldCI6ImFwaS1nYXRld2F5IiwibGFiZWwiOiJBUEnlkbzjgbPlh7rjgZciLCJkYXRhIjoiQXV0aG9yaXphdGlvbjogQmVhcmVyIn0seyJzb3VyY2UiOiJhcGktZ2F0ZXdheSIsInRhcmdldCI6InRva2VuLXZlcmlmaWVyIiwibGFiZWwiOiLnvbLlkI3mpJzoqLwiLCJkYXRhIjoiQXV0aFRva2VuIn0seyJzb3VyY2UiOiJhcGktZ2F0ZXdheSIsInRhcmdldCI6InVzZXItc2VydmljZSIsImxhYmVsIjoi44OH44O844K_5Y-W5b6XIiwiZGF0YSI6IlVzZXJJRCJ9XX19XX0
```

（`file://` で直接開く場合は URL 冒頭を `file:///<viewer/index.html の絶対パス>` に置き換えてください。`node .claude/skills/visual-planner/scripts/make_url.mjs plan-viewer/example.json` を実行すると `file://` URL を自動生成します。）

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
      "type": "term" | "feature" | "data",
      "name": "表示名",
      "description": "説明文",
      "icon": "🔐",      // 省略時はtype別デフォルト (term=📖, feature=⚡, data=💾)
      "parentId": "parent-id", // 省略可。親アイテムのidを指定すると階層構造で表示（最大3階層まで。それ以上は表示から除外）
      "persona": "受付係",      // 省略可。登場人物としての役名
      "analogy": "チェックインカウンター", // 省略可。メタファー内での姿
      "responsibility": "本人確認をして鍵を渡す", // 省略可。担当
      "evidence": [...]
    }
  ],
  // 以下 A / B のどちらか一方のみを指定（併用はバリデーションエラー）

  // A) 複数ペア形式（推奨。相互作用が多い／複数の独立フローを扱うときは必ずこちら）
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
        "interactionFlows": [1],
        "evidence": [...]
      }
    ],
    "takeaway": "この状態をひと言で",
    "interactions": [
      { "flow": 1, "source": "id1", "target": "id2", "label": "ラベル", "data": "データ名" }
    ]
  },
  "proposedState": {  // 省略可
    "description": "変更後の説明",
    "interactions": [...]
  }
}
```

`interactions` はシステムフローの説明として扱います。`flow` は各 state 内で `1` から始まる連番で、リクエスト/入力元、処理、受け渡されるデータを実行順に読めるようにします。`glossary` はそのフロー内で必要な登場要素を、必要な粒度で定義します。

### 説明文内の glossary リンク

説明用の文字列フィールドでは、glossary の項目へジャンプするリンクを埋め込めます。構文は次の完全一致のみです。

```html
<a href="#glossary:unique-id">表示ラベル</a>
```

`unique-id` は同じ plan 内の `glossary[].id` と完全一致する必要があります。クリックすると対象の glossary カードを選択し、必要な親階層を展開してカードまでスクロールします。存在しない ID や空 ID はリンクにならず、表示ラベルだけが通常のテキストとして表示されます。

安全のため、対応するのは小文字の `a`、小文字の `href`、ダブルクォート、`#glossary:` 接頭辞、対応する `</a>` を持つ構文だけです。その他の HTML や壊れた anchor は文字列としてそのまま表示され、ラベル内の `<` や `>` も HTML として解釈されません。

対象フィールドは、ヘッダーやペア、状態、ナラティブ、glossary カードなどの説明文全般です。具体的には `description` / `takeaway`、`metaphor.description`、`pairs[].comparison[].label|current|proposed|note`、`scenes[].title|action|result`、`pairs[].safeguards[]`、`glossary[].description|persona|analogy|responsibility` で利用できます。`interactions[].label` / `interactions[].data` は現時点では対象外です。

`scenes` は読者向けの時系列説明です。`interactionFlows` で対応する矢印番号を指定すると、文章と図がつながります。`comparison` は修正前後の見取り図、`safeguards` は「なぜ単純な置き換えだけでは足りないか」や防御設計の説明に使います。

**ペアを分けるべき目安**: 単一ステートの interactions が 10 本以上、または関係するノードが 10 個以上、もしくは独立した複数フロー（ログイン / API 呼び出し / ログアウトなど）を扱う場合は `pairs` に分割するとグラフが読みやすく保てます。
