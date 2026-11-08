# 画像アセットの記録

PixelLab MCP で生成した画像の記録です。作り直すときは、ここのプロンプトと設定を使います（一覧と方針は [docs/assets.md](../../docs/assets.md)）。

## キャラクター（`chars/`）

共通の設定: `create_character`（mode `standard`、4 方向、size 24、proportions `chibi`、view `low top-down`、黒の 1px 輪郭）。
歩行は `animate_character`（mode `v3`、4 コマ、`keep_first_frame: false`、下・左・右・上）。
ダウンロードした ZIP を展開し、`python3 scripts/pack_character.py <展開したフォルダ> public/assets/chars/<ID>.png` で 1 枚のシートにまとめる（行: 下・左・右・上、列: 立ち＋歩行 4 コマ）。

| ID | PixelLab のキャラクター ID | 生成プロンプト | 歩行の action_description |
| --- | --- | --- | --- |
| hero_m | db7af63f-6f1c-4f28-bc9d-5cc5c501c1ac | （下の「主人公」を参照） | walking forward at a steady pace, wide straw hat stays on head, cape sways slightly, sword stays at left hip |
| hero_f | 5c419406-e8e0-4156-b627-84c216bc3ac2 | （下の「主人公」を参照） | walking forward at a steady pace, wide straw hat stays on head, cape sways slightly, sword stays at left hip |
| kasumi | f5b98b82-be0e-4db3-9c14-96ccb14ac47b | Edo period Japanese female ninja (kunoichi), dark navy ninja outfit, cloth mask covering mouth, black hair in ponytail, small blade at back | walking forward at a steady pace |
| gendo | c4c4be3a-4027-4d27-abd2-55c907790716 | Edo period Japanese corrupt wandering monk, shaved bald head, ragged black monk robe, holding a tall wooden staff, gourd of sake at waist, burly | walking forward at a steady pace, holding the staff |
| orin | 90640155-04f7-4a06-9f27-ca89ad1d8ddf | Edo period Japanese town girl, red and cream kimono with sleeves tied back by a tasuki cord, black hair in bun, carrying a brass clockwork rifle on her back | walking forward at a steady pace, rifle stays on back |
| tatsugoro | 7eed1a60-5cf2-414a-9dd2-4dde656229a0 | Edo period Japanese yakuza boss, stout portly middle-aged man, dark brown haori jacket over kimono, topknot hair, stern face | walking forward at a steady, dignified pace |

霞・玄道はまだマップに登場しないため、シートだけを置いている（フェーズ 4 で NPC の `sprite` に指定する）。

### 主人公（`chars/hero_m.png`・`chars/hero_f.png`）

テストプレイで「三度笠姿の渡世人に全然見えない」と指摘されたため作り直した。初めの版（mode `standard`、size 24。キャラクター ID 1607d210…・52a674fd…）は、笠がサファリハットのような形で、縞の合羽が縞のシャツと半ズボンに見え、水兵のようだった。
standard の size 24 では笠と合羽が描き分けられないため、主人公は mode `v3`（8 方向。シートには下・左・右・上だけを使う）で作った。背丈は 26〜28px で、町の人（24px 前後）より少し大きい。

- hero_m: `create_character`（mode `v3`、size 28、黒の 1px 輪郭、medium detail、low top-down）。プロンプト: chibi Edo period Japanese wandering swordsman traveler (matatabi). On his head a very wide light tan straw hat shaped like a flat shallow cone (sandogasa), wider than his shoulders. A long plain grey-blue travel cape (dochu-gappa) hangs from his shoulders down to his knees, covering his arms and body like a bell. The hilt and long black scabbard of a katana stick out diagonally from the cape at his left hip. Below the cape: white cloth leg wraps on the shins and straw sandals.
- hero_f: hero_m と同じ言い方で作った女の版（d0a7ac48 の次の 4f89acdb。合羽は dark plum purple）の正面の絵に、肩にかかる黒髪と赤い襟を Pillow で描き足し、透明の余白で 32 × 32 にしたものを参照画像にして、`create_character`（mode `v3`、`reference_image_base64`、4 方向）で作った。プロンプト: chibi Edo period Japanese wandering swordswoman traveler (onna matatabi), young woman with long black hair falling over her shoulders and a red kimono collar, very wide light tan straw sandogasa hat shaped like a flat shallow cone, long dark plum purple travel cape down to her knees, katana hilt and black scabbard at her left hip, white leg wraps and straw sandals
- 歩行はどちらも `animate_character`（mode `v3`、4 コマ、`keep_first_frame: false`、下・左・右・上。40 × 40）。

作り直しの経過:

- hero_m: 1 回目（standard、size 24、text_guidance_scale 12）は笠が紺色の帽子になり、合羽も着物にしか見えなかった。2 回目は mode `v3` にして、笠を「light tan」、合羽を「grey-blue」と色で描き分け、「wider than his shoulders」「like a bell」で形を言い、採用（計 2 回）。
- hero_f: 1 回目（standard）は笠は出たが、合羽が着物になり、横向きで笠が消えた。2 回目（v3）は渡世人の形になったが、笠で髪が隠れて男女の区別がつかなかった。3 回目は「pretty young woman」「red lips」を足したところ、胸から上しか描かれず脚が切れた。4 回目は 2 回目の正面に黒髪と赤い襟を描き足して参照画像にし、4 方向を回して採用（計 4 回）。
- hero_f の下向きの歩行（2026-11-08）: テストプレイで「下向きに歩くとき足が動いておらず、歩いているように見えない」と指摘された。合羽が揺れるだけで、4 コマとも足が同じ形だった。
  - 1 回目: `animate_character`（v3、south、4 コマ、action_description: walking toward the viewer, legs clearly alternating: left foot steps forward and lifts while right foot stays back, then right foot steps forward and lifts, feet visible below the cape, …。グループ 71f631d2…）。両足がそろって上下するだけで、交互に動かなかった。
  - 2 回目: template `walking-4-frames`（south。グループ 3dffafa7…）。足は交互に動いたが、合羽が細くなり刀の位置も変わって、ほかの向きと別人に見えた。
  - 3 回目: 採用済みのコマの足だけを `scripts/fix_hero_f_walk_down.py` で描き直して採用（列 1 で左足を上げ右足を 1px 前へ、列 3 でその逆）。`pack_character.py` でシートを作り直したときは、このスクリプトをもう一度実行する。

### 敵方の人物（`chars/yashamaru.png`・`chars/oboro.png`・`chars/borei.png`）

テストプレイで「主要人物以外のキャラクターに画像がない」と指摘された残り。フィールドに立っているだけなので歩行は作らず、`scripts/pack_character.py` が歩行のコマにも立ち姿を置く。
主人公と同じく mode `v3`（size 28、黒の 1px 輪郭、medium detail、low top-down。8 方向のうち下・左・右・上を使う）。

| ID | PixelLab のキャラクター ID | 生成プロンプト | 回数 |
| --- | --- | --- | --- |
| yashamaru | 4b304f52-a2aa-4b6d-b373-139c42f49373 | chibi Edo period Japanese evil sorcerer (onmyoji) young man, long unkempt black hair down to his shoulders, pale white face with sharp eyes, loose dark purple robe with wide sleeves and a black sash, holding white paper talismans (ofuda) in one hand | 1 |
| oboro | 79da6516-c1ec-4413-95bd-1e4130545709 | chibi Edo period Japanese old ninja master, grey cloth hood covering his head, very long white beard down to his chest, grey ninja outfit with black belt, grey leg wraps, katana in a black scabbard at his hip（戦闘の画像 `enemies/oboro.png` に合わせた） | 1 |
| borei | 28d55aa9-474f-4c8d-aa99-9847dd2182c3 | chibi Japanese ghost (yurei), a small white TRIANGLE of cloth (hitaikakushi) pointing up in the middle of the forehead, long black hair hanging forward on both sides of a pale blue face, pale blue-white translucent body, white burial kimono crossed left over right, hands hanging limply at the wrists, lower body fading into wispy pale mist with no feet | 2 |

- borei: 1 回目（bcc58de0-6585-449d-830f-d487ee996aac。white triangular cloth headband）は額の布がただの白い鉢巻きになり、三角に見えなかった。2 回目は「a small white TRIANGLE of cloth … pointing up in the middle of the forehead」と形と位置を言い、採用

### 物語の専用の人物（`chars/hyogo.png`・`kinta.png`・`sakon.png`・`kagaTono.png`・`kokichi.png`・`tatewaki.png`）

町の人の類型で代えていた主要な人物に、専用の立ち姿を作った（`src/data/sprites.ts` の `STORY_SPRITES`）。設定は敵方の人物と同じ（mode `v3`、size 28、黒の 1px 輪郭、medium detail、low top-down。歩行は作らず `scripts/pack_character.py` で立ち姿を並べる）。

| ID | PixelLab のキャラクター ID | 生成プロンプト | 回数 |
| --- | --- | --- | --- |
| hyogo（榊兵庫） | 1c362666-f9d5-4126-83af-4946e2962ec5 | chibi Edo period Japanese former police samurai (yoriki) in his thirties, black hair in a neat topknot (chonmage), stern calm face, dark navy blue haori jacket with a small white family crest on the chest, grey striped hakama trousers, two swords (katana and wakizashi) at his left hip, white tabi socks and straw sandals | 2 |
| kinta（金太） | 8b2e2a4f-981a-4568-9b48-e2d38dfc0f36 | chibi Edo period Japanese young acrobat performer (karuwazashi), cheerful young man with short spiky black hair and a red twisted headband (hachimaki), bright red and yellow checkered short performer jacket, black tight leggings, bare feet in straw sandals, a small diamond-shaped paper kite tied on his back | 1 |
| sakon（長瀬左近） | be96b965-6e9d-4865-b91f-69fa21704dcd | chibi Edo period Japanese elderly loyal retainer samurai, old man with white hair in a small topknot and white eyebrows, slightly bent back, formal kamishimo: dark navy stiff winged shoulder vest over a pale grey kimono and navy hakama, a short wakizashi sword at his hip, straw sandals | 3 |
| kokichi（鼠の小吉、第 8 章） | 6dc9d10d-0639-491d-95f3-24920551c42f | chibi Edo period Japanese gentleman thief (nezumi kozo), young slim man with a dark blue tenugui cloth covering his head and tied in a knot under his nose (hokkamuri), sly friendly grin, dark navy short kimono tucked up at the hem showing his legs, black tight leggings, straw sandals, a small dark green furoshiki cloth bundle tied on his back | 1 |
| kagaTono（加賀の殿様） | 13d55f69-7426-433a-b527-b7024dffda52 | chibi Edo period Japanese daimyo lord, thin pale young man with black hair in a topknot, wearing luxurious deep purple formal robes with gold crest patterns and very long trailing purple hakama, white undercollar, dignified tired face, no weapons | 1 |

- hyogo: 1 回目は胸の家紋が見えなかった。2 回目は Pillow で羽織の左右の胸に白い家紋を描き足して採用（計 2 回）
- sakon: 1 回目は肩衣の張った肩がなかった。2 回目（d63c8980-ddb4-4620-9238-978ab0de9782。very wide pointed shoulder wings）は張りが大きすぎて、こうもりの羽に見えた。3 回目は 1 回目の正面と背面に、小さな紺の肩衣の張りを Pillow で描き足して採用（計 3 回）

第 8 章・仙台の片平帯刀（伊達の重臣）も、初めは役人の類型（npc_yakunin）で代えていたので、同じ設定で作った。

| ID | PixelLab のキャラクター ID | 生成プロンプト | 回数 |
| --- | --- | --- | --- |
| tatewaki（片平帯刀） | acc71b02-3c0c-45a9-982d-1d16e7bc204d | chibi Edo period Japanese senior retainer samurai of the Date clan in his fifties, dignified wise face with a short neat grey goatee beard, grey-streaked black hair in a neat topknot (chonmage), deep dark green haori jacket with a small white round family crest on the chest, brown hakama trousers, katana and wakizashi at his left hip, white tabi socks and straw sandals（＋Pillow で髪を塗り替え） | 2 |

- チェック項目: 4 方向とも同じ人物で崩れがない [必須]／背景透過・黒の 1px 輪郭 [必須]／50 代の侍・灰色まじりの黒髪のまげ・灰のあごひげ [必須]／深緑の羽織＋茶の袴で、兵庫（紺）・左近（紺・白髪）・鷲尾（黒＋深紅）・加賀の殿様（紫）と色で見分けられる [必須]／胸に小さな白い紋／左腰に刀／40 × 40 のシートで背丈が兵庫・左近と釣り合う。
- 1 回目は髪が全部灰色になり（左近の白髪に近い）、東向きの頭の左に灰白の浮いた点があった。
- 2 回目は Pillow で、各向きの目より上の髪の灰色を 3 段（明るい灰 → 969ca8 の筋、中間 → 3a3842、暗い灰 → 201f26）に塗り替えて黒髪に灰の筋にし、東向きの浮いた点（目の高さの後ろの 4 × 2 ドット）を消して採用。最終判定はすべて ○。

### 終章「将軍の間」の人物（`chars/washio.png`・`tenzen.png`・`shogun.png`）

設定は「物語の専用の人物」と同じ（`create_character` mode `v3`、size 28、黒の 1px 輪郭、medium detail、low top-down。8 方向のうち下・左・右・上を使う。歩行は作らず `python3 scripts/pack_character.py <展開したフォルダ> public/assets/chars/<ID>.png` で立ち姿を並べる）。偽の上様（からくり）は shogun と同じシートを使う。

| ID | PixelLab のキャラクター ID | 生成プロンプト | 回数 |
| --- | --- | --- | --- |
| washio（鷲尾但馬守宗衡） | 69b30b3f-4d9e-4612-8ee7-aa366a884d4e | chibi Edo period Japanese elderly senior shogunate councilor (roju), thin cold old man in his late fifties, grey-streaked black hair in a neat topknot (chonmage), sharp narrow eyes, a small round brass clockwork monocle over his right eye, very formal stiff kamishimo: black stiff winged shoulder vest over a deep crimson kimono, black hakama, holding a closed folding fan in his right hand, white tabi socks（＋Pillow で片眼鏡を描き足し） | 2 |
| tenzen（鬼塚典膳） | 474bcc11-cacc-4fea-b62b-517eaa169161 | chibi Edo period Japanese big heavyset muscular samurai bodyguard in his forties, large wide body with very broad square shoulders and a thick neck, jet black hair in a short topknot (chonmage), thick black eyebrows, square jaw, a thick dark red scar running diagonally across his face over one eye, plain black haori jacket with one small red crest on the chest, grey hakama trousers, a long katana in a black scabbard tucked into his sash at his left hip, straw sandals | 4 |
| shogun（上様） | 4e403a3a-de5f-4dfc-be36-8317cee05fd8 | chibi Edo period Japanese shogun, gaunt adult man in his thirties, thin pale sallow face with hollow cheeks, tired dark eyes, thin straight black eyebrows and a thin black mustache, no blush, wearing a tall narrow rounded black court cap (eboshi) standing straight up on top of his head with no brim, formal pale gold and cream court robes (hitatare) with wide square sleeves decorated with small dark green round crests, long cream hakama, white undercollar, standing upright with empty hands, no weapons | 3 |

チェック項目（共通）: 4 方向とも同じ人物で崩れがない [必須]、背景透過・黒の 1px 輪郭 [必須]、40 × 40 のシートで背丈が兵庫・左近と釣り合う。人物ごとの項目は下の各行。

- washio: 項目 = 痩せた初老の男・白髪交じりのまげ [必須]／黒の肩衣（張った肩）＋深紅の着物 [必須]／閉じた扇子／片目に真鍮の片眼鏡／兵庫（紺）・左近（紺・白髪）と色で見分けられる [必須]。
  - 1 回目（69b30b3f）は片眼鏡が描かれなかった（ほかは ○。扇子は金色の閉じた扇子）。
  - 2 回目は 1 回目の下向き（右目＝画面の左の目）と東向きの目の周りに、Pillow で真鍮の輪（e8c060・d4a03c・a07028）と青い玉の光（8cbed2）を 4〜5 ドット描き足して採用。最終判定はすべて ○。
- tenzen: 項目 = がっしりした 40 代の侍・黒髪のまげ・太い眉 [必須]／黒の羽織か肩衣＋灰の袴 [必須]／胸に小さな赤い紋／顔を横切る長い傷／左腰に長い刀 [必須]／兵庫・washio と見分けがつく [必須]。
  - 1 回目（3c448eab-7bca-40d1-be46-8ac48199b468。「a long pale scar diagonally across his face」）は傷が白い点の散らばりで傷と分からなかった。
  - 2 回目（697b85f1-a828-4922-8221-3a1263322bd4。傷を「long dark red scar line … over his left eye」と言った）は傷は出たが、長い乱れ髪でまげに見えず、紋が見えず、抜き身のような刀が両脇に出た。
  - 3 回目は 1 回目に Pillow で赤い傷を描き、髪の白いつやを暗くしたが、シートで兵庫と並べると小柄でがっしりして見えず、髪も灰色がかった。
  - 4 回目は「big heavyset muscular … very broad square shoulders and a thick neck, jet black hair」と体格と髪の色を前に出して、兵庫より明らかに幅のある体になり採用。最終判定はすべて ○。
- shogun: 項目 = 30 代のやつれた男 [必須]／縦長の黒い烏帽子 [必須]／淡い金・生成りの直垂 [必須]／小さな紋／武器なし [必須]／加賀の殿様（深い紫・帽子なし）と見分けがつく [必須]。
  - 1 回目（aef01165-ae2d-4791-a1d2-081a02f3e6ca）は烏帽子がつばと耳のある帽子になり、顔も髪の影で見えなかった。紋は胸に 1 点だけ。
  - 2 回目（edf8c3af-18ba-441e-ad00-e24b0554510c。「a tall narrow rounded black cap … with NO brim」）は烏帽子は直ったが、頬の赤い丸顔で子どもに見え、東向きの目が緑、西向きの足元に灰色の浮いた点があった。
  - 3 回目は「gaunt adult man … hollow cheeks … thin black mustache, no blush」と年齢と頬を言って採用。最終判定はすべて ○。

### 町の人（`chars/npc_*.png`）

テストプレイで「主要人物以外のキャラクターに画像がない」と指摘されたため、町の人を 19 の類型に分けて 1 体ずつ作った（どの町の人にどれを使うかは `src/data/maps.ts` の `sprite`）。
設定は上のキャラクターと同じ（`create_character`、mode `standard`、4 方向、size 24、chibi、low top-down）。町の人は歩かないので歩行は作らず、`scripts/pack_character.py` が歩行のコマにも立ち姿を置く（キャンバスの 36 × 36 は 40 × 40 に広げる）。

| ID | PixelLab のキャラクター ID | 使う人 | 生成プロンプト | 回数 |
| --- | --- | --- | --- | --- |
| npc_innkeeper | 01c927b1-2ccd-4adc-ae73-daff86bb2f54 | 旅籠の主人 | Edo period Japanese innkeeper, middle-aged man with topknot, brown kimono with a dark blue apron, friendly face | 1 |
| npc_merchant | 4a762ba2-0ab8-46ad-9a1e-037b1537d701 | よろず屋・商人・番頭・通詞など | Edo period Japanese merchant, man with topknot, olive green kimono with black haori jacket, holding a wooden abacus (soroban) | 1 |
| npc_smith | 4afe997b-8d60-43df-b25b-0907d115246c | 刀鍛冶・職人 | Edo period Japanese swordsmith, muscular man with white headband (hachimaki), grey work clothes with sleeves tied back by a cord, holding a blacksmith hammer | 1 |
| npc_hikyaku | c3c76e41-8380-4234-857e-1e46936ae927 | 飛脚 | Japanese messenger runner carrying a long thin wooden stick diagonally across his shoulder like a fishing rod, with a small black box tied to the far end of the stick, white headband, short blue coat, white loincloth, bare legs（text_guidance_scale 13。棒の先の文箱を Pillow で描き足した） | 5 |
| npc_yakunin | 34c7b563-140b-48f0-a52f-d3048f648a01 | 奉行所の役人・同心・辻番・用人 | Edo period Japanese police officer (doshin), samurai with topknot, black haori jacket, holding up a short silver iron jitte truncheon with a hook and a red tassel in his right hand, sword at the waist（text_guidance_scale 10） | 2 |
| npc_okami | 2b5c8fb9-ece0-4861-aa66-564f270bb7fa | おかみ・母親・女中・女将 | Edo period Japanese townswoman (okami), middle-aged woman with black hair tied up in a bun, plain brown striped kimono with a white apron | 1 |
| npc_kodomo | 1f82a14a-c621-4193-bc99-d2dee69c496f | 子ども・寺の小僧 | small Edo period Japanese child, short boy with a tiny topknot tuft of hair, short red and yellow checkered kimono, bare feet, playful（size 18） | 1 |
| npc_sendo | f7a6efb4-5c2d-4e6a-8d87-9666647f94eb | 船頭・漁師・釣り人 | Edo period Japanese boatman (sendo), tanned man wearing a wide conical sedge hat (sugegasa), short indigo work coat, holding a long wooden boat pole | 1 |
| npc_monban | 2b83d956-5b23-4007-bb8e-10ec16abc8c2 | 門番・番人・中間 | Edo period Japanese gate guard foot soldier (ashigaru), flat black conical jingasa hat, dark blue armor vest, holding a tall spear (yari) upright | 1 |
| npc_musume | f5a330cd-56f3-460e-af40-37ea9dedd3b9 | 茶屋の娘・織子・売り子 | Edo period Japanese young town girl, black hair in a traditional shimada bun with a red ribbon, bright pink kimono with a yellow obi sash | 1 |
| npc_so | bfd3055e-766a-45cd-af0f-97c12e39595d | 寺の僧・住職・巡礼 | Edo period Japanese Buddhist monk, shaved bald head, black monk robe with a brown kesa stole over one shoulder, holding prayer beads (juzu) | 1 |
| npc_kannushi | 9d915362-3869-454a-bcb2-2dbaba31f46d | 神主 | Shinto priest in white robes wearing a tall narrow black hat shaped like a tall rounded cone pointing straight up from the top of his head (eboshi), the hat is taller than his face, white wide-sleeved robe, pale purple hakama（text_guidance_scale 13） | 3 |
| npc_ronin | 85aecc62-76e3-4db4-9188-db5790314e8a | 浪人・用心棒・見張り | Edo period Japanese ronin, masterless samurai with messy grown-out hair tied back, stubble, faded dark grey kimono worn loosely, katana at his waist, arms folded | 1 |
| npc_roba | 93ebc391-a447-4623-9666-b045d475be1b | 老婆 | old Japanese grandmother, white hair in a small bun, hunched back, plain grey-purple kimono, leaning on a wooden walking stick（size 22） | 1 |
| npc_rojin | 3a7ec008-8d6c-4d8c-89b6-a52e7e62c6f3 | 隠居・薬草取り | old Japanese man, bald on top with white hair on the sides, long white beard, beige kimono with a dark brown sleeveless vest, holding a wooden walking stick（size 23） | 1 |
| npc_ninsoku | 8aa11a08-f15b-49fb-9916-e12d5155b2a8 | 人足・木こり・農夫・木戸番など | Edo period Japanese laborer (ninsoku), burly tanned man with a twisted rope headband, short red-brown hanten work coat, tight black work pants, straw sandals | 1 |
| npc_maiko | a47b22eb-883b-4f81-a4f4-465a4819ab3a | 舞妓 | Kyoto maiko girl, white painted face, red lips, black hair in an elaborate bun with colorful flower kanzashi hairpins, bright red and orange patterned kimono, long hanging darari obi sash at the back | 1 |
| npc_oranda | 87355f1f-b899-4cea-83a4-86800bd01819 | カピタン・商館の医者 | 17th century Dutch merchant man, blond hair, wide black hat, black coat with a big white collar, knee breeches and stockings, buckled shoes | 1 |
| npc_hikeshi | 670374f6-219a-447f-ada4-4acbe581c003 | 火消し・火消しの頭（第 8 章） | Edo period Japanese town firefighter (machi-bikeshi), man with a white twisted headband (hachimaki), dark navy blue happi coat with red trim and a white emblem, tight black work pants, straw sandals, holding a long wooden fire hook pole (tobiguchi) upright with an iron hook at the top（左右の向きの鳶口を Pillow で描き足した） | 2 |
| npc_tojin | 88c641f1-2ac4-4acd-a590-58088020b48d | 唐人の商人 | Qing dynasty Chinese trader, front of head shaved bald, one very long black braided pigtail queue hanging down his back to his waist, small round black skullcap, long dark blue silk robe, thin long mustache（text_guidance_scale 11） | 2 |

作り直しの記録:

- 役人: 1 回目は十手が見えなかった。2 回目で「silver iron jitte with a hook and a red tassel」で採用（計 2 回）。
- 神主: 1 回目・2 回目は烏帽子が山高帽や笠になった。3 回目で「tall narrow black hat ... taller than his face」で採用（計 3 回）。
- 唐人: 1 回目は弁髪が見えなかった。2 回目で「very long braided pigtail queue hanging down his back」で採用（計 2 回）。
- 飛脚: 1 回目は現代風の帽子で棒がなく、2 回目は文箱を手に提げ、3 回目も棒を担がなかった。4 回目で棒を肩に担いだが先の文箱が出なかった。5 回目は 4 回目の 4 方向に Pillow で文箱（と横向きの棒）を描き足して採用（計 5 回）。上限で採用したため、小さく見ると文箱が棒の先の旗のようにも見える点が残る。
- ほかの 15 類型は 1 回目で採用。
- 火消し（第 8 章で足した類型）: 1 回目は左右の向きで鳶口が消えた。2 回目は左右の向きに Pillow で柄と先の鉤を描き足して採用（計 2 回）。

