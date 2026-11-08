// 装備品。武器・防具・装飾品の 3 つの枠に 1 つずつ付ける。
// 数値は序章〜第 8 章の分。以降の章の装備はシナリオの実装（フェーズ 4）で足す。
import type { CharacterId } from './characters';
import type { Stats } from '../systems/stats';

export type EquipSlot = 'weapon' | 'armor' | 'accessory';

export const EQUIP_SLOTS: readonly EquipSlot[] = ['weapon', 'armor', 'accessory'];

export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '防具',
  accessory: '装飾',
};

/**
 * 装備の特性（能力値に足すだけでなく、戦闘での動きを変えるもの）。
 * - doubleAttack: 通常攻撃（たたかう）で 2 回斬りつける。1 回目で狙いが倒れたら、2 回目は別の敵を狙う
 * - doubleCast: 術（ダメージ・回復の技）がもう一度発動する。気力は 1 回分だけ使う
 */
export type EquipTrait = 'doubleAttack' | 'doubleCast';

export interface EquipDef {
  id: string;
  name: string;
  slot: EquipSlot;
  /** 買値（文）。売値は半額。 */
  price: number;
  /** 能力値に足す値。 */
  bonus: Partial<Stats>;
  /** 付けられる人物。 */
  wearers: readonly CharacterId[];
  description: string;
  /** 戦闘での動きを変える特性（レア装備だけが持つ）。 */
  traits?: readonly EquipTrait[];
  /** 店で売れない（一度しか手に入らないレア装備。売ると取り戻せないため）。 */
  unsellable?: true;
}

const ALL: readonly CharacterId[] = ['hero', 'kasumi', 'gendo', 'orin'];

