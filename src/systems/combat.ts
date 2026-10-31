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

/** 物理攻撃のダメージ。会心は防御を無視して攻撃 × 1.5。 */
export function physicalDamage(atk: number, def: number, luck: number, rng: Rng): DamageResult {
  const critical = rng() < criticalRate(luck);
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
