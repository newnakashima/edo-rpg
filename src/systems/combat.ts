// docs/balance.md の「戦闘計算」の式。
import { randRange, type Rng } from './random';

export interface DamageResult {
  damage: number;
  critical: boolean;
}

/** 会心の確率の上限。運が大きく伸びる霞（晩成）が終盤に届く。 */
export const CRITICAL_RATE_CAP = 0.5;

/** 会心の確率（0〜CRITICAL_RATE_CAP）。 */
export function criticalRate(luck: number): number {
  return Math.min(CRITICAL_RATE_CAP, 0.03 + luck / 1000);
}

/** 物理攻撃のダメージ。会心は防御を無視して攻撃 × 1.5。critBonus は会心率に足す値（無念無想など）。 */
export function physicalDamage(atk: number, def: number, luck: number, rng: Rng, critBonus = 0): DamageResult {
  const critical = rng() < criticalRate(luck) + critBonus;
  const base = critical ? atk * 1.5 : atk - def / 2;
  const damage = Math.max(1, Math.floor(base * randRange(rng, 0.875, 1.125)));
  return { damage, critical };
}

/** 防御中はダメージを半分にする（最低 1）。 */
export function applyGuard(damage: number, guarding: boolean): number {
  return guarding ? Math.max(1, Math.floor(damage / 2)) : damage;
}

/** 行動順を決めるための値。毎ターン決め直す。 */
export function initiative(spd: number, rng: Rng): number {
  return spd * randRange(rng, 0.8, 1.2);
}

/** 逃走の成功率（0.1〜0.95）。 */
export function escapeChance(partyAvgSpd: number, enemyAvgSpd: number): number {
  const chance = 0.5 + (partyAvgSpd - enemyAvgSpd) * 0.02;
  return Math.min(0.95, Math.max(0.1, chance));
}

/** 術のダメージ: 技の威力 + 術力 × 1.2 − 防御 / 4 に、物理と同じ乱数を掛ける（最低 1）。 */
export function magicDamage(power: number, mag: number, def: number, rng: Rng): number {
  return Math.max(1, Math.floor((power + mag * 1.2 - def / 4) * randRange(rng, 0.875, 1.125)));
}

/** 回復量: 技の威力 + 術力 × 1.5。 */
export function healAmount(power: number, mag: number): number {
  return Math.floor(power + mag * 1.5);
}

/** 属性の倍率。弱点が 1 つでもあれば 1.5 倍、なければ耐性があると 0.5 倍。 */
export function elementMultiplier(elements: readonly string[], weak: readonly string[] = [], resist: readonly string[] = []): number {
  if (elements.some((e) => weak.includes(e))) return 1.5;
  if (elements.some((e) => resist.includes(e))) return 0.5;
  return 1;
}

/**
 * 状態異常で効かせる運の差の上限。晩成の霞は終盤に運が 300 を超えるので、差をそのまま足すと
 * 霞のかける状態異常は必ずかかり、霞にかかる状態異常はほぼ効かなくなる。運の差は ±25 までにする。
 */
export const AILMENT_LUCK_DIFF_CAP = 25;

/** 状態異常がかかる確率。基本の確率に運の差（±25 まで）× 1% を足し、5〜95% に収める。 */
export function ailmentChance(base: number, actorLuck: number, targetLuck: number): number {
  const diff = Math.min(AILMENT_LUCK_DIFF_CAP, Math.max(-AILMENT_LUCK_DIFF_CAP, actorLuck - targetLuck));
  return Math.min(0.95, Math.max(0.05, base + diff * 0.01));
}

/** 外れる確率の上限（命中↓・回避↑ に、敵の生まれつきの命中の低さ・回避の高さを足したとき）。 */
export const MISS_CHANCE_CAP = 0.85;

/**
 * 物理攻撃が外れる確率。命中を下げられている・回避を上げているときはそれぞれ 35%（合わせて上限 70%）。
 * innate は敵の生まれつきの外れる確率（使い手の missRate + 相手の evasion）で、足したあと上限 85% にする。
 * 使い手が酩酊（酒）なら、そのうえで当たる確率を半分にする（上限 85% のあとにかけるので、外れる確率は最大 92.5%）。
 */
export function missChance(attackerAccDown: boolean, targetEvade: boolean, innate = 0, attackerDrunk = false): number {
  const status = Math.min(0.7, (attackerAccDown ? 0.35 : 0) + (targetEvade ? 0.35 : 0));
  const miss = Math.min(MISS_CHANCE_CAP, status + innate);
  return attackerDrunk ? 1 - (1 - miss) * DRUNK_HIT_RATE : miss;
}

/** 酩酊のときの、当たる確率にかける倍率。 */
export const DRUNK_HIT_RATE = 0.5;