export const EQUIPMENT: Record<string, EquipDef> = {
  // 武器
  nagawakizashi: { id: 'nagawakizashi', name: '長脇差', slot: 'weapon', price: 40, bonus: { atk: 2 }, wearers: ['hero'], description: '渡世人の差す脇差' },
  dotanuki: { id: 'dotanuki', name: '胴田貫', slot: 'weapon', price: 260, bonus: { atk: 7 }, wearers: ['hero'], description: '肉厚で折れにくい刀' },
  magoroku: { id: 'magoroku', name: '関の孫六', slot: 'weapon', price: 520, bonus: { atk: 9 }, wearers: ['hero'], description: '美濃の関で鍛えた名刀' },
  kotetsu: { id: 'kotetsu', name: '虎徹', slot: 'weapon', price: 900, bonus: { atk: 12 }, wearers: ['hero'], description: '江戸に名高い名工の刀' },
  osafune: { id: 'osafune', name: '備前長船', slot: 'weapon', price: 1300, bonus: { atk: 15 }, wearers: ['hero'], description: '備前の刀工の手になる業物' },
  tadayoshi: { id: 'tadayoshi', name: '肥前忠吉', slot: 'weapon', price: 2400, bonus: { atk: 21 }, wearers: ['hero'], description: '肥前の刀工の手になる刀' },
  kanewaka: { id: 'kanewaka', name: '加州兼若', slot: 'weapon', price: 3300, bonus: { atk: 25 }, wearers: ['hero'], description: '加賀の刀工の手になる刀' },
  kunikane: { id: 'kunikane', name: '仙台国包', slot: 'weapon', price: 3900, bonus: { atk: 27 }, wearers: ['hero'], description: '仙台の刀工の柾目肌の刀' },
  aizuKanesada: { id: 'aizuKanesada', name: '会津兼定', slot: 'weapon', price: 4200, bonus: { atk: 28 }, wearers: ['hero'], description: '会津の御抱え刀工が打った刀' },
  kiyomaro: { id: 'kiyomaro', name: '江戸清麿', slot: 'weapon', price: 4500, bonus: { atk: 30 }, wearers: ['hero'], description: '四谷の刀工の冴えた刃の刀' },
  // 終章の江戸城の葛籠だけで手に入る（店には置かない）
  aoiNagawaki: { id: 'aoiNagawaki', name: '葵の長脇差', slot: 'weapon', price: 5400, bonus: { atk: 35 }, wearers: ['hero'], description: '御金蔵に眠っていた、葵の紋の長脇差' },
  sukehiro: { id: 'sukehiro', name: '津田助広', slot: 'weapon', price: 1800, bonus: { atk: 18 }, wearers: ['hero'], description: '大坂の刀工の濤乱刃の刀' },
  kunai: { id: 'kunai', name: '苦無', slot: 'weapon', price: 40, bonus: { atk: 2, spd: 1 }, wearers: ['kasumi'], description: '忍びの小刀' },
  ninjato: { id: 'ninjato', name: '忍者刀', slot: 'weapon', price: 240, bonus: { atk: 6, spd: 2 }, wearers: ['kasumi'], description: '反りのない短い刀' },
  kusarigama: { id: 'kusarigama', name: '鎖鎌', slot: 'weapon', price: 480, bonus: { atk: 8, spd: 2 }, wearers: ['kasumi'], description: '分銅の鎖で絡め取る鎌' },
  tekkokagi: { id: 'tekkokagi', name: '手甲鉤', slot: 'weapon', price: 860, bonus: { atk: 11, spd: 3 }, wearers: ['kasumi'], description: '手の甲に付ける鉄の爪' },
  kageKodachi: { id: 'kageKodachi', name: '影小太刀', slot: 'weapon', price: 1750, bonus: { atk: 17, spd: 4 }, wearers: ['kasumi'], description: '刃を黒く焼いた小太刀' },
  karakuriKagizume: { id: 'karakuriKagizume', name: 'からくり鉤爪', slot: 'weapon', price: 2350, bonus: { atk: 20, spd: 4 }, wearers: ['kasumi'], description: 'ゼンマイで爪が伸びる手甲' },
  yukiKodachi: { id: 'yukiKodachi', name: '雪華小太刀', slot: 'weapon', price: 3200, bonus: { atk: 23, spd: 5 }, wearers: ['kasumi'], description: '刃に雪の結晶の紋が浮く小太刀' },
  hibanaKodachi: { id: 'hibanaKodachi', name: '火花小太刀', slot: 'weapon', price: 4300, bonus: { atk: 27, spd: 6 }, wearers: ['kasumi'], description: '打ち合うと火花の散る小太刀' },
  oniwabanKodachi: { id: 'oniwabanKodachi', name: '御庭番小太刀', slot: 'weapon', price: 5200, bonus: { atk: 31, spd: 7 }, wearers: ['kasumi'], description: '公儀の御庭番に伝わる小太刀。終章の江戸城で手に入る' },
  shinobiKodachi: { id: 'shinobiKodachi', name: '忍び小太刀', slot: 'weapon', price: 1250, bonus: { atk: 14, spd: 3 }, wearers: ['kasumi'], description: '伊賀の鍛冶の打った小太刀' },
  kongozue: { id: 'kongozue', name: '金剛杖', slot: 'weapon', price: 60, bonus: { atk: 3, mag: 2 }, wearers: ['gendo'], description: '八角の樫の杖' },
  shakujo: { id: 'shakujo', name: '錫杖', slot: 'weapon', price: 300, bonus: { atk: 6, mag: 4 }, wearers: ['gendo'], description: '鳴らすと魔を祓う杖' },
  dokko: { id: 'dokko', name: '独鈷杵', slot: 'weapon', price: 820, bonus: { atk: 9, mag: 6 }, wearers: ['gendo'], description: '煩悩を打ち砕く法具' },
  tetsuShakujo: { id: 'tetsuShakujo', name: '鉄錫杖', slot: 'weapon', price: 1200, bonus: { atk: 11, mag: 9 }, wearers: ['gendo'], description: '修験者の鉄の錫杖' },
  rakanShakujo: { id: 'rakanShakujo', name: '羅漢錫杖', slot: 'weapon', price: 2300, bonus: { atk: 15, mag: 13 }, wearers: ['gendo'], description: '羅漢の像を刻んだ錫杖' },
  hakusanShakujo: { id: 'hakusanShakujo', name: '白山錫杖', slot: 'weapon', price: 3100, bonus: { atk: 18, mag: 16 }, wearers: ['gendo'], description: '白山の修験者が鳴らした錫杖' },
  fudoShakujo: { id: 'fudoShakujo', name: '不動錫杖', slot: 'weapon', price: 4200, bonus: { atk: 21, mag: 19 }, wearers: ['gendo'], description: '不動明王の炎を刻んだ錫杖' },
  nyoraiShakujo: { id: 'nyoraiShakujo', name: '如来錫杖', slot: 'weapon', price: 5000, bonus: { atk: 24, mag: 23 }, wearers: ['gendo'], description: '大奥の持仏堂に納められた錫杖。終章の江戸城で手に入る' },
  kongoShakujo: { id: 'kongoShakujo', name: '金剛錫杖', slot: 'weapon', price: 1700, bonus: { atk: 13, mag: 11 }, wearers: ['gendo'], description: '金剛の輪を下げた錫杖' },
  // 第 4 章でお凛の初期装備をからくり銃に変えたので、今はどこからも手に入らない。
  // 寄り道の町の店に安い銃として置く候補なので、定義は残す（置くかは寄り道の町を作るときに決める）
  hinawaju: { id: 'hinawaju', name: '火縄銃', slot: 'weapon', price: 60, bonus: { atk: 4, mag: 3 }, wearers: ['orin'], description: '使い込んだ火縄銃' },
  karakuriju: { id: 'karakuriju', name: 'からくり銃', slot: 'weapon', price: 380, bonus: { atk: 9, mag: 6 }, wearers: ['orin'], description: 'ゼンマイで弾を込める銃' },
  nanbanju: { id: 'nanbanju', name: '南蛮銃', slot: 'weapon', price: 1300, bonus: { atk: 15, mag: 10 }, wearers: ['orin'], description: '南蛮渡りの燧石の銃' },
  gewehr: { id: 'gewehr', name: 'ゲベール銃', slot: 'weapon', price: 2400, bonus: { atk: 21, mag: 14 }, wearers: ['orin'], description: '出島から渡ったオランダの銃' },
  kagaZutsu: { id: 'kagaZutsu', name: '加賀筒', slot: 'weapon', price: 3300, bonus: { atk: 25, mag: 17 }, wearers: ['orin'], description: '加賀の鉄砲鍛冶が打った長筒' },
  kunitomoZutsu: { id: 'kunitomoZutsu', name: '国友筒', slot: 'weapon', price: 4500, bonus: { atk: 30, mag: 20 }, wearers: ['orin'], description: '近江の鉄砲鍛冶が打った筒。江戸で売られている' },
  aoiZutsu: { id: 'aoiZutsu', name: '葵の御筒', slot: 'weapon', price: 5400, bonus: { atk: 35, mag: 24 }, wearers: ['orin'], description: '将軍家の鉄砲蔵の筒。終章の江戸城で手に入る' },
  renpatsuju: { id: 'renpatsuju', name: '連発からくり銃', slot: 'weapon', price: 1800, bonus: { atk: 18, mag: 12 }, wearers: ['orin'], description: 'ゼンマイで弾を続けて送る銃' },
  // 榊兵庫（第 5 章のゲスト）だけが付ける。店には置かない
  hyogoKatana: { id: 'hyogoKatana', name: '与力の差料', slot: 'weapon', price: 0, bonus: { atk: 14 }, wearers: ['hyogo'], description: '兵庫が与力のころから差す刀' },
  // 防具
  hyogoHaori: { id: 'hyogoHaori', name: '与力の羽織', slot: 'armor', price: 0, bonus: { def: 10 }, wearers: ['hyogo'], description: '裏に鎖を縫い込んだ羽織' },
  shimagappa: { id: 'shimagappa', name: '縞の合羽', slot: 'armor', price: 30, bonus: { def: 1 }, wearers: ALL, description: '旅の雨をしのぐ合羽' },
  kusarikatabira: { id: 'kusarikatabira', name: '鎖帷子', slot: 'armor', price: 200, bonus: { def: 5 }, wearers: ['hero', 'gendo', 'orin'], description: '着物の下に着込む鎖' },
  nanbando: { id: 'nanbando', name: '南蛮胴', slot: 'armor', price: 720, bonus: { def: 8 }, wearers: ['hero', 'gendo', 'orin'], description: '南蛮渡りの鉄の胴' },
  kusarishozoku: { id: 'kusarishozoku', name: '鎖忍び装束', slot: 'armor', price: 640, bonus: { def: 6, spd: 3 }, wearers: ['kasumi'], description: '鎖を編み込んだ装束' },
  toseiGusoku: { id: 'toseiGusoku', name: '当世具足', slot: 'armor', price: 1100, bonus: { def: 11 }, wearers: ['hero', 'gendo', 'orin'], description: '動きやすい鉄の具足' },
  igaShozoku: { id: 'igaShozoku', name: '伊賀装束', slot: 'armor', price: 1000, bonus: { def: 9, spd: 4 }, wearers: ['kasumi'], description: '伊賀の里の忍び装束' },
  orandaDo: { id: 'orandaDo', name: '阿蘭陀胴', slot: 'armor', price: 2100, bonus: { def: 17 }, wearers: ['hero', 'gendo', 'orin'], description: 'オランダ渡りの鋼の胴' },
  kagaGusoku: { id: 'kagaGusoku', name: '加賀具足', slot: 'armor', price: 2900, bonus: { def: 20 }, wearers: ['hero', 'gendo', 'orin'], description: '金箔の紋を押した具足' },
  yukinoshitaDo: { id: 'yukinoshitaDo', name: '雪下胴', slot: 'armor', price: 3400, bonus: { def: 22 }, wearers: ['hero', 'gendo', 'orin'], description: '仙台の具足師が作る五枚胴' },
  sashikoBanten: { id: 'sashikoBanten', name: '刺子半纏', slot: 'armor', price: 3900, bonus: { def: 24 }, wearers: ['hero', 'gendo', 'orin'], description: '火消しが着る、水を含ませた厚い半纏' },
  kageShozoku: { id: 'kageShozoku', name: '影忍び装束', slot: 'armor', price: 1450, bonus: { def: 12, spd: 5 }, wearers: ['kasumi'], description: '月のない夜に溶ける装束' },
  yukiShozoku: { id: 'yukiShozoku', name: '雪隠れ装束', slot: 'armor', price: 2100, bonus: { def: 15, spd: 6 }, wearers: ['kasumi'], description: '雪に紛れる白い忍び装束' },
  kuroShozoku: { id: 'kuroShozoku', name: '黒装束', slot: 'armor', price: 3000, bonus: { def: 18, spd: 7 }, wearers: ['kasumi'], description: '江戸の闇に溶ける黒い装束' },
  nanbanGusoku: { id: 'nanbanGusoku', name: '南蛮具足', slot: 'armor', price: 1500, bonus: { def: 14 }, wearers: ['hero', 'gendo', 'orin'], description: '南蛮胴を仕立て直した具足' },
  shinobishozoku: { id: 'shinobishozoku', name: '忍び装束', slot: 'armor', price: 180, bonus: { def: 3, spd: 3 }, wearers: ['kasumi'], description: '闇に溶ける装束' },
  // 装飾
  sandogasa: { id: 'sandogasa', name: '三度笠', slot: 'accessory', price: 20, bonus: { def: 1, luck: 1 }, wearers: ALL, description: '旅人の笠' },
  omamori: { id: 'omamori', name: '御守り', slot: 'accessory', price: 50, bonus: { luck: 5 }, wearers: ALL, description: '寺社の御守り' },
  hachigane: { id: 'hachigane', name: '鉢金', slot: 'accessory', price: 160, bonus: { def: 3 }, wearers: ALL, description: '額を守る鉄の板' },
  tomegane: { id: 'tomegane', name: '遠眼鏡', slot: 'accessory', price: 900, bonus: { spd: 2, luck: 6 }, wearers: ALL, description: '遠くまで見通す南蛮の筒' },
  kinpakuMamori: { id: 'kinpakuMamori', name: '金箔の御守り', slot: 'accessory', price: 1200, bonus: { def: 2, luck: 9 }, wearers: ALL, description: '金箔を貼った尾山神社の御守り' },
  hikeshiTenugui: { id: 'hikeshiTenugui', name: '火消しの手拭い', slot: 'accessory', price: 1500, bonus: { def: 4, spd: 3, luck: 4 }, wearers: ALL, description: '組の印を染めた手拭い' },
  // 浜松の凧師の弥平のお礼（寄り道のサブイベント）。店には置かない
  takoItomaki: { id: 'takoItomaki', name: '凧の糸巻き', slot: 'accessory', price: 300, bonus: { spd: 3, luck: 3 }, wearers: ALL, description: '遠州の空っ風に耐えてきた凧師の糸巻き' },
  // 彦根の具足師の甚兵衛のお礼（寄り道のサブイベント）。店には置かない
  akazonaeKote: { id: 'akazonaeKote', name: '赤備えの籠手', slot: 'accessory', price: 500, bonus: { atk: 3, def: 2 }, wearers: ALL, description: '具足師が朱の漆を塗り重ねた、井伊の赤備えの籠手' },
  // 熊本の井戸掘りの茂作のお礼（寄り道のサブイベント）。店には置かない
  higoZoganTsuba: { id: 'higoZoganTsuba', name: '肥後象嵌の鍔', slot: 'accessory', price: 1000, bonus: { atk: 4, def: 2, luck: 3 }, wearers: ALL, description: '鉄の地に金銀の糸を打ち込んだ、肥後の職人の鍔' },
  // 会津若松の什の少年たちのお礼（寄り道のサブイベント）。店には置かない
  okiagariKoboshi: { id: 'okiagariKoboshi', name: '起き上がり小法師', slot: 'accessory', price: 1400, bonus: { maxHp: 20, def: 2, luck: 6 }, wearers: ALL, description: '何度転んでも起き上がる、会津の張り子の人形' },
  waraji: { id: 'waraji', name: 'わらじ', slot: 'accessory', price: 15, bonus: { spd: 2 }, wearers: ALL, description: '履き替え用の新しい草鞋' },
  chochin: { id: 'chochin', name: '提灯', slot: 'accessory', price: 60, bonus: { def: 1, luck: 3 }, wearers: ALL, description: '夜道を照らす小田原提灯' },
  kiseru: { id: 'kiseru', name: 'キセル', slot: 'accessory', price: 120, bonus: { mag: 4 }, wearers: ALL, description: '一服すると頭が冴える煙管' },
  // レア装備（店には置かず、売れない。脇道の行き止まりの葛籠で手に入る。docs/balance.md の「装備」）。price は使わない目安
  // 高野山の葛籠（大坂が開く第 5 章から現れる）。術の得意なお凛・玄道が付けると真価を発揮する
  kodamaJuzu: { id: 'kodamaJuzu', name: '木霊の数珠', slot: 'accessory', price: 3000, bonus: { mag: 3 }, wearers: ALL, description: '唱えた術が山彦のようにもう一度響く。戦闘中、術が 2 回発動する（気力は 1 回分）', traits: ['doubleCast'], unsellable: true },
  // 出雲の葛籠（大坂の一件を片づけた第 6 章から現れる）。足の遅いお凛が先に術を撃てるようにする
  idatenMamori: { id: 'idatenMamori', name: '韋駄天の守り', slot: 'accessory', price: 2600, bonus: { spd: 30 }, wearers: ALL, description: '足の速い韋駄天の御守り。素早さが大きく上がる', unsellable: true },
  // 阿蘇の葛籠（霞が戻った第 6 章から現れる）。霞だけが使いこなせる
  kagebunshin: { id: 'kagebunshin', name: '影分身の秘伝書', slot: 'accessory', price: 3000, bonus: { spd: 3 }, wearers: ['kasumi'], description: '読み解いた忍びは影を分けて斬りかかる。たたかうで 2 回攻撃する（霞のみ）', traits: ['doubleAttack'], unsellable: true },
  inro: { id: 'inro', name: '印籠', slot: 'accessory', price: 150, bonus: { maxHp: 10 }, wearers: ALL, description: '薬を入れる小箱' },
  // 敵のレアドロップ（その敵だけが落とす。店には置かない。src/data/drops.ts、docs/balance.md の「敵のドロップ」）。
  // 何度でも手に入るので売れる。強さは、その地域の店の品より一段上か、能力値の偏った品にする
  // 武器
  nagadosu: { id: 'nagadosu', name: '長ドス', slot: 'weapon', price: 360, bonus: { atk: 9 }, wearers: ['hero'], description: 'ごろつきが懐に呑んでいた長い脇差' },
  roninSashiryo: { id: 'roninSashiryo', name: '浪人の差料', slot: 'weapon', price: 800, bonus: { atk: 12 }, wearers: ['hero'], description: '追い剥ぎに身を落とした浪人が、売らずに差していた刀' },
  yojinboOdachi: { id: 'yojinboOdachi', name: '用心棒の大刀', slot: 'weapon', price: 2000, bonus: { atk: 21 }, wearers: ['hero'], description: '米問屋の用心棒の、身幅の広い大刀' },
  kosenjoTachi: { id: 'kosenjoTachi', name: '古戦場の太刀', slot: 'weapon', price: 2600, bonus: { atk: 24 }, wearers: ['hero'], description: '原城の亡霊武者が握っていた、錆の浮かない太刀' },
  yakkoOdachi: { id: 'yakkoOdachi', name: '奴の大太刀', slot: 'weapon', price: 4800, bonus: { atk: 33 }, wearers: ['hero'], description: '旗本奴が見栄で差していた朱鞘の大太刀' },
  kamaitachiTsume: { id: 'kamaitachiTsume', name: '鎌鼬の爪', slot: 'weapon', price: 260, bonus: { atk: 5, spd: 3 }, wearers: ['kasumi'], description: 'つむじ風のように速く斬れる鎌の爪' },
  juji: { id: 'juji', name: '十字手裏剣', slot: 'weapon', price: 1500, bonus: { atk: 16, spd: 5 }, wearers: ['kasumi'], description: '伊賀者が隠し持っていた鋼の手裏剣' },
  kagaNinjato: { id: 'kagaNinjato', name: '加賀忍び刀', slot: 'weapon', price: 3500, bonus: { atk: 26, spd: 7 }, wearers: ['kasumi'], description: '加賀の忍びの、鍔の四角い忍び刀' },
  kusariFundo: { id: 'kusariFundo', name: '御庭番の鎖分銅', slot: 'weapon', price: 4800, bonus: { atk: 29, spd: 8 }, wearers: ['kasumi'], description: 'からくり御庭番の腕から外した鎖分銅' },
  ikizue: { id: 'ikizue', name: '雲助の息杖', slot: 'weapon', price: 420, bonus: { atk: 9, mag: 4 }, wearers: ['gendo'], description: '駕籠かきが肩を休める太い杖' },
  oniKanabo: { id: 'oniKanabo', name: '鬼の金棒', slot: 'weapon', price: 1100, bonus: { atk: 15, mag: 3 }, wearers: ['gendo'], description: '赤鬼の金棒。術はあまり伸びないが、力で打ち砕く' },
  kotsuShakujo: { id: 'kotsuShakujo', name: '骨の錫杖', slot: 'weapon', price: 2500, bonus: { atk: 18, mag: 17 }, wearers: ['gendo'], description: 'がしゃどくろの骨で作った錫杖。供養の経を刻んである' },
  hatamotoNaginata: { id: 'hatamotoNaginata', name: 'からくり薙刀', slot: 'weapon', price: 4600, bonus: { atk: 27, mag: 17 }, wearers: ['gendo'], description: 'からくり旗本の薙刀。錫杖のように輪を下げ直してある' },
  hazamaZutsu: { id: 'hazamaZutsu', name: '狭間筒', slot: 'weapon', price: 1900, bonus: { atk: 20, mag: 13 }, wearers: ['orin'], description: '城の狭間から撃つ、鉄砲足軽の長い筒' },
  kaizokuTanzutsu: { id: 'kaizokuTanzutsu', name: '海賊の短筒', slot: 'weapon', price: 2500, bonus: { atk: 23, mag: 15 }, wearers: ['orin'], description: '海賊が南蛮船から奪った、燧石の短筒' },
  kinjuZutsu: { id: 'kinjuZutsu', name: '近習の筒', slot: 'weapon', price: 5000, bonus: { atk: 33, mag: 22 }, wearers: ['orin'], description: 'からくり近習の腕に仕込まれていた筒' },
  // 防具
  kawausoKegawa: { id: 'kawausoKegawa', name: '川獺の毛皮', slot: 'armor', price: 600, bonus: { def: 6, spd: 2 }, wearers: ALL, description: '水をはじく軽い毛皮の胴着' },
  momenHaori: { id: 'momenHaori', name: '白木綿の羽織', slot: 'armor', price: 800, bonus: { def: 8, spd: 3 }, wearers: ALL, description: '一反木綿を仕立てた、風のように軽い羽織' },
  torakawaJinbaori: { id: 'torakawaJinbaori', name: '虎皮の陣羽織', slot: 'armor', price: 1000, bonus: { def: 10, maxHp: 20 }, wearers: ['hero', 'gendo', 'orin'], description: '青鬼が腰に巻いていた虎の皮の陣羽織' },
  kumoitoShozoku: { id: 'kumoitoShozoku', name: '蜘蛛糸の装束', slot: 'armor', price: 1300, bonus: { def: 11, spd: 6 }, wearers: ['kasumi'], description: '毒蜘蛛の糸で織った、刃の通らない装束' },
  kaniKoura: { id: 'kaniKoura', name: '平家蟹の甲羅', slot: 'armor', price: 2000, bonus: { def: 19 }, wearers: ['hero', 'gendo', 'orin'], description: '武者の顔の浮かぶ、固い蟹の甲羅の胴' },
  hanshiYoroi: { id: 'hanshiYoroi', name: 'からくり藩士の鎧', slot: 'armor', price: 3000, bonus: { def: 22 }, wearers: ['hero', 'gendo', 'orin'], description: 'からくり藩士の鋼の鎧を、人が着られるように直したもの' },
  hinezumiKawagoromo: { id: 'hinezumiKawagoromo', name: '火鼠の皮衣', slot: 'armor', price: 4000, bonus: { def: 22, maxHp: 30 }, wearers: ALL, description: '火にくべても燃えないという火鼠の皮衣' },
  // 装飾
  onibiDama: { id: 'onibiDama', name: '鬼火の玉', slot: 'accessory', price: 120, bonus: { mag: 3, luck: 2 }, wearers: ALL, description: '冷たい青い火の灯る玉' },
  yamainuKiba: { id: 'yamainuKiba', name: '山犬の牙', slot: 'accessory', price: 120, bonus: { atk: 3 }, wearers: ALL, description: '紐を通して首に下げる山犬の牙' },
  bakeHappa: { id: 'bakeHappa', name: '化け葉っぱ', slot: 'accessory', price: 200, bonus: { luck: 8 }, wearers: ALL, description: '狢が頭にのせて化けるのに使う葉っぱ' },
  shinchuHaguruma: { id: 'shinchuHaguruma', name: '真鍮の歯車', slot: 'accessory', price: 300, bonus: { def: 3, spd: 2 }, wearers: ALL, description: 'からくり人形の胸から外れた、よく回る歯車' },
  yabureBangasa: { id: 'yabureBangasa', name: '破れ番傘', slot: 'accessory', price: 300, bonus: { def: 4, luck: 2 }, wearers: ALL, description: '傘お化けの抜け殻。破れていても雨と矢をしのぐ' },
  zenmaiKubiwa: { id: 'zenmaiKubiwa', name: 'ゼンマイの首輪', slot: 'accessory', price: 500, bonus: { spd: 5 }, wearers: ALL, description: '巻くと足が速くなるゼンマイ犬の首輪' },
  nusutoZukin: { id: 'nusutoZukin', name: '盗人の頭巾', slot: 'accessory', price: 600, bonus: { spd: 4, luck: 5 }, wearers: ALL, description: '護摩の灰が顔を隠していた頭巾' },
  kanawa: { id: 'kanawa', name: '牛車の鉄輪', slot: 'accessory', price: 900, bonus: { def: 7 }, wearers: ALL, description: 'からくり牛車の車輪の鉄の輪を、腕に巻けるよう打ち直したもの' },
  hinowaUdewa: { id: 'hinowaUdewa', name: '火の輪の腕輪', slot: 'accessory', price: 900, bonus: { atk: 5 }, wearers: ALL, description: '輪入道の燃える輪が冷えて固まった腕輪' },
  hakaiJuzu: { id: 'hakaiJuzu', name: '破戒の数珠', slot: 'accessory', price: 900, bonus: { mag: 7 }, wearers: ALL, description: '生臭坊主が質に入れそびれた、術の冴える数珠' },
  kunoichiKanzashi: { id: 'kunoichiKanzashi', name: 'くノ一の簪', slot: 'accessory', price: 1200, bonus: { spd: 4, luck: 8 }, wearers: ALL, description: '先を研いで手裏剣にもなる銀の簪' },
  takaBane: { id: 'takaBane', name: 'からくり鷹の羽根', slot: 'accessory', price: 1500, bonus: { spd: 12 }, wearers: ALL, description: '風を切るからくり鷹の鋼の羽根' },
  tenguUchiwa: { id: 'tenguUchiwa', name: '天狗の羽団扇', slot: 'accessory', price: 1300, bonus: { mag: 8, spd: 3 }, wearers: ALL, description: '烏天狗の持つ、風を起こす羽団扇' },
  uchidenoKozuchi: { id: 'uchidenoKozuchi', name: '打ち出の小槌', slot: 'accessory', price: 1600, bonus: { luck: 15 }, wearers: ALL, description: '化け鼠が大黒様の蔵からくすねてきた小槌' },
  nekomataSuzu: { id: 'nekomataSuzu', name: '猫又の鈴', slot: 'accessory', price: 1400, bonus: { spd: 6, luck: 6 }, wearers: ALL, description: '二股の尾に下げていた鈴。鳴らすと身が軽くなる' },
  ikasamaSai: { id: 'ikasamaSai', name: 'イカサマ賽', slot: 'accessory', price: 1600, bonus: { luck: 20 }, wearers: ALL, description: '博徒が袖に隠していた、狙った目の出る賽' },
  nanbanKabuto: { id: 'nanbanKabuto', name: '南蛮の鉄兜', slot: 'accessory', price: 2000, bonus: { def: 9 }, wearers: ALL, description: '南蛮からくり兵の頭から外した、つばの広い鉄兜' },
  umibozuDama: { id: 'umibozuDama', name: '海坊主の大珠', slot: 'accessory', price: 2000, bonus: { maxHp: 40, def: 3 }, wearers: ALL, description: '海坊主の目玉ほどもある、黒く光る珠' },
  gehoMakimono: { id: 'gehoMakimono', name: '外法の巻物', slot: 'accessory', price: 2200, bonus: { mag: 12 }, wearers: ALL, description: '外法使いの秘術を記した巻物。持つだけで術が強まる' },
  isoShinju: { id: 'isoShinju', name: '磯女の真珠', slot: 'accessory', price: 2200, bonus: { mag: 8, luck: 8 }, wearers: ALL, description: '磯女の黒髪に絡まっていた大粒の真珠' },
  ushioniTsuno: { id: 'ushioniTsuno', name: '牛鬼の角', slot: 'accessory', price: 2200, bonus: { atk: 10 }, wearers: ALL, description: '岩をも砕く牛鬼の角' },
  waraNingyo: { id: 'waraNingyo', name: '恨みの藁人形', slot: 'accessory', price: 2000, bonus: { atk: 6, mag: 6 }, wearers: ALL, description: '怨霊が抱いていた藁人形。恨みの力を借りる' },
  sokonukeHishaku: { id: 'sokonukeHishaku', name: '底抜け柄杓', slot: 'accessory', price: 2400, bonus: { def: 5, spd: 8 }, wearers: ALL, description: '船幽霊の柄杓。底が抜けていて水をくめない' },
  hyokaKanzashi: { id: 'hyokaKanzashi', name: '氷華の簪', slot: 'accessory', price: 2800, bonus: { mag: 10, spd: 5 }, wearers: ALL, description: '雪女の髪の、溶けない氷の花の簪' },
  kinpakuOgi: { id: 'kinpakuOgi', name: '金箔の扇', slot: 'accessory', price: 3000, bonus: { spd: 5, luck: 25 }, wearers: ALL, description: '金箔からくりが舞うときに広げる扇' },
  kaginawa: { id: 'kaginawa', name: '火付けの鉤縄', slot: 'accessory', price: 2800, bonus: { spd: 10, luck: 5 }, wearers: ALL, description: '火付け盗賊が屋根に上るのに使う鉤縄' },
  gokaJuzu: { id: 'gokaJuzu', name: '業火の数珠', slot: 'accessory', price: 3200, bonus: { mag: 15 }, wearers: ALL, description: '火車が亡者を運ぶときに鳴らす、熱を帯びた数珠' },
  doshinJutte: { id: 'doshinJutte', name: '同心の十手', slot: 'accessory', price: 3000, bonus: { atk: 5, def: 8 }, wearers: ALL, description: 'からくり同心の十手。刀を受け止める鉤が付いている' },
  ookamiKiba: { id: 'ookamiKiba', name: '送り狼の牙', slot: 'accessory', price: 3000, bonus: { atk: 8, spd: 6 }, wearers: ALL, description: '夜道で人の後をつける送り狼の牙' },
  ookuTekagami: { id: 'ookuTekagami', name: '大奥の手鏡', slot: 'accessory', price: 3600, bonus: { mag: 12, luck: 12 }, wearers: ALL, description: '化け猫が化けた奥女中の手鏡。覗くと心が澄む' },
};