## 顔グラフィック（`faces/`）

会話の窓の左に出す 48 × 48 の顔（`src/data/faces.ts`。台詞の「名前「」の名前から引く）。表情差分（怒り・悲しみ）は旅の仲間だけにある（下の「表情差分」）。
立ち姿のある人は、シートの下向きの立ち姿（40 × 40 の 1 コマ目）を `create_portrait_character`（direction `character_to_portrait`、result_size 48、view `low top-down`）で胸像にした。足りない所は `edit_image`（文での編集）か Pillow で直した。
立ち姿のない蘭斎は `create_image_pro`（48 × 48、玄道の顔を style_image）で 25 候補を作って選んだ。権六は戦闘の画像（`enemies/gonroku.png`）を胸像にした。

共通の要件: 48 × 48・背景透過、胸から上で目と口が見える、立ち姿と同じ人物と分かる、暗い色の輪郭、正面向き。

| ID | 元にしたもの | 直し方（edit_image の指示の要点など） | 回数 |
| --- | --- | --- | --- |
| hero_m | chars/hero_m.png | 1 回目は笠の影で目が描かれなかった。2 回目は edit_image「show his face clearly under the straw hat brim: two sharp dark eyes and eyebrows visible」で採用 | 2 |
| hero_f | chars/hero_f.png | 1 回目は目が影で見えず、髪が短かった。2 回目は edit_image「two dark eyes with eyelashes under the hat brim, long straight black hair falling down over both shoulders」で採用 | 2 |
| kasumi | chars/kasumi.png | そのまま採用 | 1 |
| gendo | chars/gendo.png | そのまま採用 | 1 |
| orin | chars/orin.png | そのまま採用 | 1 |
| tatsugoro | chars/tatsugoro.png | 1 回目はまげがなく若者の顔だった。2 回目は edit_image「stout middle-aged yakuza boss: shaved crown with a black topknot, thick eyebrows, stern face with a few wrinkles」で採用 | 2 |
| hyogo | chars/hyogo.png | 1 回目は家紋がなかった。2 回目は edit_image「a small white round family crest on each side of the chest」で採用 | 2 |
| yashamaru | chars/yashamaru.png | 1 回目は頬の赤みで少女に見えた。2 回目（edit_image「narrow sharp cold eyes … remove the pink blush」）は半眼のくま顔になり、3 回目（edit_image「eyes wide open, narrow and sharp with a cold piercing glare … porcelain white」）は女性的な顔に戻った。4 回目は create_image_pro（立ち姿を reference、玄道の顔を style_image）で「sinister young MAN … masculine angular face with a sharp narrow jaw, thin straight dark eyebrows angled down, long narrow cold sharp eyes」の 25 候補から 6 番を採用。編集を重ねると女性的な顔に戻りやすいので、男の顔は Pro で顎と眉を言うほうがよい | 4 |
| kinta | chars/kinta.png | 1 回目は上着が市松でなかった。2 回目は edit_image「bright red and yellow checkered pattern」で市松になったが、片目だけ紫で、髪の外に浮いた点があった。3 回目は Pillow でその 2 点を直して採用 | 3 |
| oboro | chars/oboro.png | そのまま採用 | 1 |
| gonroku | enemies/gonroku.png | 1 回目・2 回目（edit_image「long pale scar running diagonally across his left cheek」）とも頬の傷が見分けられなかった。3 回目は Pillow で左の頬に斜めの傷を描いて採用 | 3 |
| ranzai | （なし） | create_image_pro「elderly Edo period Japanese Dutch-studies scholar … small round wire-rimmed glasses, grey-streaked black hair combed straight back and tied at the back of the head … dark brown haori jacket over a dull green kimono」の 25 候補のうち、丸眼鏡があり下端に線の出ていない 12 番を採用 | 1 |
| sakon | chars/sakon.png | 1 回目は肩衣が棘のある鎧になった。2 回目は edit_image「a stiff flat dark navy shoulder vest whose shoulders stick straight out sideways like wide flat wings … small white topknot」で採用 | 2 |
| kokichi | chars/kokichi.png | 1 回目は頬かむりの布で口が隠れた。2 回目は edit_image「pull the dark blue cloth mask down below his chin so his whole lower face is visible: nose, a sly friendly grinning mouth … Keep the dark blue cloth covering the top of his head」で採用（create_portrait_character a6820274-b57a-4553-8f06-4dee9d64e010 → edit_image e00866d1-78eb-43d1-9924-54a75e23ea73） | 2 |
| kagaTono | chars/kagaTono.png | 1 回目は髪が紫で、肩章とネクタイの洋装になった。2 回目は edit_image「jet black hair tied in a neat topknot, … traditional deep purple kimono and haori with small gold family crests … Remove the gold epaulettes and the necktie」で直ったが、耳に金の耳飾りのような点が出た。3 回目は Pillow でその点を消して採用 | 3 |
| washio | chars/washio.png | 1 回目（create_portrait_character dad06ae5-f32c-4344-8bfe-dc1e9b4de251）は初老の顔と片眼鏡はよかったが、まげがなく、洋風の立て襟と金の丸いブローチになった。2 回目は edit_image（2f0a5673-63e2-4753-ae8d-fb2bd0211325）「Keep his old stern face, grey hair and the gold monocle exactly. Comb the grey-streaked hair back into a small neat Japanese topknot … a deep crimson kimono with its collar crossed left over right in a V at the neck, a white undercollar, and a stiff black kamishimo shoulder vest … No brooch, no medal」で直ったが、金の枠が鼻を越えて右目まで伸び、眼鏡に見えた。3 回目は Pillow で鼻の上の金の 7 ドットを肌色にして採用 | 3 |
| tenzen | chars/tenzen.png | create_portrait_character（d0c8294d-ef22-4259-a46e-ac588a6e846c）をそのまま採用（まげ・太い眉・額から頬への赤黒い傷・黒の着物と胸の赤い紋） | 1 |
| shogun | chars/shogun.png | 1 回目（create_portrait_character d04b0413-77c3-4bb5-a8fc-238aecfe76e9）はつばのあるシルクハットと黒い外套、太い八の字ひげの西洋紳士になった。2 回目は create_image_pro（4ee525a5-0e90-4253-88b2-9121a86b4eae。立ち姿を 4 倍にして reference「character base」、washio の顔を style_image）「Front-facing bust portrait … gaunt adult MAN in his thirties … tall black lacquered court cap (eboshi) … with NO brim … pale gold and cream Japanese court robes (hitatare) … small dark green round family crests」の 25 候補から 14 番を選んだが、烏帽子が上端で切れて縦長に見えなかった。3 回目は 14 番を Pillow で 7px 下げて烏帽子を描き足したが、胸が切れて紋が消えた。4 回目（create_image_pro 2e89d8da-f525-44f5-bfe7-ab4ae2927e69。「the WHOLE tall hat fits inside the image」）も 25 候補すべてで烏帽子が上端で切れた。5 回目は 2 回目の 14 番を Pillow で 5px 下げ、烏帽子の上 5 行（丸い頂）を描き足し、両肩の下端に緑の紋（32462a）を 6 ドットずつ描いて採用（5 回の上限。残る ×: 胸がほぼ切れ、肩と襟元しか見えない） | 5 |
| tatewaki | chars/tatewaki.png | 1 回目（create_portrait_character 5802c075-9184-4c52-9729-a2e3cadd1c8f）はまげがなく尖った髪で、緑は立て襟と銀のボタンの洋風の外套になった。2 回目は edit_image（79063ca3-6634-4d78-8d2e-9cd2642a49ea）「Keep his stern face, dark eyes and grey beard exactly. Comb the black and grey streaked hair back flat into a small neat Japanese samurai topknot (chonmage) … a kimono collar crossed left over right in a V at the neck with a white undercollar, under a deep dark green haori jacket, with one small white round family crest on the left chest. No buttons, no high collar, no western coat」で採用 | 2 |

- create_portrait_character は顔の細部（目の色の左右差、浮いた点、耳飾り）がときどき崩れるので、8 倍に拡大して確かめる。
- create_image_pro は候補によって下端に灰色の横線が出る。選ぶときに下端の行を確かめる。
- shogun の顔の判定（5 回の上限で採用）: 必須の ○ は 2・4・5 回目が 4/5、合計 6/7 で並んだ。2・4 回目は烏帽子が上端で切れて平たい帽子に見え、5 回目は胸が切れる。上様の目印（加賀の殿様との見分け）は縦長の烏帽子なので、5 回目を選んだ。
- create_image_pro は 48 × 48 の胸像で背の高い帽子を描かせると、「帽子全体を収める」と言っても上端で切る。帽子の高い人物の顔は、Pillow で絵を下げて帽子の上を描き足すほうが早い。

### 表情差分（`faces/<ID>_angry.png`・`faces/<ID>_sad.png`）

旅の仲間（hero_m・hero_f・kasumi・gendo・orin）の通常の顔を `edit_image`（文での編集、48 × 48、背景透過のまま）で怒り・悲しみに変えた。台詞の〈怒〉〈悲〉の印で出す。

要件: 1. [必須] 48 × 48・背景透過　2. [必須] 通常の顔と同じ人物と分かる（髪・笠・服・配色）　3. [必須] 表情が等倍で読める（怒: 眉が内側へ下がり、目つきが鋭く、口を結ぶか歯を食いしばる／悲: 眉の内側が上がり、目を伏せ、口の端が下がる）　4. [必須] 通常の顔と並べて違いが分かる　5. 構図が通常の顔と同じ　6. 暗い色の輪郭・浮いた点がない。霞は 7. [必須] 覆面が口を覆ったまま。

指示の要点: 怒「Change only the facial expression to ANGRY: … eyebrows sharply angled down toward the center in a frown, narrowed fierce glaring eyes, mouth a tight grimace showing clenched teeth. Keep the …, composition and colors exactly the same.」、悲「… SAD: eyebrows raised at the inner ends and slanting down outward, eyes looking down (with a tear), mouth corners turned down …」（服や髪の特徴を「Keep」で人ごとに書く）。

| ID | 採用したもの | 回数 |
| --- | --- | --- |
| hero_f_angry・hero_f_sad・gendo_angry・gendo_sad・orin_angry・orin_sad・kasumi_sad | 1 回目の edit_image をそのまま採用（14780ce0・85cff100・8b41db9c・461834e7・cea795be・7eae7395・7e56e1d8） | 1 |
| hero_m_angry | 1 回目（3292b784）・2 回目（6fb26e8b「two thick black eyebrows forming a sharp V shape …」）とも、笠の影の黒に眉が溶けて見えず、2 回目は口が白い四角になった。3 回目は Pillow で通常の顔の目頭を眉で隠し歯を描いたが、眉はまだ見えなかった。4 回目は Pillow で目の段（23・24 行目）を肌に塗り直し、目を 1 段下げて、その上に外が高く内が低い眉と、食いしばった歯を描いて採用 | 4 |
| hero_m_sad | 1 回目（9e9e142d）は口が丸く開いて驚いた顔、2 回目（0fa5c41c）は伏し目だけで眉が見えなかった。3 回目は Pillow で伏し目・涙・への字口を描いたが眉がなかった。4 回目は怒りと同じく目の段を塗り直し、内が高く外が低い眉、閉じた伏し目、涙、への字口を描いて採用 | 4 |
| kasumi_angry | 1 回目（35ce9a05）・2 回目（9f5a5b46）とも通常の顔とほとんど違わなかった（覆面で口がなく、眉の変化が小さい）。3 回目は Pillow で眉を V 字に描き直したが目つきが通常のままだった。4 回目は目頭の白目を消して目を細くして採用 | 4 |

- 笠を深くかぶった主人公（男）は、笠の影で目の上が黒いので、AI の編集では眉が描かれない。目の段を下げて肌の上に眉を描くと読める。
- 覆面の霞は口で表情を出せないので、眉の傾きと目の細さだけで描き分ける。ほかの人より控えめな違いになる。

## タイル（`tiles/`）

`create_tiles_pro`（tile_type `square_topdown`、tile_view `top-down`、tile_size 16、outline_mode `segmentation`）で、1 回に番号付きで複数のタイルを作り、種類ごとに 1 枚を選んで `tiles/<種類>.png` に置く（種類は `src/data/maps.ts` の `TILE_KINDS`）。
ダウンロードは `https://api.pixellab.ai/mcp/tiles-pro/<ID>/download`（ZIP）。
ZIP の番号はファイル名の末尾の通し番号（0 から 15 の 16 枚）で、プロンプトの項目番号とは一致しない（1 項目から複数枚できたり、項目の順と前後したりする）。下の表の番号のほかは使っていない。

| ID | プロンプト | 使ったタイル（ZIP の番号 → 種類） |
| --- | --- | --- |
| b174b9da-2d40-4e52-900c-50ea310dfb21 | Edo period Japanese town, top-down RPG map tiles, muted ukiyo-e palette (indigo, vermilion, ink black, off-white). 1). packed brown earth ground 2). green grass with small tufts 3). light sandy dirt road 4). round dark green pine tree canopy seen from above 5). blue water with small ripples 6). white plaster wall of a Japanese house with dark wooden beam at bottom 7). dark grey Japanese kawara roof tiles in horizontal rows 8). dark wooden sliding door of a Japanese house 9). wooden plank floor 10). grey boulder rock on grass 11). open plain grass field for world map 12). tiny Japanese town icon with roof on a road for world map 13). wooden checkpoint barrier gate (sekisho) on a road | 1 → ground、3 → grass、4 → road、7 → water、8 → wall、9 → roof、10 → door、11 → floor、12 → rock、14 → town、15 → gate |
| 653bfbb0-b997-426e-ab19-98a4ffee2b45 | Edo period Japan top-down RPG map tiles, muted ukiyo-e palette. 1). a single dense dark green pine tree seen from above with dark outline and a visible brown trunk at the bottom, on dark ground, clearly an obstacle 2). light yellow-green open meadow with tiny pale flowers, brighter than lawn grass 3). dense dark green pine tree canopy from above, round clump with black outline 4). pale khaki dry grassland for a world map | 0 → tree、5 → plain（最初の組の木と野原は草と見分けにくかったため作り直した） |

### 地域ごとのタイル（`tiles/<タイルセット>/`）

テストプレイで「町もダンジョンも同じ見た目」と指摘されたため、マップの `tileset`（`src/data/maps.ts` の `TILESETS`）で、一部の種類だけを地域の画像に差し替える。
`create_tiles_pro` の style mode（共通の `tiles/ground.png`・`roof.png`・`wall.png` を `style_images` に、style_options は輪郭・細部・陰影を写し、配色は写さない）で 16 × 16 を作った。どの組も 1 回目で採用（計 3 回）。
並べたときの継ぎ目と、同じマップの通れるタイルと通れないタイルの見分けを、3 × 3 に並べた見本とゲーム画面で確かめた。

| ID | プロンプト（共通の頭: Edo period Japan top-down RPG map tiles, muted ukiyo-e palette, seamless 16x16.） | 使ったタイル（ZIP の番号 → タイルセット/種類） |
| --- | --- | --- |
| 19748264-c606-43e1-a041-9d37a6593518 | 1). snow covered ground … 2). snow covered lawn … 3). trodden snowy road … 4). snow covered dark green pine tree … 5). snow covered dark grey kawara roof tiles … 6). grey boulder rock with white snow on top … 7). wooden ship deck … 8). ship hull rail … 9). straw rice bales (tawara) stacked as ship cargo … 10). tatami mat floor … 11). shoji paper sliding wall … | 0 → snow/ground、1 → snow/grass、2 → snow/road、3 → snow/tree、4 → snow/roof、5 → snow/rock、6 → ship/floor、7 → ship/wall、8 → ship/roof、9 → interior/floor、10 → interior/wall |
| ef84a959-510b-4d63-9ecd-9cc487ffe7ae | 1). dark cave rock wall … 2). cave floor … 3). dark underground pool water … 4). riveted dark iron plate wall with brass pipes … 5). iron grate floor plates … 6). brass cogwheel machinery block … 7). castle stone wall (ishigaki) … 8). polished dark wooden castle floor boards … 9). crumbled ruined grey stone wall … 10). cracked old stone flagstone floor … 11). dark wooden storehouse wall … 12). earthen storehouse floor (doma) … | 0 → cave/rock、1 → cave/ground、2 → cave/water（cave の 3 枚は、のちに下の「洞窟」の節で部品に替えた。ground はその岩の組の lower に差し替え、rock・water は描画に使われていない）、3 → karakuri/wall、4 → karakuri/floor、5 → karakuri/roof、6 → castle/wall、7 → castle/floor、8 → ruins/wall、9 → ruins/floor、10 → kura/wall、11 → kura/floor |
| 2c3efbe8-233c-4b0e-bdaf-5797fcf2e773 | Edo period Japan great fire, top-down RPG map tiles, muted ukiyo-e palette, seamless 16x16. 1). dark grey kawara roof tiles in horizontal rows with bright orange and red flames burning on top, clearly an obstacle 2). charred blackened wooden plank fence wall with glowing orange embers in the cracks 3). burnt ground of grey ash and black soot with a few tiny orange embers, flat and walkable 4). heap of collapsed burnt black wooden beams with small flames, clearly an obstacle（第 8 章の神田の大火。共通の ground・roof・wall を style の参照に、配色は写さない。1 回目で採用） | 2 → fire/roof、6 → fire/wall、9 → fire/ground、14 → fire/rock |
| e629b2a6-3193-42cc-8a93-b99d84a2bda4 | Japanese temple ruins top-down RPG map tiles, muted ukiyo-e palette, seamless 16x16. 1). pile of fallen rubble: broken grey stone blocks and shards of old dark roof tiles heaped on grass, clearly an obstacle 2). collapsed burnt wooden beams … 3). large cracked grey stone block … 4). heap of broken grey foundation stones …（ruins/wall・ruins/floor を style の参照に、配色も写す。レビューで、南蛮寺跡の大半を占める岩が共通の見た目のままと指摘されたため足した） | 0 → ruins/rock |

#### 町ごとの建物（屋根・壁・戸）

町の建物が共通の白壁と灰の瓦のままだったため、7 組（港町 minato・武家町 bushi・商人町 shoka・京 miyako・山里 sato・南蛮 nanban・江戸の長屋 nagaya）で屋根・壁・戸を差し替えた。
共通の `roof.png`・`wall.png`・`door.png` を `style_images` に（style_options は輪郭・細部・陰影を写し、配色は写さない）。1 回の呼び出しで 16 枚の候補が出るので、種類ごとに最もよいものを選んだ。
判定の観点: 16 × 16 で全面が埋まる、説明の特徴が見える、共通の屋根・壁・戸とも同じ組のほかの種類とも見分けられる、横（屋根は縦も）に並べて継ぎ目が目立たない、落ち着いた配色と濃い輪郭、戸は入口に見える。建物の形に組んだ見本と、14 の町のゲーム画面で確かめた。

| ID | プロンプト（共通の頭: Edo period Japan top-down RPG map tiles, muted ukiyo-e palette, seamless 16x16, dark outlines.） | 使ったタイル（ZIP の番号 → タイルセット/種類） |
| --- | --- | --- |
| f3427a07-a8cc-43f5-90a8-c6c0769c2251 | 1). dark charcoal grey kawara roof tiles in neat horizontal rows … samurai residence roof 2). white plaster wall with a lower band of grey square tiles crossed by white diagonal lattice lines (namako-kabe) 3). heavy dark brown wooden gate door with black iron studs 4). glossy black kawara roof tiles … merchant house roof 5). dark brown wooden vertical lattice (koshi) storefront wall 6). shop entrance with a dark indigo noren curtain … 7). dark slate grey kawara roof tiles in small rounded rows, Kyoto townhouse roof 8). reddish bengara painted fine wooden vertical lattice wall … 9). doorway with a white noren curtain with a small round crest … 10). thick golden-brown thatched straw roof (kayabuki) … 11). earthen clay wall, ochre-brown mud plaster … 12). rough weathered wooden plank door of a farmhouse with a straw mat hanging | 12 → bushi/roof、1 → bushi/wall、3 → shoka/roof、4 → shoka/wall、5 → shoka/door、6 → miyako/roof、7 → miyako/wall、8 → miyako/door、9 → sato/roof、10 → sato/wall、11 → sato/door |
| 15dfce59-9211-4f46-a0db-79e6904235fe | 1). grey weathered wooden plank roof weighed down with rows of round grey stones, fishing village roof 2). silver-grey salt-bleached vertical wooden plank wall of a fisherman's hut with a hanging brown rope fishing net 3). wooden sliding door of a fisherman's hut with a blue-and-white striped noren curtain 4). orange-red terracotta roof tiles in rows, western Dutch trading house roof 5). white plaster wall with a green wooden window shutter …（不採用） 6). arched dark green wooden western style door with a small brass knob … 7). light brown wooden board shingle roof (itabuki) … 8). dark brown wooden plank wall of an Edo tenement row house (nagaya) with a small barred window 9). white paper shoji sliding door … | 1 → minato/wall、2 → minato/door、3 → nanban/roof、5 → nanban/door、6 → nagaya/roof、7 → nagaya/wall、8 → nagaya/door |
| 19cac181-18a0-4a46-b293-a4e0fc020eb6 | 1)–2). samurai residence gate door: dark brown wooden double door with rows of big round black iron studs clearly visible … 3)–4). fishing village roof seen from above: grey weathered wooden planks with several big round light grey stones sitting on top …（1 回目の武家の戸は鋲が見えず、港町の屋根は重しの石がはっきりしなかったため作り直した。共通の roof・door を参照に） | 3 → bushi/door、8 → minato/roof |
| 4ba31f67-73b4-4f29-a0d1-70eaa07c4fc3 | Nagasaki Dejima Dutch trading post, top-down RPG map tiles, muted palette, seamless 16x16, dark outlines. 1). plain white plaster wall with a low band of red bricks along the bottom and a thin dark wooden beam on top, no windows, usable as a long boundary wall 2). white stucco wall with red brick base course … 3). whitewashed western wall … no window（1 回目の窓のある白壁は、出島を囲む塀に使うと窓が延々と並んで不自然だったため作り直した。共通の wall を参照に） | 3 → nanban/wall |

#### 街道（ワールドマップ）と港の海

ワールドマップが共通の黄緑の野・岩・水のままで、海と町の川、山と岩の見分けがつかなかったため、`field`（水・野原・岩・木・道・町・関所）を作り、港町の水（minato・nanban・ship の water）を港の海にした。
共通の `water.png`・`tree.png` を `style_images` に（style_options は輪郭・細部・陰影を写し、配色は写さない）。
判定の観点: 16 × 16 で全面が埋まる、並べて継ぎ目が目立たない、海・港の水・野・山・森・街道が互いに見分けられる、山が岩の塊でなく峰に見える、町と関所の印が 16px で読める。ワールドマップ全体の描き出しと、ゲーム画面（ワールドマップ・清水湊・出島）で確かめた。

| ID | プロンプト（共通の頭: Edo period Japan world map, top-down RPG overworld tiles, muted ukiyo-e palette, seamless 16x16, dark outlines.） | 使ったタイル（ZIP の番号 → タイルセット/種類） |
| --- | --- | --- |
| 340fba81-a3c9-45e3-bfc2-4452542290f9 | 1). deep indigo blue open sea with small white curling wave crests … 2). calm muted green grassland meadow, very little detail … 3). small mountain seen from above: a pointed brown and grey-green peak with dark ridge lines and a tiny white snow tip … 4). dense forest: several round dark green pine tree crowns packed together … 5). plain packed light brown dirt highway surface … same in every direction … 6). tiny Japanese castle town icon …（不採用） 7). tiny wooden checkpoint barrier gate (sekisho) … 8). harbour water: medium blue water with gentle short white ripples, calmer than the open sea … | 0 → field/water、3 → field/plain、4 → field/rock、6 → field/tree、9 → field/road、13 → field/gate、15 → minato/water・nanban/water・ship/water |
| e657a957-345a-4032-9db6-42f7159c07da | （頭は overworld map icons … on light brown dirt ground）1). castle town icon: a small white Japanese castle keep (tenshu) in the center with two dark grey roof tiers, clear white walls, bold black outline 2)–4). 天守・家並みの別案（1 回目の町の印は黒っぽい塊で町と読めなかったため作り直した。field/road と共通の town を参照に） | 2 → field/town |

### 部品で描くタイル（`tiles/<タイルセット>/<種類>_dual.png`・`_edge.png`）

1 種類 1 枚の画像を敷き詰めるのをやめ、境目や端の部品を組み合わせて描く（仕組みは `src/data/mapParts.ts`、作り方は [`map-composition` スキル](../../.claude/skills/map-composition/SKILL.md)）。
最初に商人の町（shoka: 名古屋・浜松・大坂）で作った。部品を作ったときはマップの文字（rows）を変えず、後で通れるマス（地面・草・道）だけを塗り直して配置を整えた（家の前と間を地面に、裏庭の草を互い違いのかたまりにした。浜松は南の河原に草地を足して街道を 2 マス延ばし、大坂は船場の空き地と道頓堀の南の草地の一部を地面にした。通れるかの形は変えていない）。

地形の境目（dual）: `create_topdown_tileset`（mode `pro`、tile_size 16、transition_size 0、view high top-down）。`scripts/mapkit/wang_sheet.py <ID> <出力>` で 4 × 4 のシートに並べ、下の地形を透明にした。4 組とも 1 回目で採用。

