# 音楽・効果音の一覧

今回は音楽・音声を実装しません。後のフェーズで追加するときのために、必要な曲と効果音をまとめます。
実装時は、ここに挙げたキー（ID）でシーンから再生できるよう、`src/systems/audio.ts` に空の呼び出し口だけ用意しておきます。

曲は MIDI で作曲し、Ogg Opus に書き出します。作り方は `.claude/skills/music-composition/SKILL.md`、曲の素材（core-theme・motiv）とその使い方の一覧は `music/catalog.md` にあります。

## 曲（BGM）

シナリオ（[story.md](story.md)）・全 40 マップ（`src/data/maps.ts`）・イベントの戦闘（`src/data/events.ts`）を突き合わせて洗い出した一覧です（2026-11-15）。
「優先」は作る順の目安です。A は最初にそろえる曲、B は場面の色を足す曲、C はなくても代わりの曲で困らない曲です。まだない曲を鳴らそうとしたときは「代わり」の曲を鳴らします（代わりもなければ、その上の代わりをたどる）。

### システム・ジングル

| ID | 場面 | 雰囲気 | ループ | 優先 | 代わり |
| --- | --- | --- | --- | --- | --- |
| bgm_title | タイトル・主人公の選択 | 尺八と三味線。旅立ちの寂しさと広がり | あり | A | |
| bgm_victory | 戦闘の勝利 | 短いファンファーレ（三味線） | なし | A | |
| bgm_defeat | 全滅（一行は力尽きた……） | 尺八の短い下降。重く沈む | なし | B | （無音） |
| bgm_inn | 親分の屋敷・もぐりの宿で一泊 | 短い子守唄風 | なし | A | |
| bgm_join | 仲間が加わる・戻る（霞・玄道・お凛・榊兵庫、霞の復帰） | 短く明るい合奏。頼もしさ | なし | B | （無音） |
| bgm_shugeki | 「終劇」の黒い画面 | 拍子木と、主題の最後の一節 | なし | C | （無音） |

### フィールド・町

| ID | 場面 | 雰囲気 | ループ | 優先 | 代わり |
| --- | --- | --- | --- | --- | --- |
| bgm_road | ワールドマップ | 軽快な三味線。旅の歩み | あり | A | |
| bgm_sea | 北前船の甲板・屋形 | 波と櫓の拍子、船歌。広い海と少しの心細さ | あり | B | bgm_road |
| bgm_home | 清水湊（序章・第 4 章） | 港町の朝。辰五郎一家の温かさと、帰る場所の懐かしさ | あり | A | bgm_town |
| bgm_town | 城下町（駿府・名古屋・浜松・彦根・伊賀上野・広島・熊本・仙台） | 祭り囃子を抑えた、にぎやかで穏やかな曲 | あり | A | |
| bgm_town_kyo | 京 | 雅な琴と篠笛。都の華やかさの陰に、鬼の噂の翳り | あり | B | bgm_town |
| bgm_town_osaka | 大坂 | 商都の掛け声を抑え、米の値上がりに飢える町の重さ | あり | C | bgm_town |
| bgm_town_nanban | 長崎・出島 | 和楽器にオルゴールやチェンバロの響きが混じる、異国の風 | あり | B | bgm_town |
| bgm_town_snow | 加賀金沢・会津若松 | 雪の静けさ。澄んだ琴と、遠い鐘 | あり | B | bgm_town |
| bgm_town_edo | 江戸（第 8 章） | 大江戸のにぎわいの下に、手配されて身を潜める落ち着かなさ | あり | B | bgm_town |
| bgm_town_night | 夜・夜明け前（鍵屋の辻、序章の雨の夜） | 虫の音と篠笛。静かで少し不穏 | あり | B | bgm_town |

### 屋内・施設

屋内は、建物のある町の曲をそのまま鳴らします（`respawnMap` の町。旅籠・茶屋・店・湯屋・居酒屋・妓楼・民家など）。次の施設だけは別の曲にします。

| ID | 場面 | 雰囲気 | ループ | 優先 | 代わり |
| --- | --- | --- | --- | --- | --- |
| bgm_oyabun | 親分の屋敷（各町の一家） | 低い三味線。任侠の義理と、腰を据えた重み | あり | B | 町の曲 |
| bgm_shrine | 寺社（お祓い） | 鈴と笙、遠い読経。静かで清らか | あり | C | 町の曲 |
| bgm_tobaku | 賭場（丁半） | 壺を振る間合い。張り詰めた熱気 | あり | C | 町の曲 |
| bgm_sneak | 潜入（一座の工房、与力・黒田の屋敷とその中） | 抜き足の小刻みな拍。見つかれば終わりの緊張 | あり | B | bgm_tension |

