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
| kasumi | f5b98b82-be0e-4db3-9c14-96ccb14ac47b | Edo period Japanese female ninja (kunoichi), dark navy ninja outfit, cloth mask covering mouth, black hair in ponytail, small blade at back | walking forward at a steady pace |
| gendo | c4c4be3a-4027-4d27-abd2-55c907790716 | Edo period Japanese corrupt wandering monk, shaved bald head, ragged black monk robe, holding a tall wooden staff, gourd of sake at waist, burly | walking forward at a steady pace, holding the staff |
| orin | 90640155-04f7-4a06-9f27-ca89ad1d8ddf | Edo period Japanese town girl, red and cream kimono with sleeves tied back by a tasuki cord, black hair in bun, carrying a brass clockwork rifle on her back | walking forward at a steady pace, rifle stays on back |
| tatsugoro | 7eed1a60-5cf2-414a-9dd2-4dde656229a0 | Edo period Japanese yakuza boss, stout portly middle-aged man, dark brown haori jacket over kimono, topknot hair, stern face | walking forward at a steady, dignified pace |

霞・玄道はまだマップに登場しないため、シートだけを置いている（フェーズ 4 で NPC の `sprite` に指定する）。

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
