import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../data/characters';
import {
  adjustedExp,
  enemyExp,
  enemyMoney,
  enemyStats,
  expRemainingToNext,
  expToNext,
  growthFactor,
  levelForExp,
  MAX_LEVEL,
  statsAtLevel,
  totalExpForLevel,
} from './stats';

describe('経験値', () => {
  it('docs/balance.md の例と一致する', () => {
    expect(expToNext(1)).toBe(20);
    expect(expToNext(10)).toBe(920);
    expect(expToNext(28)).toBe(6608);
    expect(enemyExp(1)).toBe(4);
    expect(enemyExp(10)).toBe(49);
    expect(enemyExp(28)).toBe(333);
  });

  it('累計経験値とレベルが相互に変換できる', () => {
    expect(totalExpForLevel(1)).toBe(0);
    expect(totalExpForLevel(2)).toBe(20);
    for (const level of [1, 2, 5, 13, 32]) {
      const exp = totalExpForLevel(level);
      expect(levelForExp(exp)).toBe(level);
      expect(levelForExp(exp - 1)).toBe(Math.max(1, level - 1));
    }
  });

  it('最大レベルを超えない', () => {
    expect(levelForExp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });

  it('敵より 4 レベル以上高いと経験値が半分になる', () => {
    expect(adjustedExp(49, 13, 10)).toBe(49);
    expect(adjustedExp(49, 14, 10)).toBe(24);
  });

  it('お金は敵レベルとともに増える', () => {
    expect(enemyMoney(1)).toBe(8);
    expect(enemyMoney(10)).toBeGreaterThan(enemyMoney(4));
  });
});

describe('能力値', () => {
  it('Lv1 は base のまま', () => {
    expect(statsAtLevel(CHARACTERS.hero.base, 1)).toEqual(CHARACTERS.hero.base);
  });

  it('3 レベルで約 1.24 倍、Lv32 で約 9.4 倍になる', () => {
    expect(growthFactor(4)).toBeCloseTo(1.2423, 3);
    expect(growthFactor(32)).toBeCloseTo(9.41, 1);
    const hero = statsAtLevel(CHARACTERS.hero.base, 32);
    expect(hero.maxHp).toBe(Math.floor(30 * growthFactor(32)));
  });

  it('雑魚敵は倍率 k と敵レベルから求める', () => {
    const s = enemyStats({ hp: 1, atk: 1, def: 1, spd: 1 }, 1);
    expect(s).toEqual({ maxHp: 16, maxMp: 0, atk: 10, def: 5, mag: 5, spd: 7, luck: 4 });
    const f = growthFactor(13);
    expect(enemyStats({ hp: 1, atk: 1.2, def: 0.9, spd: 1.4 }, 13)).toEqual({
      maxHp: Math.floor(16 * f),
      maxMp: 0,
      atk: Math.floor(1.2 * 10 * f),
      def: Math.floor(0.9 * 5 * f),
      mag: Math.floor(1.2 * 5 * f),
      spd: Math.floor(1.4 * 7 * f),
      luck: 16,
    });
    const big = enemyStats({ hp: 1.4, atk: 1, def: 1, spd: 1 }, 10);
    expect(big.maxHp).toBe(Math.floor(1.4 * 16 * growthFactor(10)));
  });
});

describe('次のレベルまでの残りの経験値', () => {
  it('累計経験値から残りを求める', () => {
    expect(expRemainingToNext(0)).toBe(20);
    expect(expRemainingToNext(19)).toBe(1);
    expect(expRemainingToNext(20)).toBe(expToNext(2));
    expect(expRemainingToNext(totalExpForLevel(10) + 5)).toBe(expToNext(10) - 5);
  });

  it('最大レベルでは null', () => {
    expect(expRemainingToNext(totalExpForLevel(MAX_LEVEL))).toBeNull();
    expect(expRemainingToNext(totalExpForLevel(MAX_LEVEL) + 1000)).toBeNull();
    expect(expRemainingToNext(totalExpForLevel(MAX_LEVEL) - 1)).toBe(1);
  });
});