### ダンジョン

| ID | 場面 | 雰囲気 | ループ | 優先 | 代わり |
| --- | --- | --- | --- | --- | --- |
| bgm_yama | 野山の道（清水湊の裏山、中田島の松林、佐和山、飯盛山） | 風と鳥の声。人里を離れた心細さ | あり | B | bgm_dungeon |
| bgm_dungeon | 洞窟・廃墟（狐火の洞、羅生門跡、鬼の巣、南蛮寺跡、原城跡、清正の古井戸の底、堀川の荷蔵） | 太鼓の低音、不気味 | あり | A | |
| bgm_ninja | 伊賀者の里 | 忍びの里の、息を殺した静けさ | あり | C | bgm_dungeon |
| bgm_karakuri | からくりのダンジョン（からくり屋敷、米蔵の地下、地下の研究所、からくり蔵） | 和楽器と機械的なリズムの混在 | あり | A | bgm_dungeon |
| bgm_castle | 大名の城と庭（名古屋城の天守、兼六園） | 雅楽風、重厚 | あり | B | bgm_dungeon |
| bgm_taika | 神田の大火 | 半鐘が急き立てる。炎に追われる焦り | あり | B | bgm_dungeon |
| bgm_edojo | 江戸城（本丸御殿・大奥・松の廊下） | 雅楽の重厚さに、からくりの音が忍び込む。最後の道のり | あり | A | bgm_castle |

### 戦闘

| ID | 場面 | 雰囲気 | ループ | 優先 | 代わり |
| --- | --- | --- | --- | --- | --- |
| bgm_battle | 通常戦闘、イベントの戦闘（追っ手・見張り・寄り道の相手） | 速い三味線と太鼓 | あり | A | |
| bgm_boss | 章のボス・中ボス | 激しい和太鼓、緊張感 | あり | A | bgm_battle |
| bgm_duel | 因縁の相手との決闘（朧、蛇骨の権六、夜叉丸、鬼塚典膳） | 尺八の鋭い叫びと太鼓。一対一の張り詰め | あり | B | bgm_boss |
| bgm_washio | 鷲尾但馬守宗衡 | 黒幕の威圧。からくりの主題が重く鳴る | あり | B | bgm_last_boss |
| bgm_last_boss | 最終ボス・からくり大権現 | 和楽器とオーケストラ、からくりの音 | あり | A | bgm_boss |

### 場面の曲（イベントで切り替える）

| ID | 場面 | 雰囲気 | ループ | 優先 | 代わり |
| --- | --- | --- | --- | --- | --- |
| bgm_sad | 悲しい場面・別れ | 胡弓または尺八の独奏 | あり | A | |
| bgm_tension | 陰謀・緊迫した会話 | 低い弦と拍子木 | あり | A | |
| bgm_rally | 味方が駆けつける・反撃に転じる | 太鼓が高まり、主題が力強く鳴る | あり | B | bgm_tension |
| bgm_matsuri | 浜松の凧揚げ合戦 | 祭り囃子。にぎやかで晴れやか | あり | C | bgm_town |
| bgm_epilogue | ひと月のちの日本橋（仲間がそれぞれの道へ去る） | 穏やかな主題。安堵と、少しの名残惜しさ | あり | B | bgm_ending |
| bgm_ending | 浜松の茶屋の前でお凛が待つ〜二人で西へ歩き出す | 主題の変奏。寂しさと温かさ | あり | A | |

エンディングの会話はプレイヤーの送りに合わせて長さが変わるので、bgm_ending はループありにします（「終劇」の画面で bgm_shugeki に替える）。

## 場面への当てはめ

### マップ

マップに入ると、マップの曲を鳴らします。同じ曲のマップへ移ったときは、曲を頭から鳴らし直さずに続けます。

