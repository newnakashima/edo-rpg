import { describe, expect, it } from 'vitest';
import { applyGuard, criticalRate, escapeChance, physicalDamage } from './combat';
import { seqRng } from './testUtils';

describe('物理ダメージ', () => {
  it('攻撃 − 防御 / 2 に乱数（0.875〜1.125）を掛ける', () => {
    // 1 つ目の乱数は会心の判定（0.99 で会心なし）、2 つ目がダメージの乱数（0.5 で 1.0 倍）
    expect(physicalDamage(20, 10, 0, seqRng(0.99, 0.5))).toEqual({ damage: 15, critical: false });
    expect(physicalDamage(20, 10, 0, seqRng(0.99, 0)).damage).toBe(13);
  });

  it('最低でも 1 ダメージ', () => {
    expect(physicalDamage(1, 100, 0, seqRng(0.99, 0)).damage).toBe(1);
  });

  it('会心は防御を無視して攻撃 × 1.5', () => {
    expect(physicalDamage(20, 100, 0, seqRng(0, 0.5))).toEqual({ damage: 30, critical: true });
  });

  it('会心率は 3% + 運 / 10 %、上限 25%', () => {
    expect(criticalRate(0)).toBeCloseTo(0.03);
    expect(criticalRate(70)).toBeCloseTo(0.1);
    expect(criticalRate(1000)).toBe(0.25);
  });
});

describe('防御と逃走', () => {
  it('防御中はダメージが半分（最低 1）', () => {
    expect(applyGuard(10, true)).toBe(5);
    expect(applyGuard(1, true)).toBe(1);
    expect(applyGuard(10, false)).toBe(10);
  });

  it('逃走の成功率は 10〜95% に収まる', () => {
    expect(escapeChance(10, 10)).toBe(0.5);
    expect(escapeChance(15, 10)).toBeCloseTo(0.6);
    expect(escapeChance(100, 0)).toBe(0.95);
    expect(escapeChance(0, 100)).toBe(0.1);
  });
});
