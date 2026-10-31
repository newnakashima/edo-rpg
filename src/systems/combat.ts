// docs/balance.md の「戦闘計算」の式。
import { randRange, type Rng } from './random';

export interface DamageResult {
  damage: number;
  critical: boolean;
}

/** 会心の確率（0〜0.25）。 */
export function criticalRate(luck: number): number {
  return Math.min(0.25, 0.03 + luck / 1000);
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

/** 状態異常がかかる確率。基本の確率に運の差 × 1% を足し、5〜95% に収める。 */
export function ailmentChance(base: number, actorLuck: number, targetLuck: number): number {
  return Math.min(0.95, Math.max(0.05, base + (actorLuck - targetLuck) * 0.01));
}

/** 命中を下げられている・回避を上げているときに外れる確率（それぞれ 35%、合わせて上限 70%）。 */
export function missChance(attackerAccDown: boolean, targetEvade: boolean): number {
  return Math.min(0.7, (attackerAccDown ? 0.35 : 0) + (targetEvade ? 0.35 : 0));
}