| 種類 | タイルセット ID | lower / upper（プロンプト） | 設定 |
| --- | --- | --- | --- |
| shoka/grass_dual | b6cd5453-8da9-4e5b-990e-c7b923285f34 | packed brown earth ground of a Japanese town, warm brown dirt with a few small dark pebbles / muted green grass lawn with small darker tufts, Edo period Japanese town | boundary_amplitude 0.2、raggedness 0.6 |
| shoka/road_dual | ae9ba13c-08ed-4119-a937-05de46ebbee0 | （lower 同上）/ light sandy beige main street road of an Edo period town, smooth packed sand with tiny pebbles, slightly raised with a thin darker border | roundness 0.4 |
| shoka/water_dual | 8bafbe8b-7fc3-48d0-9d28-2fdd2752ce09 | （lower 同上）/ deep indigo blue canal water with small white ripples, edged by a grey stone block embankment wall along the shore | roundness 0.2 |
| shoka/tree_dual | 98061687-6852-4eff-9798-f09e969d38d7 | muted green grass lawn with small darker tufts, Edo period Japanese town / dense forest of dark green Japanese pine and cedar trees seen from above, overlapping round tree crowns, dark outline and shadow at the edge | boundary_amplitude 0.15 |
| shoka/rock_dual | yama/rock_dual の複製（下の「野山」を参照） | 城の石垣・庭石。全 40 マップの通しの確認で 1 枚の画像のままと分かり、bushi と同じく yama の部品を複製した（下に草を敷き、草の joins に岩を入れる） | （同左） |

構造物（edge）: `create_image_pro`（64 × 48、透過、16 候補）で町家を 1 軒まるごと描き、`scripts/mapkit/slice_parts.py` で屋根・壁を 9 分割して 16 枚に組んだ。戸は同じ絵の戸口を 16 × 16 で切り出し、`shoka/door.png` を差し替えた。
これで `shoka/roof.png`・`shoka/wall.png` はマップの描画に使われなくなった（`TILESETS` の shoka に残っているので読み込みは続く。部品を外して元の見た目に戻すときのために残している）。

| 部品 | ジョブ ID と候補 | 切り方 |
| --- | --- | --- |
| shoka/roof_edge | 0010e2ed-7ddd-4fdd-a5ce-baae41650ef6 の候補 7 | `--cols 0,24,48 --rows 0,4,8`（屋根は y = 0〜23。中の列 x = 24 が横に並べて継ぎ目が出なかった） |
| shoka/wall_edge | 同じジョブの候補 13 | `--cols 0,40,48 --rows 26,26,26`（漆喰と格子窓が交互に並ぶ。候補 7 の壁は窓ばかりが続いて電車のように見えたため不採用） |
| shoka/door | 同じジョブの候補 13 | (16, 26) から 16 × 16（藍の暖簾の戸口） |

プロンプト（家）: JRPG town map tile art, 16-bit SNES style, front view seen from above at a 3/4 angle: an Edo period Japanese townhouse that fills the whole canvas edge to edge. Top two thirds: dark charcoal grey kawara roof tiles in neat horizontal rows, a darker roof ridge along the top edge, a straight eave line with a dark shadow at the bottom of the roof. Bottom third: white plaster front wall with dark brown wooden pillars at both ends and a dark wooden lattice window in the middle, dark base board. Straight horizontal rows, symmetric, no ground, no sky, no background, muted ukiyo-e palette, 1px dark outline.

試して使わなかったもの: `create_topdown_tileset` の standard モード（森が網目の模様になった。420c5c42… の pro は雪の森として良い出来だったが、まだ使っていない: 420c5c42-488d-4a8c-a742-20862b409683）、`create_building_kit`（square_topdown でも 24 × 30 の斜めの壁の部品になり、正面向きの家に組めない: 762b0c9e-c68e-4c06-8a1f-dae4b0f712da）。

#### 港町（minato: 清水湊・広島）

草・道・森は shoka の `grass_dual`・`road_dual`・`tree_dual` をそのまま複製した（地面と草はどちらも共通の画像なので、境目がそろう）。マップの文字は、見た目のために次だけを変えた（通れるかどうかは変えていない。変更の前後で全マスの blocked が同じことを確かめた）: 家の前や道沿いの草を地面にして、地面・道・草を入り組ませた、岩（共通の画像は草の四角に見える）を同じく通れない木にした。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| minato/water_dual | 01b29fc4-0a58-4339-90ae-c68abafdf85e（lower_base_tile_id ce6725c7…＝shoka と同じ地面、roundness 0）。upper: open calm medium blue harbour sea water with small white ripples, bordered by a grey stone block embankment drawn equally on all four sides: the top edge, bottom edge, left edge and right edge each have the same 2 pixel wide row of grey stone blocks | 5 回目で採用。4 回目のこの組は水の中に石の切れ端が出たので、陸の四分の一から 4 px 以上離れたピクセルを全面が水のタイル（マスク 15）の同じ位置で置き換えた。縁のそばの小さな石の出っ張りは残っている |
| minato/roof_edge | 8cc416ba-ad30-4f65-8cf3-2ad9126f6258 の候補 0 | `--cols 3,30,45 --rows 2,9,10`（屋根は y = 2〜25。中の列 x = 24 は重し石が半分に切れたので 30 にした） |
| minato/wall_edge | 同じ候補 0 | `--cols 6,42,43 --rows 27,27,27`（中の列 x = 10 は暖簾の青が端に入ったので 42 にした） |
| minato/door | 同じ候補 0 | (24, 27) から 16 × 16（青と白の縞の暖簾） |

プロンプト（家）: JRPG town map tile art, 16-bit SNES style, front view seen from above at a 3/4 angle: an Edo period Japanese fisherman's house of a harbour town that fills the whole canvas edge to edge. Top two thirds: grey weathered wooden plank roof in neat horizontal rows with several round light grey stones sitting on top as weights, a darker roof ridge along the top edge, a straight eave line with a dark shadow at the bottom of the roof. Bottom third: silver-grey salt-bleached vertical wooden plank front wall with dark brown wooden pillars at both ends, a doorway with a blue-and-white striped noren curtain, dark base board. Straight horizontal rows, symmetric, no ground, no sky, no background, muted ukiyo-e palette, 1px dark outline.

使わなかった水: 362f217d-ca11-49ca-99cd-4bee8427e0be（上の岸に石垣がなく点だけが残った）、ffa70b2a-edfc-4c9c-b51d-bf32824618da（水の中に石の格子が入った）、9e8ed195-c426-4301-ad36-648140fbab67（下の岸の石垣はよいが、上の岸が点だけ）。
`minato/roof.png`・`wall.png`・`water.png` は描画に使われなくなった（shoka と同じく、`TILESETS` に残して読み込みは続ける）。

#### 野山（yama: 清水湊・裏山、原城跡）

タイルセットのなかった 2 つのマップのために新しく作った。1 枚の画像は差し替えず（`TILESETS` の yama は空）、草・森は shoka の `grass_dual`・`tree_dual` をそのまま複製し、岩と水を新しく作った。
岩・水の下と縁には草を敷く（`grass` の `joins` に森・岩・水を入れ、岩・水の `under` を草にした）。山の中では岩や沢が草に接し、原城跡でも石垣の列と海が草に接するため。マップの文字は変えていない。
裏山の沢を渡る道（`==`）は共通の道の画像 1 枚のまま（2 マスだけで、両側は草と水の縁で区切られる）。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| yama/rock_dual | f3ddb73f-1eb3-49f4-b52e-8ca2ffce20b5（lower_base_tile_id 4d504dfb…＝shoka の森と同じ草、roundness 0.8、boundary_amplitude 0.15、raggedness 0.4）。upper: rocky mountain outcrop of large rough grey granite boulders seen from above, lit light grey tops with darker grey cracks, dark outline and a dark shadow at the edge | 1 回目で採用。1 マスの岩も岩の山に、原城跡の 1 マス幅の `^` の列は崩れた石垣に見える |
| yama/water_dual | 9626abf6-e2ab-40da-a935-cb2efcbc5e9b（lower_base_tile_id 同上、roundness 0.6、boundary_amplitude 0.12）。upper: clear deep indigo blue mountain stream water with small white ripples, the whole water surface is open water, bordered on all four sides by a natural shore of small rounded grey river stones with a dark outline | 1 回目で採用。4 方向とも同じ川石の岸。原城跡の海にも使う（波の点が格子に並ぶのは、広い水面の柄違いがまだないため） |

#### 洞窟（cave: 狐火の洞、清正の古井戸の底）

岩壁と地の下の水を境目の部品（dual）にし、床（`cave/ground.png`）を岩の組の lower のタイル（マスク 0）に差し替えた（境目の透明な所と床の色がぴったり合うように。もとの床は菱形の柄が格子に並んで目立っていた）。水の組は `lower_base_tile_id` で同じ床をつないだ。
清正の古井戸の底で地の下の川を渡る道（`=`）は、板の橋の端の部品（edge）にした。床を仲間（`joins: ['ground']`）とみなすので、欄干は川と岩壁に接する辺にだけ出て、床の側へはそのまま続く。マップの文字は変えていない。
`cave/rock.png`・`water.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| cave/rock_dual | 50d69d01-e0e3-4e10-b499-3690b1d7e160（lower_base_tile_id f1d4385c-0e2b-4afd-ad72-086055b4f617、roundness 0.7、boundary_amplitude 0.15、raggedness 0.4）。lower: dark brown packed earth floor of an underground cave, smooth and even with a few tiny dark pebbles, subtle texture, no pattern / upper: solid dark grey cave bedrock seen from above, a uniform rough stone surface of many small irregular stones and fine dark cracks, even texture with no large boulders and no repeating shapes, the edge where it meets the floor has a black outline and a dark shadow | 2 回目で採用。1 回目（e0abcc87-bdac-4269-aecf-67fb2671fd8f、upper: irregular large boulders…）は中の大きな岩が 16 px ごとに同じ形で格子に並んだので、細かく均一な岩肌にした |
| cave/ground | 同じ組の lower（f1d4385c…、マスク 0 のタイル） | 岩・水の組と同じ床 |
| cave/water_dual | 6c158e62-0dc3-42e3-9c08-73112278669e（lower_base_tile_id f1d4385c…、roundness 0.6、boundary_amplitude 0.12）。upper: still dark teal blue underground spring water with faint pale ripples, the whole water surface is open water, bordered on all four sides by a shore of small rounded grey cave stones with a dark outline | 1 回目で採用 |
| cave/road_edge | `create_image_pro`（48 × 48、透過、25 候補）049aa254-ffb4-4688-acfc-c7325b8dbdcc の候補 20 | 1 回目で採用。絵の橋は y = 10〜38 で 16 px の段にそろわないので、上の欄干（y = 10〜17）・板（y = 18〜31 に、縦に同じ柄の y = 22〜23 を足して 16 行）・下の欄干と柱（y = 32〜39）を縦につないだ 48 × 32 の絵にし、柱の間の透明を暗い影（#18161a）で埋めてから `--cols 3,16,29 --rows 0,8,16` で切った |

プロンプト（橋）: JRPG map tile art, 16-bit SNES style, seen from directly above: a straight Edo period Japanese wooden plank footbridge that fills the whole square canvas edge to edge, the bridge runs left to right, weathered brown wooden boards laid side by side running from top to bottom, a dark brown wooden handrail beam along the entire top edge and along the entire bottom edge, symmetric, no water, no ground, no background, muted ukiyo-e palette, 1px dark outline.

#### 武家の城下（bushi: 駿府城下、与力・黒田の屋敷、仙台城下、近江・彦根、肥後・熊本）

草・道・水・森は shoka の `grass_dual`・`road_dual`・`water_dual`・`tree_dual` を、岩は yama の `rock_dual` をそのまま複製した（地面・草・水はどれも共通の画像なので、境目がそろう。yama の岩の組の lower は shoka の森と同じ草）。
水は石の護岸の堀に、岩（`^`）は城や屋敷を囲む石垣と庭石に見える。岩の下には草を敷き（`under: 'grass'`）、草の `joins` に岩を入れて、石垣の縁を草でつなぐ。マップの文字は変えていない。
屋根・壁・戸は、武家屋敷 1 軒の絵（`create_image_pro`、64 × 48、透過、16 候補、各 10 generations）から切り出した。壁はなまこ壁で窓がなく、与力の屋敷の外周の塀にもそのまま使える。
`bushi/roof.png`・`wall.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。`bushi/door.png` は同じ絵の戸口に差し替えた。

| 部品 | ジョブ ID と候補 | 切り方 |
| --- | --- | --- |
| bushi/roof_edge | 72cea87b-9206-4af6-9bc4-cd93ddee1c0b の候補 12 | `--cols 0,24,48 --rows 0,4,7`（屋根は y = 0〜23。下の行を 8 にすると軒先の下に壁の白が 1 px 入った） |
| bushi/wall_edge | 同じ候補 12 | `--cols 21,30,48 --rows 31,31,31`（戸を左に寄せた絵なので、左端は戸の右の柱 x = 21 から、中は右半分の無地のなまこ壁 x = 30 から切った。右端は絵の右端の柱） |
| bushi/door | 同じ候補 12 | (8, 31) から 16 × 16（鋲を打った焦げ茶の板戸） |

プロンプト（家、5 回目）: JRPG town map tile art, 16-bit SNES style, front view seen from above at a 3/4 angle: a long Edo period Japanese samurai residence (buke yashiki), same style as the reference, filling the whole 64x48 canvas edge to edge, fully opaque, no transparent margins on the left or right. Top 20 pixels: dark slate grey kawara roof tiles in clearly visible straight horizontal rows with lighter grey highlights, a ridge line with tile ends along the very top edge, a straight eave with a dark shadow at the bottom of the roof. Bottom 28 pixels: a long front wall running the full canvas width: white plaster upper part and a lower band of grey square tiles crossed by white diagonal lattice lines (namako-kabe), a dark brown wooden pillar at the far left edge and at the far right edge. Only one small narrow dark brown wooden door with black iron studs, 14 pixels wide, placed near the left side; the whole right half of the wall is a long plain uninterrupted stretch of white plaster and namako tiles with nothing on it. Straight horizontal rows, no ground, no sky, no background, no windows, no signs, no lanterns, no plants, muted ukiyo-e palette, 1px dark outline.（参照画像: 3 回目の候補 10）

5 回の上限で 5 回目を採用した。残った ×: 左右対称でない（戸を左に寄せたため。切り出しには影響しない）。作り直しの理由:
1 回目（22fd3457-59f2-4bcf-9ad9-9a09f95374f6、heavy gate door を指定）は長屋門の絵になり、屋根が上の 4 割しかなく壁の両端に柱がなかった。2 回目（4aaac744-511e-456c-ae6d-e9c707114644、1 回目の候補 14 を参照）は屋根が黒くつぶれて棟と瓦の段が読めず、なまこ壁の白が透明に抜けた候補が多かった。3 回目（0355fd22-5b08-4555-876a-f9ebc0666953、棟・瓦の段・明るい灰を指定）は候補 10 の屋根と壁がよかったが、壁の左右 3 px が透明で、戸の両脇の壁が 14 px しかなく中の部品（16 px）が取れなかった。4 回目（3d91886a-01b9-4344-b0e3-c0b5bdd490b0、3 回目の候補 10 を参照）も同じだったので、5 回目は戸を左に寄せて右半分を無地の壁にした（白い漆喰が透明に抜けなかったのは候補 12 だけ）。

#### 京の町家（miyako: 京）

草・道・水・森は shoka の `grass_dual`・`road_dual`・`water_dual`・`tree_dual` を、岩は yama の `rock_dual` をそのまま複製した（bushi と同じ組み合わせ。地面・草・水はどれも共通の画像なので、境目がそろう）。
鴨川は石の護岸の川に、岩（`^`）は北の山の岩と寺の庭石に見える。岩の下には草を敷き（`under: 'grass'`）、草の `joins` に岩を入れた。
屋根・壁・戸は、京町家 1 軒の絵（`create_image_pro`、64 × 48、透過、16 候補、10 generations）から切り出した。1 回目で採用（bushi で分かった「戸を左に寄せて右半分を無地の壁にする」書き方を最初から使った）。
`miyako/roof.png`・`wall.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。`miyako/door.png` は同じ絵の戸口に差し替えた。

マップの文字は、通れるマス（草 `,` → 地面 `.`）だけを塗り直した（194 マス。全マスの blocked が変わらないことを確かめた）: 壁・戸の真下の草（家の前）を地面にし、その次の行の草は、家ごとに右・左・中に寄せた 1 つのかたまり（区間の 6 割、3 マス以上）を残して地面にした。寺の五重塔（`RRR`／`RWR`）はそのまま。

| 部品 | ジョブ ID と候補 | 切り方 |
| --- | --- | --- |
| miyako/roof_edge | f61358f4-a791-4db3-98db-c0183472a8c4 の候補 0 | `--cols 0,24,48 --rows 0,4,5`（屋根は y = 0〜20。下の行を 6 にすると軒先の下に壁の赤が 1 px 入った） |
| miyako/wall_edge | 同じ候補 0 | `--cols 0,32,48 --rows 21,27,31`（壁は y = 21〜46 の 1 段。1 段の壁は上の四分の一を y = 21〜28（鴨居）、下の四分の一を y = 39〜46（土台）から取る。中の列は戸の右の無地の紅殻格子 x = 32 から） |
| miyako/door | 同じ候補 0 | x = 10〜25 の縦を y = 21〜22（鴨居）・25〜36（白い暖簾）・44〜45（土台）でつないだ 16 × 16 |

プロンプト（家）: JRPG town map tile art, 16-bit SNES style, front view seen from above at a 3/4 angle: a long Kyoto machiya townhouse of the Edo period, filling the whole 64x48 canvas edge to edge, fully opaque, no transparent margins on the left or right. Top 22 pixels: dark slate grey rounded kawara roof tiles in clearly visible straight horizontal rows with lighter grey highlights, a ridge line along the very top edge, a straight eave with a dark shadow at the bottom of the roof. Bottom 26 pixels: a long front wall running the full canvas width made of reddish-brown bengara painted fine vertical wooden lattice (bengara-goshi), a dark brown wooden pillar at the far left edge and at the far right edge, dark base board. Only one doorway, 14 pixels wide, near the left side, with a white noren curtain hanging in it; the whole right half of the wall is a long plain uninterrupted stretch of fine red-brown lattice with nothing on it. Straight horizontal rows, no ground, no sky, no background, no signs, no lanterns, no plants, muted ukiyo-e palette, 1px dark outline.

#### 山里（sato: 伊賀上野、伊賀者の里、鍵屋の辻）

草・道・水・森は shoka の `grass_dual`・`road_dual`・`water_dual`・`tree_dual` を、岩は yama の `rock_dual` をそのまま複製した（bushi・miyako と同じ組み合わせ）。
岩（`^`）は伊賀上野では屋敷を囲む石垣、伊賀者の里では修練場の岩に見える。岩の下には草を敷き（`under: 'grass'`）、草の `joins` に岩を入れた（修練場の土の上の岩は、草の縁のついた岩になる）。
屋根・壁・戸は、茅葺きの農家 1 軒の絵（`create_image_pro`、64 × 48、16 候補、10 generations × 3 回）から切り出した。壁は鍵屋の辻の縦の板塀（壁 1 列）にも使う。伊賀者の里の道場の床（`_`）は共通の 1 枚の画像のまま。
`sato/roof.png`・`wall.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。`sato/door.png` は同じ絵の戸口に差し替えた。

3 回目で採用。作り直しの理由: 1 回目（b2adb85c-c609-4d36-9ef8-5e12f6f43554）はどの候補も斜めから見た家で、左に側面の壁と透明な余白が出て、壁の左端に柱がなかった。2 回目（6992a124-914f-4dfd-9553-48ab0948ddd1、1 回目の候補 2 を参照し、正面の立面図と書いた）は正面になったが、黄土色の土壁が背景として透明に抜けた（bushi の白い漆喰と同じ）。3 回目（f2b193d2-3a38-4d44-89dd-79b878a3da55、2 回目の候補 0 を参照）は `no_background: false` にして全面を不透明にした。

マップの文字は、通れるマス（草 `,` → 地面 `.`）だけを塗り直した（123 マス。全マスの blocked が変わらないことを確かめた）: 屋根の下の壁・戸の真下の草（家の前）を、左右に 1 マスはみ出して地面にし、戸の下の草は 4 マス以内で道か地面に届くときだけ地面の小道にした。

| 部品 | ジョブ ID と候補 | 切り方 |
| --- | --- | --- |
| sato/roof_edge | f2b193d2-3a38-4d44-89dd-79b878a3da55 の候補 3 | `--cols 0,24,48 --rows 0,8,11`（屋根は y = 0〜25、棟は y = 0〜6。下の行を 11 にして y = 26 の軒の影まで入れる） |
| sato/wall_edge | 同じ候補 3 | `--cols 0,32,48 --rows 26,28,32`（壁は y = 26〜47 の 1 段。中の行を 29 にすると y = 29 の影の線が板塀の途中に繰り返し出た。中の列は戸の右の無地の土壁 x = 32 から） |
| sato/door | 同じ候補 3 | x = 15〜30 の縦を y = 26〜27（鴨居）・32〜43（板戸）・46〜47（土台）でつないだ 16 × 16 |

プロンプト（家、3 回目）: JRPG town map tile art, 16-bit SNES style. A flat straight-on FRONT ELEVATION of a long Iga mountain village farmhouse filling the entire 64x48 canvas edge to edge with no background anywhere: no perspective, no side wall, no gable, perfectly rectangular silhouette, the left and right edges are straight vertical lines. Top 22 pixels: golden-brown thatched straw roof (kayabuki) in straight horizontal layered rows, a dark bound ridge with small rope knots along the very top edge, a straight trimmed eave with a dark shadow line at the bottom of the roof. Bottom 26 pixels: a solid front wall running the full canvas width, painted with textured warm ochre-brown earthen clay plaster (solid colour, clearly visible mud texture) between dark brown wooden posts, a thick dark brown wooden pillar exactly at the far left edge and exactly at the far right edge, a dark wooden base board along the bottom. One dark wooden plank door 14 pixels wide on the left side; the whole right half of the wall is a long plain uninterrupted ochre clay wall. No ground, no sky, no signs, no lanterns, no plants, muted palette, 1px dark outline.（`no_background: false`、参照画像: 2 回目の候補 0）

#### 南蛮の町（nanban: 長崎、出島）

草・道・森は shoka の `grass_dual`・`road_dual`・`tree_dual` を、岩は yama の `rock_dual` を、水は minato の `water_dual`（石の護岸で囲んだ港の海）をそのまま複製した。
岩（`^`）は長崎の東の山の斜面に、水は湊・中島川・出島を囲む海に使う。岩の下には草を敷き（`under: 'grass'`）、草の `joins` に岩を入れた。湊の船（屋根の形）と出島の囲いは石の護岸で縁取られ、船着き場に見える。
屋根・壁・戸は、赤い洋瓦と白壁・煉瓦の腰の商館 1 軒の絵（`create_image_pro`、64 × 48、16 候補、10 generations × 2 回）から切り出した。壁は出島を囲む塀（縦の列・L 字の角）と長崎の唐人屋敷の囲いにも使う。床（`_`）は共通の 1 枚の画像のまま。
`nanban/roof.png`・`wall.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。`nanban/water.png` も部品の下には使われないが、同じく残した。`nanban/door.png` は同じ絵の戸口に差し替えた。

2 回目で採用。作り直しの理由: 1 回目（aef1603a-8194-4463-acad-afb4c89a5bd2）はどの候補も扉が壁の真ん中にあり、「扉は左寄り、右半分は無地」を満たさなかった。2 回目（c98cfb31-48d6-4e91-8f89-1fb8836203f6、1 回目の候補 8 を参照）は扉の位置を座標（x = 6〜18）で書いた。sato の経験から、最初から `no_background: false` にした（白壁が透明に抜けなかった）。

マップの文字は、長崎の通れるマス（草 `,` → 地面 `.`）だけを塗り直した（17 マス。全マスの blocked が変わらないことを確かめた）: 家と家の間の 1 マスの草、壁・戸の真下の草、家の前の地面の左右の草を地面にした。出島は前から家の前が地面なので、地面・草は変えていない。出島の扇形の斜めの塀は、`W` が 1 マスずつ離れた階段で、辺の部品では孤立した短い柱の欠片に見えたので、段と段の間の海（`~`）を塀（`W`）にしてつないだ（14 マス。どちらも通れないので blocked は変わらない）。

| 部品 | ジョブ ID と候補 | 切り方 |
| --- | --- | --- |
| nanban/roof_edge | c98cfb31-48d6-4e91-8f89-1fb8836203f6 の候補 5 | `--cols 0,24,48 --rows 0,2,5`（屋根は y = 0〜20、棟は y = 0〜2、軒の影は y = 17〜20。中の行を 4 にすると、2 段以上の屋根の中ほどに軒の黒い帯が出た） |
| nanban/wall_edge | 同じ候補 5（x = 7 の扉の縁を x = 6 の色で塗りつぶした写し） | `--cols 0,32,48 --rows 21,23,32`（壁は y = 21〜47 の 1 段、煉瓦の腰は y = 39〜。中の行を白壁だけの 23 にして、出島の縦の塀が白と煉瓦の縞にならないようにした。中の列は扉の右の無地 x = 32 から） |
| nanban/door | 同じ候補 5 | x = 7〜22 の縦を y = 21〜34（壁の上の線・扉の上半分）・46〜47（煉瓦の土台）でつないだ 16 × 16 |

プロンプト（家、2 回目）: JRPG town map tile art, 16-bit SNES style, same house as the reference but with the door moved to the far left. A flat straight-on FRONT ELEVATION of a long Dutch-Japanese trading house in Edo-period Nagasaki, filling the entire 64x48 canvas edge to edge with no background: no perspective, no side wall, perfectly rectangular silhouette. Top 22 pixels: terracotta red western clay roof tiles in straight horizontal rows, a dark ridge line along the very top edge, a straight eave with a dark shadow line at the bottom of the roof. Bottom 26 pixels: smooth white plaster front wall running the full canvas width, a dark brown wooden pillar exactly at the far left edge and exactly at the far right edge, a red brick wainscot band along the bottom of the wall. The only door is a dark green western wooden door placed at the LEFT, from x=6 to x=18, right next to the left pillar. Everything right of the door, from x=20 to x=62, is one long plain uninterrupted stretch of white plaster over red brick with nothing on it. No ground, no sky, no signs, no lanterns, no plants, no windows, muted palette, 1px dark outline.（`no_background: false`、参照画像: 1 回目の候補 8）

#### 雪の町（snow: 加賀金沢、兼六園、会津若松）

地面（`snow/ground.png`）を 5 組で共通の lower のタイル（4ea960ee-9f77-434c-bc22-af4e3e2e8b7b、マスク 0。もとのクリーム色の雪より青白い）に差し替え、その上に草 → 道 → 水 → 岩 → 森 の順に境目の部品（dual）を重ねる。どれも雪の上の地形なので、下はすべて雪（`under: 'ground'`）で、草の `joins` には何も入れない。
ほかの町の草・道・森は緑の草と砂の道の上の絵で雪に合わないので、5 組とも新しく作った（`create_topdown_tileset` の pro、15 generations × 7 回。lower: soft white fresh snow covering the ground of an Edo period snowy town, smooth even pale white snow with faint light blue-grey shading specks, subtle texture, no pattern）。
屋根・壁・戸は、雪の積もった屋根と格子の壁の町家 1 軒の絵（`create_image_pro`、64 × 48、16 候補、10 generations × 2 回）から切り出した。壁は兼六園の外周の塀と、金沢城・長町の屋敷の囲いにも使う。床（`_`）は共通の 1 枚の画像のまま。
`snow/grass.png`・`road.png`・`tree.png`・`rock.png`・`roof.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。`snow/door.png` は同じ絵の戸口で新しく足した（`TILESETS` の snow に `door` を足した）。

