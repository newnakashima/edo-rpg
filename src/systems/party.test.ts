import { describe, expect, it } from 'vitest';
import { createMember, gainExp, memberLevel, memberStats, restoreAll } from './party';
import { totalExpForLevel } from './stats';

describe('party', () => {
  it('指定したレベルで、HP・MP 満タンで作る', () => {
    const m = createMember('kasumi', 5);
    expect(memberLevel(m)).toBe(5);
    expect(m.hp).toBe(memberStats(m).maxHp);
    expect(m.mp).toBe(memberStats(m).maxMp);
  });

  it('レベルが上がると最大 HP の増分を現在の HP にも加える', () => {
    const m = { ...createMember('hero', 1), hp: 10 };
    const { party, levelUps } = gainExp([m], [totalExpForLevel(3)]);
    expect(levelUps).toEqual([{ id: 'hero', from: 1, to: 3, learned: ['jingi'] }]);
    const after = party[0];
    expect(after && memberLevel(after)).toBe(3);
    expect(after?.hp).toBe(10 + (memberStats(after!).maxHp - 30));
  });

  it('レベルアップで覚えた技を返す', () => {
    const m = createMember('hero', 4);
    const { levelUps } = gainExp([m], [totalExpForLevel(8) - m.exp]);
    expect(levelUps).toEqual([{ id: 'hero', from: 4, to: 8, learned: ['iai', 'kabau'] }]);
  });

  it('戦闘不能の仲間は経験値を得ない', () => {
    const m = { ...createMember('hero', 1), hp: 0 };
    const { party, levelUps } = gainExp([m], [1000]);
    expect(party[0]?.exp).toBe(0);
    expect(levelUps).toEqual([]);
  });

  it('旅籠で全回復する', () => {
    const m = { ...createMember('gendo', 3), hp: 0, mp: 0 };
    const [r] = restoreAll([m]);
    expect(r?.hp).toBe(memberStats(m).maxHp);
    expect(r?.mp).toBe(memberStats(m).maxMp);
  });

  it('加入時の装備を付け、装備込みの HP・MP で満タンにする', () => {
    const m = createMember('hero', 1);
    expect(m.equip).toEqual({ weapon: 'nagawakizashi', armor: 'shimagappa', accessory: 'sandogasa' });
    // 主人公 Lv1: 攻撃 10 + 長脇差 2、防御 8 + 合羽 1 + 笠 1、運 6 + 笠 1
    expect(memberStats(m)).toMatchObject({ atk: 12, def: 10, luck: 7 });
    const withInro = createMember('kasumi', 1, { accessory: 'inro' });
    expect(withInro.hp).toBe(24 + 10);
    expect(createMember('hero', 1, {}).equip).toEqual({});
  });
});

describe('ゲスト（榊兵庫）', () => {
  it('経験値を得ず、レベルも上がらない（ほかの仲間は得る）', () => {
    const hyogo = createMember('hyogo', 18);
    const hero = createMember('hero', 10);
    const { party, levelUps } = gainExp([hero, hyogo], [5000, 5000]);
    expect(party[1]).toEqual(hyogo);
    expect(memberLevel(party[1]!)).toBe(18);
    expect(party[0]!.exp).toBe(hero.exp + 5000);
    expect(levelUps.map((l) => l.id)).toEqual(['hero']);
  });
});
