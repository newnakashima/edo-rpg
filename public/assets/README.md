# 画像アセットの記録

PixelLab MCP で生成した画像の記録です。作り直すときは、ここのプロンプトと設定を使います（一覧と方針は [docs/assets.md](../../docs/assets.md)）。

## キャラクター（`chars/`）

共通の設定: `create_character`（mode `standard`、4 方向、size 24、proportions `chibi`、view `low top-down`、黒の 1px 輪郭）。
歩行は `animate_character`（mode `v3`、4 コマ、`keep_first_frame: false`、下・左・右・上）。
ダウンロードした ZIP を展開し、`python3 scripts/pack_character.py <展開したフォルダ> public/assets/chars/<ID>.png` で 1 枚のシートにまとめる（行: 下・左・右・上、列: 立ち＋歩行 4 コマ）。

| ID | PixelLab のキャラクター ID | 生成プロンプト | 歩行の action_description |
| --- | --- | --- | --- |
| hero_m | 1607d210-3505-4c6a-9d28-95a77f29dc1e | Edo period Japanese wandering gambler (matatabi) man, wide round straw sandogasa hat, striped indigo travel cape (kappa) over kimono, long sword at hip, straw sandals | walking forward at a steady pace, hat stays on head, sword stays at left hip |
| hero_f | 52a674fd-5353-482d-8e78-abb0714fb775 | Edo period Japanese wandering gambler woman, tied-up black hair, wide round straw sandogasa hat, striped dark plum travel cape (kappa) over kimono, short sword at hip, straw sandals | walking forward at a steady pace, hat stays on head |