| 部品 | タイルセット ID と設定 | 結果 |
| --- | --- | --- |
| snow/grass_dual | 12fa17d3-2d98-4f46-996d-e1bda54d9d37（roundness 0.8、boundary_amplitude 0.18、raggedness 0.4）。upper: patch of muted dark olive green winter grass and dry yellow-brown tufts poking through thin snow, clearly darker than the snow, with a thin darker green border and small snow lumps at the edge | 1 回目で採用 |
| snow/road_dual | a4461add-cc26-446b-907d-99a0eaa3dbbe（lower_base_tile_id 4ea960ee…、roundness 0.4）。upper: trodden snow street of an Edo period town, packed grey-brown slushy snow with faint wheel ruts and footprints, clearly darker than the fresh snow, slightly sunken with a thin darker grey border | 1 回目で採用 |
| snow/water_dual | e031ae68-7b6c-47e8-8deb-bfc4c8d317b2（lower_base_tile_id 同上、roundness 0.3、boundary_amplitude 0.08）。upper: open cold dark indigo blue river water seen from above, the interior is plain water with a few small pale ripples and no stones at all; only along the shoreline where the water meets the snow there is a narrow rim of small grey stones with a dark outline | 2 回目で採用。1 回目（73d45e18-6e3f-4d17-919d-dee854b02d6a、upper: …bordered on all four sides by a grey stone block embankment with white snow on top…）は水面の中に雪をかぶった石の帯が 1 マスごとに横縞で出たので、中は水だけ、岸だけに石と書いた |
| snow/rock_dual | 727e4e79-d8bd-4e03-8ea7-0b6860ec1526（lower_base_tile_id 同上、roundness 0.8、boundary_amplitude 0.15、raggedness 0.4）。upper: pile of large rough grey granite stones seen from above, each stone capped with white snow on top, darker grey cracks between the stones, dark outline and a dark shadow at the edge | 1 回目で採用。会津の鶴ヶ城を囲む石垣、飯盛山の岩に見える |
| snow/tree_dual | a7918126-fd9f-4baa-9cbc-4cee25a2754f（lower_base_tile_id 同上、roundness 0.8、boundary_amplitude 0.18、raggedness 0.4）。upper: dense dark green conifer woodland seen from directly above, an irregular clumpy canopy of overlapping tree crowns of varied sizes, patches of white snow resting unevenly on the dark green needles, no regular rows, no repeated identical trees, dark outline and a dark blue-grey shadow at the edge | 2 回目で採用。1 回目（dfd3aea8-2354-491e-a5ea-0466ed6fd774、upper: dense forest of dark green Japanese pine trees…）は同じ形の木が格子に並んで見えたので、不ぞろいな樹冠と書いた |
| snow/ground | 5 組で共通の lower（4ea960ee…、マスク 0 のタイル） | 境目の透明な所と雪の色がそろう |

構造物（edge）:

| 部品 | ジョブ ID と候補 | 切り方 |
| --- | --- | --- |
| snow/roof_edge | 1902abfd-5443-4e9b-a71e-38b8c40a5086 の候補 10 を加工した写し（下に記す） | `--cols 0,24,48 --rows 0,5,14` |
| snow/wall_edge | 同じ候補 10（屋根を高くした写しの、x = 3〜22 の戸を右の格子 x = 24〜43 で塗りつぶした写し） | `--cols 0,32,48 --rows 25,30,39`（屋根を高くした写しの座標。壁は y = 25〜55 の 1 段、上に梁、下に石の土台） |
| snow/door | 同じ候補 10（屋根を高くした写し） | x = 3〜18 の縦を y = 27〜34（梁と藍の暖簾）・45〜52（格子戸の下半分）でつないだ 16 × 16 |

屋根の加工: 生成した屋根は y = 1〜17 と低く、雪の中の行が 10 px しかないので、2 段以上の屋根の中ほどに軒の帯が出る。そこで、(1) 背景の灰色（#aeb0b3。屋根の上の左右の角）を透明にし、(2) 雪の行 y = 3〜10 を複製して屋根を 8 px 高くした写しを作った。さらに、そのままでは雪の屋根が雪の地面とほぼ同じ白で、棟と左右の端が見分けられなかったので、(3) 屋根の部品の元を組み直した: 上端に黒い輪郭の 1 行と、軒先の瓦の行（y = 22〜24）を写した 3 行の棟、左右の端に暗い瓦の縁（3 px）、その内側に雪の影の 1 列を描き足し、雪の中の右寄り（x = 44〜59）の汚れの点を消した（右端の列で点が縦に並んだため）。

家の判定: 1 回目（69a58456-d9b2-46ae-a5ba-39fe42417025）はどの候補も戸が真ん中で、屋根の上の左右の角に背景の灰色が残った。2 回目（候補 8 を参照、戸の位置を x = 6〜18 と書いた）で戸は左に寄ったが、灰色の角は残った（× のまま採用。角は透明にして屋根の丸い端として見せた）。

プロンプト（家、2 回目）: JRPG town map tile art, 16-bit SNES style, same house as the reference but with the door moved to the far left. A flat straight-on FRONT ELEVATION of a long Edo period Japanese townhouse in snowy Kanazawa, filling the entire 64x48 canvas edge to edge: no perspective, no side wall, perfectly rectangular silhouette, the roof reaches all four corners of the canvas with no grey or empty corners. Top 22 pixels: roof covered with a thick even layer of white snow, a straight ridge along the very top edge, a straight eave with dark grey tile ends and a dark shadow line at the bottom of the roof. Bottom 26 pixels: dark brown wooden lattice front wall running the full canvas width, a dark brown wooden pillar exactly at the far left edge and exactly at the far right edge, a dark stone foundation band along the bottom. The only door is a dark wooden sliding door with an indigo noren curtain placed at the LEFT, from x=6 to x=18, right next to the left pillar. Everything right of the door, from x=20 to x=62, is one long plain uninterrupted stretch of dark brown vertical wooden lattice wall with nothing on it. No ground, no snow on the ground, no sky, no signs, no lanterns, no plants, no windows, muted palette, 1px dark outline.（`no_background: false`、参照画像: 1 回目の候補 8）

マップの文字は、会津若松の通れるマス（草 `,` ↔ 地面 `.`）だけを塗り直した（356 マス。全マスで通れるかが変わらないことを確かめた）: 町の中（15〜30 行）の草を雪の地面にし、家並みの間の通りに互い違いの草のかたまりと、南東の屋敷の脇の草地を残した。北の屋敷の周りも地面にし、西の縁と南西に草を残した。南の外れは街道のそばを地面にした。金沢・兼六園の文字は変えていない。

#### 江戸の長屋（nagaya: 江戸）

草・道・水・森は shoka の `grass_dual`・`road_dual`・`water_dual`・`tree_dual` をそのまま複製した（地面・草・水はどれも共通の画像なので、境目がそろう）。水は北の外堀と日本橋川、長屋の脇の小さな水溜め（1 × 2 マス）に使い、どれも石の護岸で縁取られる。
屋根・壁・戸は、江戸の長屋 1 軒の絵（`create_image_pro`、64 × 48、16 候補、10 generations）から切り出した。1 回目（778225c8-450f-4a4c-a8e6-432818bc1bb6）の候補 4 で全項目 ○。ほかの町で分かった「戸を左に寄せて右半分を無地の壁にする」「`no_background: false`」を最初から使った。壁は大手門の左右の櫓（壁 2 列）にも使う。
`nagaya/roof.png`・`wall.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。`nagaya/door.png` は同じ絵の戸口に差し替えた。

マップの文字は、通れるマス（地面 `.` → 草 `,`）だけを塗り直した（189 マス。地面と草はどちらも通れるので、通れるかは変わらない）: 長屋の裏（屋根の上の行）の一部、水溜めの脇・大通りの脇の空き地、火消しの番屋の前の広場の南、南の外れに、形と大きさの違う草のかたまりを作った。家の前（壁・戸の真下の行）は地面のまま。

| 部品 | ジョブ ID と候補 | 切り方 |
| --- | --- | --- |
| nagaya/roof_edge | 778225c8-450f-4a4c-a8e6-432818bc1bb6 の候補 4 を加工した写し（屋根 y = 0〜20 の左右の端に、1 px の黒い輪郭と、内側 2 px を暗くした破風を描き足した。そのままでは端が中と同じ板の段で、左右の端に見えなかった） | `--cols 0,24,48 --rows 0,4,5`（屋根は y = 0〜20、棟は y = 0〜1、軒の影は y = 19〜20） |
| nagaya/wall_edge | 同じ候補 4（x = 3〜22 の戸を右の板壁 x = 24〜43 で塗りつぶした写し。そのままでは左端の部品に障子の白い縁が入った） | `--cols 0,32,48 --rows 21,27,32`（壁は y = 21〜47 の 1 段、下の四分の一は土台の y = 40〜47） |
| nagaya/door | 同じ候補 4 | x = 5〜20 の縦を y = 21〜22（鴨居）・26〜37（障子）・42〜43（敷居）でつないだ 16 × 16 |

プロンプト（家）: JRPG town map tile art, 16-bit SNES style. A flat straight-on FRONT ELEVATION of a long Edo period Japanese nagaya row house in the Kanda district, filling the entire 64x48 canvas edge to edge: no perspective, no side wall, perfectly rectangular silhouette, the roof reaches all four corners of the canvas. Top 22 pixels: grey-brown weathered wooden shingle board roof (itabuki) in clearly visible straight horizontal rows of thin boards with lighter highlights, a dark straight ridge line along the very top edge, a straight eave with a dark shadow line at the bottom of the roof. Bottom 26 pixels: dark brown weathered vertical wooden plank front wall running the full canvas width, a dark wooden pillar exactly at the far left edge and exactly at the far right edge, a dark base board along the bottom. The only door is a white paper shoji sliding door with a thin wooden grid placed at the LEFT, from x=6 to x=18, right next to the left pillar. Everything right of the door, from x=20 to x=62, is one long plain uninterrupted stretch of dark brown vertical wooden planks with nothing on it. No ground, no sky, no signs, no lanterns, no plants, no windows, muted ukiyo-e palette, 1px dark outline.（`no_background: false`）

#### 屋内（interior: 一座の工房・金太の凧屋）

障子の壁と畳の縦縞の床が全面に繰り返していたので、床を 3 つに分けた。地面（`.`）を土間、床（`_`）を一段高い板の間、草（`,`）を畳の間に使い、土間の上に板の間 → 畳の順に境目の部品（dual）を重ねる。畳の下には板の間を敷き（`under: 'floor'`）、板の間の `joins` に畳を入れて、畳の縁の外も板の間にした。
`interior/ground.png` は板の間の組の lower（土間、マスク 0）、`interior/floor.png` は同じ組の upper（板の間、マスク 15）に差し替えた（`TILESETS.interior` に ground を足した）。`interior/wall.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。

マップの文字は、通れるマス（床 `_` → 土間 `.`・畳 `,`）だけを塗り直した（どれも通れるので、通れるかは変わらない）: 工房は入口のまわりの広間（y = 13〜16 は x = 8〜19、y = 12 は x = 8〜13、戸口 (13, 17)）を土間、座元の間（文机のある右上、x = 21〜26、y = 1〜8）を畳。凧屋は入口の土間（y = 10〜14 は x = 9〜16、戸口 (12, 15)）、居間（左下）と奥の作業場の文机のまわりを畳にした。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| interior/floor_dual | fb8b9ae4-a797-465f-a999-34687d79dd51（transition_size 0.25、step_slope 0、roundness 0、raggedness 0、lower_base_tile_id 3d373bac-2fbe-41a9-b3a3-7e3b00bd5607）。lower: flat smooth dark grey-brown packed clay earthen floor (doma) inside a Japanese house, almost uniform colour, very subtle texture / upper: raised wooden platform floor of a Japanese house: light warm brown long straight floorboards running horizontally with thin seams, the platform rim is a solid dark brown wooden beam with a bright top highlight and a black outline, low step down to the earthen floor / transition: dark brown wooden beam side of the raised floor platform | 4 回目で採用（3 回目の組で、マスク 1・2・3・5・9・13 の土間の側に 1 px ずつはみ出した点を Pillow で消した）。1 回目（d07d6c36-9a61-46b2-8a85-cff467fe0b5b）は縁が点の並びで框に見えず、土間の側に点が散った。2 回目（3fdb7b5e-52de-4821-b25f-684fe8d52cf2）は縁が 1 px の黒い線だけで、角に板の欠片が残った。transition_size 0.25 にして、南の縁に板の間の側面が見える一段高い床になった |
| interior/grass_dual（畳） | 665ee8c0-6004-45b0-8e2c-a423399e6708（roundness 0、raggedness 0、lower_base_tile_id 34d5adb3-d0a2-4ae3-ab0b-9409385e530e = 板の間）。upper: Japanese tatami mat floor seen from directly above: pale green-yellow woven rush mats with clearly visible fine dense vertical weave stripes in alternating light and darker green-yellow, long horizontal black cloth border strips (heri) every 8 pixels between the rows of mats, sharp straight clean outer boundary with a thin dark outline | 4 回目で採用。3 回目の組の全面が畳のタイル（マスク 15）から、畳の角の 4 分の 1 だけを残して、畳の側の境に 1 px の敷居の線（#281e18）を引いた 16 枚に組み直した（3 回目は南の縁に板の茶色のかたまりが残り、角が欠けた）。1 回目（8aaf809e-bd85-40b2-b709-a682b6f41ff6）は畳縁も目もなく芝生に見えた。2 回目（7ee3c337-c103-459f-b49a-000b08e0977c）は目がほとんど見えず、南の縁に板の欠片が下がった |
| interior/wall_edge | create_image_pro 505ff0af-b69e-4121-bd3e-f79b870e1740 の候補 0 を加工した写し: 梁の天端 y = 0〜20 に y = 8〜18 を足して 32 行に、正面を y = 21〜22（鴨居）・26〜35（漆喰）・44〜47（土台）の 16 行に詰め、左の端の 16 列を右の端の 16 列の左右反転にした（障子が壁ごとの左端に並ばないように） | `--cols 0,32,48 --rows 0,8,32`。1 回目で全項目 ○ |

プロンプト（壁）: JRPG indoor map tile art, 16-bit SNES style. A straight-on piece of an interior wall of an Edo period Japanese house seen from above at a 3/4 angle, filling the entire 64x48 canvas edge to edge, perfectly rectangular, no perspective, no side faces. Top 30 pixels: the flat top of the thick wall seen from above: plain dark brown wooden beam boards running horizontally, a thin lighter highlight line along the very top edge, a thin black outline at the far left and far right edges, no pattern, no objects. Bottom 18 pixels: the front face of the wall: a dark wooden horizontal lintel at the top of the face, a dark brown wooden pillar exactly at the far left edge and exactly at the far right edge, one white paper shoji panel with a thin wooden grid at the LEFT from x=4 to x=20, everything right of it from x=22 to x=60 plain beige clay plaster with nothing on it, a dark wooden baseboard along the bottom. No floor, no sky, no furniture, no lanterns, no windows besides the one shoji, muted ukiyo-e palette, 1px dark outline.（`no_background: false`、64 × 48、16 候補、10 generations）

#### 蔵（kura: 堀川の荷蔵）

板壁と土間の柄が全面に繰り返し、堀川は縁のない青い帯、橋は砂色の 1 枚だった。地面（`.`）を土間、床（`_`）を一段高い板敷きに使い、土間の上に板敷き → 石の護岸の堀川 の順に境目の部品（dual）を重ねる。堀川を渡る道（`=`）は欄干付きの板橋の端の部品（edge）で、土間・板敷きを仲間（`joins`）とみなすので、欄干は堀川の側にだけ出る。
`kura/ground.png` は板敷きの組の lower（土間、マスク 0）、`kura/floor.png` は同じ組の upper（板敷き、マスク 15）に差し替えた（`TILESETS.kura` に ground を足した）。`kura/wall.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。

マップの文字は、通れるマス（床 `_` → 土間 `.`）だけを塗り直した（どちらも通れるので、通れるかは変わらない）: 堀川の河岸から南（y = 17 以降。荷さばき場と入口の通路）と、東の材木置き場の迷路（x = 26 以降、y = 6〜16）。西の米蔵・中の帳場・北の奥の間とそこへの廊下は板敷きのまま。堀川は 1 マス幅のまま（2 マスにすると河岸の通路がふさがるため）。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| kura/floor_dual | e7896346-60da-4f96-8a00-063ec4108400（transition_size 0.25、step_slope 0、roundness 0、raggedness 0）。lower: flat smooth grey-brown packed clay earthen floor (doma) inside an old Japanese storehouse, almost uniform dull colour, very subtle texture, no pattern / upper: raised floor of an old Edo period Japanese warehouse: dark weathered brown wide wooden floorboards running horizontally with thin dark seams and a few faint wood grain lines, the platform rim is a solid very dark brown heavy wooden beam with a thin dull highlight on top and a black outline / transition: very dark brown wooden beam side of the raised warehouse floor | 2 回目（部分修正）で採用。1 回目のこの組は、土間の側に灰色・緑がかった影の欠片が散ったので、Pillow で彩度の低い画素（最大と最小の差が 26 以下）と、タイル内で 10 画素未満の小さなかたまりを透明にした（土間に落ちる影もなくなり、板の側面の暗い梁が段差を表す） |
| kura/ground・floor | 同じ組の lower（69423940-e45b-4ab1-82f2-277984b9f432、マスク 0）・upper（c25a9a5d-b41d-4428-bb77-581563f222cd、マスク 15） | 土間・板敷きの 1 枚 |
| kura/water_dual | 8a5914a6-f8cb-496d-bfbb-49cceac35d7a（lower_base_tile_id 69423940…、roundness 0.2）。upper: dark murky green-blue canal water inside a warehouse seen from above, the whole water surface is open water with only a few faint pale ripples, bordered on all four sides by a straight embankment of grey cut stone blocks with a dark outline and a dark shadow on the water side | 4 回目（部分修正）で採用。1 回目のこの組は護岸が 1 px の灰色の線だけだった。2 回目（901e4030-13a3-481b-bbcd-22e0cde603f1、3 pixel wide row of light grey cut stone blocks）は石の線が水の中ほどに出た。3 回目は 1 回目の組に Pillow で護岸を描いた（土間から 1 px 目を暗い輪郭、2〜3 px 目を 5 px ごとに目地の入った灰色の石、4 px 目を水の側の影）。4 回目は 3 回目の波の点が格子に見えたので、5 つに 4 つを水の色に戻して減らした |
| kura/road_edge | `create_image_pro`（48 × 48、透過、25 候補）e8077bec-bdda-45da-826e-b84f05086b33 の候補 23 | 1 回目で採用。欄干の柱の間の透明を暗い影（#18161a）で埋めてから `--cols 0,16,32 --rows 0,16,32` で切った |
| kura/wall_edge | `create_image_pro`（64 × 48、`no_background: false`、16 候補）ba3bea9a-d400-43fd-a2ad-08a802296265 の候補 1 を加工した写し: 天端の行（y = 0〜17、5〜14、17〜20、さらに天端の 8 行）を 40 行に、正面を y = 20（黒い梁）・22・25・28（漆喰）・32・36・40（腰板）・46（土台）の 8 行に詰めた | `--cols 0,24,48 --rows 0,8,32`。1 回目で全項目 ○。edge の南の端は下の 8 行しか使わないので、正面は 8 行に詰めた（16 行にすると漆喰が切れて腰板だけが残った） |

プロンプト（壁）: JRPG indoor map tile art, 16-bit SNES style. A straight-on piece of an interior wall of an Edo period Japanese earthen storehouse (dozo, kura) seen from above at a 3/4 angle, filling the entire 64x48 canvas edge to edge, perfectly rectangular, no perspective, no side faces. Top 30 pixels: the flat top of the thick wall seen from above: very dark charcoal grey-black heavy timber boards running horizontally, a thin lighter grey highlight line along the very top edge, a thin black outline at the far left and far right edges, no pattern, no objects. Bottom 18 pixels: the front face of the wall: a thick black wooden beam at the top of the face, a dark wooden pillar exactly at the far left edge and exactly at the far right edge, the upper part of the face plain off-white lime plaster (shikkui) with nothing on it, the lower half dark brown vertical wooden wainscot boards (koshiita) running the whole width, a dark baseboard along the bottom. No floor, no sky, no windows, no doors, no furniture, no barrels, no lanterns, muted ukiyo-e palette, 1px dark outline.

プロンプト（橋）: JRPG map tile art, 16-bit SNES style, seen from directly above. A square wooden footbridge deck over a canal, filling the whole 48x48 canvas edge to edge: warm brown wooden planks running horizontally across, each plank separated by a thin dark seam, and a low dark brown wooden railing with small square posts along the full left edge and the full right edge, also a railing along the top edge and the bottom edge. Flat, perfectly rectangular, symmetric, no perspective, no water, no ground, no people, muted ukiyo-e palette, 1px dark outline.

#### からくりの工場（karakuri: からくり屋敷・米蔵の地下・地下の研究所・からくり蔵）

壁（鉄板）と床（鉄の格子）の柄が全面に繰り返し、機械は 1 枚の歯車の柄、水路は縁のない青い帯、橋は共通の道の 1 枚だった。地面（`.`）を廊下の石畳、床（`_`）を部屋の一段高い板の床に使い、石畳の上に板の床 → 石の縁の水路 の順に境目の部品（dual）を重ねる。水路を渡る道（`=`）は kura の `road_edge.png`（欄干付きの板橋）を複製した。壁と機械（屋根の文字 `R`）は端の部品（edge）で、天端と正面を 1 枚の絵から切り出した。
`karakuri/ground.png` は板の床の組の lower（石畳、マスク 0）、`karakuri/floor.png` は同じ組の upper（板の床、マスク 15）に差し替えた（`TILESETS.karakuri` に ground を足した）。`karakuri/floor.png`・`wall.png`・`roof.png` は描画に使われない（板の床は floor_dual、壁・機械は edge の部品で描く。`TILESETS` に残して読み込みは続ける。floor.png は板の床の 1 枚として組の upper にそろえておいた）。

マップの文字は、通れるマス（床 `_` → 石畳 `.`）だけを塗り直した（どちらも通れるので、通れるかは変わらない）: 3 × 3 の通れるマスに入らない所（2 マス幅の廊下）を石畳にし、部屋の中の柱の間に 1 列だけ残った石畳は板の床に戻した。米蔵の地下は、中央の蔵（x = 14〜29）を石畳にして、西の蔵と東の部屋の板の床と分けた。機械の形（からくり蔵の L 字の機械）は通れるかが変わるので変えていない。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| karakuri/floor_dual | 517a5378-d538-4ee8-baf1-1e0cf5e3fe96（transition_size 0.25、step_slope 0、roundness 0、raggedness 0）。lower: flat dark slate grey square stone flagstone floor of an underground room in a Japanese mechanical mansion, large worn stone slabs with thin dark seams, almost uniform dull colour, no objects / upper: raised wooden floor of an Edo period Japanese trick mansion (karakuri yashiki): dark reddish-brown polished wooden floorboards running horizontally with thin dark seams, the platform rim is a solid black-brown heavy wooden beam with small brass rivets and a thin dull highlight on top and a black outline / transition: black-brown wooden beam side of the raised floor with small brass rivets | 2 回目（部分修正）で採用。1 回目のこの組は石畳の側に灰色の点が散り、1 px の黒いはみ出しがあったので、Pillow でタイル内の 10 画素未満のかたまり、隣が 1 つ以下の画素、彩度の低い灰色（最大と最小の差が 26 以下で明るさ 45 超）を透明にした。ゲームに当てはめると板の赤茶が壁・石畳より明るく浮いたので、赤茶の画素の彩度を 0.72 倍、明るさを 0.88 倍にした（floor.png も同じ） |
| karakuri/ground・floor | 同じ組の lower（5a845ea6-b1a3-403a-85fa-2a53b8536a96、マスク 0）・upper（2eb37910-1119-45b0-abcc-84421f234660、マスク 15） | 石畳・板の床の 1 枚 |
| karakuri/water_dual | 77e75736-03e6-4526-84af-128c1a3b5593（lower_base_tile_id 5a845ea6…、roundness 0.2）。upper: dark blue-green water flowing in an underground stone water channel seen from above, the whole water surface is open water with only a few faint pale ripples, bordered on all four sides by a straight 3 pixel wide curb of light grey cut stone blocks with a dark outline and a dark shadow on the water side | 3 回目（部分修正）で採用。1 回目のこの組は縁が 1 px の点線だけだった。2 回目は Pillow で元の透明の形から 3 px の石の縁を描いたが、元の形のでこぼこが縁に出た。3 回目は角の組み合わせから水の形を半マスで決め直し、外から 1 px 目を暗い輪郭、2〜3 px 目を 8 px ごとに目地の入った灰色の石、4 px 目を水の側の影にした（中の水は全面が水のタイルの柄、明るい点線は水の色に戻した） |
| karakuri/road_edge | kura/road_edge.png の複製 | 水路の南北に欄干が出る |
| karakuri/wall_edge | `create_image_pro`（64 × 48、`no_background: false`、16 候補）cab3e3e0-953a-4918-b6a5-3fe1038b038e の候補 11 を加工した写し: 天端は y = 0〜2 のあと y = 3〜18 の 16 行をくり返して 40 行に、正面を y = 20〜22（鋲の鉄の帯）・28・34（鉄の帯）・40・45・47（土台）の 8 行に詰めた | `--cols 0,24,48 --rows 0,8,32`。2 回目で全項目 ○。1 回目（f449dbeb-7af0-47cc-a885-b20fe069914e）はどの候補も天端が台形で、上の左右の角に背景の灰色が残った。2 回目は「キャンバスを全幅の 2 つの横の帯に分ける」と書いて長方形になった |
| karakuri/roof_edge（機械） | `create_image_pro`（64 × 48、`no_background: false`、16 候補）eccf4c0b-ec64-4202-aa97-f2ae69e570d8 の候補 3 を加工した写し: 天端（枠と歯車）y = 0〜27 のあとに、正面を y = 28〜31（真鍮の帯）・36・40・44・46 の 8 行に詰めた（36 行） | `--cols 0,24,48 --rows 0,8,20`。1 回目で全項目 ○（大きな歯車が真ん中にない候補を選んだ） |

プロンプト（壁、2 回目）: JRPG indoor dungeon map tile art, 16-bit SNES style, flat orthographic texture sheet. The canvas is divided into exactly two horizontal rectangular bands that each span the full 64 pixel width from the left edge to the right edge on every row, no slanted sides, no grey or empty corners, no background visible anywhere. Upper band, rows 0 to 29: the flat top surface of a thick wall seen straight from above, like a floor texture: very dark brown-black wooden planks running horizontally, two vertical black iron straps with small brass rivets crossing it at x=20 and x=44, a thin black outline along the very top row and down the far left and far right columns. Lower band, rows 30 to 47: the vertical front face of the same wall of an Edo period Japanese clockwork trick mansion: a black iron-banded beam at the top of the face, a dark wooden pillar with brass rivets exactly at the far left edge and exactly at the far right edge, between them plain dark brown vertical wooden boards with one thin horizontal iron band with rivets running the whole width, a dark baseboard along the bottom. No windows, no doors, no furniture, no gears, muted ukiyo-e palette, 1px dark outline.

プロンプト（機械）: JRPG indoor dungeon map tile art, 16-bit SNES style. A straight-on piece of a large Edo period Japanese clockwork machine housing (karakuri mechanism) seen from above at a 3/4 angle, filling the entire 64x48 canvas edge to edge, perfectly rectangular, no perspective, no side faces. Top 34 pixels: the open top of the machine seen from above: a dark wooden frame border 3 pixels wide along the top, left and right edges, inside it a dense even pattern of interlocking brass and bronze cogwheels of different sizes with dark gaps between them, evenly spread across the whole width, no single big centre gear. Bottom 14 pixels: the front face of the machine housing: dark reddish-brown wooden boards with a thick black wooden corner post exactly at the far left edge and exactly at the far right edge, a thin brass band along the top of the face, a dark baseboard along the bottom. No floor, no sky, no people, muted palette with warm brass highlights, 1px dark outline.

残る点: 石畳と板の床の広い面は同じ柄の繰り返し（柄違いの仕組みがまだない）。からくり蔵の機械は文字の形どおり L 字・コの字に描かれる（入り隅の部品がない）。

#### 廃墟（ruins: 羅生門跡・鬼の巣・南蛮寺跡）

草・森・池・岩・塀・石畳・屋根がすべて 1 枚の柄の敷き詰めで、草と地面、石畳と地面の境に縁がなかった。共通の地面の上に、草 → 石畳 → 池 → がれき → 森 の順に境目の部品（dual）を重ね、屋根・壁（築地塀）を端の部品（edge）で描く。
草・森は shoka の `grass_dual`・`tree_dual`、池・がれき（`^`）は yama の `water_dual`・`rock_dual` をそのまま複製した（池・がれき・森の下と縁は草。草の `joins` に森・岩・水を入れた）。羅生門跡の基壇の `^` の列は崩れた礎石、南蛮寺跡を囲む `^` は岩山に見える。
`ruins/wall.png`・`floor.png`・`rock.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。

