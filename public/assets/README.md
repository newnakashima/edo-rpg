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
