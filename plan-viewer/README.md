# plan-viewer

AIが生成した実装プランのJSONをビジュアルに表示する静的Webアプリです。

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

`example.json` をエンコードしたサンプルURL（`npm run preview` 後にブラウザで開けます）:

```
http://localhost:4173/?plan=ewogICJ0aXRsZSI6ICLoqo3oqLzjgrfjgrnjg4bjg6DliLfmlrDjg5fjg6njg7MiLAogICJkZXNjcmlwdGlvbiI6ICLjgrvjg4Pjgrfjg6fjg7Pjg5njg7zjgrnjgYvjgolKV1Toqo3oqLzjgbjjga7np7vooYzjgavjgojjgorjgIHjgrnjgrHjg7zjg6njg5Pjg6rjg4bjgqPjgajjgrvjgq3jg6Xjg6rjg4bjgqPjgpLlkJHkuIrjgZXjgZvjgovjgIIiLAogICJnbG9zc2FyeSI6IFsKICAgIHsKICAgICAgImlkIjogInVzZXItYXV0aCIsCiAgICAgICJ0eXBlIjogImZlYXR1cmUiLAogICAgICAibmFtZSI6ICLjg6bjg7zjgrbjg7zoqo3oqLwiLAogICAgICAiZGVzY3JpcHRpb24iOiAi44Ot44Kw44Kk44Oz44O744Ot44Kw44Ki44Km44OI44O744OR44K544Ov44O844OJ44Oq44K744OD44OI44KS5ouF5b2T44GZ44KL44Oi44K444Ol44O844OrIiwKICAgICAgImljb24iOiAi8J-UkCIKICAgIH0sCiAgICB7CiAgICAgICJpZCI6ICJzZXNzaW9uIiwKICAgICAgInR5cGUiOiAiZGF0YSIsCiAgICAgICJuYW1lIjogIuOCu-ODg-OCt-ODp-ODsyIsCiAgICAgICJkZXNjcmlwdGlvbiI6ICLjgrXjg7zjg5Djg7zjgrXjgqTjg4njgafnrqHnkIbjgZnjgovjg6bjg7zjgrbjg7zjgrvjg4Pjgrfjg6fjg7Pmg4XloLEiLAogICAgICAiaWNvbiI6ICLwn5eC77iPIgogICAgfSwKICAgIHsKICAgICAgImlkIjogImp3dC10b2tlbiIsCiAgICAgICJ0eXBlIjogImRhdGEiLAogICAgICAibmFtZSI6ICJKV1Tjg4jjg7zjgq_jg7MiLAogICAgICAiZGVzY3JpcHRpb24iOiAi44Kv44Op44Kk44Ki44Oz44OI44K144Kk44OJ44Gn5L-d5oyB44GZ44KLSlNPTuOCpuOCp-ODluODiOODvOOCr-ODsyIsCiAgICAgICJpY29uIjogIvCfjqsiCiAgICB9LAogICAgewogICAgICAiaWQiOiAiYXBpLWdhdGV3YXkiLAogICAgICAidHlwZSI6ICJmZWF0dXJlIiwKICAgICAgIm5hbWUiOiAiQVBJ44Ky44O844OI44Km44Kn44KkIiwKICAgICAgImRlc2NyaXB0aW9uIjogIuWklumDqOOBi-OCieOBruODquOCr-OCqOOCueODiOOCkuWPl-OBkeS7mOOBkeOAgeWGhemDqOOCteODvOODk-OCueOBq-ODq-ODvOODhuOCo-ODs-OCsOOBmeOCiyIsCiAgICAgICJpY29uIjogIvCfjJAiCiAgICB9LAogICAgewogICAgICAiaWQiOiAidXNlci1zZXJ2aWNlIiwKICAgICAgInR5cGUiOiAiZmVhdHVyZSIsCiAgICAgICJuYW1lIjogIuODpuODvOOCtuODvOOCteODvOODk-OCuSIsCiAgICAgICJkZXNjcmlwdGlvbiI6ICLjg6bjg7zjgrbjg7zmg4XloLHjga5DUlVE44KS5o-Q5L6b44GZ44KL44Oe44Kk44Kv44Ot44K144O844OT44K5IgogICAgfSwKICAgIHsKICAgICAgImlkIjogImF1ZGl0LWxvZyIsCiAgICAgICJ0eXBlIjogInRlcm0iLAogICAgICAibmFtZSI6ICLnm6Pmn7vjg63jgrAiLAogICAgICAiZGVzY3JpcHRpb24iOiAi44K744Kt44Ol44Oq44OG44Kj44Kk44OZ44Oz44OI44KE6KqN6Ki86Kmm6KGM44KS6KiY6Yyy44GZ44KL44Ot44Kw44K544OI44Os44O844K4IiwKICAgICAgImljb24iOiAi8J-TiyIKICAgIH0KICBdLAogICJjdXJyZW50U3RhdGUiOiB7CiAgICAiZGVzY3JpcHRpb24iOiAi54--5Zyo44Gv44K144O844OQ44O844K144Kk44OJ44K744OD44K344On44Oz44KS5L2_55So44GX44Gm44GK44KK44CB44K544Kx44O844Or44Ki44Km44OI5pmC44Gr44K744OD44K344On44Oz5YWx5pyJ44GM6Kqy6aGM44Go44Gq44Gj44Gm44GE44KL44CCIiwKICAgICJpbnRlcmFjdGlvbnMiOiBbCiAgICAgIHsgInNvdXJjZSI6ICJ1c2VyLWF1dGgiLCAidGFyZ2V0IjogInNlc3Npb24iLCAibGFiZWwiOiAiQ29va2ll55m66KGMIiwgImRhdGEiOiAiU2Vzc2lvbklEIiB9LAogICAgICB7ICJzb3VyY2UiOiAiYXBpLWdhdGV3YXkiLCAidGFyZ2V0IjogInVzZXItYXV0aCIsICJsYWJlbCI6ICLoqo3oqLzopoHmsYIiLCAiZGF0YSI6ICJDcmVkZW50aWFscyIgfSwKICAgICAgeyAic291cmNlIjogInVzZXItYXV0aCIsICJ0YXJnZXQiOiAiYXVkaXQtbG9nIiwgImxhYmVsIjogIuODreOCsOiomOmMsiIsICJkYXRhIjogIkxvZ2luRXZlbnQiIH0sCiAgICAgIHsgInNvdXJjZSI6ICJ1c2VyLWF1dGgiLCAidGFyZ2V0IjogInVzZXItc2VydmljZSIsICJsYWJlbCI6ICLjg6bjg7zjgrbjg7zlj5blvpciLCAiZGF0YSI6ICJVc2VySUQiIH0KICAgIF0KICB9LAogICJwcm9wb3NlZFN0YXRlIjogewogICAgImRlc2NyaXB0aW9uIjogIkpXVOOCkuWwjuWFpeOBmeOCi-OBk-OBqOOBp-OCueODhuODvOODiOODrOOCueiqjeiovOOCkuWun-ePvuOBl-OAgeawtOW5s-OCueOCseODvOODquODs-OCsOOCkuWuueaYk-OBq-OBmeOCi-OAgiIsCiAgICAiaW50ZXJhY3Rpb25zIjogWwogICAgICB7ICJzb3VyY2UiOiAidXNlci1hdXRoIiwgInRhcmdldCI6ICJqd3QtdG9rZW4iLCAibGFiZWwiOiAiSldU55m66KGMIiwgImRhdGEiOiAiQXV0aFRva2VuIiB9LAogICAgICB7ICJzb3VyY2UiOiAiYXBpLWdhdGV3YXkiLCAidGFyZ2V0IjogInVzZXItYXV0aCIsICJsYWJlbCI6ICLoqo3oqLzopoHmsYIiLCAiZGF0YSI6ICJDcmVkZW50aWFscyIgfSwKICAgICAgeyAic291cmNlIjogInVzZXItYXV0aCIsICJ0YXJnZXQiOiAiYXVkaXQtbG9nIiwgImxhYmVsIjogIuODreOCsOiomOmMsiIsICJkYXRhIjogIlNlY3VyaXR5RXZlbnQiIH0sCiAgICAgIHsgInNvdXJjZSI6ICJhcGktZ2F0ZXdheSIsICJ0YXJnZXQiOiAiand0LXRva2VuIiwgImxhYmVsIjogIuODiOODvOOCr-ODs-aknOiovCIsICJkYXRhIjogIkJlYXJlclRva2VuIiB9LAogICAgICB7ICJzb3VyY2UiOiAidXNlci1hdXRoIiwgInRhcmdldCI6ICJ1c2VyLXNlcnZpY2UiLCAibGFiZWwiOiAi44Om44O844K244O85qSc57SiIiwgImRhdGEiOiAiRW1haWwiIH0KICAgIF0KICB9Cn0K
```

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
  "glossary": [
    {
      "id": "unique-id",
      "type": "term" | "feature" | "data",
      "name": "表示名",
      "description": "説明文",
      "icon": "🔐"   // 省略時はtype別デフォルト (term=📖, feature=⚡, data=💾)
    }
  ],
  "currentState": {   // 省略可
    "description": "現状の説明",
    "interactions": [
      { "source": "id1", "target": "id2", "label": "ラベル", "data": "データ名" }
    ]
  },
  "proposedState": {  // 省略可
    "description": "変更後の説明",
    "interactions": [...]
  }
}
```
