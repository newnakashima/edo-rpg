# 音色の番号（General MIDI、FluidR3_GM）

`song.track(..., program=番号)` に渡す番号（0 始まり）。全 128 音色のうち、このゲームで使いそうなものを挙げる。ここにないものも使ってよい。
音色名は FluidR3_GM での名前と、近い和楽器の例である。音は実際に書き出して確かめる。

## 旋律・和音の楽器

| 番号 | 音色 | 近い楽器・使いどころの例 |
| --- | --- | --- |
| 77 | Shakuhachi | 尺八 |
| 106 | Shamisen | 三味線 |
| 107 | Koto | 琴 |
| 73 | Flute | 篠笛・能管の代わり |
| 72 | Piccolo | 高い笛 |
| 75 | Pan Flute | かすれた笛 |
| 79 | Ocarina | 素朴な笛 |
| 110 | Fiddle | 胡弓の代わり |
| 111 | Shanai | 篳篥（雅楽）の代わり |
| 109 | Bagpipe | 笙のような持続音の代わり |
| 108 | Kalimba | はじく音 |
| 46 | Orchestral Harp | 琴の代わり、流れる音 |
| 45 | Pizzicato Strings | はじく弦 |
| 48 / 49 | String Ensemble 1 / 2（Slow） | 弦の和音・持続 |
| 42 / 43 | Cello / Contrabass | 低い弦 |
| 52 | Choir Aahs | 声 |
| 60 / 61 | French Horn / Brass Section | 金管 |
| 47 | Timpani | ティンパニ |
| 14 | Tubular Bells | 鐘 |
| 9 / 10 / 8 | Glockenspiel / Music Box / Celesta | 鈴のような高い音 |
| 11 / 12 / 13 | Vibraphone / Marimba / Xylophone | 木や金属の鍵盤 |
| 0 / 6 | Acoustic Grand Piano / Harpsichord | ピアノ・チェンバロ |
| 88〜95 | Pad 1〜8 | 背景の持続音 |

## 音程のある打楽器（旋律のトラックで使う）

| 番号 | 音色 | 例 |
| --- | --- | --- |
| 116 | Taiko Drum | 和太鼓 |
| 115 | Woodblock | 拍子木・木魚の代わり |
| 117 | Melodic Tom | 締太鼓の代わり |
| 112 | Tinkle Bell | 鈴 |
| 113 | Agogo | 当たり鉦の代わり |
| 118 | Synth Drum | |
| 119 | Reverse Cymbal | |

## 打楽器のトラック（`drum=True`）の音の番号

打楽器のトラックでは、音の高さの代わりに番号で楽器を選ぶ（例: `parse("| 36:1 42:1 38:1 42:1 |")`）。

| 番号 | 楽器 | 番号 | 楽器 |
| --- | --- | --- | --- |
| 35 / 36 | バスドラム | 41 / 43 / 45 / 47 / 48 / 50 | タム（低→高） |
| 37 | リムショット | 49 / 57 | クラッシュシンバル |
| 38 / 40 | スネア | 51 / 59 | ライドシンバル |
| 39 | 手拍子 | 54 | タンバリン |
| 42 / 44 / 46 | ハイハット（閉・踏・開） | 56 | カウベル |
| 75 | クラベス（拍子木の代わり） | 76 / 77 | ウッドブロック（高・低） |
| 80 / 81 | トライアングル（閉・開） | 70 | マラカス |
