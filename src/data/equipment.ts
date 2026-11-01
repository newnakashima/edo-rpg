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
  hinawaju: { id: 'hinawaju', name: '火縄銃', slot: 'weapon', price: 60, bonus: { atk: 4 }, wearers: ['orin'], description: '使い込んだ火縄銃' },
  karakuriju: { id: 'karakuriju', name: 'からくり銃', slot: 'weapon', price: 380, bonus: { atk: 9 }, wearers: ['orin'], description: 'ゼンマイで弾を込める銃' },
  nanbanju: { id: 'nanbanju', name: '南蛮銃', slot: 'weapon', price: 1300, bonus: { atk: 15 }, wearers: ['orin'], description: '南蛮渡りの燧石の銃' },
  gewehr: { id: 'gewehr', name: 'ゲベール銃', slot: 'weapon', price: 2400, bonus: { atk: 21 }, wearers: ['orin'], description: '出島から渡ったオランダの銃' },
  kagaZutsu: { id: 'kagaZutsu', name: '加賀筒', slot: 'weapon', price: 3300, bonus: { atk: 25 }, wearers: ['orin'], description: '加賀の鉄砲鍛冶が打った長筒' },
  kunitomoZutsu: { id: 'kunitomoZutsu', name: '国友筒', slot: 'weapon', price: 4500, bonus: { atk: 30 }, wearers: ['orin'], description: '近江の鉄砲鍛冶が打った筒。江戸で売られている' },
  aoiZutsu: { id: 'aoiZutsu', name: '葵の御筒', slot: 'weapon', price: 5400, bonus: { atk: 35 }, wearers: ['orin'], description: '将軍家の鉄砲蔵の筒。終章の江戸城で手に入る' },
  renpatsuju: { id: 'renpatsuju', name: '連発からくり銃', slot: 'weapon', price: 1800, bonus: { atk: 18 }, wearers: ['orin'], description: 'ゼンマイで弾を続けて送る銃' },
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
  // 会津若松の什の少年たちのお礼（寄り道のサブイベント）。店には置かない
  okiagariKoboshi: { id: 'okiagariKoboshi', name: '起き上がり小法師', slot: 'accessory', price: 1400, bonus: { maxHp: 20, def: 2, luck: 6 }, wearers: ALL, description: '何度転んでも起き上がる、会津の張り子の人形' },
  waraji: { id: 'waraji', name: 'わらじ', slot: 'accessory', price: 15, bonus: { spd: 2 }, wearers: ALL, description: '履き替え用の新しい草鞋' },
  chochin: { id: 'chochin', name: '提灯', slot: 'accessory', price: 60, bonus: { def: 1, luck: 3 }, wearers: ALL, description: '夜道を照らす小田原提灯' },
  kiseru: { id: 'kiseru', name: 'キセル', slot: 'accessory', price: 120, bonus: { mag: 4 }, wearers: ALL, description: '一服すると頭が冴える煙管' },
  inro: { id: 'inro', name: '印籠', slot: 'accessory', price: 150, bonus: { maxHp: 10 }, wearers: ALL, description: '薬を入れる小箱' },
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