マップの文字は、羅生門跡の荒れ寺のまわり（y = 1〜5 の x = 1〜7 と、y = 6 の x = 1〜4。南の縁は草と段になるように残した）の草を地面にしただけ（どちらも通れるので、通れるかは変わらない。屋根の角の透明な所から見える地面が、草の上で茶色の欠片に見えたため）。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| ruins/floor_dual（石畳） | 36b1c08d-3bcf-456f-af29-bf15b601d7c6（lower_base_tile_id ab062a8f-251f-4018-b8ff-c17c5f3e0c5f＝shoka の草の組の lower と同じ地面、roundness 0.2）。upper: old weathered paving of large irregular grey stone slabs of a ruined temple courtyard seen from above, cracked slabs of varied sizes with dark seams and small green moss and weed tufts growing in the cracks, the paved area has a straight border of darker grey curb stones with a dark outline where it meets the dirt | 2 回目（部分修正）で採用。1 回目のこの組は南・西の縁に土色の帯が残り、中の斜めの模様が 16 px ごとに並んで見えたので、Pillow で土色（彩度 0.35 超、色相 0.03〜0.14）の画素を同じ明るさの 0.75 倍の灰色にし、ほかの画素のコントラストを灰色（104）に向けて 0.7 倍に下げ、透明に接する画素を暗い輪郭（#28262a）にした |
| ruins/roof_edge | `create_image_pro`（64 × 48、透過、16 候補）b99039be-1fcc-4ee2-a78f-6f0d00e6f684 の候補 5 | `--cols 0,24,48 --rows 0,8,12`（屋根は y = 1〜27。1 回目で全項目 ○） |
| ruins/wall_edge（築地塀） | 同じ候補 5 を加工した写し（64 × 56）: y = 0〜39 のあとに漆喰の y = 32〜39 を複製し、台石の y = 40〜47 を続けた。漆喰の板（x = 10〜53、y = 31〜43）の染みは、いちばん多い漆喰の色に向けて 0.45 倍に薄めた | `--cols 4,16,44 --rows 28,32,40`。2 回目（部分修正）で採用。1 回目（`--cols 0,24,48 --rows 28,30,32`）は縦に続く塀で台石の暗い線が横縞になり、染みが 16 px ごとに歯のように並び、左右の端の列の透明な所から地面が見えて 1 マス幅の縦の塀が細い線になった |

プロンプト（荒れ寺）: JRPG town map tile art, 16-bit SNES style, front view seen from above at a 3/4 angle: an abandoned, dilapidated Edo period Japanese temple hall that fills the whole canvas edge to edge. Top two thirds: old weathered dark grey kawara roof tiles in neat horizontal rows, a few tiles missing or cracked, patches of green moss on the tiles, a darker roof ridge along the top edge, a straight eave line with a dark shadow at the bottom of the roof. Bottom third: cracked and stained beige earthen plaster wall (tsuiji) with dark weathered wooden pillars at both ends, plain wall with a few cracks in the middle, dark stone base. Straight horizontal rows, rectangular, symmetric, no ground, no sky, no background, muted ukiyo-e palette, 1px dark outline.

残る点: 南蛮寺跡を囲む岩山・鬼の巣の森の広い面は、全面のタイルの繰り返し（柄違いの仕組みがまだない）。南蛮寺跡の礼拝堂の厚い壁の切れ込み（通れる `_` のくぼみ）は、通れるかが変わるので形を変えていない。

#### 船の上（ship: 北前船）

甲板（`ship/floor.png`）を船べりの組の lower のタイル（1634236d-80ba-4638-82a9-358cc11fe064、マスク 0）に差し替え、その上に 船べり（壁の文字）→ 海 の順に境目の部品（dual）を重ねる。屋形の屋根と積み荷（屋根の文字）は端の部品（edge）、戸（`ship/door.png`。`TILESETS.ship` に足した）は屋形の絵の戸口。マップの文字は変えていない。
船の外形は斜めの段なので、船べりを edge にすると段ごとに切れて見える。dual にして、斜めのコマ（マスク 6・9）の真ん中を全面のタイル（マスク 15）の画素で幅 11 px の斜めの帯につなぎ、帯の縁を暗い輪郭（#28180e）にした。
船べりの下には甲板を敷くので、船べりの外側の凸角を丸めると甲板が海の側に見える。海は船べりの後に重ね、船体側の凸角（半径 3 px）と海側の凸角を丸く覆うようにした。
`ship/wall.png`・`roof.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。`ship/water.png` は海のマスの下地と、海の部品の中の柄に使う。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| ship/wall_dual（船べり） | 85891b8b-88c5-4379-88c1-1c6c8d629a2f（pro、roundness 0.3）。lower: wooden ship deck: long light brown planks running horizontally, thin dark seams, few nail dots, plain and even, seen from above。upper: raised thick dark brown wooden ship gunwale bulwark rail, heavy timber beam seen from above with a lighter top edge highlight, edged by a dark outline and a dark shadow line where it meets the deck | 2 回目（部分修正）で採用。1 回目は透明な側に 1 px の点と、船べりの中に 1 px の穴が残った。Pillow で、透明に 3 方向を囲まれた画素と 4 画素以下のかたまりを消し、3 方向を不透明に囲まれた穴を隣の色で埋め、斜めのコマを帯でつないだ |
| ship/water_dual（海） | PixelLab を使わず、Pillow で作った。角の組み合わせから船体の形を半マスで決め、凸角を丸め（半径 3 px の opening と closing）、海の側を `ship/water.png` の柄（半マスずらして海のマスの下地とそろえる）で塗り、船体に接する 1 px を白い波（#ecf4f6）、その外の 1 px を白と淡い青（#96bed6）の点にした | 縁は角から幾何学的に描く（pro の水の縁が 1 px の点線になりやすかったため。karakuri の水路で、角の組み合わせから水の形を決め直して縁を描いたのと同じ考え方。ただし karakuri は PixelLab の組を手直ししたもので、ship の海は PixelLab を使っていない） |
| ship/roof_edge（苫の屋根） | `create_image_pro`（64 × 48、不透明、16 候補）457d2fd6-e805-4b1f-b150-bf9ac733536b の候補 6 を加工した写し（58 × 40）: 左右の灰色の背景を落として x = 3〜60 を切り、棟の y = 0〜4、苫の 1 段の y = 12〜19 を 4 回、軒先の y = 25〜27 を重ね、上の 1 行と左右の 1 列を暗い輪郭にした | `--cols 0,21,42 --rows 0,8,24`（写しの座標。写しの x は元の候補の x − 3）。3 回目（2 回目の候補 6 の部分修正）で採用。1 回目（de62feef-0f8e-4a66-9427-8c944b75d61d、プロンプトは下の「屋形、1 回目」）は全候補で屋根の左右が斜めで、戸が真ん中だった。2 回目（457d2fd6…、下のプロンプト）は戸が左に寄り屋根もほぼ四角になったが、左右の端にまだ背景の灰色が残った |
| ship/door | 同じ候補 6 の、元の候補（64 × 48）の座標で x = 16〜31、y = 28〜43（屋根の写しとは別に、元の候補から切った） | 引き戸の右の板と取っ手、右の柱 |

プロンプト（屋形、1 回目）: Front view pixel art of a small Japanese wooden deckhouse cabin (yakata) on an Edo period cargo ship, filling the whole canvas edge to edge, no ground and no sky. The upper two thirds is a roof covered with woven straw mats (toma): a dark wooden ridge beam along the very top, straight horizontal rows of golden straw mat with dark rope bands, a dark eave line and shadow at the bottom of the roof. The lower third is a dark brown plank wall with a wooden post at each end; a small dark sliding wooden door is on the left side (x 6 to 18), the right half of the wall is plain planks. Straight horizontal rows, flat frontal view, muted Edo colours, 1px dark outline.

プロンプト（屋形、2 回目）: Front view pixel art of a Japanese wooden deckhouse cabin on an Edo period cargo ship, drawn as a perfect rectangle that fills the whole canvas: every row of pixels touches the left and right canvas edges, no background, no sky, no ground, no slanted sides. Top 32 pixel rows: roof of woven golden straw mats (toma) in straight horizontal rows tied with dark rope bands, a thick dark wooden ridge beam along the full width of the very top row, and a dark eave line with a shadow along the full width at the bottom of the roof. Bottom 16 pixel rows: dark brown plank wall with a wooden post at the far left and far right; one dark sliding wooden door placed at the far left of the wall (x 4 to 18); the whole right half of the wall is plain planks with no door and no window. Flat frontal view, muted Edo colours, 1px dark outline.

残る点: 甲板の広い面は同じ板の柄の繰り返し（柄違いの仕組みがまだない）。船の外形は rows の形どおりの階段で、外側の縁は段のまま（斜めの段は船べりの帯でつないだ）。屋根の苫の中の段には縄の帯がなく、縄は棟の上にだけ見える。

#### 大火の町（fire: 神田の大火）

屋根・壁・地面・がれきがすべて 1 枚の柄の敷き詰めで、炎の屋根が格子に並び、地面とがれき・屋根の境に縁がなかった。焼け跡の地面（`fire/ground.png`。がれきの組の lower のタイル ebea3dbf-6c90-496c-b530-001bec2ae730 に差し替えた。`wang_sheet.py <ID> <出力> --keep-lower` で並べたシートのマスク 0 のコマ（左上の 16 × 16）を切り出した。透明にしたシートのマスク 0 は全面が透明）の上に がれき（岩の文字）を境目の部品（dual）で重ね、燃える長屋の屋根・焦げた板壁を端の部品（edge）で描く。壁は外周の塀にも使う。
`fire/roof.png`・`wall.png`・`rock.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。

マップの文字は、高さ 3 段以上の屋根の、下が屋根でない横の並び（3 マス以上で、どのマスも上に屋根が 2 段以上続くもの）を壁にしただけ（134 マス。屋根も壁も通れないので、通れるかは変わらない）。5 段の屋根が壁 1 段の上に載り、炎の柄が広い面に並んで見えたため、家を屋根 2〜4 段・壁 1〜2 段に分けた。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| fire/rock_dual（がれき） | 4070d6a8-b607-4f1f-8284-98828a6dfa6f（pro、boundary_amplitude 0.2、raggedness 0.5）。lower: scorched ash-grey burnt ground of an Edo period town after a great fire, dark grey packed earth with soft lighter ash patches and a few tiny black cinders, plain and even, seen from above。upper: pile of collapsed charred black wooden beams and burnt timber rubble seen from above, crossed blackened planks with a few small glowing orange embers in the cracks, irregular heap with a dark outline and dark shadow at the edge | 3 回目（部分修正）で採用。1 回目は山のまわりの透明な側に黒い点が多く散らばった。2 回目は Pillow で、角の象限から 3 px より離れた画素、4 方向のうち 3 方向以上が透明な画素（2 回）、upper の象限の辺に接しない 8 画素未満のかたまりを消したが、小さな欠片が残った。3 回目は距離を 2 px、かたまりを 24 画素未満にして消した（山につながった灰色の影は残る） |
| fire/roof_edge（燃える板葺き） | `create_image_pro`（64 × 48、不透明、16 候補）e3aacd7b-d3fb-4888-a7f7-7d0b36b47fc3 の候補 3 を加工した写し（64 × 47）: 上の空の帯（y = 0〜4）を落として y = 5〜47 を y = 4 から置き、残った空の色の画素を下の板の色で埋め、y = 0〜3 に棟（輪郭・明るい上面・梁・影、火の粉を 5 点）を描き、屋根の左右の 3 列を破風の輪郭と暗い色にした | `--cols 0,24,48 --rows 0,6,9`（写しの座標。屋根は y = 0〜24）。2 回目（部分修正）で採用。1 回目は棟がなく上に暗い空が入り、壁の両端に柱がなかった。中の列は x = 16・24・32 を並べて比べ、炎が最もまばらで並んで見えにくい 24 にした |
| fire/wall_edge（焦げた板壁） | 同じ写し。壁の左右の 4 列に柱（輪郭・明るい面・暗い面・影）を描いた | `--cols 0,24,48 --rows 25,27,31`（壁は y = 25〜46 の 1 段） |

プロンプト（燃える長屋）: JRPG town map tile art, 16-bit SNES style. A flat straight-on FRONT ELEVATION of a long Edo period Japanese nagaya row house that is ON FIRE during a great fire, drawn as a perfect rectangle filling the entire 64x48 canvas: every row of pixels touches the left and right canvas edges, no perspective, no side wall, no slanted sides. Top 30 pixel rows: dark charred grey-brown wooden shingle board roof in clearly visible straight horizontal rows, with orange and yellow flames licking up from the roof boards and glowing red embers between the boards, a dark straight ridge line along the full width of the very top row, a straight eave with a dark shadow line along the full width at the bottom of the roof. Bottom 18 pixel rows: scorched blackened vertical wooden plank front wall with faint red glowing cracks, a dark wooden pillar exactly at the far left edge and exactly at the far right edge, a dark base board along the bottom. The wall is one long plain stretch of planks with no door and no window. No ground, no sky, no smoke cloud, no background, muted ukiyo-e palette with fire orange, 1px dark outline.（`no_background: false`）

残る点: 屋根の広い面（南の端の 4 段など）は、同じ炎の柄の繰り返し（柄違いの仕組みがまだない）。焼け跡の地面も同じ柄の繰り返し。がれきの中の材木の模様は 16 px ごとに並ぶ（このマップのがれきはどれも 1 マスなので目立たない）。

#### 城の中（castle: 名古屋城 天守・江戸城 本丸御殿・松の廊下）

壁は灰色の石垣の 1 枚が全面に繰り返し（御殿の部屋の壁も石垣に見えた）、天守の屋根（`R`）は共通の屋根の 1 枚、本丸御殿の中庭は縁のない草・池・木の 1 枚だった。板の間（`_`）は 1 枚の画像（`castle/floor.png`）のまま下地にし、その上に中庭の草 → 池 → 森 を境目の部品（dual）で重ね、天守の屋根と御殿の壁を端の部品（edge）で描く。
草・森は shoka、池は yama の沢の部品を複製した（池・森の下と縁は草、草の縁の外は板の間）。`castle/wall.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。マップの文字は変えていない。

| 部品 | ジョブ ID と候補 | 切り方・判定 |
| --- | --- | --- |
| castle/grass_dual・tree_dual | shoka/grass_dual.png・tree_dual.png の複製 | 中庭の草は板の間の上に縁取られる |
| castle/water_dual | yama/water_dual.png の複製 | 中庭の池 |
| castle/roof_edge | `create_image_pro`（64 × 48、`no_background: false`、16 候補）9f6a9af3-7e33-46ae-972d-9cfb3577d2f0 の候補 0 | `--cols 0,24,48 --rows 0,16,32`。1 回目で全項目 ○（白い棟・左右の白い破風の縁・軒先の瓦の列と影がある）。不透明な絵なので、屋根の下には何も敷かない |
| castle/wall_edge | `create_image_pro`（64 × 48、`no_background: false`、16 候補）48a15fbb-35d8-4231-b377-e09767c7f88c の候補 0 を加工した写し: 天端は y = 0〜2 のあと、y = 13〜20 の 8 行（黒漆の板）をくり返して 40 行に、真ん中の柱（x = 26〜39）は 16 px 左の同じ行で埋めた。正面を y = 22（黒い長押）・24・28・32・37・42（金の襖。引き手の行を含む）・46・47（黒い腰板）の 8 行に詰め、右の襖の松の緑は 16 px 左の襖で埋めた。天端の左右に 1 px の暗い輪郭を足し、天端の縞のコントラストを 0.45 倍にして少し明るくした | `--cols 0,24,48 --rows 0,8,32`。2 回目（部分修正）で採用。1 回目は天端の真ん中に柱があり、右の襖の松が中の列に入った。撮ると天端の黒い縞が強く、広い壁が黒い穴の横縞に見えたのでコントラストを下げた |

プロンプト（屋根）: JRPG map tile art, 16-bit SNES style, flat orthographic texture sheet seen from directly above. A rectangular piece of a Japanese castle keep (tenshu) roof filling the entire 64x48 canvas edge to edge on every row, perfectly rectangular, no slanted sides, no empty corners, no sky, no background visible anywhere. Rows 0 to 7: the ridge along the top: a straight horizontal white plaster ridge cap with a dark grey tile cap and a thin black outline. Rows 8 to 39: the roof surface: dark blue-grey kawara roof tiles in straight vertical rows of round channel tiles with thin darker grooves, evenly repeating across the whole width, no objects. Rows 40 to 47: the eaves along the bottom: a row of round tile ends with tiny white plaster dots, then a dark shadow line at the very bottom. A 3 pixel wide straight vertical white plaster gable border with a black outline exactly along the far left edge and exactly along the far right edge. Symmetric, muted ukiyo-e palette, 1px dark outline.

プロンプト（壁）: JRPG indoor castle map tile art, 16-bit SNES style, flat orthographic texture sheet. The canvas is divided into exactly two horizontal rectangular bands that each span the full 64 pixel width from the left edge to the right edge on every row, no slanted sides, no grey or empty corners, no background visible anywhere. Upper band, rows 0 to 29: the flat top of a thick palace wall seen straight from above, like a floor texture: glossy black lacquered wood running horizontally with a thin gold metal trim line along the very top edge and a thin black outline, almost uniform, no objects. Lower band, rows 30 to 47: the front face of an interior wall of an Edo period shogun's palace (honmaru goten): a black lacquered horizontal lintel with a thin gold line at the top of the face, a black lacquered wooden pillar exactly at the far left edge and exactly at the far right edge, between them pale cream gold-leaf fusuma sliding panels with a faint green pine branch painting, a black lacquered baseboard along the bottom. No floor, no sky, no furniture, no lanterns, muted ukiyo-e palette, 1px dark outline.

残る点: 板の間と壁の天端の広い面は同じ柄の繰り返し（柄違いの仕組みがまだない）。天守の 1 マスの柱・本丸御殿の 1 マスの仕切りも同じ襖の壁で描く。

#### ワールドマップ（field: 日本）

野（`field/plain.png`）を 4 組で共通の lower のタイル（ad7f8912-40fa-4df5-bb38-d8f2765c9181、マスク 0）に差し替え、その上に街道 → 海 → 山 → 森 の順に境目の部品（dual）を重ねる。4 組とも `lower_base_tile_id` ad7f8912… でつないだ（lower: muted green grassy plain of an old Japanese world map, even flat green field with a few tiny darker green specks, no pattern）。マップの文字は変えていない。
町（`O`）と関所（`G`）の印は、背景の土色（町 #ae8e68 と草の点、関所はもとの `field/road.png` と同じ画素）を透明にし、新しい決まり `over`（dual をすべて重ねた後に 1 枚の画像を上から描く）で描く。街道の `joins` に町・関所を入れて、道が印の下まで続く（行き止まりの町で道が印の手前で切れない）。
`field/water.png`・`rock.png`・`tree.png`・`road.png` は描画に使われなくなった（`TILESETS` に残して読み込みは続ける）。

| 部品 | ID と設定 | 判定 |
| --- | --- | --- |
| field/water_dual | ef2659d0-70e0-41e2-9c7d-d516aa4fd319（roundness 0.6、boundary_amplitude 0.15、raggedness 0.2）。upper: calm deep indigo blue sea seen from above, a flat even blue water surface with only a very few faint thin pale ripples placed irregularly, the whole sea surface is open water, bordered on all four sides by a narrow pale sandy beach coastline with a thin white foam line | 2 回目で採用。1 回目（0c0fb2d4-596d-4791-8b49-eadf8ec9116f、small scattered white wave crests）は波の印が格子に並び、陸側に濃い緑の点が残ったので、波をかすかにした |
| field/road_dual | 5c94e6ec-15c8-42ec-85d6-3d3fc9c7ac69（roundness 0.3、boundary_amplitude 0.05）。upper: smooth packed light tan dirt highway road seen from above, a flat even tan earth surface with subtle soft shading and no dots or pebbles, edged by a thin darker brown border line where it meets the grass | 3 回目で採用。1 回目（8276537f-e22e-4d12-a435-711c3a6be728、a few tiny pebbles）は小石の点が格子に並んだ。2 回目（この組）は入り隅（マスク 14）の内側に緑の点が 6 px 残ったので、全面が道のタイル（マスク 15）の同じ位置の画素で置き換えた（3 回目） |
| field/tree_dual | 9a74de62-86a5-4f5f-8c88-0c99696f0baa（roundness 0.85、boundary_amplitude 0.15、raggedness 0.5）。upper: dense forest of dark green Japanese pine and cedar trees seen from above, many small overlapping round tree crowns of varied sizes, dark outline and shadow at the edge | 1 回目で採用 |
| field/rock_dual | 65927aed-8c98-4761-925f-840e3914e1b9（roundness 0.8、boundary_amplitude 0.15、raggedness 0.4）。upper: rocky grey-brown mountain highland seen from directly above, an even rough surface of many small irregular crags, little ridges and fine dark cracks, no single large peak and no repeating shapes, dark outline and a dark shadow at the foot where it meets the plain | 5 回の上限で 2 回目を採用。残った ×: 中の丸い岩のかたまりが 16 px ごとに並ぶ（全面が山のタイルが 1 枚なので、どの回も峰が格子に並んだ）。1 回目（d24e7628-1f0b-49ac-8924-e621bd9c6de0、峰が菱形の格子）、3 回目（1fcd95a6-9592-409b-ab0d-8dd5c5d66907、丸いかたまりの格子）、4 回目（a12c271c-b61e-4e18-9163-e9f5642fc5d6、格子は消えたが平らな灰色の台地で山に見えない）、5 回目（12888c3e-1cc2-4d6e-983e-e25ae020c276、小さな峰が列に並び細かすぎる）と比べ、マップに当てはめて山に見えて格子が最も目立たない 2 回目にした。柄違いの仕組みができたら作り直す |
| field/plain | 4 組で共通の lower（ad7f8912…、マスク 0 のタイル） | 境目の透明な所と野の色がそろう |
| field/town・gate | もとの画像の背景を透明にしたもの（町は右端の土色の 1 px も消した） | 街道の上に印だけが乗る |

## 敵（`enemies/`）

`create_image_pixflux`（64 × 64、`no_background: true`、黒の 1px 輪郭、view `side`、medium detail）で 1 体ずつ作る（1 体 1 回）。ボスは 96 × 96 で作る。
戦闘では画像の下端を地面の少し下（y = 106）に置くので、足元（いちばん下の不透明な行）の下に透明な行が 5 行残るようにそろえる（足元が地面の 1 行目の y = 100 に乗る。野狐は生成した画像を 2px 下へずらした）。
ダウンロードは `https://api.pixellab.ai/mcp/images/<ID>/download`。`src/data/enemies.ts` で `image: true` にした敵だけ画像を使う。

