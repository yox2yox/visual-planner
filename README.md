# sensei

実装計画、アーキテクチャ図、前後比較、データフローを **自己完結 HTML** として可視化する apm スキルパッケージ。生成された HTML は `file://` で開けるため、サーバーやネットワークは不要です。

## インストール（[apm](https://github.com/microsoft/apm)）

```bash
apm install yox2yox/sensei
```

インストールすると、対象 CLI（Claude Code / Copilot / Cursor / Gemini / OpenCode / Codex）の所定のスキルディレクトリに `sensei` が配置されます。実装計画やアーキテクチャ変更を可視化したいときに自動的にトリガーされます。

## 構成（apm 規約）

```
.
├── apm.yml                          # apm マニフェスト
├── .apm/
│   └── skills/
│       └── sensei/                  # スキル本体
│           ├── SKILL.md
│           ├── reference/
│           ├── scripts/
│           └── viewer/              # ビルド済み viewer バンドル
└── plan-viewer/                     # viewer のソース（開発用）
```

## viewer の再ビルド

`.apm/skills/sensei/viewer/index.html` を更新したい場合:

```bash
cd plan-viewer
npm install
npm run build
# 生成物を ../.apm/skills/sensei/viewer/ にコピー
```

詳細は [plan-viewer/README.md](plan-viewer/README.md) を参照してください。
