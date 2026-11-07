# 音楽・効果音の一覧

今回は音楽・音声を実装しません。後のフェーズで追加するときのために、必要な曲と効果音をまとめます。
実装時は、ここに挙げたキー（ID）でシーンから再生できるよう、`src/systems/audio.ts` に空の呼び出し口だけ用意しておきます。

## 曲の作り方

スーパーファミコン期の雰囲気を出すため、曲は音楽生成 AI を使わず、AI エージェントが自分で作曲します。

1. [bgm-composition スキル](../.claude/skills/bgm-composition/SKILL.md): コード進行と旋律を曲の設計図（`audio-src/bgm/<ID>.song`）に書き、`scripts/bgm/song.py` で音楽理論の検査を通して MIDI（`audio-src/bgm/<ID>.mid`）に書き出す
2. [bgm-render スキル](../.claude/skills/bgm-render/SKILL.md): MIDI を `scripts/bgm/render.py` のスーパーファミコン風の音源で鳴らし、Ogg Opus（`public/assets/bgm/<ID>.opus`）に書き出す。ループの位置は Opus のタグ `LOOPSTART` / `LOOPLENGTH` に入る

必要なもの: Python 3.10 以上、numpy、Pillow、ffmpeg（libopus 付き）。

## 曲（BGM）

| ID | 場面 | 雰囲気 | ループ | 書き出し |
| --- | --- | --- | --- | --- |
| bgm_title | タイトル | 尺八と三味線。旅立ちの寂しさと広がり | あり | 未 |
| bgm_town | 町（通常） | 祭り囃子を抑えた、にぎやかで穏やかな曲 | あり | 未 |
| bgm_town_night | 町（夜） | 虫の音と篠笛。静かで少し不穏 | あり | 未 |
| bgm_road | 街道・ワールドマップ | 軽快な三味線。旅の歩み | あり | 未 |
| bgm_dungeon | ダンジョン（洞窟・山寺） | 太鼓の低音、不気味 | あり | 未 |
| bgm_karakuri | からくりのダンジョン | 和楽器と機械的なリズムの混在 | あり | 未 |
| bgm_castle | 江戸城 | 雅楽風、重厚 | あり | 未 |
| bgm_battle | 通常戦闘 | 速い三味線と太鼓 | あり | [bgm_battle.opus](../public/assets/bgm/bgm_battle.opus) |
| bgm_boss | ボス戦 | 激しい和太鼓、緊張感 | あり | 未 |
| bgm_last_boss | 最終ボス戦 | 和楽器とオーケストラ、からくりの音 | あり | 未 |
| bgm_victory | 戦闘勝利 | 短いファンファーレ（三味線） | なし | 未 |
| bgm_sad | 悲しい場面・別れ | 胡弓または尺八の独奏 | あり | 未 |
| bgm_tension | 陰謀・緊迫した会話 | 低い弦と拍子木 | あり | 未 |
| bgm_inn | 旅籠で一泊 | 短い子守唄風 | なし | 未 |
| bgm_ending | エンディング | 主題の変奏。寂しさと温かさ | なし | 未 |

## 効果音（SE）

| ID | 場面 |
| --- | --- |
| se_cursor | カーソル移動 |
| se_ok | 決定 |
| se_cancel | 取消 |
| se_buzzer | 選べない |
| se_door | 襖・戸の開閉 |
| se_stairs | 階段・出入り口 |
| se_encounter | 戦闘開始 |
| se_slash | 斬撃 |
| se_hit | 打撃 |
| se_shuriken | 手裏剣 |
| se_gun | 鉄砲 |
| se_magic | 術・妖術 |
| se_heal | 回復 |
| se_critical | 会心の一撃 |
| se_damage | 味方が被弾 |
| se_enemy_down | 敵を倒す |
| se_escape | 逃走 |
| se_levelup | レベルアップ |
| se_item | アイテム入手 |
| se_coin | 支払い・お金 |
| se_save | セーブ |
| se_karakuri | からくりの作動音（ゼンマイ・歯車） |
| se_fire | 火事 |
| se_bell | 寺の鐘 |
| se_hyoshigi | 拍子木（場面転換） |
