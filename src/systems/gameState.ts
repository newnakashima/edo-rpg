import type { Gender } from '../data/characters';
import { createMember, type PartyMember } from './party';

export type Facing = 'up' | 'down' | 'left' | 'right';

/** セーブの対象になるゲームの状態。 */
export interface GameState {
  gender: Gender;
  party: PartyMember[];
  /** 所持金（文）。 */
  money: number;
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
  /** イベントの進行フラグ。 */
  flags: Record<string, boolean>;
  /** 次のエンカウントまでの残り歩数。 */
  stepsToEncounter: number;
  playTimeSec: number;
}

export function newGame(gender: Gender, start: { mapId: string; x: number; y: number }): GameState {
  return {
    gender,
    party: [createMember('hero', 1)],
    money: 50,
    mapId: start.mapId,
    x: start.x,
    y: start.y,
    facing: 'down',
    flags: {},
    stepsToEncounter: 24,
    playTimeSec: 0,
  };
}