| ID | PixelLab のジョブ ID | direction | プロンプト |
| --- | --- | --- | --- |
| onibi | 64ee1a0a-f3e4-48e2-81de-8f09b89e88ab | south | Japanese yokai onibi, a floating ghostly blue-white will-o'-wisp flame with a spooky face, wispy tail, JRPG enemy battle sprite, facing viewer |
| yamainu | 8aba08d5-34c4-4720-ba1b-4fcffd56eebc | south-west | fierce Japanese wild mountain dog (yamainu), brown fur, bared fangs, growling, crouched ready to pounce, full body, JRPG enemy battle sprite, three-quarter front view |
| ogaeru | ad9df976-154a-4537-aad3-cb1468c32a51 | south | huge fat green Japanese toad yokai (ogaeru) with warty skin, wide mouth, yellow eyes, sitting, full body, JRPG enemy battle sprite, facing viewer |
| yako | 4a39f375-4954-4ee6-ab1f-df69f7c9908a | south-west | Japanese yokai fox (yako), sly golden-orange fox with two bushy tails, glowing pale blue foxfire flames floating around it, a small brass clockwork gear embedded on its forehead, standing menacingly, full body, JRPG boss battle sprite, three-quarter front view |
| karakuriNingyo | 084c7d7d-dfb0-4edf-ac82-945db04679dc | south-west | Japanese karakuri ningyo wooden clockwork doll enemy, exposed brass gears and cogs spinning inside an open chest panel, big brass wind-up key sticking out of its back, wooden ball-jointed arms, white painted doll face with red lips and black bobbed hair, red kimono, stiff stance, full body, JRPG enemy battle sprite, three-quarter front view |
| gorotsuki | 8bf47a55-a968-4a61-804c-c368367ac583 | south-west | Edo period Japanese street thug (gorotsuki), rough man with a topknot and a twisted headband, loose striped kimono open at the chest, holding a short dagger (aikuchi), menacing grin, full body standing, JRPG enemy battle sprite, three-quarter front view |
| bakeChochin | 79e44cb2-9034-4c69-9b79-6b4301458540 | south | small cyclops paper lantern yokai (chochin-obake) centered with empty space around it, a single huge eye in the center, torn ripped paper forming a jagged gaping mouth, short red tongue, old orange paper lantern with black wooden top and bottom rims, eerie, floating, JRPG enemy battle sprite, facing viewer（2 回目の a9a34c33-9712-414e-99d8-6fb25c579557 を init_image に、init_image_strength 60） |
| tetsubin | 83f41628-1d1f-4d10-b548-565aba1656fd | south-west | giant Japanese clockwork iron general robot (karakuri taisho Tetsubin), heavy dark iron body shaped like a round cast-iron tea kettle, kettle-shaped head with a spout, white steam puffing from its top, huge iron fists, brass gears on its chest, samurai armor plates, standing menacingly, full body, JRPG boss battle sprite, three-quarter front view（96 × 96） |
| oihagiRonin | ffa9eb95-9558-4cb7-bc19-c5b2d2bf1571 | south-west | ragged ronin in tattered rags, kimono torn to shreds with jagged ripped edges and holes and sewn patches, faded dirty brown and grey cloth, unshaven face with stubble, wild messy unkempt hair, holding a long drawn curved katana, threatening stance, Edo period Japanese highwayman, full body standing, JRPG enemy battle sprite, three-quarter front view（4 回目の afcf5b69-2959-4507-8b14-c5066329d5ed を 88% に縮めて足元を y = 58 に置いたものを init_image に、init_image_strength 300） |
| kawauso | e7ac0977-5b06-410d-9a85-63372e8faad8 | south-west | sly mischievous Japanese river otter yokai (kawauso), slender sleek brown otter standing upright on hind legs, sneaky smirk with narrowed eyes, small round ears, long thick tapered tail, wearing a small straw hat, holding a fish in one paw, full body, JRPG enemy battle sprite, three-quarter front view |
| zenmaiInu | ec827e5b-93f1-4ccb-b88c-bfb04a623d23 | south-west | Japanese karakuri clockwork mechanical robot dog, body made of riveted brass and dark iron plates, exposed brass gears and cogs on its side, big brass wind-up key sticking up from its back, glowing red eyes, metal jointed legs, full body standing, JRPG enemy battle sprite, three-quarter front view |
| kumosuke | e1adbf05-beb6-4588-ba9e-aaa7235212b8 | south-west | Edo period Japanese palanquin bearer thug (kumosuke), burly muscular bald-ish man bare-chested, white twisted headband, white fundoshi loincloth, short open happi coat, carrying a thick long wooden palanquin pole over his shoulder as a club, angry face, full body standing, JRPG enemy battle sprite, three-quarter front view |
| kinshachi | 19d09485-1ef5-4c21-80e0-23de3d42bdc9 | south-west | giant golden clockwork shachihoko (kinshachi) from Nagoya castle roof, fierce tiger head with fangs on a carp fish body, gleaming gold scales, tail curled upward high above its head, brass gears visible at its fin joints, menacing, full body, JRPG boss battle sprite, three-quarter front view（96 × 96） |
| akaoni | 269af503-ee54-42f6-8c27-d9feeb2293f7 | south-west | Japanese red oni (akaoni), bright red skin, two horns, wild black hair, orange tiger-skin loincloth with black stripes, carrying a black iron kanabo club studded with silver studs on his shoulder, angry face with fangs, full body standing, JRPG enemy battle sprite, three-quarter front view（2 回目の ced723e7-5fb8-494f-9308-3a12c2bbfa88 の金棒に銀の鋲、腰布に黒の縞を Pillow で描き足したものを init_image に、init_image_strength 300。生成後、薄くなった角を Pillow で生成りに塗り、黒の輪郭を付けた） |
| ittanmomen | 58657291-f263-4f49-bd44-430bdcc55ab5 | south | ittan-momen yokai, a long flying strip of white cotton cloth with two small black eyes on its upper end, black outline, fluttering in the air, JRPG enemy battle sprite（2 回目の 6d429772-54bd-4b9f-86e1-1c9b69fad485 の灰色の輪郭を黒にし、両端の茶色の棒を消し、上の端に目を 2 つ描き足したものを init_image に、init_image_strength 300） |
| namagusaBozu | da4cb792-2dcc-4499-a925-0b140e66a3ae | south-west | corrupt drunken fat Buddhist monk (namagusa bozu), shaved bald head, big round belly, dirty stained brown monk robes, a string of brown prayer beads (juzu) around his neck, holding an orange sake gourd, sly greedy grin, full body standing, JRPG enemy battle sprite, three-quarter front view（3 回目の 76e406a1-7ae2-450f-b5af-76b0e489a219 の首に数珠を Pillow で描き足したものを init_image に、init_image_strength 300） |
| karakuriGissha | df3a19e0-e57f-45b0-a6f2-913375e0cc57 | south-west | Japanese karakuri clockwork ox-cart (gissha), black lacquered Heian ox carriage cabin with curved roof and red and gold trim, large wheel with a brass gear hub, pulled by a mechanical clockwork ox made of riveted iron and brass plates, big round brass gears and cogs clearly visible on the ox's side and shoulder, glowing red eyes, JRPG enemy battle sprite, three-quarter front view（1 回目の 2d8ced43-0a53-4227-af38-359eb402c4d6 を 1px 下げたものを init_image に、init_image_strength 150） |
| shuten | 17955c61-ab86-4217-a568-40835c99f899 | south-west | giant oni king Shuten-doji, huge dark crimson-skinned oni with two big curved golden horns, long wild white hair flowing, ornate purple and gold embroidered kimono robe draped open over a muscular chest, holding a giant red lacquered sake cup (sakazuki), fierce furious glaring eyes, angry frowning brows, bared fangs, menacing imposing stance, full body, JRPG boss battle sprite, three-quarter front view（96 × 96。1 回目の c85d091c-c732-4f6f-8575-c613b43a519d を 90% に縮めて足元を y = 90 に置いたものを init_image に、init_image_strength 200） |
| iganin | 7ba48aa4-26da-45c5-84f8-b0b25d1115ec | south-west | Iga ninja (iganin), black ninja outfit with black hood and face mask covering the face except narrow eyes, holding a steel shuriken throwing star raised in one hand and a short straight ninja sword in the other, crouching ready stance, full body, JRPG enemy battle sprite, three-quarter front view |
| dokugumo | 10efcd22-edb4-4d24-b1d6-af51142df6b0 | south-west | giant poisonous Japanese yokai spider (dokugumo), dark purple body with bright green poison markings on its round abdomen, eight long jointed hairy legs spread out wide, green poison dripping from its fangs, glowing red eyes, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view |
| karakuriTaka | e14b10aa-d692-4ed7-b066-1b0edf180374 | south-west | Japanese karakuri clockwork mechanical hawk, a big round brass cogwheel with teeth on its chest and small brass cogwheels at both wing joints, riveted dark iron plate feathers, wings spread wide, metal talons, glowing red eyes, JRPG enemy battle sprite, three-quarter front view（1 回目の 8fb6544c-ff65-4f37-99eb-938fdb18da9d の胸と翼の付け根に歯車を Pillow で描き足したものを init_image に、init_image_strength 300） |
| oboro | 0cee1983-2fc0-4796-a6eb-5409c3d8425b | south-west | elderly Iga ninja grandmaster, tight-fitting grey shinobi shozoku ninja suit with fitted sleeves and leg wraps, black tabi boots, metal hand guards, grey ninja hood pulled back off his head showing long white hair tied in a topknot and long white beard, stern narrowed eyes, straight ninja sword held forward in one hand and a steel shuriken throwing star in the other, low ninja stance, full body, JRPG boss battle sprite, three-quarter front view（96 × 96、text_guidance_scale 10） |
| gonroku | 999d9d9e-329e-4aa2-8c30-3f82befe9502 | south-west | Edo period Japanese assassin with a big mechanical prosthetic left arm made of dark iron and brass with exposed gears and a metal claw hand, a long dark red scar slashed across his right cheek, cruel smirk, black hair, dark navy kimono, short katana in his right hand, full body standing, JRPG boss battle sprite, three-quarter front view（96 × 96。1 回目の 08ed533b-a87c-4610-81c1-9376a3c4556c を 88% に縮めて足元を y = 90 に置き、頬に傷を描き足したものを init_image に、init_image_strength 250。生成後、消えた頬の傷を Pillow で描き直した） |
| yojinbo | cef63430-cd40-44b6-98d9-37b070cb5a76 | south-west | burly Edo period ronin bodyguard (yojinbo) of a rice merchant, muscular man in a dark brown kimono with a white sash, unshaven scowling angry face, holding a drawn katana, menacing stance, full body standing, JRPG enemy battle sprite, three-quarter front view（1 回目の 3f38ec6a-214d-45d3-9ae8-edeab685613c を 58 × 58 に縮めて足元を y = 58 に置いたものを init_image に、init_image_strength 300） |
| teppoAshigaru | f9f557d3-27e1-446b-93d2-4fb4bec4f50b | south-west | Edo period Japanese foot soldier musketeer (teppo ashigaru), wearing a flat black conical jingasa hat and simple dark lacquered armor over blue clothes, holding a long matchlock tanegashima gun at the ready, full body standing, JRPG enemy battle sprite, three-quarter front view |
| karakuriTawara | 913eab51-f699-4982-a1bb-3ba96b029da4 | south-west | karakuri clockwork rice bale monster, a round straw Japanese rice bale (tawara) body tied with thick ropes, big brass gears sticking out of its sides, four short riveted iron mechanical legs, glowing red eyes peeking from the straw, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view |
| bakeNezumi | bbf3a582-4663-4f3a-8e99-cdb3c2a59453 | south-west | giant Japanese yokai rat (bake-nezumi), big grey-brown furry rat standing on hind legs, long pink tail, glowing red eyes, bared sharp yellow fangs, menacing claws raised, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view |
| hyakuhyo | f364c017-c6c6-46b6-b8d0-15739974b60f | south-west | huge monster built from stacked yellow straw rice bales (tawara) with rough straw texture and brown rope ties, dark bronze cogwheels with teeth at its shoulders and knees, one glowing red eye, menacing, full body, JRPG boss battle sprite, three-quarter front view（96 × 96。2 回目の f96f56af-c2d4-4593-a35c-99fca4b14abe を 90% に縮めて足元を y = 90 に置き、肩と膝に暗い青銅の歯車を Pillow で描き足したものを init_image に、init_image_strength 300） |
| nanbanHei | ae66a7de-60b8-4992-9dd0-22422f36465b | south-west | Japanese karakuri clockwork soldier robot in European nanban armor, steel morion helmet with curved brim and crest, steel breastplate with an open window in the chest showing big round brass cogwheels with visible teeth, brass cogwheels at both shoulders and knees, holding a thin straight rapier sword, glowing red eyes, small and centered with empty space around it, full body standing, JRPG enemy battle sprite, three-quarter front view |
| umibozu | b02bc299-c3d3-4826-9734-dfb98353452b | south | Japanese sea yokai umibozu, a huge round bald black shadowy monk-shaped head and shoulders rising out of dark blue ocean waves, two big glowing yellow eyes, no mouth, white foamy waves curling around its base, small and centered with empty space around it, JRPG enemy battle sprite, facing viewer |
| boreiMusha | eaf98a46-e12b-4958-8325-dfa80fb65beb | south-west | ghost samurai warrior (borei musha), pale glowing blue-white skeletal face, tattered broken dark red Japanese samurai yoroi armor with a horned kabuto helmet, ghostly translucent wisps trailing from his body, holding a chipped katana, full body standing, JRPG enemy battle sprite, three-quarter front view, small and centered with empty space around it |
| gehoTsukai | c09caaa2-b512-48d1-9802-dbefe7363ee5 | south-west | Edo period Japanese dark sorcerer (geho tsukai), long dark purple hooded robes, white noh mask over his face, holding up a long white paper ofuda talisman strip with red writing that is burning with bright purple fire, sinister, full body standing, JRPG enemy battle sprite, three-quarter front view, small and centered with empty space around it |
| heikegani | 69f97ae4-855d-4440-b294-d015e5e8b336 | south-west | giant red Heike crab yokai, an angry frowning human samurai face with fierce eyebrows clearly carved on its red back shell, two huge raised pincer claws, eight spiky legs, full body, JRPG enemy battle sprite（1 回目の 413b2ace-ea31-4a9e-b65a-71fbd13d3159 の甲羅の模様を消し、怒った顔を Pillow で描き足したものを init_image に、init_image_strength 350） |
| nanbanOzutsu | 606be5dd-9c66-4c91-a12a-13eae4df85d5 | south-west | giant clockwork iron war machine robot with a huge black bronze cannon barrel mounted on its shoulder pointing forward, heavy riveted dark iron body mixing European armor and Japanese samurai armor plates, open chest showing round brass cogwheels with teeth and glowing blue light, thick iron legs, menacing, full body, JRPG boss battle sprite, three-quarter front view（96 × 96。1 回目の def5a72a-069d-424b-b95f-3f3f56220a92 を 88% に縮めて足元を y = 90 に置き、胸に真鍮の歯車を描き足したものを init_image に、init_image_strength 300） |
| kamaitachi | ef43421d-4b0d-409c-8faf-d02d9149daf3 | south-west | Japanese yokai kamaitachi, a slender orange-brown weasel with a long body and long tail, both of its front legs end in large curved shiny silver sickle blades (kama) held up and clearly visible, small white wind swirls near its feet, fierce eyes, small and centered with lots of empty space around it, full body, JRPG enemy battle sprite, three-quarter front view（text_guidance_scale 12。生成後 4px 下げた） |
| mujina | a06a6bd4-a76e-41ef-bf04-d2fc814ed440 | south-west | Japanese shapeshifting badger yokai (mujina), round grey-brown furry badger-raccoon dog standing on hind legs, a green leaf on top of its head, mischievous sly grin, big round belly, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view（2px 上げた） |
| inoshishi | e79dde3c-8f4b-42a3-9f2a-d293d215f455 | south-west | fierce Japanese wild boar (inoshishi) charging forward, head lowered low with big curved white tusks thrust forward, front legs bent, hind legs pushing, bristly dark brown fur raised on its back, dust kicking up, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view（text_guidance_scale 10） |
| karakasa | e05b3306-daaa-44cc-93d2-5f950ae1e1a8 | south | tsukumogami umbrella monster: a tall narrow CLOSED folded red paper umbrella standing upright like a cone, with one big round eye in the middle of the folded umbrella and a long red tongue hanging from a mouth under the eye, the bottom ends in ONE single bare human leg wearing ONE wooden geta sandal, standing on one leg, small and centered with empty space around it, JRPG enemy battle sprite, facing viewer（text_guidance_scale 14） |
| gomanohai | 74abd30a-493f-49c2-b762-0c0f2c48d37c | south-west | Edo period Japanese thief, middle-aged man with stubble, shifty eyes and sly grin, his head and cheeks wrapped in a white cloth like a hood that covers the top of his head and is knotted under his chin (hokkamuri, like a cartoon burglar), plain grey travel kimono, small bundle on his back, holding a short dagger, crouching sneakily, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view（text_guidance_scale 12） |
| hitotsumeKozo | 8d79cb36-bf9f-411a-a6c8-5a4f39c45f0d | south-west | Japanese yokai hitotsume-kozo, a small bald boy monk with one single huge eye in the middle of his face, long red tongue sticking out, wearing a plain blue-grey monk robe, holding a paper lantern on a stick, spooky, small and centered with empty space around it, full body standing, JRPG enemy battle sprite, three-quarter front view |
| chahakobi | 053916cb-44ed-48e4-a658-64393ff3f9db | south-west | Japanese karakuri clockwork tea-serving doll robot, a small doll with a white painted face and black hair holding a tray with a teacup, its wooden body has an open panel on the chest showing big brass gears and cogs, a large brass wind-up key sticking out from its back, it rolls on visible wooden wheels instead of feet, stiff mechanical pose, glowing red eyes, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view（text_guidance_scale 12。2px 上げた） |
| kappa | cfadc8a1-5f22-4694-8eac-19ed96430563 | south-west | Japanese river yokai kappa, green scaly skin, a flat white water dish on top of its head ringed by messy hair, yellow beak, brown turtle shell on its back, webbed hands with claws raised, menacing, small and centered with empty space around it, full body standing, JRPG enemy battle sprite, three-quarter front view |
| aooni | 1109776a-be8c-4138-af33-e50ef80b9874 | south-west | Japanese blue oni (aooni), bright blue skin, one big horn on the forehead, wild white hair, yellow and black striped tiger-skin loincloth, holding a black iron kanabo club with silver studs, angry face with fangs, full body standing, JRPG enemy battle sprite, three-quarter front view, small and centered with empty space around it |
| wanyudo | 360a36b2-c156-4ff8-bb96-39a7b3179b19 | south | Japanese yokai wanyudo, a burning wooden ox-cart wheel with small orange flames around its rim, in the center hub of the wheel is the angry face of a bald shaven-headed old monk, no horns, glaring eyes, the whole wheel is small and centered with lots of transparent empty space above and around it, JRPG enemy battle sprite, facing viewer（text_guidance_scale 12。2px 下げた） |
| karasuTengu | 7f9a68fc-22c7-4a38-88bb-08f2fd77ad54 | south-west | Japanese karasu-tengu, a crow-headed tengu warrior with a black crow head and sharp beak, large black feathered wings spread from its back, wearing white and red yamabushi mountain monk clothes with a small black tokin cap and pom-pom sash, holding a short sword, fierce, small and centered with empty space around it, full body standing, JRPG enemy battle sprite, three-quarter front view（上の余白がなかったので 95% に縮めた） |
| igaKunoichi | 486b875c-e979-4df5-950a-8377e6753db7 | south-west | Iga kunoichi enemy, a female ninja in a dark purple ninja outfit with a purple cloth mask covering her mouth and nose, long black ponytail, holding a kunai knife in each hand, cold sharp eyes, crouching ready stance, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view（98% に縮めた） |
| nekomata | 933cd89c-56b2-4a65-97ec-079779a72938 | south-west | Japanese yokai nekomata, a big sinister black and white cat standing on its hind legs, behind it TWO separate long black tails rising up and curling apart in a V shape, glowing yellow eyes, sharp fangs, blue ghost flames floating near it, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view（text_guidance_scale 12） |
| bakuto | 5c491400-51ba-4359-9c6e-a302cbbf1c2d | south-west | Edo period Japanese gambler (bakuto), tough man with his kimono slipped off one shoulder showing a tattooed arm, topknot, holding up a bamboo dice cup (tsubo) in one hand and two white dice in the other, smug grin, small and centered with empty space around it, full body standing, JRPG enemy battle sprite, three-quarter front view |
| isoonna | 8958fd78-b5e4-46c4-9c35-db40d4ee40ef | south | Japanese sea yokai iso-onna, a small pale ghostly woman in a white kimono standing on a small round black rock, her very long wet black hair hangs straight down to the rock, tiny white foam around the rock, the whole figure is small and centered with lots of transparent empty space on all four sides, full body, JRPG enemy battle sprite, facing viewer（text_guidance_scale 12） |
| ushioni | 3ae0eeaf-c8e8-47b9-b6d2-7f1a1c464e87 | south-west | Japanese sea yokai ushi-oni (gyuki), a monster with a horned black bull head with glaring red eyes and fangs on a huge spider-like body with six long jointed spiky legs, dark body, rising from the seashore, small and centered with empty space around it, full body, JRPG enemy battle sprite, three-quarter front view |
| kaizoku | b4517619-2549-4382-a689-d77d5223043b | south-west | Edo period Japanese pirate (kaizoku) of the western seas, rough sun-tanned sailor with a twisted blue headband, open short happi jacket over bare chest, baggy pants, holding a curved sword (katana), scarred angry face, small and centered with empty space around it, full body standing, JRPG enemy battle sprite, three-quarter front view（98% に縮めた） |
| gashadokuro | 999eaf16-f3ef-4333-b041-bf810ddd6a09 | south | Japanese yokai gashadokuro, a giant skeleton rising from the ground, big skull with glowing eyes and a large ribcage and two bony arms with claw fingers reaching forward, upper body only emerging from dark ground, ghostly purple glow, small and centered with empty space around it, JRPG enemy battle sprite, facing viewer |
| onryo | 7fba63f8-71bd-4c86-95a5-75d98b6d7e26 | south | Japanese yurei ghost floating in the air, a woman in a white kimono with her head bowed forward so that her long straight black hair hangs down in front of her face like a curtain, covering her face completely except one glaring eye showing through a gap in the hair, limp hands dangling forward, no feet, the bottom of the kimono fades into a wispy ghost tail, small and centered with empty space around it, JRPG enemy battle sprite, facing viewer（text_guidance_scale 14。生成後、残った足を Pillow で消して裾を細い尾にし、髪のすき間に目を描き足した） |

