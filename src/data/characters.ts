// docs/characters.md、docs/balance.md の「能力値」の表。
import type { Stats } from '../systems/stats';

export type CharacterId = 'hero' | 'kasumi' | 'gendo' | 'orin' | 'hyogo';
export type Gender = 'm' | 'f';

export interface CharacterDef {
  id: CharacterId;
  /** 表示名。主人公は男女で変わる。 */
  name: string | Record<Gender, string>;
  job: string;
  /** Lv1 の能力値。 */
  base: Stats;
  /**
   * 一時加入のゲスト（第 5 章の榊兵庫）のレベル。ゲストはこのレベルで加入し、経験値を得ず（成長しない）、装備を変えられない。
   * 抜けるときは一時離脱の預かり（GameState.away）に入れない。
   */
  guestLevel?: number;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  hero: {
    id: 'hero',
    name: { m: '弥太郎', f: 'お志乃' },
    job: '渡世人',
    base: { maxHp: 30, maxMp: 6, atk: 10, def: 8, mag: 5, spd: 8, luck: 6 },
  },
  kasumi: {
    id: 'kasumi',
    name: '霞',
    job: '忍者',
    base: { maxHp: 24, maxMp: 8, atk: 9, def: 6, mag: 6, spd: 13, luck: 9 },
  },
  gendo: {
    id: 'gendo',
    name: '玄道',
    job: '破戒僧',
    base: { maxHp: 34, maxMp: 10, atk: 11, def: 9, mag: 9, spd: 5, luck: 5 },
  },
  orin: {
    id: 'orin',
    name: 'お凛',
    job: '鉄砲打ち',
    base: { maxHp: 26, maxMp: 8, atk: 12, def: 6, mag: 7, spd: 9, luck: 7 },
  },
  hyogo: {
    id: 'hyogo',
    name: '榊兵庫',
    job: '侍',
    base: { maxHp: 30, maxMp: 8, atk: 12, def: 10, mag: 4, spd: 8, luck: 6 },
    guestLevel: 18,
  },
};

/** 一時加入のゲスト（経験値を得ず、装備を変えられない）か。 */
export function isGuest(id: CharacterId): boolean {
  return CHARACTERS[id].guestLevel !== undefined;
}

export function characterName(id: CharacterId, gender: Gender): string {
  const name = CHARACTERS[id].name;
  return typeof name === 'string' ? name : name[gender];
}
