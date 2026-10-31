// 町の施設（docs/balance.md の「経済」）。
import type { GameState } from './gameState';
import { memberStats, restoreAll } from './party';

export function innPrice(areaLevel: number): number {
  return 10 + areaLevel * 4;
}

export function dangoPrice(areaLevel: number): number {
  return 5 + areaLevel;
}

/** 団子で回復する割合（最大 HP に対する割合）。 */
export const DANGO_HEAL_RATE = 0.3;

export type PurchaseResult = { ok: true; state: GameState } | { ok: false; reason: 'money' };

/** 旅籠に泊まる。全員の HP・MP を全回復する（戦闘不能も治る）。 */
export function stayAtInn(state: GameState, areaLevel: number): PurchaseResult {
  const price = innPrice(areaLevel);
  if (state.money < price) return { ok: false, reason: 'money' };
  return { ok: true, state: { ...state, money: state.money - price, party: restoreAll(state.party) } };
}

/** 茶屋で団子を食べる。戦闘不能でない全員の HP を少し回復する。 */
export function eatDango(state: GameState, areaLevel: number): PurchaseResult {
  const price = dangoPrice(areaLevel);
  if (state.money < price) return { ok: false, reason: 'money' };
  const party = state.party.map((m) => {
    if (m.hp <= 0) return m;
    const max = memberStats(m).maxHp;
    return { ...m, hp: Math.min(max, m.hp + Math.ceil(max * DANGO_HEAL_RATE)) };
  });
  return { ok: true, state: { ...state, money: state.money - price, party } };
}

/** 全滅したとき。所持金を半分にし、全員を全回復して旅籠の前に戻す。 */
export function reviveAfterDefeat(state: GameState, respawn: { mapId: string; x: number; y: number }): GameState {
  return {
    ...state,
    money: Math.floor(state.money / 2),
    party: restoreAll(state.party),
    mapId: respawn.mapId,
    x: respawn.x,
    y: respawn.y,
    facing: 'down',
  };
}
