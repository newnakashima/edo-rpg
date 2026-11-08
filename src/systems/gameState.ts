import type { Gender } from '../data/characters';
import type { Inventory } from '../data/items';
import { JINGI_START } from './jingi';
import { createMember, type PartyMember } from './party';

export type Facing = 'up' | 'down' | 'left' | 'right';

/** セーブの対象になるゲームの状態。 */
export interface GameState {
  gender: Gender;
  party: PartyMember[];
  /** 一時的に抜けている仲間（経験値と装備を預かる。第 5 章の霞）。 */
  away: PartyMember[];
  /** 所持金（文）。 */
  money: number;
  /** 道具・装備品（ID ごとの個数）。 */
  items: Inventory;
  /** 飛脚に預けている道具・装備品。 */
  storage: Inventory;
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
  /** イベントの進行フラグ。 */
  flags: Record<string, boolean>;
  /** 次のエンカウントまでの残り歩数。 */
  stepsToEncounter: number;
  /** 仁義ポイント（0〜JINGI_MAX）。親分の屋敷に泊まるときに使う（src/systems/jingi.ts）。 */
  jingi: number;
  /** 魔除けの香・結界の真言が効いている残りの歩数（敵の出る場所を歩くと減る）。省くと 0（効いていない）。 */
  wardSteps?: number;
  playTimeSec: number;
}

/** 旅立ちのときに持っている道具。 */
export const STARTING_ITEMS: Inventory = { kizugusuri: 3, dokukeshi: 1 };

export function newGame(gender: Gender, start: { mapId: string; x: number; y: number }): GameState {
  return {
    gender,
    party: [createMember('hero', 1)],
    away: [],
    money: 50,
    items: { ...STARTING_ITEMS },
    storage: {},
    mapId: start.mapId,
    x: start.x,
    y: start.y,
    facing: 'down',
    flags: {},
    jingi: JINGI_START,
    stepsToEncounter: 24,
    playTimeSec: 0,
  };
}
