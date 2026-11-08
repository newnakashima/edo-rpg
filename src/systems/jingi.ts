// 仁義ポイントと親分の屋敷（docs/balance.md の「仁義ポイント」）。
// 渡世人の一行は、各地の親分の屋敷に仁義ポイントを使って泊まり、体力と気力を全回復する。
// ポイントは賭場・居酒屋・妓楼の頼まれごとと博徒の紹介（src/data/jingiRequests.ts）や、親分の頼み（src/data/oyabunRequests.ts）で得る。
// 町の旅籠は渡世人を泊めないので、泊まるのは親分の屋敷か、もぐりの宿。
// ポイントが足りないときは、ワールドマップのもぐりの宿（src/data/moguriYado.ts）にお金で泊まる。
import type { GameState } from './gameState';
import { memberStats, restoreAll } from './party';

/** 仁義ポイントの上限（ユーザーの決定、2026-11-07）。 */
export const JINGI_MAX = 100;

/**
 * 「名が通る」仁義ポイント（ユーザーの決定、2026-11-07）。これ以上あるあいだは、各地の親分の屋敷で贈り物（レアな装飾品）をもらえる
 * （src/data/oyabunGifts.ts）。メニューの仁義ポイントの横にも「名が通る」と出す。
 */
export const JINGI_RENOWN = 90;

/** 名が通っているか（仁義ポイントが JINGI_RENOWN 以上）。 */
export function isRenowned(jingi: number): boolean {
  return jingi >= JINGI_RENOWN;
}

/** メニューに出す仁義ポイント（名が通っていれば、そう添える）。 */
export function jingiLabel(jingi: number): string {
  return isRenowned(jingi) ? `仁義 ${jingi}（名が通る）` : `仁義 ${jingi}`;
}

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
 * 親分の屋敷に泊まる。仁義ポイントを使い、全員の体力・気力を全回復する（もぐりの宿と同じく戦闘不能も治る）。
 * もぐりの宿と違い、全員の体力・気力が満タンなら泊めず（full）、ポイントを使わない（得る手段の限られた資源をむだにしないため）。
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
