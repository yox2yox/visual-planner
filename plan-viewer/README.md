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
http://localhost:4173/?plan=ewogICJ0aXRsZSI6ICLoqo3oqLzjgrfjgrnjg4bjg6DliLfmlrDjg5fjg6njg7MiLAogICJkZXNjcmlwdGlvbiI6ICLjgrvjg4Pjgrfjg6fjg7Pjg5njg7zjgrnjgYvjgolKV1Toqo3oqLzjgbjjga7np7vooYzjgavjgojjgorjgIHjgrnjgrHjg7zjg6njg5Pjg6rjg4bjgqPjgajjgrvjgq3jg6Xjg6rjg4bjgqPjgpLlkJHkuIrjgZXjgZvjgovjgIIiLAogICJnbG9zc2FyeSI6IFsKICAgIHsKICAgICAgImlkIjogImJhY2tlbmQiLAogICAgICAidHlwZSI6ICJmZWF0dXJlIiwKICAgICAgIm5hbWUiOiAi44OQ44OD44Kv44Ko44Oz44OJIiwKICAgICAgImRlc2NyaXB0aW9uIjogIuOCteODvOODkOODvOOCteOCpOODieOBruWHpueQhuOCkuaLheW9k-OBmeOCi-ODrOOCpOODpOODvCIsCiAgICAgICJpY29uIjogIvCflqXvuI8iCiAgICB9LAogICAgewogICAgICAiaWQiOiAidXNlci1hdXRoIiwKICAgICAgInR5cGUiOiAiZmVhdHVyZSIsCiAgICAgICJuYW1lIjogIuODpuODvOOCtuODvOiqjeiovCIsCiAgICAgICJkZXNjcmlwdGlvbiI6ICLjg63jgrDjgqTjg7Pjg7vjg63jgrDjgqLjgqbjg4jjg7vjg5Hjgrnjg6_jg7zjg4njg6rjgrvjg4Pjg4jjgpLmi4XlvZPjgZnjgovjg6Ljgrjjg6Xjg7zjg6siLAogICAgICAiaWNvbiI6ICLwn5SQIiwKICAgICAgInBhcmVudElkIjogImJhY2tlbmQiCiAgICB9LAogICAgewogICAgICAiaWQiOiAidXNlci1zZXJ2aWNlIiwKICAgICAgInR5cGUiOiAiZmVhdHVyZSIsCiAgICAgICJuYW1lIjogIuODpuODvOOCtuODvOOCteODvOODk-OCuSIsCiAgICAgICJkZXNjcmlwdGlvbiI6ICLjg6bjg7zjgrbjg7zmg4XloLHjga5DUlVE44KS5o-Q5L6b44GZ44KL44Oe44Kk44Kv44Ot44K144O844OT44K5IiwKICAgICAgInBhcmVudElkIjogImJhY2tlbmQiCiAgICB9LAogICAgewogICAgICAiaWQiOiAiYXBpLWdhdGV3YXkiLAogICAgICAidHlwZSI6ICJmZWF0dXJlIiwKICAgICAgIm5hbWUiOiAiQVBJ44Ky44O844OI44Km44Kn44KkIiwKICAgICAgImRlc2NyaXB0aW9uIjogIuWklumDqOOBi-OCieOBruODquOCr-OCqOOCueODiOOCkuWPl-OBkeS7mOOBkeOAgeWGhemDqOOCteODvOODk-OCueOBq-ODq-ODvOODhuOCo-ODs-OCsOOBmeOCiyIsCiAgICAgICJpY29uIjogIvCfjJAiLAogICAgICAicGFyZW50SWQiOiAiYmFja2VuZCIKICAgIH0sCiAgICB7CiAgICAgICJpZCI6ICJkYXRhLWxheWVyIiwKICAgICAgInR5cGUiOiAiZGF0YSIsCiAgICAgICJuYW1lIjogIuODh-ODvOOCv-OCueODiOOCoiIsCiAgICAgICJkZXNjcmlwdGlvbiI6ICLmsLjntprljJbjgZXjgozjgovjg4fjg7zjgr_jga7nrqHnkIbjg6zjgqTjg6Tjg7wiLAogICAgICAiaWNvbiI6ICLwn5K-IgogICAgfSwKICAgIHsKICAgICAgImlkIjogInNlc3Npb24iLAogICAgICAidHlwZSI6ICJkYXRhIiwKICAgICAgIm5hbWUiOiAi44K744OD44K344On44OzIiwKICAgICAgImRlc2NyaXB0aW9uIjogIuOCteODvOODkOODvOOCteOCpOODieOBp-euoeeQhuOBmeOCi-ODpuODvOOCtuODvOOCu-ODg-OCt-ODp-ODs-aDheWgsSIsCiAgICAgICJpY29uIjogIvCfl4LvuI8iLAogICAgICAicGFyZW50SWQiOiAiZGF0YS1sYXllciIKICAgIH0sCiAgICB7CiAgICAgICJpZCI6ICJqd3QtdG9rZW4iLAogICAgICAidHlwZSI6ICJkYXRhIiwKICAgICAgIm5hbWUiOiAiSldU44OI44O844Kv44OzIiwKICAgICAgImRlc2NyaXB0aW9uIjogIuOCr-ODqeOCpOOCouODs-ODiOOCteOCpOODieOBp-S_neaMgeOBmeOCi0pTT07jgqbjgqfjg5bjg4jjg7zjgq_jg7MiLAogICAgICAiaWNvbiI6ICLwn46rIiwKICAgICAgInBhcmVudElkIjogImRhdGEtbGF5ZXIiCiAgICB9LAogICAgewogICAgICAiaWQiOiAiYXVkaXQtbG9nIiwKICAgICAgInR5cGUiOiAidGVybSIsCiAgICAgICJuYW1lIjogIuebo-afu-ODreOCsCIsCiAgICAgICJkZXNjcmlwdGlvbiI6ICLjgrvjgq3jg6Xjg6rjg4bjgqPjgqTjg5njg7Pjg4jjgoToqo3oqLzoqabooYzjgpLoqJjpjLLjgZnjgovjg63jgrDjgrnjg4jjg6zjg7zjgrgiLAogICAgICAiaWNvbiI6ICLwn5OLIgogICAgfQogIF0sCiAgImN1cnJlbnRTdGF0ZSI6IHsKICAgICJkZXNjcmlwdGlvbiI6ICLnj77lnKjjga_jgrXjg7zjg5Djg7zjgrXjgqTjg4njgrvjg4Pjgrfjg6fjg7PjgpLkvb_nlKjjgZfjgabjgYrjgorjgIHjgrnjgrHjg7zjg6vjgqLjgqbjg4jmmYLjgavjgrvjg4Pjgrfjg6fjg7PlhbHmnInjgYzoqrLpoYzjgajjgarjgaPjgabjgYTjgovjgIIiLAogICAgImludGVyYWN0aW9ucyI6IFsKICAgICAgeyAic291cmNlIjogImFwaS1nYXRld2F5IiwgInRhcmdldCI6ICJ1c2VyLWF1dGgiLCAibGFiZWwiOiAi6KqN6Ki86KaB5rGCIiwgImRhdGEiOiAiQ3JlZGVudGlhbHMiIH0sCiAgICAgIHsgInNvdXJjZSI6ICJ1c2VyLWF1dGgiLCAidGFyZ2V0IjogInVzZXItc2VydmljZSIsICJsYWJlbCI6ICLjg6bjg7zjgrbjg7zlj5blvpciLCAiZGF0YSI6ICJVc2VySUQiIH0sCiAgICAgIHsgInNvdXJjZSI6ICJ1c2VyLWF1dGgiLCAidGFyZ2V0IjogImFwaS1nYXRld2F5IiwgImxhYmVsIjogIkNvb2tpZeeZuuihjCIsICJkYXRhIjogIlNlc3Npb25JRCIgfQogICAgXQogIH0sCiAgInByb3Bvc2VkU3RhdGUiOiB7CiAgICAiZGVzY3JpcHRpb24iOiAiSldU44KS5bCO5YWl44GZ44KL44GT44Go44Gn44K544OG44O844OI44Os44K56KqN6Ki844KS5a6f54--44GX44CB5rC05bmz44K544Kx44O844Oq44Oz44Kw44KS5a655piT44Gr44GZ44KL44CCIiwKICAgICJpbnRlcmFjdGlvbnMiOiBbCiAgICAgIHsgInNvdXJjZSI6ICJhcGktZ2F0ZXdheSIsICJ0YXJnZXQiOiAidXNlci1hdXRoIiwgImxhYmVsIjogIuiqjeiovOimgeaxgiIsICJkYXRhIjogIkNyZWRlbnRpYWxzIiB9LAogICAgICB7ICJzb3VyY2UiOiAidXNlci1hdXRoIiwgInRhcmdldCI6ICJ1c2VyLXNlcnZpY2UiLCAibGFiZWwiOiAi44Om44O844K244O85qSc57SiIiwgImRhdGEiOiAiRW1haWwiIH0sCiAgICAgIHsgInNvdXJjZSI6ICJ1c2VyLWF1dGgiLCAidGFyZ2V0IjogImFwaS1nYXRld2F5IiwgImxhYmVsIjogIkpXVOeZuuihjCIsICJkYXRhIjogIkF1dGhUb2tlbiIgfQogICAgXQogIH0KfQo
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
      "icon": "🔐",      // 省略時はtype別デフォルト (term=📖, feature=⚡, data=💾)
      "parentId": "parent-id"  // 省略可。親アイテムのidを指定すると階層構造で表示
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
