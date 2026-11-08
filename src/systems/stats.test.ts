import { describe, expect, it } from 'vitest';
import { CHARACTERS, type CharacterId } from '../data/characters';
import { criticalRate } from './combat';
import {
  adjustedExp,
  enemyExp,
  enemyMoney,
  enemyStats,
  expRemainingToNext,
  expToNext,
  growthFactor,
  grownStat,
  levelForExp,
  MAX_LEVEL,
  STAT_KEYS,
  statsAtLevel,
  totalExpForLevel,
  type Stats,
} from './stats';

const MEMBERS: readonly CharacterId[] = ['hero', 'kasumi', 'gendo', 'orin'];
const at = (id: CharacterId, level: number): Stats => statsAtLevel(CHARACTERS[id].growth, level);

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
  it('どの仲間も Lv1 と Lv32 で表の値になる', () => {
    for (const id of MEMBERS) {
      const g = CHARACTERS[id].growth;
      for (const key of STAT_KEYS) {
        expect(at(id, 1)[key]).toBe(g[key].lv1);
        expect(at(id, 32)[key]).toBe(g[key].lv32);
      }
    }
  });

  it('レベルが上がって下がる能力値はない（Lv99 まで）', () => {
    for (const id of [...MEMBERS, 'hyogo'] as const) {
      for (let level = 2; level <= 99; level++) {
        const before = at(id, level - 1);
        const after = at(id, level);
        for (const key of STAT_KEYS) expect(after[key]).toBeGreaterThanOrEqual(before[key]);
      }
    }
  });

  it('同じ Lv1・Lv32 の値なら、途中のレベルでは早熟 > 普通 > 晩成', () => {
    const row = { lv1: 10, lv32: 90 };
    for (const level of [4, 13, 22, 31]) {
      const early = grownStat({ ...row, curve: 'early' }, level);
      const normal = grownStat({ ...row, curve: 'normal' }, level);
      const late = grownStat({ ...row, curve: 'late' }, level);
      expect(early).toBeGreaterThan(normal);
      expect(normal).toBeGreaterThan(late);
    }
    // 普通の伸びは毎レベル同じ割合（3 レベルで 9 ^ (3 / 31) 倍）
    expect(grownStat({ ...row, curve: 'normal' }, 4)).toBe(Math.floor(10 * 9 ** (3 / 31)));
  });

  it('役割が能力値に出る（Lv32）: 攻撃は玄道 > 主人公 > 霞 > お凛、術力・気力はお凛、素早さ・運は霞がいちばん高い', () => {
    const s = Object.fromEntries(MEMBERS.map((id) => [id, at(id, 32)])) as Record<(typeof MEMBERS)[number], Stats>;
    expect(s.gendo.atk).toBeGreaterThan(s.hero.atk);
    expect(s.hero.atk).toBeGreaterThan(s.kasumi.atk);
    expect(s.kasumi.atk).toBeGreaterThan(s.orin.atk);
    for (const id of ['hero', 'kasumi', 'gendo'] as const) {
      expect(s.orin.mag).toBeGreaterThan(s[id].mag);
      expect(s.orin.maxMp).toBeGreaterThan(s[id].maxMp);
      expect(s.kasumi.spd).toBeGreaterThan(s[id === 'kasumi' ? 'orin' : id].spd);
      expect(s.kasumi.luck).toBeGreaterThan(s[id === 'kasumi' ? 'orin' : id].luck);
    }
    // 主人公はバランス型: 術力・気力も攻撃の 8 割以上ある
    expect(s.hero.mag).toBeGreaterThanOrEqual(s.hero.atk * 0.8);
    expect(s.hero.maxMp).toBeGreaterThanOrEqual(s.hero.atk * 0.8);
    // 霞は終盤に会心率が 30% を超える
    expect(criticalRate(s.kasumi.luck)).toBeGreaterThan(0.3);
  });

  it('早熟の玄道は中盤で攻撃がいちばん高く、晩成の霞・お凛は中盤では Lv32 の値に比べて伸びが小さい', () => {
    const mid = 16;
    for (const id of ['hero', 'kasumi', 'orin'] as const) expect(at('gendo', mid).atk).toBeGreaterThan(at(id, mid).atk);
    const ratio = (id: CharacterId, key: keyof Stats) => at(id, mid)[key] / at(id, 32)[key];
    expect(ratio('gendo', 'atk')).toBeGreaterThan(ratio('hero', 'atk'));
    expect(ratio('hero', 'atk')).toBeGreaterThan(ratio('kasumi', 'atk'));
    expect(ratio('hero', 'mag')).toBeGreaterThan(ratio('orin', 'mag'));
  });

  it('ゲストの兵庫は毎レベル同じ割合（1.075 倍）で伸びる式のまま（Lv18 で HP 102）', () => {
    const base = at('hyogo', 1);
    for (const key of STAT_KEYS) expect(at('hyogo', 18)[key]).toBe(Math.floor(base[key] * growthFactor(18)));
    expect(at('hyogo', 18).maxHp).toBe(102);
  });

  it('敵の倍率は 3 レベルで約 1.24 倍、Lv32 で約 9.4 倍になる', () => {
    expect(growthFactor(4)).toBeCloseTo(1.2423, 3);
    expect(growthFactor(32)).toBeCloseTo(9.41, 1);
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
