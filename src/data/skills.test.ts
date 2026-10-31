import { describe, expect, it } from 'vitest';
import { ailmentMarks, LEARNSETS, SKILLS, skillsAtLevel, skillsLearnedBetween } from './skills';

describe('技', () => {
  it('習得表の技はすべて定義されている', () => {
    for (const learnset of Object.values(LEARNSETS)) {
      for (const l of learnset) expect(SKILLS[l.skill]).toBeDefined();
    }
  });

  it('レベルで覚えている技が決まる', () => {
    expect(skillsAtLevel('hero', 1)).toEqual([]);
    expect(skillsAtLevel('hero', 5)).toEqual(['jingi', 'iai']);
    expect(skillsLearnedBetween('gendo', 14, 19)).toEqual(['kongoriki', 'hannya']);
  });

  it('状態異常のマークは状態異常だけを決まった順に出す', () => {
    expect(ailmentMarks(['sleep', 'atkUp', 'poison', 'bind'])).toBe('毒眠影');
    expect(ailmentMarks([])).toBe('');
  });
});