第 1 章の 4 体の作り直しの記録:

- からくり人形: 1 回目は歯車もゼンマイの鍵も見えず、からくりと分からなかった。2 回目で「開いた胸の歯車」「背中の大きな鍵」を前に出して採用（計 2 回）。
- 化け提灯: 1 回目は目が 2 つで愛嬌のある顔になった。2 回目は「single huge eye」「torn ripped paper」で一つ目と裂けた口になったが、画像の上下の端まで描かれて頭の輪が切れているか分からなかった。3 回目は 2 回目を init_image にして「small, centered with empty space」で余白を作り採用（計 3 回）。
- ごろつき・鉄瓶: 1 回目で採用（各 1 回）。

- 足元をそろえるため、からくり人形は 2px 上、ごろつきは 1px 上、鉄瓶は 1px 下へずらした（化け提灯は鬼火と同じく浮いているのでそのまま）。

第 2 章の 5 体の作り直しの記録:

- 追い剥ぎ浪人: 1 回目は着物に破れがなく、無精髭も見えなかった。2 回目は刀が鎖のように見え、足元に灰色の影が残った。3 回目（1 回目を init_image に、strength 150）は元の整った着物が残り、ひげも口ひげになった。4 回目は init_image なしで「tattered rags」を先頭に出し、text_guidance_scale 11 にして、破れ・継ぎ・無精髭が出たが、足元が y = 62 で上の余白がなく、足元をそろえると頭が切れた。5 回目は 4 回目を 88% に縮めて余白を作ったものを init_image（strength 300）にして採用（計 5 回）。
- 川獺: 1 回目はにこやかな顔で、いたずらっぽく見えなかった（手の物も魚でなく器）。2 回目で「sly」「sneaky smirk with narrowed eyes」「holding a fish」を前に出して採用（計 2 回）。
- ゼンマイ犬・雲助・金鯱からくり: 1 回目で採用（各 1 回）。
- 足元をそろえるため、ゼンマイ犬・雲助・金鯱からくりは 1px 上へずらした（追い剥ぎ浪人と川獺はそのまま）。

第 3 章の 5 体の作り直しの記録:

- 赤鬼: 1 回目は金棒が槌（ハンマー）の形になった。2 回目は金棒を肩に担いだ形はよかったが、先が丸い棍棒で鋲がなく、腰布の虎縞も見えなかった。3 回目は虎縞が出たが、金棒が両端に玉の付いた鉄アレイの形になった。4 回目（2 回目を init_image に、strength 130）も鋲と縞が出なかった。5 回目は 2 回目に銀の鋲と黒の縞を Pillow で描き足して init_image（strength 300）にし、鋲と縞は出たが角が薄い灰色になって髪に埋もれた。上限の 5 回に達したので 5 回目を採用し、角を Pillow で生成りに塗って黒の輪郭を付けた（計 5 回）。どの回も尻尾が付いた（要件外なのでそのまま）。
- 一反木綿: 1 回目は鯨かおたまじゃくしのような塊になった。2 回目は長い布の帯になったが、目がなく、輪郭が灰色で、両端に茶色の棒が付いた。3 回目は西洋のおばけのような形になった。4 回目（2 回目を init_image に、strength 150）は目が崩れ、輪郭が消えた。5 回目は 2 回目の輪郭を黒にし、棒を消し、目を描き足して init_image（strength 300）にして採用（計 5 回）。
- 生臭坊主: 1 回目は数珠が金の鎖と飾りに見え、衣が汚れていない黒で、上下の余白もなかった。2 回目は瓢箪が腹の袋に見え、顔もにやけていなかった。3 回目で瓢箪とにやけ顔が出たが、手の数珠が棒に見えた。4 回目（3 回目を init_image に、strength 200）も棒に見えた。5 回目は 3 回目の首に数珠を描き足して init_image（strength 300）にして採用（計 5 回）。
- からくり牛車: 1 回目は牛に歯車が見えず、からくりと分からなかった。2 回目は 1 回目を init_image（strength 150）に「big round brass gears」を足して、牛の脇と車輪の軸に歯車が出たので採用（計 2 回）。
- 酒呑の大鬼: 1 回目は顔がにこやかで、足元が y = 94 で上の余白がなく、足元をそろえると頭が切れた。2 回目は 1 回目を 90% に縮めて足元を y = 90 に置いたものを init_image（strength 200）に「fierce furious glaring eyes, angry frowning brows」を足して採用（計 2 回）。
- 足元をそろえるため、一反木綿は 5px 下へずらした（ほかの 4 体はそのまま）。
- init_image は base64 で渡すと途中で切れて失敗したので、`get_upload_url` でアップロードし、`init_image_url` に `upload:<ID>` を渡した。

第 4 章の 5 体の作り直しの記録:

- 伊賀者・毒蜘蛛: 1 回目で採用（各 1 回）。
- からくり鷹: 1 回目は胸が真鍮の玉、翼が金の縁取りだけで、歯車が見えなかった。2 回目（1 回目を init_image に、strength 150、「cogwheels with visible teeth」）も玉のままだった。3 回目は 1 回目の胸と翼の付け根に歯車を Pillow で描き足して init_image（strength 300）にし、胸に歯のある歯車が出たので採用（計 3 回）。
- 上忍 朧: 1 回目は頭巾付きの長い衣で、忍びより隠者に見えた。2 回目は「tight-fitting shinobi shozoku」「tabi」「leg wraps」で忍び装束になったので採用（計 2 回）。
- 蛇骨の権六: 1 回目は頬の傷がなく（目の上の赤い印だけ）、頭が上端に付き足元が y = 95 だった。2 回目は 1 回目を 88% に縮め、頬に傷を描き足して init_image（strength 250）にし、余白は直ったが傷が消えた。3 回目（2 回目に傷を描き足して strength 350）も傷が消えて額の赤い印になった。4 回目は 2 回目の頬に傷を Pillow で描き直して採用（計 4 回。pixflux は細い傷を消してしまう）。
- 足元をそろえるため、毒蜘蛛は 5px、朧は 1px 下へずらした（伊賀者・権六はそのまま。からくり鷹は飛んでいるのでそのまま）。

第 5 章の 5 体の作り直しの記録:

- 鉄砲足軽・からくり俵・化け鼠: 1 回目で採用（各 1 回）。
- 米問屋の用心棒: 1 回目は上の余白が 2 行しかなく、足元が y = 61 で、足元をそろえると髷が切れた。2 回目は 1 回目を縮めて余白を作ったものを init_image（strength 300）にして採用（計 2 回）。
- 百俵からくり: 1 回目は金色のロボットのようになり、俵にも歯車にも見えなかった。2 回目は「straw texture」「rope ties」で俵の山になったが、歯車がなく、上の余白もなかった。3 回目は 2 回目を 90% に縮め、肩と膝に暗い青銅の歯車を描き足して init_image（strength 300）にして採用（計 3 回。明るい真鍮色の歯車は藁に埋もれて見えなかったので、暗い色にした）。
- 足元をそろえるため、鉄砲足軽は 1px 上、化け鼠は 2px 下へずらした（ほかの 3 体はそのまま）。

第 6 章の 6 体の作り直しの記録:

- 海坊主・亡霊武者: 1 回目で採用（各 1 回）。
- 南蛮からくり兵: 1 回目は肩に金の飾りがあるだけで歯車が見えなかった。2 回目は「open window in the chest showing big round brass cogwheels」で胸と膝に歯車が出たので採用（計 2 回）。
- 外法使い: 1 回目は手の紫のものが水晶に見え、炎か護符か分からなかった。2 回目は「ofuda talisman strip with red writing」「burning with bright purple fire」で護符と紫の炎が出たので採用（計 2 回）。
- 平家蟹: 1 回目は甲羅に人の顔が見えなかった。2 回目は 1 回目の甲羅に怒った顔を描き足して init_image（strength 350）にして採用（計 2 回）。
- 南蛮大筒からくり: 1 回目は胸が青い画面のようで歯車と分からず、足元の下の余白も足りなかった。2 回目は 88% に縮めて胸に歯車を描き足し、init_image（strength 300）にして採用（計 2 回）。
- 足元をそろえるため、南蛮からくり兵・海坊主は 2px 上（上の余白を 1 行残すため、足元は地面の行より 1px 低い）、亡霊武者・外法使い・南蛮大筒からくりは 1px 下、平家蟹は 4px 下へずらした。

テストプレイのフィードバック（雑魚敵が少ない）で足した序章〜京の 10 体の記録（採用した 10 体で計 20 回。使わなかった野衾の 5 回を含めると 25 回）:

- 狢・河童・青鬼・一つ目小僧: 1 回目で採用（各 1 回）。
- 茶運び人形: 1 回目は赤い袴の少女に見え、背中の鍵が小さくからくりと分からなかった（レビューで指摘）。2 回目で「open panel on the chest showing big brass gears」「wooden wheels instead of feet」で採用（計 2 回）。
- 輪入道: 1 回目は車輪の中の顔に角と耳があり、入道（坊主頭の男）でなく鬼に見えた（レビューで指摘）。2 回目は坊主頭になったが炎が画像の上端で切れた。3 回目で「small flames around its rim」「lots of transparent empty space」で採用（計 3 回）。
- 猪: 1 回目は立ち姿で突進の構えでなかった。2 回目で「charging, head lowered」で採用（計 2 回）。
- 鎌鼬: 1 回目はネズミに見えた。2 回目はつむじ風が画像の端に触れ、鎌が細かった。3 回目で「front legs end in large sickle blades」「small and centered」で採用（計 3 回）。
- 傘お化け: 1 回目・2 回目は足が 2 本で、傘を持った別の生き物になった。3 回目で「closed folded umbrella IS the body」「ONE single leg」で採用（計 3 回）。
- 護摩の灰: 1 回目は子どもの顔、2 回目は頬かむりでなく鉢巻になった。3 回目で採用（計 3 回）。
- 野衾（使っていない）: 前足と後ろ足のあいだの皮膜が、5 回とも虫の羽か、皮膜のない姿になった（c57e1650・30f581c3・aeaa9989 ほか）。上限の 5 回に達しても必須の項目（皮膜）を満たさなかったので採用せず、東海道の敵を一つ目小僧に差し替えた。
- 足元をそろえるため、鎌鼬は 4px 下、一つ目小僧は 5px 下、河童は 3px 下、輪入道は 2px 下、狢・傘お化け・茶運び人形は 2px 上、護摩の灰は 3px 上、猪は 1px 上へずらした。

伊賀〜原城に足した 9 体の記録（計 15 回。Pillow での描き直し 1 回を含む）:

- 烏天狗・伊賀のくノ一・博徒・牛鬼・海賊・がしゃどくろ: 1 回目で採用（各 1 回）。
- 猫又: 1 回目は尾が 1 本しか見えなかった。2 回目で「TWO separate long tails ... in a V shape」で採用（計 2 回）。
- 磯女: 1 回目は髪が足元まで届かず、2 回目は岩と波しぶきが画像の端で切れた。3 回目で「small round black rock」「lots of transparent empty space on all four sides」で採用（計 3 回）。
- 怨霊: 1 回目は顔が髪で隠れず足があった。2 回目も顔が見えた。3 回目で顔は髪で隠れたが足が残った。4 回目は 3 回目の足を Pillow で消して裾を細い尾に描き替え、髪のすき間に光る目を描き足して採用（計 4 回）。
- 足元をそろえるため、烏天狗（95%）・伊賀のくノ一（98%）・海賊（98%）は縮めて足元を y = 58 に置き、猫又は 1px 下、博徒・がしゃどくろは 2px 上、牛鬼は 1px 上へずらした（磯女・怨霊はそのまま）。

第 7 章（北前船・金沢）の 8 体の記録（計 12 回。Pillow での描き直し 2 回を含む）。設定は上と同じ（64 × 64、ボスの影武者・夜叉丸は 96 × 96、direction south-west）:

| ID | PixelLab のジョブ ID | プロンプト |
| --- | --- | --- |
| funayurei | cdca7381-9abd-4cea-8662-709a7786ad9e | ghost of a drowned Japanese fisherman sailor (funayurei), gaunt man with a pale blue-green skull-like face and hollow glowing eyes, dripping wet messy black hair, white twisted headband, tattered grey-blue sailor clothes, raising a long-handled wooden ladle (hishaku) high above his head with both hands, lower body is a swirl of dark blue sea water and white foam with no legs, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（text_guidance_scale 11。柄杓の先がへらに見えたので、Pillow で丸い椀に描き直した） |
| karakuriHanshi | 8febdcf5-9dbb-44d0-844c-ce7d1918acab | clockwork robot samurai made of riveted dark iron plates, robot body and robot head with a black iron topknot and glowing red eyes, wearing a light blue Edo samurai kamishimo vest with big stiff triangular winged shoulder pieces, round brass cogwheels with teeth exposed in its open chest and at its knees, holding a long straight yari spear upright, full body standing, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（text_guidance_scale 11） |
| yukiOnna | 021324a6-fe78-4899-8146-694a7224dc53 | Japanese snow woman yokai yuki-onna, beautiful pale blue-white skinned woman with very long straight black hair, pure white kimono, breathing a cold icy blue mist from her lips, snowflakes swirling around her, cold expressionless eyes, full body standing, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view |
| kagaShinobi | f37fb515-f901-4a9c-bd97-a0264637e0b6 | Japanese snow country ninja, white and light grey ninja outfit with a white hood and white face mask covering the face except narrow eyes, dark grey belt and leg wraps, holding a short straight ninja sword in a reverse grip, crouching ready stance, full body, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（黒い伊賀者と見分けるため白い装束にした） |
| yukiNyudo | 6eaefa27-e89c-4927-a401-8b28481ed424 | Japanese snow giant yokai yuki-nyudo, a huge hulking round monk-shaped giant made of packed white snow, bald round snowy head, two dark angry eyes and a wide mouth, thick snowy arms raised, icicles hanging from its arms, light blue shading on white snow, full body, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view |
| kinpakuNingyo | 390c337f-51ea-4761-be53-57828b753f1e | gold leaf covered karakuri clockwork doll, shiny gold kimono, gold painted doll face with black eyes and red lips, black bobbed hair, a round brass cogwheel on its chest, brass wind-up key on its back, holding an open golden folding fan in one hand, full body standing, JRPG enemy battle sprite, three-quarter front view（`enemies/karakuriNingyo.png` の赤い着物と顔を金に塗り替えたものを init_image に、init_image_strength 150。肌色のままの顔と手を金に塗り、扇を Pillow で描き足した） |
| kagemusha | 948529ac-4674-4ed3-b364-6bb90db16a96 | karakuri clockwork impostor of a Japanese daimyo lord, wearing ornate purple and gold daimyo court robes (hitatare) and a tall black eboshi court hat, expressionless white porcelain doll face with blank eyes, a cracked opening in its chest showing brass cogwheels and glowing blue light, holding a drawn katana, stiff menacing stance, full body, JRPG boss battle sprite, three-quarter front view（96 × 96） |
| yashamaru | 57422ebf-c01d-445f-9394-536289f9ec09 | Edo period Japanese evil sorcerer (onmyoji) young man, long unkempt black hair down to his shoulders, pale white face with sharp eyes, a white hannya demon mask with horns pushed to the side of his head, loose dark purple robe with wide sleeves and a black sash, holding up white paper ofuda talismans burning with purple fire, purple flames swirling around him, menacing, full body standing, JRPG boss battle sprite, three-quarter front view（96 × 96。面は横に寄せず顔にかかったが、物語の「割れた面」に合うのでそのまま使った） |

- 雪女・加賀の忍び・雪入道・影武者・夜叉丸: 1 回目で採用（各 1 回）。
- 船幽霊: 1 回目は西洋のシーツお化け、2 回目は白い着物と黒髪の女になり雪女と見分けにくく、柄杓も壺に見えた。3 回目で男の水夫の亡霊になったが柄杓の先がへらに見えた。4 回目は Pillow で柄杓の先を丸い椀に描き直して採用（計 4 回）。
- からくり藩士: 1 回目は西洋風の甲冑で地面に影が残り、2 回目は人間の侍に見えた。3 回目で「clockwork robot ... riveted dark iron plates」を前に出して採用（計 3 回）。
- 金箔からくり: 1 回目はかわいい娘、2 回目は西洋のロボットになった。3 回目は既存のからくり人形を金に塗った下絵から作り、4 回目に顔と手を金に塗って扇を描き足して採用（計 4 回）。
- 足元をそろえるため、64 × 64 の 6 体は足元を y = 58、96 × 96 の 2 体は 89% に縮めて足元を y = 90 に置いた。

第 8 章（奥州街道・江戸）の 7 体の記録（計 12 回。Pillow での描き直し 4 回を含む）。設定は上と同じ（64 × 64、ボスの火車からくりは 96 × 96、direction south-west）:

| ID | PixelLab のジョブ ID | プロンプト |
| --- | --- | --- |
| hitsukeTozoku | 855d9943-e31c-4767-a3dd-b7caac630173 | Edo period Japanese arsonist bandit (hitsuke tozoku), man with a dark brown cloth tied over his head and around his cheeks (hokkamuri), dark indigo short kimono and tight black leggings, holding up a burning wooden torch with a bright orange flame in one hand, sneaky crouching stance, full body, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（頭と頬の布を Pillow で白地に藍の豆絞りの手拭いに描き替えた） |
| kasha | 503b3531-c284-4f5d-bdb6-a181188388d6 | Japanese yokai kasha, a large black and orange demon cat walking on four legs, its whole body wreathed in roaring red and orange flames, two tails of fire, fierce glowing yellow eyes and sharp fangs, full body, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view |
| karakuriDoshin | 15dda38c-91de-4fd5-bbff-7e6b26ae3e4d | clockwork robot Edo police officer (karakuri doshin) made of riveted dark iron plates, robot head with a black iron topknot and glowing red eyes, wearing a black haori jacket, round brass cogwheels exposed in its open chest, holding up a silver iron jitte truncheon with a hook and a red tassel in its right hand, full body standing, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（十手を Pillow で、L 字の鉤のある銀の棒と赤い房に描き直した） |
| hatamotoYakko | 9ad16e96-ab16-4acf-b3fb-fe44c58b9f0f | Edo period Japanese hatamoto-yakko street gang samurai, swaggering arrogant man with a big bushy black handlebar mustache and a huge tall topknot, very gaudy flashy kimono with bold purple and white pattern and a wide red sash, holding a very long drawn katana over his shoulder, full body standing, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view |
| hinezumi | 859bec87-0394-48cb-b85d-73e97a01ad5d | Japanese yokai fire rat (hinezumi), a small rat-shaped creature whose entire body and fur is made of living orange and yellow fire, flickering flame fur all over its back, glowing red eyes, long thin tail ending in fire, small and centered with lots of empty space around it, JRPG enemy battle sprite, three-quarter front view（text_guidance_scale 11） |
| okuriOkami | 4f2678f4-0890-4520-8a79-d82d4133632d | Japanese okuri-okami, a large lean grey wolf with dark grey back fur and pale grey belly, bared white fangs, glowing yellow eyes, head lowered stalking menacingly, full body standing on four legs, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view |
| kashaKarakuri | 9890dfc1-087a-4884-aa2b-1eff17d14d6e | giant karakuri clockwork fire wheel machine, a huge wooden cart wheel with iron rim burning with red and orange flames, a fierce demon cat face with fangs and glowing yellow eyes at the hub in the center, two big jointed dark iron robot arms with claws sticking out from both sides of the wheel, large round brass cogwheels with teeth clearly visible at the axle beside the hub, menacing, full body, JRPG boss battle sprite, three-quarter front view（96 × 96、text_guidance_scale 11。上端の離れた火の粉 2 点を消した） |

- 火車・旗本奴・送り狼: 1 回目で採用（各 1 回）。
- 火付け盗賊: 1 回目は布が鉢巻きのようで頬を覆わず、2 回目（eb7b4f53-0830-43cf-8b67-05265f396092）は布がなかった。3 回目は 1 回目の頬に茶色の布を Pillow で描いたがひげに見えた。4 回目は頭から頬・口もとまでを白地に藍の豆絞りの手拭いに描き替えて採用（計 4 回）。
- からくり同心: 1 回目は十手が先の丸い棍棒に見え、2 回目（70b94472-1821-44e1-aebf-df6ae8b0bbef）は細い棒だけで鉤がなかった。3 回目は 1 回目の棒を Pillow でまっすぐな銀の棒に描き直したが鉤が小さく、4 回目に鉤を L 字に大きくして採用（計 4 回）。
- 火鼠: 1 回目（e594f343-a20f-46e6-9c24-d27b323547b1）は赤茶の毛の鼠に炎が少し付いただけだった。2 回目で「entire body and fur is made of living … fire」で採用（計 2 回）。
- 火車からくり: 1 回目（38b0d1aa-2f16-451e-9b08-7e24e9dd6ed8）はからくりの腕と歯車がなかった。2 回目で腕と歯車を前に出して採用（計 2 回）。
- 足元をそろえるため、64 × 64 の 6 体は足元を y = 58（火車は 97% に縮めた）、火車からくりは 89% に縮めて足元を y = 90 に置いた。

終章（将軍の間・江戸城）の 4 体の記録（計 13 回。Pillow での描き直し 1 回を含む）。設定は上と同じ（`create_image_pixflux`、64 × 64、`no_background: true`、黒の 1px 輪郭（`single color black outline`）、view `side`、medium detail、direction south-west）:

| ID | PixelLab のジョブ ID | プロンプト |
| --- | --- | --- |
| karakuriOniwaban | 23aa52df-c00d-4056-9119-40516a822f68 | clockwork robot ninja spy (karakuri oniwaban), robot body made of riveted dark bronze-green iron plates, robot head covered by a dark green ninja hood, ONE single round glowing red eye lens in the middle of its metal face, brass cogwheels with teeth at its shoulders and knees, holding a kusarigama: a silver curved sickle in one hand with an iron chain hanging from it, crouching ready stance, full body, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（1 回目の f67ee56b-e2dd-4cbb-a607-fa011b2589a7 の 2 つの目を 1 つの赤いレンズにし、左手の塊を鎖鎌（銀の鎌と鎖と分銅）に、肩と膝に歯のある真鍮の歯車を Pillow で描き足したものを init_image に、init_image_strength 300） |
| ookuBakeneko | 36ece03a-c151-4ef4-a05c-c4cc6a8fbbc1 | Japanese monster cat yokai (bakeneko) disguised as a court lady of the shogun's inner palace, walking upright on two legs, wearing a luxurious red and gold embroidered uchikake robe, a large fierce cat head with glowing green eyes, open mouth with sharp white fangs, sharp white claws out on its paws, two split cat tails rising behind her, menacing, full body, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（1 回目の 4edf4bdc-a2ce-44cc-afb6-700053355e86 の口に白い牙、両手に白い爪を Pillow で描き足したものを init_image に、init_image_strength 300） |
| karakuriHatamoto | d944d3ab-d693-4ea8-8d75-11149f76292c | big bulky heavy clockwork robot samurai (karakuri hatamoto), made of black lacquered iron plates with gold trim, full Japanese samurai yoroi armor, kabuto helmet with a large golden crest, glowing red eyes, a brass wind-up key sticking out of its back, holding a large naginata polearm with a curved silver blade at its top, menacing wide stance, full body, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（1 回目の 0a05148d-0be9-4f30-92c6-9833d179c801 の足元の影を消し、柄の先の真鍮の飾りを反った銀の刃に、右肩の後ろにゼンマイの鍵を Pillow で描き足したものを init_image に、init_image_strength 300。生成後、目がはっきりしなかったので、面頬の暗い所に赤く光る細い目を Pillow で描き足した） |
| karakuriKinju | 9823477d-3346-495d-84b9-71775c92296c | slim karakuri clockwork page boy doll (kinju), porcelain-white expressionless doll face, neat black young page-boy hair with front bangs (maegami), wearing a pale purple formal kimono and grey hakama trousers, a small brass cogwheel at the open collar, holding a short drawn silver wakizashi sword, stiff upright stance, full body, small and centered with empty space around it, JRPG enemy battle sprite, three-quarter front view（1 回目の ac3b787a-b4d9-4e77-a4b3-a17287981318 の黒い棒を銀の脇差に、襟元に真鍮の歯車を Pillow で描き足したものを init_image に、init_image_strength 300。上限の 5 回に達して採用。襟元の歯車と斜めの向きは満たしていない） |

