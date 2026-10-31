// 道具（消耗品）と所持品。装備品の定義は equipment.ts にあり、所持品には両方が入る。
import { EQUIPMENT } from './equipment';

export type ItemEffect =
  /** HP を amount 回復する。 */
  | { kind: 'healHp'; amount: number }
  /** MP を amount 回復する。 */
  | { kind: 'healMp'; amount: number }
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

export const ITEMS: Record<string, ItemDef> = {
  kizugusuri: { id: 'kizugusuri', name: '傷薬', price: 8, effect: { kind: 'healHp', amount: 30 }, target: 'ally', field: true, description: '体力を 30 回復する' },
  kintsuba: { id: 'kintsuba', name: '金創膏', price: 60, effect: { kind: 'healHp', amount: 120 }, target: 'ally', field: true, description: '体力を 120 回復する' },
  kakimeshi: { id: 'kakimeshi', name: '牡蠣飯', price: 30, effect: { kind: 'healHp', amount: 90 }, target: 'ally', field: true, description: '広島の牡蠣の炊き込み飯。体力を 90 回復する' },
  kasutera: { id: 'kasutera', name: 'カステラ', price: 110, effect: { kind: 'healHp', amount: 200 }, target: 'ally', field: true, description: '長崎の南蛮菓子。体力を 200 回復する' },
  mankintan: { id: 'mankintan', name: '万金丹', price: 40, effect: { kind: 'healMp', amount: 15 }, target: 'ally', field: true, description: '気力を 15 回復する' },
  konpeito: { id: 'konpeito', name: '金平糖', price: 90, effect: { kind: 'healMp', amount: 30 }, target: 'ally', field: true, description: '南蛮渡りの砂糖菓子。気力を 30 回復する' },
  dokukeshi: { id: 'dokukeshi', name: '毒消し', price: 6, effect: { kind: 'cure', ailment: 'poison' }, target: 'ally', field: false, description: '毒を治す' },
  kitsukegusuri: { id: 'kitsukegusuri', name: '気付け薬', price: 100, effect: { kind: 'revive', rate: 0.25 }, target: 'ally', field: true, description: '戦闘不能から起こす' },
  hangontan: { id: 'hangontan', name: '反魂丹', price: 30, effect: { kind: 'cure' }, target: 'ally', field: false, description: '状態異常をすべて治す' },
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
