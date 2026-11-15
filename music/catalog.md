# 曲の素材の一覧

`python3 scripts/music/build.py --catalog` で作り直す。手で書き換えない。

## core-theme

| ID | 名前 | 拍子 | 小節数 | どんな主題か |
| --- | --- | --- | --- | --- |
| heroine | お凛の主題 | 4/4 | 16 | 気の強さの奥の、父を慕う優しさ。まっすぐ上へ伸びる出だしと、高いところで揺れる情。お凛の加入、辰五郎の弔い、仇討ち、エンディングで響かせる |
| ikka | 一家の主題 | 4/4 | 8 | 世間からはみ出た者たちの、陰を帯びた義理と温かさ。日陰を肩を組んで歩くような、弾む足取りと張りのある掛け声。短調で書く（ユーザー指定）。一家の屋敷、親分の屋敷、宿で響かせる |
| karakuri | からくりの主題 | 4/4 | 8 | 歯車とゼンマイの、冷たく規則正しい動き。人の心のない機械の刻みと、その奥の鷲尾の企み。からくり屋敷、不穏な場面、鷲尾、ラストバトルで響かせる |
| komoriuta | 子守唄 | 3/4 | 8 | ゼンマイに封じられた母が、最後に鳴らしたからくりの子守唄。小さく、少し欠けた、さらわれた人々の魂の歌。第 1 章の別れ、宿の夜、からくり大権現から魂が解き放たれる場面で響かせる |
| main | 流れ者の主題 | 4/4 | 16 | 旅立ちの寂しさと、街道が開けていく広がり。主人公の旅そのもの。タイトル、街道、仲間が集う場面、エンディングで響かせる |
| yashamaru | 夜叉丸の主題 | 4/4 | 8 | 妖しさの奥の、家族を奪われた悲しみ。闇から差し込む低いゆらぎと、ふいに高く上がる嘆き。夜叉丸の登場、夜叉丸との決着、その最期で響かせる |

## motiv

| ID | 元の core-theme | 範囲 | どんな断片か |
| --- | --- | --- | --- |
| heroine.kiai | heroine | 1-1 小節 | 出だしの、迷いなく上へ伸びる 4 音。気の強さ |
| heroine.shitau | heroine | 5-6 小節 | 高いところまで上って、ふっとほどける。父を慕う心 |
| heroine.omoi | heroine | 15-16 小節 | 結び。揺れながら落ち着く |
| ikka.ashidori | ikka | 1-1 小節 | 出だしの弾む足取り。日陰を行く者の、陰りのある歩み |
| ikka.kakegoe | ikka | 6-6 小節 | 上へ張り上げる掛け声 |
| ikka.irori | ikka | 7-8 小節 | 結び。囲炉裏端に腰を下ろすような落ち着き |
| karakuri.haguruma | karakuri | 1-1 小節 | 噛み合って回る歯車の刻み |
| karakuri.zenmai | karakuri | 4-4 小節 | ゼンマイを巻き上げるように、じわじわ下りる 4 音 |
| karakuri.tomaru | karakuri | 8-8 小節 | 機械が止まる、乾いた結び |
| komoriuta.yurikago | komoriuta | 1-2 小節 | 揺りかごを揺らすような出だし |
| komoriuta.nemure | komoriuta | 7-8 小節 | 眠りに落ちるような結び |
| main.call | main | 1-2 小節 | 冒頭の呼びかけ。低いところから上へ伸びて、ひと息つく |
| main.wide | main | 9-10 小節 | 後半の開け。高く跳んで遠くを見渡す |
| main.sigh | main | 15-16 小節 | 結び。下りてきて、元の高さに落ち着く |
| yashamaru.kage | yashamaru | 1-2 小節 | 闇のゆらぎから跳ね上がる、妖しい出だし |
| yashamaru.nageki | yashamaru | 6-6 小節 | 高いところでの嘆き |
| yashamaru.sue | yashamaru | 7-8 小節 | 結び。悲しみを抱えて沈む |

## 曲

| ID | 名前 | ループ | 主旋律（main） | 副旋律（sub） |
| --- | --- | --- | --- | --- |
| bgm_battle | 戦闘 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_boss | ボス戦 | あり | 新しく書いた旋律だけ | motif:karakuri.zenmai |
| bgm_castle | 城 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_defeat | 全滅 | なし | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_duel | 決闘 | あり | 新しく書いた旋律だけ | motif:main.call |
| bgm_dungeon | 洞窟・廃墟 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_edojo | 江戸城 | あり | 新しく書いた旋律だけ | motif:karakuri.haguruma, motif:karakuri.tomaru |
| bgm_ending | ふたたび街道へ | あり | theme:heroine, theme:main | motif:heroine.omoi |
| bgm_epilogue | 日本橋 | あり | theme:main | 新しく書いた旋律だけ |
| bgm_home | 清水湊 | あり | motif:ikka.ashidori, motif:ikka.irori, theme:ikka | motif:heroine.kiai |
| bgm_inn | 一泊 | なし | motif:komoriuta.nemure, theme:komoriuta | 新しく書いた旋律だけ |
| bgm_join | 仲間 | なし | motif:main.wide | 新しく書いた旋律だけ |
| bgm_karakuri | からくり屋敷 | あり | motif:karakuri.haguruma, theme:karakuri | motif:karakuri.zenmai |
| bgm_last_boss | からくり大権現 | あり | motif:karakuri.tomaru, motif:karakuri.zenmai, motif:main.call, motif:main.wide, motif:yashamaru.kage, theme:heroine, theme:karakuri, theme:komoriuta, theme:main | motif:karakuri.haguruma, theme:komoriuta |
| bgm_matsuri | 凧揚げ合戦 | あり | motif:main.wide | motif:main.wide |
| bgm_ninja | 伊賀者の里 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_oyabun | 親分の屋敷 | あり | motif:ikka.irori, theme:ikka | 新しく書いた旋律だけ |
| bgm_rally | 反撃 | あり | theme:main | 新しく書いた旋律だけ |
| bgm_road | 街道 | あり | theme:main | 新しく書いた旋律だけ |
| bgm_sad | 別れ | あり | motif:heroine.shitau | motif:komoriuta.nemure |
| bgm_sea | 北前船 | あり | 新しく書いた旋律だけ | motif:main.call |
| bgm_shrine | 寺社 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_shugeki | 終劇 | なし | motif:main.sigh | 新しく書いた旋律だけ |
| bgm_sneak | 潜入 | あり | 新しく書いた旋律だけ | motif:karakuri.haguruma |
| bgm_taika | 大火 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_tension | 陰謀 | あり | motif:yashamaru.kage | motif:karakuri.zenmai |
| bgm_title | タイトル | あり | theme:main | motif:main.call |
| bgm_tobaku | 賭場 | あり | 新しく書いた旋律だけ | motif:ikka.kakegoe |
| bgm_town | 城下町 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_town_edo | 江戸 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_town_kyo | 京 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_town_nanban | 長崎 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_town_night | 夜 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_town_osaka | 大坂 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_town_snow | 雪の町 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
| bgm_victory | 勝利 | なし | motif:main.call | 新しく書いた旋律だけ |
| bgm_washio | 鷲尾 | あり | motif:karakuri.zenmai, theme:karakuri | motif:karakuri.haguruma, motif:main.wide, theme:karakuri |
| bgm_yama | 野山 | あり | 新しく書いた旋律だけ | 新しく書いた旋律だけ |