- からくり御庭番: 1 回目は目が 2 つで、鎖鎌が黒い塊に見え、関節の真鍮も丸いだけで歯車に見えなかった。2 回目（aa1a25fa-fb8a-40f3-8ada-43486f96c56d、text_guidance_scale 11）は一つ目になったが、頭が潜水ヘルメットのようで頭巾でなく、鎖も見えなかった。3 回目は 1 回目に単眼・鎖鎌・歯車を描き足した下絵から作り、すべて満たしたので採用（計 3 回）。
- 大奥の化け猫: 1 回目は打掛・二股の尾はよかったが、牙と爪が見えなかった。2 回目（bbda646b-ba76-4346-9ece-bd0cd742c4bc、三毛、text_guidance_scale 11）は牙が出たが、尾が 1 本しか見えず爪もなかった。3 回目は 1 回目に牙と爪を描き足した下絵から作り、すべて満たしたので採用（計 3 回）。黒猫の猫又・火車と見分けるため、直立して赤と金の打掛を着せた。
- からくり旗本: 1 回目は薙刀の刃が真鍮の槌のような飾りになり、背中の鍵が分からず、足元に黒い影が残った。2 回目（2999e2cf-2173-4100-85c8-73b505889596、text_guidance_scale 11）は鍵が出たが、薙刀が細い棒で刃がなく、体も細くなった。3 回目は 1 回目の影を消し、刃と鍵を描き足した下絵から作り、刃・鍵・前立てが出たが、目が赤い点 1 つではっきりせず、刃の先が上端に付いた。4 回目は 3 回目の目を Pillow で描き足して採用し、刃の先の余白は配置のときに縮めて作った（計 4 回）。
- からくり近習: 1 回目は脇差が黒い棒に見え、襟元に歯車がなく（帯の金具だけ）、人の子に見えた。2 回目（ff865e0d-2cc7-48ed-be03-4b01b4cee893、text_guidance_scale 11）は脇差が出たが、髪が乱れ、足元に灰色の影が残り、歯車もなかった。3 回目は 1 回目に脇差と襟元の歯車を描き足した下絵から作り、脇差・白い顔・前髪・薄紫の着物と袴は出たが、歯車が茶色の市松模様になり、体も真正面だった。4 回目（13b69a55-b9d7-4adb-88c2-115bd148106f、init_image なし、「body turned three-quarter to the left」、text_guidance_scale 11）は頭の大きい二頭身で刀が 2 本、歯車も帯の位置になった。5 回目（757b4050-1f85-4869-9aa5-c3d166954658、3 回目の襟元に大きい歯車を描き直したものを init_image に、strength 120、text_guidance_scale 10）は顔が肌色になり、歯車も胸から腹へずれ、向きも真正面のままだった。上限の 5 回に達したので、必須の項目をすべて満たした 3 回目を採用した（計 5 回）。残った ×: 「襟元に真鍮の歯車が見える」（茶色の市松模様に見える）、「斜め前（左下向き）」（体が真正面。脇差は左下に向けている）。
- 足元をそろえるため、4 体とも足元を y = 58 に置いた。からくり御庭番は 95%、からくり旗本は 90% に縮めた（最近傍補間）。大奥の化け猫は一様に縮めると牙と爪が崩れたので、打掛の行（y = 42・46・50・54）を 4 行抜き、からくり近習は袴の行（y = 46・50・54）を 3 行抜いて背丈を合わせた（顔はそのまま）。

終章（将軍の間・江戸城）のボス 3 体の記録（計 15 回。Pillow での描き直し・下絵づくりを含む）。設定は上と同じ（`create_image_pixflux`、96 × 96、`no_background: true`、黒の 1px 輪郭、view `side`、medium detail、direction south-west）。
3 体とも、生成した 96 × 96 を最近傍補間で 89%（85 × 85）に縮め、左右は中央（x = 5 から）、足元（いちばん下の不透明な行）を y = 90 に置いた（下に透明な行が 5 行残る）。

| ID | PixelLab のジョブ ID | プロンプト |
| --- | --- | --- |
| onizukaTenzen | 3d06cf57-40fd-4a2f-bd07-0c2cbc88ae42 | burly middle-aged Edo period Japanese samurai swordsman, human man in his forties, black topknot, a long thin red scar running diagonally across his face over one eye, fierce glaring eyes, black haori jacket over black kimono, a small red oni demon face crest on his chest, grey hakama trousers, crouched low in an iai quick-draw stance, his right hand gripping the hilt of a long katana sheathed in a black scabbard at his left hip, blade not drawn, full body, JRPG boss battle sprite, three-quarter front view（96 × 96、text_guidance_scale 10。2 回目の 6d257dbf-56b7-4976-b7b2-1ea67a63b6bc の抜き身の刀と地面の影を消し、鞘の口から柄を描き足して右の拳を柄の近くへ移し、顔の赤い塗りを細い傷の線に描き直したものを init_image に、init_image_strength 250。生成後、89% に縮めて足元を y = 90 に置き、胸の紋を Pillow で鬼の顔（金の角・黄の目・白い牙）に描き直した） |
| washio | 6dab7636-3dcf-43df-ad16-58b2a3ce7029 | thin gaunt elderly Edo period Japanese shogunate councilor, human man in his late fifties, pale cold face, grey-streaked topknot, a round brass monocle over his right eye, black kamishimo with big stiff triangular winged shoulder pieces spread wide over a deep crimson kimono, black hakama, holding an open red folding fan in his right hand, glowing golden brass cogwheels behind his back, arrogant upright standing pose, full body standing, JRPG boss battle sprite, three-quarter front view（96 × 96、text_guidance_scale 10。3 回目の f9abca24-c192-47cf-b28b-91fe7903f085 の足元の影を消し、両肩に黒い三角の肩衣を Pillow で描き足したものを init_image に、init_image_strength 250。生成後、89% に縮めて足元を y = 90 に置き、輪郭のなかった背中の歯車と扇の外側に黒の 1px 輪郭を付けた） |
| karakuriDaigongen | ac9dea9f-2148-41b8-b6ab-052bbba7f3a6 | giant multi-armed golden clockwork Buddhist deity statue machine (karakuri gongen idol), gilded gold and brass body with black lacquer and crimson robes, a huge brass cogwheel halo with square teeth behind its head, a pale stern human old man's face on its head, four brass mechanical arms with claw hands, two black cannons on its shoulders, glowing blue spiral springs inside its open belly, awe-inspiring and menacing, full body, JRPG boss battle sprite, three-quarter front view（96 × 96、text_guidance_scale 10。2 回目の abb33186-cba6-434c-9914-e289e8473024 の下の 1 対の砲身を真鍮の腕に塗り替えて先に爪の手を描き、光背の外側に歯を描き足したものを init_image に、init_image_strength 250。生成後、89% に縮めて足元を y = 90 に置き、丸くつぶれた光背の上半分に黒の輪郭付きの歯車の歯を Pillow で描き直した） |

- 鬼塚典膳: 1 回目（d977f28b-9000-4d96-846f-06a60a8ab838）は刀を抜いて構え、顔に傷がなかった。2 回目（6d257dbf-…）は居合の腰の構えと鞘は出たが、反対の手に抜き身の刀を持ち、傷が赤い塗りに見え、地面に影が残った。3 回目（3c326696-aa70-4a2a-9047-bd76db4f34cf）は正面向きで刀身が見え、紋が四角だった。4 回目は 2 回目を Pillow で直した下絵から作り、鞘に納めた刀・細い傷・影なしになったが、紋が赤と金の四角のままだった。5 回目に紋を Pillow で鬼の顔に描き直して採用（計 5 回）。
  - 上限の 5 回で採用。残った ×: 「右手が左腰の刀の柄を握っている」（拳は鞘の口の柄頭のすぐ手前にあり、柄を握っているとまでは言い切れない。居合で腰を落とし、刀は鞘に納まっている点は ○）。
- 鷲尾但馬守宗衡: 1 回目（f857d563-7df8-4a0b-b0ff-6de30e3a23e9）は太った老人で、片眼鏡がなく、扇が手を離れて浮き、地面に影があった。2 回目（bd804bf5-7b47-4080-9053-9c0ed3a51733）は片眼鏡・扇・歯車は出たが、足が画像の下で切れ、肩衣がなく、オレンジの矢のようなごみが付いた。3 回目（f9abca24-…）は全身・片眼鏡・扇・背中の歯車がそろったが、裃の肩衣が張っておらず、足元に影が残った。4 回目は 3 回目に肩衣を描き足した下絵から作り、すべて出たが、背中の歯車と扇に黒の輪郭がなかった。5 回目に Pillow で黒の輪郭を付けて採用（計 5 回。最後の判定で × なし）。あごひげはプロンプトの clean-shaven にかかわらず残った（要件の項目ではない）。
- からくり大権現: 1 回目（dc4894bd-a3b3-49bf-a26c-d8c2c1dfa1a2）は腕が 2 本の西洋風の鎧で、顔は仮面に見え、肩の大砲もはっきりしなかった。2 回目（abb33186-…）は頭に青白い人の顔、肩の大砲 4 門、腹の青いばねが出たが、光背が歯のない輪で、腕が 2 本だった。3 回目（9237c6b1-299d-4ff3-91b1-b5cbc28b9101）は歯のある光背になったが、顔が金色で人の顔に見えず、腕も 2 本だった。4 回目は 2 回目の下の砲身を真鍮の腕に塗り替え、光背に歯を描き足した下絵から作り、腕 4 本になったが、光背の歯がつぶれて丸い輪に戻った。5 回目に光背の上半分の歯を Pillow で描き直して採用（計 5 回。最後の判定で × なし）。
- 足元をそろえるため、3 体とも 89% に縮めて足元を y = 90 に置いた（典膳・鷲尾・大権現の不透明な範囲は、それぞれ x 24〜81・y 15〜90、x 16〜81・y 14〜90、x 7〜87・y 4〜90）。

## 物（`objects/`）

マップに置く物の画像。`src/data/sprites.ts` の `OBJECT_DEFS`、マップの NPC の `object` で使う。葛籠は 1 コマ 16 × 16（タイルと同じ）で、横に並べた 2 コマ（列 0: 閉じた姿、列 1: 開いた姿）。ほかの物は 32 × 32 の 1 コマで、下端の中央をタイルの下端の中央に合わせて置く（町の人と釣り合う大きさ）。

| ID | 作り方 |
| --- | --- |
| tsuzura | 葛籠（宝箱）。`python3 scripts/draw_tsuzura.py public/assets/objects/tsuzura.png` で手で描いた（上面は生成り・黄土の網目、前面は茶の網目、中央に朱の紐。開いた姿は蓋を奥に立て、中の暗がりを見せる）。PixelLab の `create_image_pixflux`（32 × 32、high top-down、黒の 1px 輪郭）で 2 回作ったが（4bc9d422-2f75-4458-b4d3-9778c1a12b03、100b7c5b-053e-4231-ab63-084b2dd88d5a）、どちらも 20px を超え、16 × 16 に縮めると網目がつぶれて葛籠と分からなかったため使っていない |

### 人でない物（32 × 32）

テストプレイで「主要人物以外のキャラクターに画像がない」と指摘されたため、色の仮表示だった物 26 か所に 24 種類の画像を作った（文机と石碑は 2 か所ずつで使う）。
`create_1_direction_object`（size 32、view `top-down`）。size 32 では 1 回で 64 個の候補ができるので、`item_descriptions` に物ごとの説明を並べて 1 回で作り、`select_object_frames` で選んだものを `https://api.pixellab.ai/mcp/objects/<ID>/download`（PNG）から取った。共通の description: Edo period Japan RPG map prop, pixel art, dark outline, muted traditional colors

- 1 回目（4c276f4a-a642-42fb-825f-3aca8d945e76）で 19 種類を採用: hokora・kibako・ningyoTana・zenmaiSochi・niguruma・oodako・senryobako・shachiDaiza・sekihi・kakejiku・jizo・komeKikai・ushi・shoroAto・haka・saidan・tsuka・zenmaiTana・ransaiTsukue。説明は各物の英語の説明（例: hokora は small wooden Shinto roadside shrine (hokora) with tiny gabled roof and red paper streamers, on a stone base）
- 1 回目で作り直したもの: fuzukue（脚の長い洋机になった）、ningyo（胸のゼンマイが見えない）、butsuzo（首がある）、ishidan（石段が見えず穴に見えた）、jikkenDai（護符の箱が青く光っていない）
- 2 回目（b11c522e-253c-4b13-8a4c-be8854904f04）で fuzukue（very low Japanese floor writing desk … short stubby legs）・ningyo（chest panel open revealing a bright golden brass coiled spring）・butsuzo（NO HEAD … the head lies on the ground beside it）・jikkenDai（iron box … glowing bright blue symbols）を採用。各 3 通りの言い方で作り、要件を満たすものを選んだ
- ishidan: 2 回目は段が描けたが 32 × 32 を埋めて透過の余白がなく、まわりのタイルを覆うため作り直した

- 3 回目（89dcac26-52b0-4ab4-8b12-4806560bdbbc）で ishidan を採用。description の終わりを small isolated object with empty transparent space around it にし、説明を small square opening in the ground with a low grey stone rim, inside it grey stone steps go down into darkness, only 20 pixels wide, transparent background around の言い方で 4 通り作り、透過の余白があり段の見えるものを選んだ
- 判定の観点（全物共通）: 説明の主な特徴が見える、背景が透過、見下ろし気味でタイルと矛盾しない、濃い輪郭、落ち着いた配色（出島・研究所の洋物を除く）、32 × 32 に収まり下端が地面、ほかの物と見分けがつく。ゲーム画面で工房・鍵屋の辻・鬼の巣・研究所・原城跡・出島を確かめた

- toro（第 7 章の兼六園の徽軫灯籠）: `create_image_pixflux`（32 × 32、`no_background: true`、黒の 1px 輪郭、low top-down、medium detail）。1 回目（d043095d-010f-4c31-af44-35b4876048e4。Japanese kotoji-toro stone lantern of Kenroku-en garden, grey granite lantern with a wide flat umbrella-shaped roof (kasa) and a square fire box with a window, standing on TWO separate stone legs of different lengths …、text_guidance_scale 11）は脚が 1 本の台座で、火袋の赤い光が目に見えた。2 回目（fb8c0764-5ae6-415b-8ffc-cc3031042408。脚を「TWO thin straight stone legs standing apart」と言い直し、text_guidance_scale 13）も台座で、窓が目に見えた。3 回目は 1 回目の笠と火袋を使い、Pillow で窓を 1 つの黄色い灯りに、脚を長い左脚と石に乗った短い右脚に描き直して採用（計 3 回）

## UI（`ui/`）

`create_image_pixflux` で作り、Pillow で仕上げた。表示は `src/ui/uiImages.ts`（大きさ・分割）と `src/ui/widgets.ts`（`drawWindow`・`Menu` のカーソル）、タイトルの背景は `src/scenes/TitleScene.ts`、仮想パッドは `index.html` の CSS（DOM の要素の背景。大きさと倍率は CSS に直接書き、`uiImages.ts` の `PAD_*` の仕様値と合うことをテストで確かめる）。

| ファイル | 大きさ | 使い方 |
| --- | --- | --- |
| window.png | 16 × 16 | ウィンドウ枠。四隅 4 × 4 はそのまま、辺と中央は引き伸ばす（9 分割）。藍の地、縁は外から墨・茶・生成り・墨の 4 px、四隅に金の角金具 |
| cursor.png | 32 × 32 | メニューのカーソル（右を向いた扇子）。1/3 に縮めて表示する（内部解像度で約 11 px、実際のキャンバスで元の 1 ドットが 1 px） |
| title.png | 384 × 216 | タイトル画面の背景（夜明けの富士と、松並木の街道）。画面と同じ大きさで、そのまま敷く。題字・副題の y 8〜55（`TITLE_SKY_BAND`）は無地の藍の空 |
| dpad.png | 64 × 64 | 仮想パッドの十字キー。2 倍（128 × 128）で表示し、上に上下左右の押せる区画（3 × 3 の格子）を重ねる。黒漆の地・金の縁・生成りの三角の矢印 |
| icons.png | 320 × 32 | メニューのアイコン。32 × 32 のコマを `ICON_NAMES` の順（刀・鉄砲・錫杖・手裏剣・胴・薬包・団子・巻物・お守り・文銭）に横に並べた 1 枚。カーソルと同じく 1/3 で表示する。どれを出すかは `src/ui/icons.ts` |
| button_ok.png・button_cancel.png | 32 × 32 | 仮想パッドの決定（朱）・取消（藍）。2 倍（64 × 64）で表示し、中央の無地の面（半径 9 px）に HTML の文字を重ねる。金の縁・黒の輪郭 |

### ウィンドウ枠（`ui/window.png`）

- 採用: 2 回目（ジョブ 15df11a5-1880-4c37-8c34-e490052dec61。32 × 32、no_background、flat shading、low detail、黒の 1px 輪郭、text_guidance_scale 14）。プロンプト: simple pixel art RPG menu window frame. Center is ONE flat solid dark navy blue color with no texture and no noise. Border: 1 pixel black outer line, then 2 pixel plain smooth cream line, then 1 pixel dark line, same thickness on all four sides, straight and uniform. Each of the four corners has an identical small gold square metal fitting. Perfectly symmetric.
- 仕上げ: 2 回目の四隅 4 × 4 だけを残し、縁は 1 本の断面（墨・茶・生成り・墨。下と右は茶と生成りが逆）を辺の全長にそろえ、中央を 1 色にして 16 × 16 に組み直した（9 分割で伸ばしても筋が出ないように）
- 作り直しの経過（計 4 回）: 1 回目（21def222、64 × 64）は中央がざらつき、縁に斑があり、外の輪郭がなかった。2 回目は中央が 1 色になったが、縁の生成りが 3 色の斑だった。3 回目は Pillow で色をそろえたが、緑がかった点が残った。4 回目は上の仕上げで、すべての項目を満たした

### カーソル（`ui/cursor.png`）

- 採用: 4 回目（ジョブ 4761f787-40aa-44a4-84c5-6d39d972df98。32 × 32、no_background、黒の 1px 輪郭、text_guidance_scale 10、init_image_strength 250）。Pillow で描いた「左に要、右へ開く朱の扇子」の下絵を init_image にした。プロンプト: pixel art cursor icon of an open Japanese folding fan (sensu) lying sideways and opening toward the right, gold pivot rivet at the left, thin brown wooden ribs fanning out, red vermilion paper, clean black outline, entire fan inside the canvas
- 上限の 5 回で採用したので、残った点がある: 画像は 16 px 以内の要件に対して 32 px（表示は 1/3 に縮めて行に収める）。扇の右の上下が画像の端で切れて輪郭がなく、下の端に黄色の点が 1 つ浮いている
- 作り直しの経過（計 5 回）: 1 回目（f7cfe551）は扇子らしいが上向きで 28 px と大きかった。2 回目（be71f81a）は右向きの小さな絵を頼んだが、赤い虫のようで扇子に見えなかった。3 回目は 1 回目を右へ回して 16 px に縮めたが、骨が潰れて貝に見えた。4 回目は下絵から清書し、扇子で右向きになった（採用）。5 回目は 4 回目を 16 px に縮めたが、赤い四角に見えた
- 1 回目から右向きを頼むと崩れやすい。扇子のような形の決まった小物は、下絵を init_image に渡すと形が保たれる

### タイトルの背景（`ui/title.png`）

- 採用: 3 回目（ジョブ f284dfa3-2c15-4fc7-8ffc-2df7793c346c。384 × 216、no_background false、side、medium detail、basic shading、text_guidance_scale 10、init_image_strength 220）。1 回目の絵を 22 px 下へずらして富士の頂を副題より下に下げ、モミの木を消して、Pillow で枝の平たい松並木と土の一本道を描いた下絵を init_image にした。プロンプト: Japanese Edo period landscape background for an RPG title screen. Plain empty dark indigo sky at the top. Mount Fuji with a white snowy cap in the center distance, dawn orange glow at the horizon. A single unpaved brown dirt highway road (Tokaido) runs from the bottom center toward Mount Fuji. Rows of Japanese black pine trees (matsu) with dark brown leaning trunks and flat layered cloud-shaped green crowns line both sides of the road. Green fields. Muted calm colors: indigo, ink black, cream, dark green. No text, no people.
- 仕上げ: テストのデコーダー（8 bit の RGBA）で読めるように RGBA で保存した（すべて不透明）
- 作り直しの経過（計 3 回）: 1 回目（d55d9b71）は構図がよかったが、富士の頂が副題（y 50）に重なり、並木が西洋のモミの形だった。2 回目（56e550b9）は富士を下げたが、道に舗装路の白線が入り、木はモミのまま、空に顔のような橙の月が出た。3 回目は 1 回目をもとにした下絵から清書し、すべての項目を満たした
- 松のように形の決まった木は、言葉だけではモミになりやすい。下絵を init_image に渡すと形が保たれる

### 仮想パッド（`ui/dpad.png`・`ui/button_ok.png`・`ui/button_cancel.png`）

- 十字キー: 1 回目（ジョブ da023c60-ca3e-4eb5-a688-932b1244288b。64 × 64、no_background、黒の 1px 輪郭、basic shading、medium detail、text_guidance_scale 10、init_image_strength 250）を採用。Pillow で描いた十字（墨の輪郭・金の縁・黒漆の地・生成りの三角）の下絵を init_image にした。プロンプト: pixel art game controller directional pad (d-pad) button for a Japanese Edo period RPG, cross shape seen from the front, black urushi lacquer surface with subtle shine, thin gold metal rim around the cross, four cream triangle arrows pointing outward (up, down, left, right), small round gold rivet in the center, clean black outline, perfectly symmetric, no text
- 丸いボタン: 1 回目（ジョブ dbe1fb00-1b71-4897-a164-d7178302512a。32 × 32、no_background、黒の 1px 輪郭、basic shading、low detail、text_guidance_scale 10、init_image_strength 250）を採用。Pillow で描いた円（墨・金・朱）の下絵を init_image にした。プロンプト: pixel art round game button for a Japanese Edo period RPG, a circle of glossy red vermilion urushi lacquer with a thin gold metal rim, plain flat empty center with no symbol, subtle highlight at the top left, clean black outline, symmetric, no text
- 仕上げ: ボタンの朱の面にあった近い 2 色（172,55,46 と 176,55,48）を 1 色にそろえて button_ok.png に。同じ面を藍（46,64,112）に塗り替えて button_cancel.png にした（形・縁は同じ）
- 判定（どちらも 1 回目ですべて ○）: 十字キーは十字の形で四隅が透過・4 本の腕に外向きの矢印・黒漆の地に金の縁と生成りの矢印・黒の輪郭で左右対称・文字なし。ボタンは円の外が透過・中央が無地の面・朱の漆に金の縁・黒の輪郭で左右対称・文字や模様なし。ゲーム画面（縦持ち 390 × 844、横持ち 844 × 390 のタッチ端末。下のセーフエリアなし）で、暗い背景の上で読め、押した腕が金色に光ることを確かめた。十字キーが 128 px になったので、縦持ちのパッドの高さを余白と十字キーと下のセーフエリアの和にした（ゲーム画面に重ならない）
- 形の決まった UI は、カーソル・タイトルと同じく下絵を init_image に渡すと 1 回で形が保たれた

### アイコン（`ui/icons.png`）

- 10 個とも `create_image_pixflux`（32 × 32、no_background、single color black outline、text_guidance_scale 10、init_image_strength 250）で、Pillow で描いた下絵を init_image にした。できた 10 枚を Pillow で横に並べて 1 枚にした（絵には手を入れていない）
- 共通の項目: 32 × 32 で背景が透過 [必須]／何の絵か一目で分かる [必須]／縁に 1 px 以上の余白があり輪郭が切れない [必須]／1/3 に縮めた約 11 px でも形が読め、ほかの 9 個と見分けがつく [必須]／黒の 1px 輪郭／藍・朱・墨・生成り・金の落ち着いた配色
- 採用（すべての項目が ○）:
  - 刀 1 回目（2309f2fe-4872-4753-9eb4-9873876b6503）: Japanese katana in its indigo lacquered scabbard, diagonal from bottom-left to top-right, round gold tsuba guard, ivory wrapped handle
  - 鉄砲 1 回目（41f67754-141c-4cb0-9ce8-77ed838b297c）: Japanese matchlock musket (tanegashima), long dark iron barrel and brown wooden stock, diagonal
  - 錫杖 1 回目（6055b8f0-7529-496e-880c-f83b9c29ff7e）: Buddhist monk's staff (shakujo), long brown wooden pole diagonal, gold metal ring loop at the top end with small gold rings
  - 手裏剣 1 回目（a2d27f37-3992-4a13-93d8-e9c4239e84ed）: steel four-pointed ninja shuriken throwing star, grey metal with a hole in the center
  - 胴 1 回目（d9f9150d-d3f8-4870-b8e3-619962853946）: Japanese samurai armor chest plate (do), front view, dark indigo lacquered plates laced with red cords in horizontal rows
  - 薬包 1 回目（2651e59c-dd79-472c-af8f-9508d4d0914e）: folded paper medicine packet, cream washi paper folded into a diamond shape with fold lines, red paper seal label in the middle
  - 団子 1 回目（08c859eb-d642-43bd-b6a0-93a8dff64b1a）: Japanese hanami dango, three round rice dumplings pink white and green on a wooden skewer, diagonal
  - 巻物 2 回目（a290dd22-e904-4472-bc02-a2996d72adbd）: rolled-up Japanese paper scroll (makimono), closed cream paper cylinder lying diagonally, spiral paper end visible at the top right, dark wooden roller knob at the bottom left, tied around the middle with a red cord
  - お守り 1 回目（8e25e508-4371-470e-8e04-8d93d293ab44）: Japanese omamori charm, small red brocade pouch with gold label panel and a knotted cord loop at the top, front view
  - 文銭 1 回目（67743f92-4f69-4ffd-a9e5-11e076ca0392）: old Japanese copper mon coin, round bronze coin with a square hole in the center and a raised rim
  - どのプロンプトも先頭に「pixel art item icon of」、末尾に「clean black outline, whole ... inside the canvas」を付けた
- 作り直し: 巻物の 1 回目（a3295673）は広げた紙を平たい朱の帯で挟んだ形で、巻物ではなく札に見えた。下絵を「巻いて閉じた筒・渦巻きの端・軸の頭・真ん中の朱の紐」に描き直して 2 回目で採用した
- ゲーム画面（道具・技・装備の一覧、戦闘の技・道具、所持金の窓）で、文字の行に収まり、カーソルの扇子と重ならず、11 px でも何の絵か分かることを確かめた