| マップ | 曲 |
| --- | --- |
| ワールドマップ（world） | bgm_road |
| 清水湊（shimizu）とその屋内 | bgm_home |
| 駿府城下・名古屋・浜松・彦根・伊賀上野・広島・熊本・仙台とその屋内 | bgm_town |
| 京（kyo）とその屋内 | bgm_town_kyo |
| 大坂（osaka）とその屋内 | bgm_town_osaka |
| 長崎・出島（nagasaki・dejima）とその屋内 | bgm_town_nanban |
| 加賀金沢・会津若松（kanazawa・aizu）とその屋内 | bgm_town_snow |
| 江戸（edo）とその屋内 | bgm_town_edo |
| 鍵屋の辻（kagiya）とその民家 | bgm_town_night |
| 各町の親分の屋敷（`*Oyabun*`） | bgm_oyabun |
| 寺社の屋内（`*Tera`・`*Zendera`・`*ShikakeDera`・`sunpuSengen`・`nagoyaAtsuta`・`kyoYasaka`・`igaTenjin`・`osakaTennoji`・`sendaiHachiman`） | bgm_shrine |
| 賭場（`*Tobaku*`） | bgm_tobaku |
| 一座の工房（kobo）、与力・黒田の屋敷（yoriki・yorikiOmoya・yorikiHokoninNagaya・yorikiKuraNaka） | bgm_sneak |
| 北前船（kitamaebune・kitamaeYakata） | bgm_sea |
| 清水湊・裏山（urayama）、中田島の松林、佐和山、飯盛山 | bgm_yama |
| 狐火の洞、羅生門跡、鬼の巣、南蛮寺跡、原城跡、清正の古井戸の底、堀川の荷蔵 | bgm_dungeon |
| 伊賀者の里（igaSato）とその民家 | bgm_ninja |
| からくり屋敷、米蔵の地下、地下の研究所、からくり蔵 | bgm_karakuri |
| 名古屋城 天守（tenshu）、兼六園（kenrokuen） | bgm_castle |
| 神田の大火（edoTaika） | bgm_taika |
| 江戸城 本丸御殿（edojo）、松の廊下（matsuNoRoka） | bgm_edojo |

### 戦闘

ランダムエンカウントはすべて bgm_battle です。イベントの戦闘は次のとおりです（書いていない戦闘は bgm_battle）。勝てば bgm_victory、全滅すれば bgm_defeat を鳴らし、フィールドに戻るとマップの曲（イベントの途中なら、そのとき鳴らしていた場面の曲）に戻します。

| 章 | 相手 | 曲 |
| --- | --- | --- |
| 序章 | 野狐 | bgm_boss |
| 第 1 章 | からくり大将 鉄瓶 | bgm_boss |
| 第 2 章 | 金鯱からくり | bgm_boss |
| 第 3 章 | 酒呑の大鬼 | bgm_boss |
| 第 4 章 | 朧（霞の師） | bgm_duel |
| 第 4 章 | 蛇骨の権六（仇討ち） | bgm_duel |
| 第 5 章 | 百俵からくり | bgm_boss |
| 第 6 章 | 南蛮大筒からくり | bgm_boss |
| 第 7 章 | 船幽霊・海坊主（北前船の船首） | bgm_boss |
| 第 7 章 | からくり影武者（中ボス） | bgm_boss |
| 第 7 章 | 夜叉丸 | bgm_duel |
| 第 8 章 | 火車からくり | bgm_boss |
| 終章 | 鬼塚典膳（松の廊下） | bgm_duel |
| 終章 | 鷲尾但馬守宗衡 | bgm_washio |
| 終章 | からくり大権現 | bgm_last_boss |

寄り道の町のダンジョンの奥の相手（亡霊武者・浪人と雲助・外法使い・送り狼の群れ）や、御金蔵・大奥・将軍の間の手前の手下は、章のボスほどの重みを持たせないため bgm_battle にします。

### イベントの場面

イベントの途中で曲を替える場面です。イベントが終わったら、マップの曲に戻します（エンディングのように戻さない場面は「戻さない」と書いた）。

