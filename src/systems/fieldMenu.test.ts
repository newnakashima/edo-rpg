import { describe, expect, it } from 'vitest';
import { SKILLS, skillsAtLevel } from '../data/skills';
import { changeEquipment, expToNext, fieldSkills, itemUsableOn, skillDescription, statsWithEquipment, statusSheet, useItemInField, useSkillInField } from './fieldMenu';
import { newGame, type GameState } from './gameState';
import { createMember, memberStats } from './party';
import { expRemainingToNext, MAX_LEVEL } from './stats';

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

describe('兵糧丸（体力と気力）', () => {
  it('体力と気力を両方回復し、どちらかが減っていれば使える', () => {
    const s = game({ party: [{ ...createMember('hero', 10), hp: 1, mp: 0 }], items: { hyorogan: 2 } });
    const max = memberStats(s.party[0]!);
    const r = useItemInField(s, 'hyorogan', 0);
    expect(r.ok && r.state.party[0]?.hp).toBe(Math.min(max.maxHp, 61));
    expect(r.ok && r.state.party[0]?.mp).toBe(Math.min(max.maxMp, 12));
    expect(r.ok && r.state.items).toEqual({ hyorogan: 1 });
    // 気力だけ減っている
    const mpOnly = { ...createMember('hero', 10), mp: 0 };
    expect(itemUsableOn('hyorogan', mpOnly)).toBe(true);
    expect(itemUsableOn('hyorogan', createMember('hero', 10))).toBe(false);
    expect(itemUsableOn('hyorogan', { ...createMember('hero', 10), hp: 0, mp: 0 })).toBe(false);
  });
});

