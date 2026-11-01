// 道具（消耗品）と所持品。装備品の定義は equipment.ts にあり、所持品には両方が入る。
import { EQUIPMENT } from './equipment';

export type ItemEffect =
  /** HP を amount 回復する。 */
  | { kind: 'healHp'; amount: number }
  /** MP を amount 回復する。 */
  | { kind: 'healMp'; amount: number }
  /** HP を hp、MP を mp 回復する（兵糧丸）。 */
  | { kind: 'healBoth'; hp: number; mp: number }
  /** 状態異常を治す。ailment を省くとすべて。 */
  | { kind: 'cure'; ailment?: 'poison' | 'paralysis' | 'sleep' | 'confusion' }
  /** 戦闘不能から HP の rate の割合で起き上がらせる。 */
  | { kind: 'revive'; rate: number };

export interface ItemDef {
  id: string;
  name: string;
  /** 買値（文）。売値は半額。店（フェーズ 2 の町の施設）で使う。 */
  price: number;
  effect: ItemEffect;
  /** 対象。今は味方単体の道具だけ。 */
  target: 'ally';
  /** 戦闘の外（メニュー）でも使える。状態異常は戦闘が終わると治るので、治す道具は戦闘中だけ。 */
  field: boolean;
  description: string;
}

// 定義順がメニューの並び順になる（体力 → 気力 → 両方 → 状態異常 → 気付け）。
// 名物の食べ物は、その土地の店（shops.ts）で売る。
export const ITEMS: Record<string, ItemDef> = {
  // 体力
  omusubi: { id: 'omusubi', name: 'おむすび', price: 4, effect: { kind: 'healHp', amount: 20 }, target: 'ally', field: true, description: '塩むすび。体力を 20 回復する' },
  kizugusuri: { id: 'kizugusuri', name: '傷薬', price: 8, effect: { kind: 'healHp', amount: 30 }, target: 'ally', field: true, description: '体力を 30 回復する' },
  dango: { id: 'dango', name: '団子', price: 10, effect: { kind: 'healHp', amount: 35 }, target: 'ally', field: true, description: '茶屋の串団子。体力を 35 回復する' },
  abekawamochi: { id: 'abekawamochi', name: '安倍川餅', price: 18, effect: { kind: 'healHp', amount: 50 }, target: 'ally', field: true, description: '駿府の名物のきな粉餅。体力を 50 回復する' },
  unagi: { id: 'unagi', name: 'うなぎの蒲焼', price: 22, effect: { kind: 'healHp', amount: 58 }, target: 'ally', field: true, description: '浜名湖のうなぎを焼いた浜松の名物。体力を 58 回復する' },
  uiro: { id: 'uiro', name: 'ういろう', price: 26, effect: { kind: 'healHp', amount: 65 }, target: 'ally', field: true, description: '名古屋の米の蒸し菓子。体力を 65 回復する' },
  yatsuhashi: { id: 'yatsuhashi', name: '八ツ橋', price: 28, effect: { kind: 'healHp', amount: 70 }, target: 'ally', field: true, description: '京の肉桂の焼き菓子。体力を 70 回復する' },
  katayaki: { id: 'katayaki', name: 'かたやき', price: 30, effect: { kind: 'healHp', amount: 75 }, target: 'ally', field: true, description: '伊賀の忍びの固い煎餅。体力を 75 回復する' },
  kakimeshi: { id: 'kakimeshi', name: '牡蠣飯', price: 30, effect: { kind: 'healHp', amount: 90 }, target: 'ally', field: true, description: '広島の牡蠣の炊き込み飯。体力を 90 回復する' },
  awaokoshi: { id: 'awaokoshi', name: '粟おこし', price: 40, effect: { kind: 'healHp', amount: 100 }, target: 'ally', field: true, description: '大坂の名物の干菓子。体力を 100 回復する' },
  kintsuba: { id: 'kintsuba', name: '金創膏', price: 60, effect: { kind: 'healHp', amount: 120 }, target: 'ally', field: true, description: '体力を 120 回復する' },
  kasutera: { id: 'kasutera', name: 'カステラ', price: 110, effect: { kind: 'healHp', amount: 200 }, target: 'ally', field: true, description: '長崎の南蛮菓子。体力を 200 回復する' },
  shibafune: { id: 'shibafune', name: '柴舟', price: 130, effect: { kind: 'healHp', amount: 240 }, target: 'ally', field: true, description: '金沢の生姜の煎餅。体力を 240 回復する' },
  zundaMochi: { id: 'zundaMochi', name: 'ずんだ餅', price: 150, effect: { kind: 'healHp', amount: 270 }, target: 'ally', field: true, description: '仙台の枝豆の餡の餅。体力を 270 回復する' },
  mishirazuGaki: { id: 'mishirazuGaki', name: '身不知柿', price: 160, effect: { kind: 'healHp', amount: 285 }, target: 'ally', field: true, description: '会津の渋を抜いた甘い柿。体力を 285 回復する' },
  sakuraMochi: { id: 'sakuraMochi', name: '桜餅', price: 170, effect: { kind: 'healHp', amount: 300 }, target: 'ally', field: true, description: '江戸向島の桜の葉の餅。体力を 300 回復する' },
  // 気力
  amazake: { id: 'amazake', name: '甘酒', price: 20, effect: { kind: 'healMp', amount: 8 }, target: 'ally', field: true, description: '体の温まる甘酒。気力を 8 回復する' },
  mankintan: { id: 'mankintan', name: '万金丹', price: 40, effect: { kind: 'healMp', amount: 15 }, target: 'ally', field: true, description: '気力を 15 回復する' },
  matcha: { id: 'matcha', name: '宇治の抹茶', price: 70, effect: { kind: 'healMp', amount: 24 }, target: 'ally', field: true, description: '宇治の濃い抹茶。気力を 24 回復する' },
  konpeito: { id: 'konpeito', name: '金平糖', price: 90, effect: { kind: 'healMp', amount: 30 }, target: 'ally', field: true, description: '南蛮渡りの砂糖菓子。気力を 30 回復する' },
  bocha: { id: 'bocha', name: '加賀棒茶', price: 110, effect: { kind: 'healMp', amount: 36 }, target: 'ally', field: true, description: '茎を焙じた加賀の茶。気力を 36 回復する' },
  // 体力と気力
  hyorogan: { id: 'hyorogan', name: '兵糧丸', price: 60, effect: { kind: 'healBoth', hp: 60, mp: 12 }, target: 'ally', field: true, description: '忍びの携帯食。体力を 60、気力を 12 回復する' },
  // 状態異常（戦闘が終わると治るので、戦闘中だけ）
  dokukeshi: { id: 'dokukeshi', name: '毒消し', price: 6, effect: { kind: 'cure', ailment: 'poison' }, target: 'ally', field: false, description: '毒を治す' },
  umeboshi: { id: 'umeboshi', name: '梅干し', price: 8, effect: { kind: 'cure', ailment: 'sleep' }, target: 'ally', field: false, description: '酸っぱさで目が覚める。眠りを治す' },
  kumanoi: { id: 'kumanoi', name: '熊の胆', price: 20, effect: { kind: 'cure', ailment: 'paralysis' }, target: 'ally', field: false, description: '苦い胆の薬。痺れを治す' },
  hakka: { id: 'hakka', name: '薄荷', price: 18, effect: { kind: 'cure', ailment: 'confusion' }, target: 'ally', field: false, description: 'すっとする香りで正気に返る。混乱を治す' },
  hangontan: { id: 'hangontan', name: '反魂丹', price: 30, effect: { kind: 'cure' }, target: 'ally', field: false, description: '状態異常をすべて治す' },
  // 気付け
  kitsukegusuri: { id: 'kitsukegusuri', name: '気付け薬', price: 100, effect: { kind: 'revive', rate: 0.25 }, target: 'ally', field: true, description: '戦闘不能から起こす' },
  ninjin: { id: 'ninjin', name: '朝鮮人参', price: 280, effect: { kind: 'revive', rate: 0.5 }, target: 'ally', field: true, description: '高価な薬の根。戦闘不能から体力の半分で起こす' },
};

