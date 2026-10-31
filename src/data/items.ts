// 道具（消耗品）。装備品はフェーズ 2 の別の作業で追加する。

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
  /** 戦闘の外（メニュー）でも使える。メニュー画面（フェーズ 2）で使う。 */
  field: boolean;
  description: string;
}

export const ITEMS: Record<string, ItemDef> = {
  kizugusuri: { id: 'kizugusuri', name: '傷薬', price: 8, effect: { kind: 'healHp', amount: 30 }, target: 'ally', field: true, description: '体力を 30 回復する' },
  kintsuba: { id: 'kintsuba', name: '金創膏', price: 60, effect: { kind: 'healHp', amount: 120 }, target: 'ally', field: true, description: '体力を 120 回復する' },
  mankintan: { id: 'mankintan', name: '万金丹', price: 40, effect: { kind: 'healMp', amount: 15 }, target: 'ally', field: true, description: '気力を 15 回復する' },
  dokukeshi: { id: 'dokukeshi', name: '毒消し', price: 6, effect: { kind: 'cure', ailment: 'poison' }, target: 'ally', field: true, description: '毒を治す' },
  kitsukegusuri: { id: 'kitsukegusuri', name: '気付け薬', price: 100, effect: { kind: 'revive', rate: 0.25 }, target: 'ally', field: true, description: '戦闘不能から起こす' },
  hangontan: { id: 'hangontan', name: '反魂丹', price: 30, effect: { kind: 'cure' }, target: 'ally', field: false, description: '状態異常をすべて治す' },
};

/** 所持品（道具の ID ごとの個数）。 */
export type Inventory = Record<string, number>;

/** 1 種類の道具を持てる上限。 */
export const MAX_ITEM_COUNT = 99;

export function itemCount(inv: Inventory, id: string): number {
  return inv[id] ?? 0;
}

/** 道具を加える（上限で止める）。新しいオブジェクトを返す。店・宝箱で使う。 */
export function addItem(inv: Inventory, id: string, n = 1): Inventory {
  if (!Object.hasOwn(ITEMS, id)) throw new Error(`unknown item: ${id}`);
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

/** 持っている道具の ID（ITEMS の定義順）。 */
export function ownedItems(inv: Inventory): string[] {
  return Object.keys(ITEMS).filter((id) => itemCount(inv, id) > 0);
}