describe('道具をメニューで使う（続き）', () => {
  it('万金丹で気力を回復し、満タンなら使わない', () => {
    const s = game({ party: [{ ...createMember('hero', 1), mp: 1 }], items: { mankintan: 1 } });
    const r = useItemInField(s, 'mankintan', 0);
    expect(r.ok && r.state.party[0]?.mp).toBe(memberStats(s.party[0]!).maxMp);
    const full = game({ party: [createMember('hero', 1)], items: { mankintan: 1 } });
    expect(useItemInField(full, 'mankintan', 0)).toEqual({ ok: false, reason: 'noEffect' });
  });

  it('効く仲間だけを選べる', () => {
    const fallen = { ...createMember('kasumi', 1), hp: 0 };
    const hurt = { ...createMember('hero', 1), hp: 1 };
    expect(itemUsableOn('kizugusuri', hurt)).toBe(true);
    expect(itemUsableOn('kizugusuri', fallen)).toBe(false);
    expect(itemUsableOn('kitsukegusuri', fallen)).toBe(true);
    expect(itemUsableOn('kitsukegusuri', hurt)).toBe(false);
    expect(itemUsableOn('dokukeshi', hurt)).toBe(false);
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

  it('外した装備を持ちきれないときは付け替えない', () => {
    const s = game({ items: { nagawakizashi: 99, dotanuki: 1 } });
    expect(changeEquipment(s, 0, 'weapon', 'dotanuki')).toEqual({ ok: false, reason: 'full' });
    expect(changeEquipment(s, 0, 'weapon', null)).toEqual({ ok: false, reason: 'full' });
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

describe('次のレベルまでの経験値', () => {
  it('次のレベルまでの残りを返す', () => {
    expect(expToNext({ ...createMember('hero', 1), exp: 7 })).toBe(13);
    expect(expToNext(createMember('hero', 2))).toBe(56);
  });

  it('最大レベルでは null', () => {
    expect(expToNext(createMember('hero', MAX_LEVEL))).toBeNull();
  });
});

describe('ゲストの装備と経験値の表示', () => {
  const withHyogo = () => ({ ...newGame('m', { mapId: 'osaka', x: 1, y: 1 }), party: [createMember('hero', 18), createMember('hyogo', 18)], items: { sukehiro: 1 } });

  it('ゲストの装備は付けることも外すこともできず、所持品も変わらない', () => {
    const s = withHyogo();
    expect(changeEquipment(s, 1, 'weapon', null)).toEqual({ ok: false, reason: 'guest' });
    expect(changeEquipment(s, 1, 'armor', null)).toEqual({ ok: false, reason: 'guest' });
    expect(changeEquipment({ ...s, items: { hyogoKatana: 1 } }, 1, 'weapon', 'hyogoKatana')).toEqual({ ok: false, reason: 'guest' });
    // ほかの仲間はふつうに付け替えられる
    expect(changeEquipment(s, 0, 'weapon', 'sukehiro').ok).toBe(true);
  });

  it('ゲストは次のレベルまでの経験値を出さない', () => {
    expect(expToNext(createMember('hyogo', 18))).toBeNull();
    expect(expToNext(createMember('hero', 18))).not.toBeNull();
  });
});

describe('ステータス画面の内容', () => {
  it('名前・職・レベル・体力と気力・能力値・経験値を出す', () => {
    const m = { ...createMember('hero', 5), hp: 3 };
    const s = memberStats(m);
    const sheet = statusSheet(m, 'f');
    expect(sheet.name).toBe('お志乃');
    expect(sheet.job).toBe('渡世人');
    expect(sheet.level).toBe(5);
    expect(sheet.hp).toBe(`3/${s.maxHp}`);
    expect(sheet.mp).toBe(`${m.mp}/${s.maxMp}`);
    expect(sheet.stats).toEqual([
      { label: '攻撃', value: s.atk },
      { label: '防御', value: s.def },
      { label: '術力', value: s.mag },
      { label: '素早さ', value: s.spd },
      { label: '運', value: s.luck },
    ]);
    expect(sheet.exp).toBe(m.exp);
    expect(sheet.next).toBe(expRemainingToNext(m.exp));
    expect(sheet.down).toBe(false);
    expect(statusSheet(m, 'm').name).toBe('弥太郎');
  });

  it('装備は枠の順に並び、空の枠は ―― と出す', () => {
    const m = createMember('hero', 1, { weapon: 'dotanuki' });
    const sheet = statusSheet(m, 'm');
    expect(sheet.equipment.map((e) => e.slot)).toEqual(['weapon', 'armor', 'accessory']);
    expect(sheet.equipment[0]).toMatchObject({ label: '胴田貫', description: '武器: 肉厚で折れにくい刀' });
    expect(sheet.equipment[1]).toMatchObject({ label: '――', description: '防具: 何も付けていない' });
  });

  it('使える技は今のレベルで覚えているものだけを習得順に、消費する気力と説明つきで出す', () => {
    const sheet = statusSheet(createMember('hero', 5), 'm');
    expect(sheet.skills.map((e) => e.label)).toEqual([SKILLS.jingi!.name, SKILLS.iai!.name]);
    expect(sheet.skills[0]!.note).toBe(String(SKILLS.jingi!.mp));
    expect(sheet.skills[0]!.description).toContain(SKILLS.jingi!.description);
    expect(statusSheet(createMember('hero', 1), 'm').skills).toEqual([]);
  });

  it('戦闘の外でも使える技は説明にそう書く', () => {
    const sheet = statusSheet(createMember('gendo', 1), 'm');
    const yakushi = sheet.skills.find((e) => e.label === SKILLS.yakushi!.name);
    expect(SKILLS.yakushi!.field).toBe(true);
    expect(yakushi?.description).toContain('戦闘の外でも使える');
  });

  it('倒れている仲間は down になる', () => {
    const sheet = statusSheet({ ...createMember('kasumi', 3), hp: 0 }, 'm');
    expect(sheet.down).toBe(true);
    expect(sheet.hp).toMatch(/^0\//);
  });

  it('ゲストは装備と技を出し、次のレベルまでの経験値は出さない', () => {
    const m = createMember('hyogo', 18);
    const sheet = statusSheet(m, 'm');
    expect(sheet.next).toBeNull();
    expect(sheet.exp).toBe(m.exp);
    expect(sheet.equipment[0]!.label).toBe('与力の差料');
    expect(sheet.equipment[1]!.label).toBe('与力の羽織');
    expect(sheet.skills.map((e) => e.label)).toEqual(skillsAtLevel('hyogo', 18).map((id) => SKILLS[id]!.name));
    expect(sheet.skills.length).toBeGreaterThan(0);
  });
});

describe('技の説明', () => {
  it('気力を書き、withField のときだけ戦闘の外でも使えることを書き足す', () => {
    expect(skillDescription(SKILLS.yakushi!)).toBe(`${SKILLS.yakushi!.description}（気力 ${SKILLS.yakushi!.mp}）`);
    expect(skillDescription(SKILLS.yakushi!, true)).toBe(`${SKILLS.yakushi!.description}（気力 ${SKILLS.yakushi!.mp}・戦闘の外でも使える）`);
    expect(skillDescription(SKILLS.iai!, true)).toBe(`${SKILLS.iai!.description}（気力 ${SKILLS.iai!.mp}）`);
  });
});
