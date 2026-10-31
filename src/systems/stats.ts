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

/** レベルごとの成長率。全員・全能力値で共通にする。 */
export const GROWTH_RATE = 1.075;

/** レベル L の能力値の倍率（Lv1 で 1）。 */
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

/** Lv1 の能力値からレベル L の能力値を求める。小数点以下は切り捨てる。 */
export function statsAtLevel(base: Stats, level: number): Stats {
  const f = growthFactor(level);
  return {
    maxHp: Math.floor(base.maxHp * f),
    maxMp: Math.floor(base.maxMp * f),
    atk: Math.floor(base.atk * f),
    def: Math.floor(base.def * f),
    mag: Math.floor(base.mag * f),
    spd: Math.floor(base.spd * f),
    luck: Math.floor(base.luck * f),
  };
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
