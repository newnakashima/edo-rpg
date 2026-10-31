// docs/characters.md の「技の一覧」と、敵が使う技。
import type { CharacterId } from './characters';

/** 属性。祓は妖怪、機はからくりに効く。 */
export type Element = 'fire' | 'thunder' | 'holy' | 'mech';

/** 状態異常（悪い効果）。 */
export type Ailment = 'poison' | 'paralysis' | 'sleep' | 'confusion' | 'bind';

/** 一時的な能力の変化（良い効果・悪い効果の両方）。 */
export type Buff = 'atkUp' | 'atkDown' | 'accDown' | 'evade' | 'critUp';

export type StatusId = Ailment | Buff;

export const STATUS_NAMES: Record<StatusId, string> = {
  poison: '毒',
  paralysis: '麻痺',
  sleep: '眠り',
  confusion: '混乱',
  bind: '影縫い',
  atkUp: '攻撃↑',
  atkDown: '攻撃↓',
  accDown: '命中↓',
  evade: '回避↑',
  critUp: '会心↑',
};

export const AILMENTS: readonly Ailment[] = ['poison', 'paralysis', 'sleep', 'confusion', 'bind'];

export function isAilment(id: StatusId): id is Ailment {
  return (AILMENTS as readonly string[]).includes(id);
}

/** 状態異常の短い表示（戦闘の味方の欄に出す）。状態の名前の 1 文字目を AILMENTS の順に並べる。 */
export function ailmentMarks(status: Iterable<StatusId>): string {
  const set = new Set(status);
  return AILMENTS.filter((id) => set.has(id))
    .map((id) => STATUS_NAMES[id].slice(0, 1))
    .join('');
}

/**
 * 技の対象。
 * - enemy / ally: 単体を選ぶ（ally は戦闘不能の味方は選べない）
 * - allEnemies / allAllies: 全体
 * - randomEnemies: 敵からランダムに hits 回
 * - self: 自分
 * 「敵」「味方」は使う側から見た向き（敵が使う ally は敵どうし）。
 */
export type SkillTarget = 'enemy' | 'ally' | 'allEnemies' | 'allAllies' | 'randomEnemies' | 'self';

export type SkillEffect =
  /** 物理攻撃。ダメージは通常攻撃 × multiplier。hits〜maxHits 回当てる。gamble は半々で × 0 か × multiplier。 */
  | { kind: 'physical'; multiplier: number; hits?: number; maxHits?: number; sureHit?: boolean; ignoreDefense?: boolean; gamble?: boolean }
  /** 術のダメージ（技の威力 + 術力 × 1.2 − 防御 / 4）。 */
  | { kind: 'magic'; power: number }
  /** 回復（技の威力 + 術力 × 1.5）。 */
  | { kind: 'heal'; power: number }
  /** 状態異常・能力の変化を与える。 */
  | { kind: 'status'; status: StatusId; turns: number; chance?: number }
  /** 状態異常を治す。 */
  | { kind: 'cure' }
  /** 敵 1 体の攻撃を自分に引きつける。 */
  | { kind: 'taunt'; turns: number }
  /** そのターン、味方 1 人の代わりに攻撃を受ける。 */
  | { kind: 'cover' };

export interface SkillDef {
  id: string;
  name: string;
  /** 消費する気力。 */
  mp: number;
  target: SkillTarget;
  effect: SkillEffect;
  elements?: Element[];
  /** 行動順に関係なく先に動く（居合・かばう）。 */
  priority?: boolean;
  /** 戦闘の外（メニュー）でも使える（回復の技だけ）。 */
  field?: boolean;
  /** 説明（メニューに出す）。 */
  description: string;
}

export interface LearnableSkill {
  skill: string;
  /** 習得レベル。加入時に覚えている技は 1。 */
  level: number;
}

