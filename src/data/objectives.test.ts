import { describe, expect, it } from 'vitest';
import events from './events.ts?raw';
import { nextObjective, OBJECTIVES } from './objectives';

describe('次にすべきこと', () => {
  it('始めたばかりなら、辰五郎の話を聞くよう案内する', () => {
    expect(nextObjective({})).toBe('辰五郎一家の屋敷で、親分の話を聞く');
  });

  it('いちばん先まで進んだフラグの案内を出す（前の章のフラグが残っていても）', () => {
    expect(nextObjective({ talkedToTatsugoro: true, yakoDefeated: true, prologueCleared: true })).toBe('西の駿府の城下へ向かう');
    expect(nextObjective({ prologueCleared: true, chapter7Cleared: true, kagaTegata: true })).toBe('北国街道を東へ、陸路で仙台へ向かう');
    expect(nextObjective({ chapter3Cleared: true, orinJoined: true })).toBe('仇の権六を追って、伊賀上野へ向かう');
  });

  it('false のフラグは立っていないものとして扱う', () => {
    expect(nextObjective({ talkedToTatsugoro: true, yakoDefeated: false })).toBe('北の裏山の、狐火の洞を調べる');
  });

  it('案内のフラグはどれもイベントで立てられ、重ならない', () => {
    const flags = OBJECTIVES.map(([flag]) => flag).filter((f): f is string => f !== null);
    expect(new Set(flags).size).toBe(flags.length);
    for (const flag of flags) expect(events, flag).toContain(`type: 'setFlag', flag: '${flag}'`);
  });

  it('案内は所持金の窓の 2 行に収まる長さ', () => {
    for (const [, text] of OBJECTIVES) expect(text.length, text).toBeLessThanOrEqual(26);
  });
});