/** 所持品（道具・装備品の ID ごとの個数）。 */
export type Inventory = Record<string, number>;

/** 1 種類の道具を持てる上限。 */
export const MAX_ITEM_COUNT = 99;

export function itemCount(inv: Inventory, id: string): number {
  return inv[id] ?? 0;
}

/** 道具か装備品として定義されている ID か。 */
export function isKnownItem(id: string): boolean {
  return Object.hasOwn(ITEMS, id) || Object.hasOwn(EQUIPMENT, id);
}

/** 道具・装備品の表示名。 */
export function itemName(id: string): string {
  return ITEMS[id]?.name ?? EQUIPMENT[id]?.name ?? id;
}

/** 道具・装備品を加える（上限で止める）。新しいオブジェクトを返す。店・宝箱・装備を外したときに使う。 */
export function addItem(inv: Inventory, id: string, n = 1): Inventory {
  if (!isKnownItem(id)) throw new Error(`unknown item: ${id}`);
  return { ...inv, [id]: Math.min(MAX_ITEM_COUNT, itemCount(inv, id) + n) };
}

/** 道具を減らす。足りなければ null。0 個になったら消す。 */
export function removeItem(inv: Inventory, id: string, n = 1): Inventory | null {
  const have = itemCount(inv, id);
  if (have < n) return null;
  const next = { ...inv };
  if (have === n) delete next[id];
  else next[id] = have - n;
  return next;
}

/** 持っている道具（消耗品）の ID（ITEMS の定義順）。 */
export function ownedItems(inv: Inventory): string[] {
  return Object.keys(ITEMS).filter((id) => itemCount(inv, id) > 0);
}

/** 持っている装備品の ID（EQUIPMENT の定義順）。 */
export function ownedEquipment(inv: Inventory): string[] {
  return Object.keys(EQUIPMENT).filter((id) => itemCount(inv, id) > 0);
}
