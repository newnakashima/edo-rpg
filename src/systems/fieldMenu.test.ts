import { describe, expect, it } from 'vitest';
import { changeEquipment, fieldSkills, statsWithEquipment, useItemInField, useSkillInField } from './fieldMenu';
import { newGame, type GameState } from './gameState';
import { createMember, memberStats } from './party';

function game(over: Partial<GameState> = {}): GameState {
  return { ...newGame('m', { mapId: 'shimizu', x: 1, y: 1 }), ...over };
}

describe('道具をメニューで使う', () => {
  it('傷薬で回復し、1 つ減る', () => {
    const s = game({ party: [{ ...createMember('hero', 1), hp: 5 }], items: { kizugusuri: 2 } });
    const r = useItemInField(s, 'kizugusuri', 0);
    expect(r.ok && r.state.party[0]?.hp).toBe(Math.min(memberStats(s.party[0]!).maxHp, 35));
    expect(r.ok && r.state.items).toEqual({ kizugusuri: 1 });
  });

  it('効かないときは使わない', () => {
    const s = game({ party: [createMember('hero', 1), { ...createMember('kasumi', 1), hp: 0 }], items: { kizugusuri: 1, kitsukegusuri: 1, dokukeshi: 1 } });
    expect(useItemInField(s, 'kizugusuri', 0)).toEqual({ ok: false, reason: 'noEffect' });
    expect(useItemInField(s, 'kizugusuri', 1)).toEqual({ ok: false, reason: 'noEffect' });
    expect(useItemInField(s, 'kitsukegusuri', 0)).toEqual({ ok: false, reason: 'noEffect' });
    expect(useItemInField(s, 'dokukeshi', 0)).toEqual({ ok: false, reason: 'notField' });
    expect(useItemInField(s, 'kintsuba', 0)).toEqual({ ok: false, reason: 'noItem' });
  });

  it('気付け薬で倒れた仲間を起こす', () => {
    const s = game({ party: [createMember('hero', 1), { ...createMember('kasumi', 1), hp: 0 }], items: { kitsukegusuri: 1 } });
    const r = useItemInField(s, 'kitsukegusuri', 1);
    expect(r.ok && r.state.party[1]?.hp).toBe(Math.floor(memberStats(s.party[1]!).maxHp * 0.25));
  });
});

describe('技をメニューで使う', () => {
  it('回復の技だけが使える', () => {
    expect(fieldSkills(createMember('gendo', 19))).toEqual(['yakushi', 'hannya']);
    expect(fieldSkills(createMember('kasumi', 30))).toEqual([]);
  });

  it('薬師の真言で回復し、気力を使う', () => {
    const s = game({ party: [createMember('gendo', 1), { ...createMember('hero', 1), hp: 1 }] });
    const r = useSkillInField(s, 0, 'yakushi', 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.party[1]!.hp).toBeGreaterThan(1);
    expect(r.state.party[0]!.mp).toBe(s.party[0]!.mp - 3);
  });

  it('全体の技は倒れていない全員を回復する', () => {
    const party = [{ ...createMember('hero', 12), hp: 1 }, { ...createMember('kasumi', 12), hp: 0 }, { ...createMember('gendo', 12), hp: 1 }];
    const r = useSkillInField(game({ party }), 0, 'ichishuku');
    expect(r.ok && r.state.party.map((m) => m.hp > 1)).toEqual([true, false, true]);
  });

  it('誰も回復しない、気力が足りない、使い手が倒れているときは使わない', () => {
    const full = game({ party: [createMember('gendo', 1)] });
    expect(useSkillInField(full, 0, 'yakushi', 0)).toEqual({ ok: false, reason: 'noEffect' });
    const noMp = game({ party: [{ ...createMember('gendo', 1), mp: 2, hp: 1 }] });
    expect(useSkillInField(noMp, 0, 'yakushi', 0)).toEqual({ ok: false, reason: 'noMp' });
    const down = game({ party: [{ ...createMember('gendo', 1), hp: 0 }, { ...createMember('hero', 1), hp: 1 }] });
    expect(useSkillInField(down, 0, 'yakushi', 1)).toEqual({ ok: false, reason: 'casterDown' });
    expect(useSkillInField(full, 0, 'katsu', 0)).toEqual({ ok: false, reason: 'notField' });
  });
});

describe('装備', () => {
  it('付け替えると、外した装備は所持品に戻る', () => {
    const s = game({ items: { dotanuki: 1 } });
    const r = changeEquipment(s, 0, 'weapon', 'dotanuki');
    expect(r.ok && r.state.party[0]?.equip.weapon).toBe('dotanuki');
    expect(r.ok && r.state.items).toEqual({ nagawakizashi: 1 });
    expect(r.ok && memberStats(r.state.party[0]!).atk).toBe(memberStats(s.party[0]!).atk - 2 + 7);
  });

  it('外せる', () => {
    const r = changeEquipment(game(), 0, 'accessory', null);
    expect(r.ok && r.state.party[0]?.equip.accessory).toBeUndefined();
    expect(r.ok && r.state.items.sandogasa).toBe(1);
  });

  it('持っていない、付けられない、枠が違う装備は付けられない', () => {
    expect(changeEquipment(game(), 0, 'weapon', 'dotanuki')).toEqual({ ok: false, reason: 'noItem' });
    expect(changeEquipment(game({ items: { kunai: 1 } }), 0, 'weapon', 'kunai')).toEqual({ ok: false, reason: 'cannotEquip' });
    expect(changeEquipment(game({ items: { omamori: 1 } }), 0, 'weapon', 'omamori')).toEqual({ ok: false, reason: 'cannotEquip' });
  });

  it('最大 HP が減ったら、HP を最大値に収める', () => {
    const hero = { ...createMember('hero', 1, { accessory: 'inro' }) };
    const s = game({ party: [hero] });
    expect(hero.hp).toBe(40);
    const r = changeEquipment(s, 0, 'accessory', null);
    expect(r.ok && r.state.party[0]?.hp).toBe(30);
  });

  it('付け替えた後の能力値を比べられる', () => {
    const hero = createMember('hero', 1);
    expect(statsWithEquipment(hero, 'weapon', 'dotanuki').atk).toBe(memberStats(hero).atk + 5);
  });
});
