// 店の売り買い、寺社のお祓い、飛脚の預かり（docs/balance.md の「経済」）。
import { EQUIPMENT } from '../data/equipment';
import { addItem, isKnownItem, ITEMS, itemCount, MAX_ITEM_COUNT, removeItem, type Inventory } from '../data/items';
import type { GameState } from './gameState';
import { memberStats } from './party';

export type TradeResult = { ok: true; state: GameState } | { ok: false; reason: 'money' | 'full' | 'none' | 'unknown' };

/** 買値（文）。 */
export function buyPrice(id: string): number {
  return ITEMS[id]?.price ?? EQUIPMENT[id]?.price ?? 0;
}

/** 売値（買値の半額、切り捨て）。 */
export function sellPrice(id: string): number {
  return Math.floor(buyPrice(id) / 2);
}

/** n 個買う。お金が足りない、持ちきれないときは買わない。 */
export function buy(state: GameState, id: string, n = 1): TradeResult {
  if (!isKnownItem(id) || n < 1) return { ok: false, reason: 'unknown' };
  const cost = buyPrice(id) * n;
  if (state.money < cost) return { ok: false, reason: 'money' };
  if (itemCount(state.items, id) + n > MAX_ITEM_COUNT) return { ok: false, reason: 'full' };
  return { ok: true, state: { ...state, money: state.money - cost, items: addItem(state.items, id, n) } };
}

/** 所持品から n 個売る（付けている装備は所持品に入っていないので売れない）。 */
export function sell(state: GameState, id: string, n = 1): TradeResult {
  if (!isKnownItem(id) || n < 1) return { ok: false, reason: 'unknown' };
  const items = removeItem(state.items, id, n);
  if (!items) return { ok: false, reason: 'none' };
  return { ok: true, state: { ...state, money: state.money + sellPrice(id) * n, items } };
}

/** 寺社のお祓い（倒れた仲間 1 人を起こす）の値段。 */
export function templePrice(areaLevel: number): number {
  return 20 + areaLevel * 10;
}

/** 寺社でお祓いを受け、倒れた仲間を全員起こす（HP・MP 満タン）。値段は倒れた人数分。 */
export function prayAtTemple(state: GameState, areaLevel: number): TradeResult {
  const fallen = state.party.filter((m) => m.hp <= 0).length;
  if (fallen === 0) return { ok: false, reason: 'none' };
  const cost = templePrice(areaLevel) * fallen;
  if (state.money < cost) return { ok: false, reason: 'money' };
  const party = state.party.map((m) => {
    if (m.hp > 0) return m;
    const s = memberStats(m);
    return { ...m, hp: s.maxHp, mp: s.maxMp };
  });
  return { ok: true, state: { ...state, money: state.money - cost, party } };
}

function move(from: Inventory, to: Inventory, id: string, n: number): { from: Inventory; to: Inventory } | null {
  const rest = removeItem(from, id, n);
  if (!rest || itemCount(to, id) + n > MAX_ITEM_COUNT) return null;
  return { from: rest, to: addItem(to, id, n) };
}

/** 飛脚に預ける（所持品 → 預かり）。 */
export function deposit(state: GameState, id: string, n = 1): TradeResult {
  if (!isKnownItem(id)) return { ok: false, reason: 'unknown' };
  if (itemCount(state.items, id) < n) return { ok: false, reason: 'none' };
  const r = move(state.items, state.storage, id, n);
  return r ? { ok: true, state: { ...state, items: r.from, storage: r.to } } : { ok: false, reason: 'full' };
}

/** 飛脚から引き出す（預かり → 所持品）。 */
export function withdraw(state: GameState, id: string, n = 1): TradeResult {
  if (!isKnownItem(id)) return { ok: false, reason: 'unknown' };
  if (itemCount(state.storage, id) < n) return { ok: false, reason: 'none' };
  const r = move(state.storage, state.items, id, n);
  return r ? { ok: true, state: { ...state, storage: r.from, items: r.to } } : { ok: false, reason: 'full' };
}