export const SKILLS: Record<string, SkillDef> = {
  // 渡世人（主人公）
  jingi: { id: 'jingi', name: '仁義を切る', mp: 2, target: 'enemy', effect: { kind: 'taunt', turns: 3 }, description: '3 ターン、敵の攻撃を引きつける' },
  iai: { id: 'iai', name: '居合', mp: 3, target: 'enemy', effect: { kind: 'physical', multiplier: 1.6 }, priority: true, description: '先制で斬る' },
  kabau: { id: 'kabau', name: 'かばう', mp: 0, target: 'ally', effect: { kind: 'cover' }, priority: true, description: '味方の代わりに攻撃を受ける' },
  ichishuku: { id: 'ichishuku', name: '一宿一飯の恩', mp: 6, target: 'allAllies', effect: { kind: 'heal', power: 8 }, field: true, description: '味方全体を回復する' },
  chohan: { id: 'chohan', name: '丁半博打', mp: 4, target: 'enemy', effect: { kind: 'physical', multiplier: 3, gamble: true }, description: '半々で大当たりか空振り' },
  toseinoiji: { id: 'toseinoiji', name: '渡世の意地', mp: 10, target: 'allEnemies', effect: { kind: 'physical', multiplier: 1.4 }, description: '敵全体を斬る' },
  // 霞（忍者）
  shuriken: { id: 'shuriken', name: '手裏剣', mp: 2, target: 'randomEnemies', effect: { kind: 'physical', multiplier: 0.6, hits: 2, maxHits: 3 }, description: '敵に 2〜3 回投げる' },
  kemuridama: { id: 'kemuridama', name: '煙玉', mp: 3, target: 'allEnemies', effect: { kind: 'status', status: 'accDown', turns: 3 }, description: '敵全体の命中を下げる' },
  shibire: { id: 'shibire', name: '痺れ薬', mp: 4, target: 'enemy', effect: { kind: 'status', status: 'paralysis', turns: 3 }, description: '敵を麻痺させる' },
  kagenui: { id: 'kagenui', name: '影縫い', mp: 5, target: 'enemy', effect: { kind: 'status', status: 'bind', turns: 1, chance: 0.9 }, description: '敵の次の行動を止める' },
  bunshin: { id: 'bunshin', name: '分身の術', mp: 6, target: 'self', effect: { kind: 'status', status: 'evade', turns: 3 }, description: '3 ターン回避を上げる' },
  katon: { id: 'katon', name: '火遁の術', mp: 9, target: 'allEnemies', effect: { kind: 'magic', power: 14 }, elements: ['fire'], description: '敵全体に火の術' },
  // 玄道（破戒僧）
  yakushi: { id: 'yakushi', name: '薬師の真言', mp: 3, target: 'ally', effect: { kind: 'heal', power: 10 }, field: true, description: '味方 1 人を回復する' },
  oharai: { id: 'oharai', name: 'お祓い', mp: 3, target: 'ally', effect: { kind: 'cure' }, description: '状態異常を治す' },
  katsu: { id: 'katsu', name: '喝', mp: 4, target: 'enemy', effect: { kind: 'magic', power: 10 }, elements: ['holy'], description: '妖怪・からくりに効く祓いの一喝' },
  kongoriki: { id: 'kongoriki', name: '金剛力', mp: 5, target: 'ally', effect: { kind: 'status', status: 'atkUp', turns: 3 }, description: '3 ターン攻撃を上げる' },
  hannya: { id: 'hannya', name: '般若心経', mp: 10, target: 'allAllies', effect: { kind: 'heal', power: 9 }, field: true, description: '味方全体を回復する' },
  fudo: { id: 'fudo', name: '不動明王の火炎', mp: 12, target: 'allEnemies', effect: { kind: 'magic', power: 16 }, elements: ['fire', 'holy'], description: '敵全体に火・祓の炎' },
  // お凛（鉄砲打ち）
  neraiuchi: { id: 'neraiuchi', name: '狙い撃ち', mp: 3, target: 'enemy', effect: { kind: 'physical', multiplier: 1.5, sureHit: true }, description: '必ず当たる強い一発' },
  sandan: { id: 'sandan', name: '散弾', mp: 5, target: 'allEnemies', effect: { kind: 'physical', multiplier: 0.7 }, description: '敵全体を撃つ' },
  kayakudan: { id: 'kayakudan', name: '火薬弾', mp: 4, target: 'enemy', effect: { kind: 'physical', multiplier: 1.2 }, elements: ['fire'], description: '火の弾' },
  raikandan: { id: 'raikandan', name: '雷管弾', mp: 5, target: 'enemy', effect: { kind: 'physical', multiplier: 1.2 }, elements: ['thunder'], description: 'からくりに効く雷の弾' },
  hayago: { id: 'hayago', name: '早合', mp: 6, target: 'enemy', effect: { kind: 'physical', multiplier: 1.0, hits: 2 }, description: '2 回撃つ' },
  katami: { id: 'katami', name: '父の形見', mp: 12, target: 'enemy', effect: { kind: 'physical', multiplier: 2.5, ignoreDefense: true }, description: '防御を無視する一撃' },
  // 敵の技
  kitsunebi: { id: 'kitsunebi', name: '狐火', mp: 0, target: 'enemy', effect: { kind: 'magic', power: 3 }, elements: ['fire'], description: '' },
  dokueki: { id: 'dokueki', name: '毒液', mp: 0, target: 'enemy', effect: { kind: 'status', status: 'poison', turns: 99, chance: 0.6 }, description: '' },
  toboe: { id: 'toboe', name: '遠吠え', mp: 0, target: 'self', effect: { kind: 'status', status: 'atkUp', turns: 3 }, description: '' },
};

/** 仲間ごとに覚える技と習得レベル（docs/characters.md）。 */
export const LEARNSETS: Record<CharacterId, LearnableSkill[]> = {
  hero: [
    { skill: 'jingi', level: 3 },
    { skill: 'iai', level: 5 },
    { skill: 'kabau', level: 8 },
    { skill: 'ichishuku', level: 12 },
    { skill: 'chohan', level: 16 },
    { skill: 'toseinoiji', level: 24 },
  ],
  kasumi: [
    { skill: 'shuriken', level: 1 },
    { skill: 'kemuridama', level: 1 },
    { skill: 'shibire', level: 9 },
    { skill: 'kagenui', level: 14 },
    { skill: 'bunshin', level: 18 },
    { skill: 'katon', level: 23 },
  ],
  gendo: [
    { skill: 'yakushi', level: 1 },
    { skill: 'oharai', level: 1 },
    { skill: 'katsu', level: 1 },
    { skill: 'kongoriki', level: 15 },
    { skill: 'hannya', level: 19 },
    { skill: 'fudo', level: 25 },
  ],
  orin: [
    { skill: 'neraiuchi', level: 1 },
    { skill: 'sandan', level: 1 },
    { skill: 'kayakudan', level: 1 },
    { skill: 'raikandan', level: 17 },
    { skill: 'hayago', level: 21 },
    { skill: 'katami', level: 26 },
  ],
};

/** レベル L の仲間が覚えている技の ID（習得順）。 */
export function skillsAtLevel(id: CharacterId, level: number): string[] {
  return LEARNSETS[id].filter((l) => l.level <= level).map((l) => l.skill);
}

/** from より上、to 以下のレベルで覚える技の ID。 */
export function skillsLearnedBetween(id: CharacterId, from: number, to: number): string[] {
  return LEARNSETS[id].filter((l) => l.level > from && l.level <= to).map((l) => l.skill);
}
