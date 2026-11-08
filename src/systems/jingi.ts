// 仁義ポイントと親分の屋敷（docs/balance.md の「仁義ポイント」）。
// 渡世人の一行は、各地の親分の屋敷に仁義ポイントを使って泊まり、体力と気力を全回復する。
// ポイントは賭場・居酒屋・妓楼の頼まれごと（src/data/jingiRequests.ts）や、博徒の紹介・親分の頼み（シナリオ。別に足す）で得る。
// 町の旅籠は渡世人を泊めないので、泊まるのは親分の屋敷か、もぐりの宿。
// ポイントが足りないときは、ワールドマップのもぐりの宿（src/data/moguriYado.ts）にお金で泊まる。
import type { GameState } from './gameState';
import { memberStats, restoreAll } from './party';

/** 仁義ポイントの上限（ユーザーの決定、2026-11-07）。 */
export const JINGI_MAX = 100;

/** 旅立ちのときの仁義ポイント（序盤の屋敷に 10 回泊まれる）。 */
export const JINGI_START = 10;

/**
 * 親分の屋敷に 1 回泊まるのに使う仁義ポイント。序盤の町は 1、中盤は 2、終盤は 3（ユーザーの決定、2026-11-07）。
 * 町の区分は地域の敵レベルで決める（序盤 = 清水湊〜名古屋の Lv1〜7、中盤 = 京〜大坂の Lv10〜16、終盤 = 長崎から先の Lv19 以上）。
 * 寄り道の町も、付近の敵レベルで同じように分ける。
 */
export function oyabunStayCost(areaLevel: number): number {
  if (areaLevel < 10) return 1;
  if (areaLevel < 19) return 2;
  return 3;
}

/** 仁義ポイントを増やす・減らす（0〜JINGI_MAX に収める）。 */
export function addJingi(state: GameState, amount: number): GameState {
  return { ...state, jingi: Math.max(0, Math.min(JINGI_MAX, state.jingi + amount)) };
}

export type OyabunStayResult = { ok: true; state: GameState; cost: number } | { ok: false; reason: 'jingi' | 'full'; cost: number };

/**
 * 親分の屋敷に泊まる。仁義ポイントを使い、全員の体力・気力を全回復する（旅籠と同じく戦闘不能も治る）。
 * 旅籠と違い、全員の体力・気力が満タンなら泊めず（full）、ポイントを使わない（得る手段の限られた資源をむだにしないため）。
 */
export function stayAtOyabun(state: GameState, areaLevel: number): OyabunStayResult {
  const cost = oyabunStayCost(areaLevel);
  const full = state.party.every((m) => {
    const max = memberStats(m);
    return m.hp >= max.maxHp && m.mp >= max.maxMp;
  });
  if (full) return { ok: false, reason: 'full', cost };
  if (state.jingi < cost) return { ok: false, reason: 'jingi', cost };
  return { ok: true, state: { ...addJingi(state, -cost), party: restoreAll(state.party) }, cost };
}