export type Equipped = Partial<Record<EquipSlot, string>>;

/** 加入したときに付けている装備。 */
export const STARTING_EQUIPMENT: Record<CharacterId, Equipped> = {
  hero: { weapon: 'nagawakizashi', armor: 'shimagappa', accessory: 'sandogasa' },
  kasumi: { weapon: 'kunai', armor: 'shimagappa' },
  gendo: { weapon: 'kongozue', armor: 'shimagappa' },
  // 第 4 章で、辰五郎の形見のからくり鉄砲を持って加入する
  orin: { weapon: 'karakuriju', armor: 'kusarikatabira' },
  hyogo: { weapon: 'hyogoKatana', armor: 'hyogoHaori' },
};

export function canEquip(id: CharacterId, equipId: string): boolean {
  return EQUIPMENT[equipId]?.wearers.includes(id) ?? false;
}

/** その特性を与えている装備の ID（戦闘のメッセージに名前を出すため）。 */
export function traitSource(equipped: Equipped, trait: EquipTrait): string | undefined {
  return EQUIP_SLOTS.map((slot) => equipped[slot]).find((id) => id && EQUIPMENT[id]?.traits?.includes(trait));
}

/** 装備の能力値の合計。 */
export function equipmentBonus(equipped: Equipped): Stats {
  const total: Stats = { maxHp: 0, maxMp: 0, atk: 0, def: 0, mag: 0, spd: 0, luck: 0 };
  for (const slot of EQUIP_SLOTS) {
    const id = equipped[slot];
    const bonus = id ? EQUIPMENT[id]?.bonus : undefined;
    if (!bonus) continue;
    for (const k of Object.keys(total) as (keyof Stats)[]) total[k] += bonus[k] ?? 0;
  }
  return total;
}
