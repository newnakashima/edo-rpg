// docs/characters.md、docs/balance.md の「能力値」の表。
import { GROWTH_RATE, GROWTH_REFERENCE_LEVEL, STAT_KEYS, type GrowthCurve, type GrowthTable, type Stats } from '../systems/stats';

export type CharacterId = 'hero' | 'kasumi' | 'gendo' | 'orin' | 'hyogo';
export type Gender = 'm' | 'f';

export interface CharacterDef {
  id: CharacterId;
  /** 表示名。主人公は男女で変わる。 */
  name: string | Record<Gender, string>;
  job: string;
  /** 能力値ごとの伸び方（Lv1 の値・Lv32 の値・成長曲線）。 */
  growth: GrowthTable;
  /** 加入時のレベル。省くとその時点のパーティーの平均レベル（お凛は 1）。 */
  joinLevel?: number;
  /**
   * 一時加入のゲスト（第 5 章の榊兵庫）のレベル。ゲストはこのレベルで加入し、経験値を得ず（成長しない）、装備を変えられない。
   * 抜けるときは一時離脱の預かり（GameState.away）に入れない。
   */
  guestLevel?: number;
}

type Row = [lv1: number, lv32: number, curve: GrowthCurve];

/** 表の 1 行（HP・MP・攻撃・防御・術力・素早さ・運の順）から成長の表を作る。 */
function table(rows: Record<keyof Stats, Row>): GrowthTable {
  const growth = {} as GrowthTable;
  for (const key of STAT_KEYS) {
    const [lv1, lv32, curve] = rows[key];
    growth[key] = { lv1, lv32, curve };
  }
  return growth;
}

/** 毎レベル GROWTH_RATE ずつ同じ割合で伸びる表（成長しないゲストの榊兵庫）。 */
function steady(base: Stats): GrowthTable {
  const f = GROWTH_RATE ** (GROWTH_REFERENCE_LEVEL - 1);
  const growth = {} as GrowthTable;
  for (const key of STAT_KEYS) growth[key] = { lv1: base[key], lv32: base[key] * f, curve: 'normal' };
  return growth;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  // 攻守と術のバランス型。すべて普通の伸び
  hero: {
    id: 'hero',
    name: { m: '弥太郎', f: 'お志乃' },
    job: '渡世人',
    growth: table({
      maxHp: [30, 285, 'normal'],
      maxMp: [8, 90, 'normal'],
      atk: [10, 90, 'normal'],
      def: [8, 75, 'normal'],
      mag: [7, 75, 'normal'],
      spd: [8, 72, 'normal'],
      luck: [6, 55, 'normal'],
    }),
  },
  // 速さと会心（運）の晩成型。体は普通に伸びるが打たれ弱い
  kasumi: {
    id: 'kasumi',
    name: '霞',
    job: '忍者',
    growth: table({
      maxHp: [24, 200, 'normal'],
      maxMp: [8, 70, 'normal'],
      atk: [10, 85, 'late'],
      def: [6, 48, 'normal'],
      mag: [6, 45, 'normal'],
      spd: [14, 175, 'late'],
      luck: [10, 320, 'late'],
    }),
  },
  // 戦士と僧侶を兼ねる早熟型。体・力・守り・術がどれも早く伸びる。素早さは低い
  gendo: {
    id: 'gendo',
    name: '玄道',
    job: '破戒僧',
    growth: table({
      maxHp: [36, 330, 'early'],
      maxMp: [10, 100, 'early'],
      atk: [12, 102, 'early'],
      def: [10, 88, 'early'],
      mag: [9, 80, 'early'],
      spd: [5, 42, 'early'],
      luck: [5, 40, 'normal'],
    }),
  },
  // 術力と気力に特化した晩成型。ほかは低い。Lv1 で加わる
  orin: {
    id: 'orin',
    name: 'お凛',
    job: '鉄砲打ち',
    growth: table({
      maxHp: [22, 170, 'late'],
      maxMp: [14, 170, 'late'],
      atk: [7, 52, 'late'],
      def: [5, 45, 'late'],
      mag: [15, 140, 'late'],
      spd: [8, 72, 'late'],
      luck: [7, 60, 'late'],
    }),
    joinLevel: 1,
  },
  hyogo: {
    id: 'hyogo',
    name: '榊兵庫',
    job: '侍',
    growth: steady({ maxHp: 30, maxMp: 8, atk: 12, def: 10, mag: 4, spd: 8, luck: 6 }),
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
