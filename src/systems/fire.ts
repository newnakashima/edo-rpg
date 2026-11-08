// 火のある場所（煙草の葉を吸える場所）。画面に依存しない純粋なロジック。
import { MAPS, npcVisible, type NpcDef } from '../data/maps';
import type { GameState } from './gameState';

/** 火のそばとみなす距離（縦・横・斜めのマス数）。茶屋・旅籠・居酒屋の人は台の向こうに立つので、店先から届くようにする。 */
export const FIRE_RANGE = 2;

/** 火の元になる人・物。茶屋（湯を沸かす火）・旅籠（囲炉裏）・居酒屋（燗をつける火）の人と、焚き火・もぐりの宿の小屋（囲炉裏）。 */
export function isFireSource(npc: NpcDef): boolean {
  return npc.action === 'teahouse' || npc.action === 'inn' || npc.action === 'moguriInn' || npc.action === 'izakaya' || npc.object === 'takibi';
}

/** 今いる場所が火のそばか（FIRE_RANGE のマス以内に、いる火の元がある）。 */
export function nearFire(state: Pick<GameState, 'mapId' | 'x' | 'y' | 'flags'>): boolean {
  const map = MAPS[state.mapId];
  return map ? fireAmong(map.npcs, state.x, state.y, state.flags) : false;
}

/**
 * npcs の中に、(x, y) から FIRE_RANGE のマス以内にいる火の元があるか。
 * 壁越しでも火のそばとみなす（今の茶屋・旅籠・居酒屋・焚き火のまわりで壁を挟んで立てるのは店の外の通りなど、火の気の届く近さだけのため）。
 * 壁の向こうで吸えるのがおかしい場所ができたら、マスの間の見通し（壁を通らないか）を足す。
 */
export function fireAmong(npcs: readonly NpcDef[], x: number, y: number, flags: Record<string, boolean>): boolean {
  return npcs.some((n) => isFireSource(n) && npcVisible(n, flags) && Math.max(Math.abs(n.x - x), Math.abs(n.y - y)) <= FIRE_RANGE);
}
