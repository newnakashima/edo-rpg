# edo-rpg

架空の江戸時代を舞台にした和風 RPG です。ブラウザとスマートフォンで遊べる 2D の JRPG を目指しています。

## 企画ドキュメント

- [ストーリー](docs/story.md): あらすじ、章立て、下敷きにする実在エピソード
- [登場人物と職業](docs/characters.md)
- [バランス設計](docs/balance.md): 敵レベル帯、成長、戦闘計算、プレイ時間の見積もり
- [画像アセットの一覧](docs/assets.md)
- [音楽・効果音の一覧](docs/audio.md)

## 開発

Node.js 22 以上が必要です。

```bash
npm install
npm run dev        # 開発サーバー
npm test           # ロジックの単体テスト
npm run typecheck  # 型チェック
npm run lint       # リント
npm run build      # dist/ にビルド
```

操作: 十字キー（または WASD）で移動、Z / Enter / Space で決定・話す、X / Esc で取消・メニュー。
台詞の中の色と下線の付いた言葉（読みにくい漢字・江戸の言葉）は、台詞を読んでいる間に X / Esc（スマートフォンでは「用語」と表示される取消ボタン）で読みと意味を見られる（用語は `src/data/glossary.ts`）。スマートフォンの取消ボタンは、マップを歩いている間は「状態」（メニューを開く）と表示される。
スマートフォンでは画面の仮想パッドで操作します。

main に入ると GitHub Actions で GitHub Pages に公開します（Settings → Pages の Source を「GitHub Actions」にしておく）。

## ソースの構成

- `src/systems/`: 戦闘計算・成長・セーブなどの画面に依存しないロジック（単体テストあり）
- `src/data/`: 人物・敵・マップのデータ
- `src/scenes/`: Phaser のシーン（タイトル、主人公の選択、フィールド、戦闘）
- `src/ui/`: 入力（キーボードと仮想パッド）、ウィンドウ・メニュー