| 章 | 場面 | 曲 |
| --- | --- | --- |
| 序章 | 雨の夜、辰五郎一家の門をくぐって仁義を切る（`shimizuEnter`） | bgm_town_night |
| 序章 | 狐火の洞の奥で、ゼンマイの仕掛けの人形の残骸を見つける | bgm_tension |
| 第 1 章 | 霞と鉢合わせ、手を組む | bgm_join（加わったところで） |
| 第 1 章 | からくり屋敷の最深部で夜叉丸に出会う | bgm_tension |
| 第 1 章 | ゼンマイに封じられた母が、最後に子守唄のからくり音を鳴らす | bgm_sad |
| 第 2 章 | 金太の兄がからくり兵として倒れる | bgm_sad |
| 第 3 章 | 鬼の巣で夜叉丸が黒幕をほのめかす | bgm_tension |
| 第 3 章 | 飛脚の急報「辰五郎親分、殺される」 | bgm_tension |
| 第 4 章 | 清水湊での辰五郎の弔い、お凛が仇討ちを誓う（`shimizuEnter`） | bgm_sad |
| 第 4 章 | 権六の最期の言葉 | bgm_sad |
| 第 5 章 | 霞の一時離脱 | bgm_sad |
| 第 5 章 | 兵庫が橋の上で撃たれ、堂島川へ落ちる | bgm_sad |
| 第 6 章 | 蘭斎が祝詞を託して息を引き取る | bgm_sad |
| 第 7 章 | 家老が殿様を閉じ込め、からくりの影武者を立てていると聞く | bgm_tension |
| 第 7 章 | 夜叉丸が妻子を人質に取られていたと明かし、お鈴を託して息を引き取る | bgm_sad |
| 第 8 章 | 日本橋の高札の人相書き（`edoIntro`） | bgm_tension |
| 第 8 章 | 小吉の報告（将軍はからくり、今夜の火付け） | bgm_tension |
| 第 8 章 | 火付け盗賊が火を放ち、半鐘が鳴る（`taikaStarted`） | bgm_taika |
| 終章 | 金太・銀次の火消しが助けに来る、榊兵庫が後ろから斬り込む | bgm_rally |
| 終章 | 将軍の間で鷲尾と対峙する | bgm_tension |
| 終章 | 大権現を倒し、夜叉丸と妻の魂が昇っていく〜本物の上様が戻る | bgm_sad → bgm_epilogue |
| 終章 | ひと月のちの日本橋 | bgm_epilogue（戻さない） |
| 終章 | 浜松の茶屋の前でお凛が待つ〜「終劇」 | bgm_ending → bgm_shugeki（戻さない） |
| 寄り道 | 浜松の凧揚げ合戦 | bgm_matsuri |

仲間が加わる・戻る場面（霞・玄道・お凛・榊兵庫の加入、霞の復帰）では、`join`・`rejoin` の知らせに合わせて bgm_join を鳴らし、終わったらその場面の曲に戻します。

### コードでの鳴らし方（案）

- `src/systems/audio.ts` の `BgmId` に上の ID をすべて並べ、代わりの曲の表を置く（まだ書き出していない曲は代わりをたどる）。
- マップに `bgm`（曲の ID）を書けるようにする。書いていない屋内は、`respawnMap` の町の曲を鳴らす。親分の屋敷・寺社・賭場は、建物の種類（`src/data/townFacilities.ts`）から決める。
- イベントの手順に `bgm`（曲を替える。`id: null` で止める）を足す。イベントが終わったらマップの曲に戻し、`keep: true` なら戻さない。
- イベントの `battle` に `bgm` を書けるようにし、書いていなければ bgm_battle にする。勝ったら bgm_victory、全滅したら bgm_defeat を鳴らす。

### core-theme の候補

曲を組み立てる素材として、次の主題を作っておくと、上の曲どうしがつながって聞こえます（作るときは `music-composition` スキルに従い、どの曲で使うかは作曲のときに決める）。

| 候補 | どんな主題か | 響かせたい曲 |
| --- | --- | --- |
| 流れ者の主題（main） | 旅立ちの寂しさと広がり。主人公の旅そのもの | bgm_title、bgm_road、bgm_rally、bgm_epilogue、bgm_ending、bgm_shugeki |
| お凛の主題 | 気の強さの奥の、父を慕う優しさ | bgm_home、bgm_sad（弔い）、bgm_duel（仇討ち）、bgm_ending |
| 一家の主題 | 辰五郎一家の義理と温かさ | bgm_home、bgm_oyabun、bgm_inn |
| 子守唄 | ゼンマイに封じられた母のからくりの子守唄。さらわれた人々の魂 | bgm_inn、bgm_sad（第 1 章）、bgm_last_boss（魂の解放） |
| からくりの主題 | 歯車とゼンマイの、冷たく規則正しい動き。鷲尾の企み | bgm_karakuri、bgm_tension、bgm_washio、bgm_last_boss |
| 夜叉丸の主題 | 妖しさの奥の、家族を奪われた悲しみ | bgm_tension（夜叉丸の登場）、bgm_duel（夜叉丸）、bgm_sad（第 7 章） |

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
