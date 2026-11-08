// docs/balance.md の「成長」「雑魚敵の能力値」の式を実装する。

export interface Stats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  luck: number;
}

export const MAX_LEVEL = 99;

/** 敵の能力値・技の威力のレベルごとの成長率。味方の能力値は成長曲線（GrowthTable）で求める。 */
export const GROWTH_RATE = 1.075;

/** レベル L の敵の能力値・技の威力の倍率（Lv1 で 1）。 */
export function growthFactor(level: number): number {
  return GROWTH_RATE ** (level - 1);
}

/** 次のレベルまでに必要な経験値。 */
export function expToNext(level: number): number {
  return 8 * level ** 2 + 12 * level;
}

/** レベル L に到達するまでの累計経験値（Lv1 は 0）。 */
export function totalExpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += expToNext(l);
  return total;
}

/** 累計経験値から現在のレベルを求める。 */
export function levelForExp(exp: number): number {
  let level = 1;
  let rest = exp;
  while (level < MAX_LEVEL && rest >= expToNext(level)) {
    rest -= expToNext(level);
    level++;
  }
  return level;
}

/** 累計経験値から、次のレベルまでの残りの経験値を求める。最大レベルなら null。 */
export function expRemainingToNext(exp: number): number | null {
  const level = levelForExp(exp);
  if (level >= MAX_LEVEL) return null;
  return totalExpForLevel(level + 1) - exp;
}

/** 敵 1 体を倒したときの経験値。 */
export function enemyExp(enemyLevel: number): number {
  return Math.round(0.4 * enemyLevel ** 2 + 0.6 * enemyLevel) + 3;
}

/** 味方のレベルが敵より 4 以上高いとき、経験値を半分にする。 */
export function adjustedExp(baseExp: number, memberLevel: number, enemyLevel: number): number {
  return memberLevel - enemyLevel >= 4 ? Math.floor(baseExp / 2) : baseExp;
}

/** 敵 1 体を倒したときのお金（文）。 */
export function enemyMoney(enemyLevel: number): number {
  return Math.round(5 + 3 * enemyLevel ** 1.3);
}

/**
 * 成長曲線。early（早熟）は低いレベルで大きく伸びて後で鈍り、late（晩成）は低いレベルで伸びが小さく後で大きく伸びる。
 * どの曲線も Lv1 と基準レベル（GROWTH_REFERENCE_LEVEL）で同じ値を通る。
 */
export type GrowthCurve = 'early' | 'normal' | 'late';

/** 成長曲線の指数（docs/balance.md の「能力値」）。 */
export const CURVE_EXPONENT: Record<GrowthCurve, number> = { early: 0.7, normal: 1, late: 1.35 };

/** 成長の基準レベル（終章のボス戦の推奨レベルのあたり）。lv32 はこのレベルでの値。 */
export const GROWTH_REFERENCE_LEVEL = 32;

/** 能力値 1 つの伸び方。 */
export interface StatGrowth {
  /** Lv1 の値。 */
  lv1: number;
  /** 基準レベル（Lv32）の値。 */
  lv32: number;
  curve: GrowthCurve;
}

export type GrowthTable = Record<keyof Stats, StatGrowth>;

export const STAT_KEYS: readonly (keyof Stats)[] = ['maxHp', 'maxMp', 'atk', 'def', 'mag', 'spd', 'luck'];

/**
 * レベル L の能力値: `lv1 * (lv32 / lv1) ^ (t ^ p)`（t = (L - 1) / 31、p は曲線の指数）。小数点以下は切り捨てる。
 * p = 1 なら毎レベル同じ割合で伸びる。Lv32 を超えても同じ式で伸び続ける（早熟は鈍く、晩成は大きく）。
 */
export function grownStat(growth: StatGrowth, level: number): number {
  const t = (level - 1) / (GROWTH_REFERENCE_LEVEL - 1);
  const value = growth.lv1 * (growth.lv32 / growth.lv1) ** (t ** CURVE_EXPONENT[growth.curve]);
  // 浮動小数点の誤差で Lv32 の値が 1 小さくならないようにする
  return Math.floor(value + 1e-9);
}

/** 成長の表からレベル L の能力値を求める。 */
export function statsAtLevel(growth: GrowthTable, level: number): Stats {
  const stats = {} as Stats;
  for (const key of STAT_KEYS) stats[key] = grownStat(growth[key], level);
  return stats;
}

/** 雑魚敵の種族ごとの倍率。 */
export interface EnemyFactors {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

/** 雑魚敵の能力値を種族の倍率と敵レベルから求める。 */
export function enemyStats(k: EnemyFactors, level: number): Stats {
  const f = growthFactor(level);
  return {
    maxHp: Math.max(1, Math.floor(k.hp * 16 * f)),
    maxMp: 0,
    atk: Math.floor(k.atk * 10 * f),
    def: Math.floor(k.def * 5 * f),
    mag: Math.floor(k.atk * 5 * f),
    spd: Math.floor(k.spd * 7 * f),
    luck: 3 + level,
  };
}
