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

### 敵方の人物（`chars/yashamaru.png`・`chars/oboro.png`・`chars/borei.png`）

テストプレイで「主要人物以外のキャラクターに画像がない」と指摘された残り。フィールドに立っているだけなので歩行は作らず、`scripts/pack_character.py` が歩行のコマにも立ち姿を置く。
主人公と同じく mode `v3`（size 28、黒の 1px 輪郭、medium detail、low top-down。8 方向のうち下・左・右・上を使う）。

| ID | PixelLab のキャラクター ID | 生成プロンプト | 回数 |
| --- | --- | --- | --- |
| yashamaru | 4b304f52-a2aa-4b6d-b373-139c42f49373 | chibi Edo period Japanese evil sorcerer (onmyoji) young man, long unkempt black hair down to his shoulders, pale white face with sharp eyes, loose dark purple robe with wide sleeves and a black sash, holding white paper talismans (ofuda) in one hand | 1 |
| oboro | 79da6516-c1ec-4413-95bd-1e4130545709 | chibi Edo period Japanese old ninja master, grey cloth hood covering his head, very long white beard down to his chest, grey ninja outfit with black belt, grey leg wraps, katana in a black scabbard at his hip（戦闘の画像 `enemies/oboro.png` に合わせた） | 1 |
| borei | 28d55aa9-474f-4c8d-aa99-9847dd2182c3 | chibi Japanese ghost (yurei), a small white TRIANGLE of cloth (hitaikakushi) pointing up in the middle of the forehead, long black hair hanging forward on both sides of a pale blue face, pale blue-white translucent body, white burial kimono crossed left over right, hands hanging limply at the wrists, lower body fading into wispy pale mist with no feet | 2 |

- borei: 1 回目（bcc58de0-6585-449d-830f-d487ee996aac。white triangular cloth headband）は額の布がただの白い鉢巻きになり、三角に見えなかった。2 回目は「a small white TRIANGLE of cloth … pointing up in the middle of the forehead」と形と位置を言い、採用

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
| npc_tojin | 88c641f1-2ac4-4acd-a590-58088020b48d | 唐人の商人 | Qing dynasty Chinese trader, front of head shaved bald, one very long black braided pigtail queue hanging down his back to his waist, small round black skullcap, long dark blue silk robe, thin long mustache（text_guidance_scale 11） | 2 |

作り直しの記録:

- 役人: 1 回目は十手が見えなかった。2 回目で「silver iron jitte with a hook and a red tassel」で採用（計 2 回）。
- 神主: 1 回目・2 回目は烏帽子が山高帽や笠になった。3 回目で「tall narrow black hat ... taller than his face」で採用（計 3 回）。
- 唐人: 1 回目は弁髪が見えなかった。2 回目で「very long braided pigtail queue hanging down his back」で採用（計 2 回）。
- 飛脚: 1 回目は現代風の帽子で棒がなく、2 回目は文箱を手に提げ、3 回目も棒を担がなかった。4 回目で棒を肩に担いだが先の文箱が出なかった。5 回目は 4 回目の 4 方向に Pillow で文箱（と横向きの棒）を描き足して採用（計 5 回）。上限で採用したため、小さく見ると文箱が棒の先の旗のようにも見える点が残る。
- ほかの 15 類型は 1 回目で採用。

## タイル（`tiles/`）

`create_tiles_pro`（tile_type `square_topdown`、tile_view `top-down`、tile_size 16、outline_mode `segmentation`）で、1 回に番号付きで複数のタイルを作り、種類ごとに 1 枚を選んで `tiles/<種類>.png` に置く（種類は `src/data/maps.ts` の `TILE_KINDS`）。
ダウンロードは `https://api.pixellab.ai/mcp/tiles-pro/<ID>/download`（ZIP）。
ZIP の番号はファイル名の末尾の通し番号（0 から 15 の 16 枚）で、プロンプトの項目番号とは一致しない（1 項目から複数枚できたり、項目の順と前後したりする）。下の表の番号のほかは使っていない。

| ID | プロンプト | 使ったタイル（ZIP の番号 → 種類） |
| --- | --- | --- |
| b174b9da-2d40-4e52-900c-50ea310dfb21 | Edo period Japanese town, top-down RPG map tiles, muted ukiyo-e palette (indigo, vermilion, ink black, off-white). 1). packed brown earth ground 2). green grass with small tufts 3). light sandy dirt road 4). round dark green pine tree canopy seen from above 5). blue water with small ripples 6). white plaster wall of a Japanese house with dark wooden beam at bottom 7). dark grey Japanese kawara roof tiles in horizontal rows 8). dark wooden sliding door of a Japanese house 9). wooden plank floor 10). grey boulder rock on grass 11). open plain grass field for world map 12). tiny Japanese town icon with roof on a road for world map 13). wooden checkpoint barrier gate (sekisho) on a road | 1 → ground、3 → grass、4 → road、7 → water、8 → wall、9 → roof、10 → door、11 → floor、12 → rock、14 → town、15 → gate |
| 653bfbb0-b997-426e-ab19-98a4ffee2b45 | Edo period Japan top-down RPG map tiles, muted ukiyo-e palette. 1). a single dense dark green pine tree seen from above with dark outline and a visible brown trunk at the bottom, on dark ground, clearly an obstacle 2). light yellow-green open meadow with tiny pale flowers, brighter than lawn grass 3). dense dark green pine tree canopy from above, round clump with black outline 4). pale khaki dry grassland for a world map | 0 → tree、5 → plain（最初の組の木と野原は草と見分けにくかったため作り直した） |

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
