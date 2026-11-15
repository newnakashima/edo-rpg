import { describe, expect, it } from 'vitest';
import { SKILLS } from '../data/skills';
import { attackSe, battleSounds, isMultiHit, skillSe, statusSe, victorySounds, type SeActor } from './battleSe';
import type { BattleEvent } from './battle';

const actors = new Map<string, SeActor>([
  ['p0', { side: 'party', character: 'hero' }],
  ['p1', { side: 'party', character: 'gendo' }],
  ['p2', { side: 'party', character: 'orin' }],
  ['e0', { side: 'enemy' }],
  ['e1', { side: 'enemy' }],
]);

const skill = (id: string) => {
  const s = SKILLS[id];
  if (!s) throw new Error(id);
  return s;
};

describe('技の音', () => {
  it('定義の se を使い、なければ属性と効き目から決める', () => {
    expect(skillSe(skill('iai'))).toBe('se_slash');
    expect(skillSe(skill('tekken'))).toBe('se_hit');
    expect(skillSe(skill('shuriken'))).toBe('se_shuriken');
    expect(skillSe(skill('katon'))).toBe('se_fire');
    expect(skillSe(skill('raikandan'))).toBe('se_thunder');
    expect(skillSe(skill('katsu'))).toBe('se_magic');
    expect(skillSe(skill('yakushi'))).toBe('se_heal');
    expect(skillSe(skill('jingi'))).toBe('se_jingi');
    expect(skillSe(skill('kabau'))).toBe('se_guard');
  });

  it('お凛の鉄砲の技は、雷管弾を除いて鉄砲の音（火薬弾も）。大筒は大筒の音', () => {
    for (const id of ['neraiuchi', 'sandan', 'kayakudan', 'hayago', 'katami', 'teppo', 'budodan']) expect(skillSe(skill(id))).toBe('se_gun');
    expect(skillSe(skill('ozutsu'))).toBe('se_cannon');
    expect(skillSe(skill('gongenHo'))).toBe('se_cannon');
  });

  it('状態は、強くなる・弱くなる・状態異常で分ける（酒の酔いは弱くなる）', () => {
    expect(statusSe('atkUp')).toBe('se_buff');
    expect(statusSe('evade')).toBe('se_buff');
    expect(statusSe('accDown')).toBe('se_debuff');
    expect(statusSe('drunk')).toBe('se_debuff');
    expect(statusSe('poison')).toBe('se_ailment');
  });

  it('何度も当たる技は、hits・maxHits が 2 以上か、狙いがランダムな技（敵全体の技は含めない）', () => {
    expect(isMultiHit(skill('nirengeki'))).toBe(true);
    expect(isMultiHit(skill('shuriken'))).toBe(true);
    expect(isMultiHit(skill('katon'))).toBe(false);
    expect(isMultiHit(skill('iai'))).toBe(false);
  });

  it('通常攻撃は武器で決める（玄道は杖、お凛は鉄砲、ほかは刀・槍）。敵は鳴らさない', () => {
    expect(attackSe('hero')).toBe('se_slash');
    expect(attackSe('hyogo')).toBe('se_slash');
    expect(attackSe('gendo')).toBe('se_hit');
    expect(attackSe('orin')).toBe('se_gun');
    expect(attackSe(undefined)).toBeNull();
  });
});

describe('1 ターンの出来事の音', () => {
  it('通常攻撃・会心・敵の攻撃・外れ・倒す', () => {
    const events: BattleEvent[] = [
      { type: 'attack', actor: 'p0', target: 'e0', damage: 10, critical: true },
      { type: 'attack', actor: 'p1', target: 'e0', damage: 5, critical: false },
      { type: 'defeated', target: 'e0' },
      { type: 'attack', actor: 'e1', target: 'p2', damage: 3, critical: false },
      { type: 'miss', actor: 'e1', target: 'p0' },
      { type: 'defeated', target: 'p2' },
    ];
    expect(battleSounds(events, actors)).toEqual([
      ['se_slash', 'se_critical'],
      ['se_hit'],
      ['se_enemy_down'],
      ['se_damage'],
      ['se_miss'],
      ['se_ko'],
    ]);
  });

  it('何度も当たる技は 2 つ目からの当たり外れでも技の音を鳴らし、続く別の人の外れは数えない', () => {
    const events: BattleEvent[] = [
      { type: 'skill', actor: 'p0', skill: 'shuriken' },
      { type: 'damage', target: 'e0', damage: 3, critical: false, weak: false, resisted: false },
      { type: 'miss', actor: 'p0', target: 'e1' },
      { type: 'damage', target: 'e1', damage: 3, critical: false, weak: false, resisted: false },
      { type: 'miss', actor: 'p1', target: 'e1' },
    ];
    expect(battleSounds(events, actors)).toEqual([['se_shuriken'], [], ['se_shuriken', 'se_miss'], ['se_shuriken'], ['se_miss']]);
  });

  it('敵全体の技は 1 度だけ鳴らし、敵の技が味方に当たると当たるごとに se_damage', () => {
    const events: BattleEvent[] = [
      { type: 'skill', actor: 'p0', skill: 'katon' },
      { type: 'damage', target: 'e0', damage: 9, critical: false, weak: false, resisted: false },
      { type: 'damage', target: 'e1', damage: 9, critical: false, weak: false, resisted: false },
      { type: 'skill', actor: 'e0', skill: 'kitsunebiUzu' },
      { type: 'damage', target: 'p0', damage: 4, critical: false, weak: false, resisted: false },
      { type: 'damage', target: 'p1', damage: 4, critical: false, weak: false, resisted: false },
    ];
    expect(battleSounds(events, actors)).toEqual([['se_fire'], [], [], ['se_fire'], ['se_damage'], ['se_damage']]);
  });

  it('回復の技は技の音だけ、道具は続く回復で鳴らす。失敗は se_buzzer、逃げる', () => {
    const events: BattleEvent[] = [
      { type: 'skill', actor: 'p1', skill: 'ichishuku' },
      { type: 'heal', target: 'p0', amount: 10 },
      { type: 'heal', target: 'p1', amount: 10 },
      { type: 'item', actor: 'p0', item: 'kizugusuri' },
      { type: 'heal', target: 'p2', amount: 30 },
      { type: 'noMp', actor: 'p2', skill: 'sandan' },
      { type: 'escape', success: false },
      { type: 'escape', success: true },
    ];
    expect(battleSounds(events, actors)).toEqual([['se_heal'], [], [], [], ['se_heal'], ['se_buzzer'], ['se_buzzer'], ['se_escape']]);
  });

  it('動けない・何もしない・状態が切れるのは無音、毒は味方だけ se_damage', () => {
    const events: BattleEvent[] = [
      { type: 'cannotAct', actor: 'p0', reason: 'sleep' },
      { type: 'statusEnd', target: 'p0', status: 'sleep' },
      { type: 'poison', target: 'p0', damage: 2 },
      { type: 'poison', target: 'e0', damage: 2 },
    ];
    expect(battleSounds(events, actors)).toEqual([[], [], ['se_damage'], []]);
  });

  it('同じ人が技のあとに続けて通常攻撃をして外れても、前の技の当たりに数えない', () => {
    const events: BattleEvent[] = [
      { type: 'skill', actor: 'e0', skill: 'budodan' },
      { type: 'damage', target: 'p0', damage: 3, critical: false, weak: false, resisted: false },
      { type: 'miss', actor: 'e0', target: 'p1', attack: true },
    ];
    expect(battleSounds(events, actors)).toEqual([['se_gun'], ['se_damage'], ['se_miss']]);
  });

  it('装備の 2 度目: 術がもう一度なら技の音、もう一度斬るなら続く通常攻撃の音だけ', () => {
    const cast: BattleEvent[] = [
      { type: 'skill', actor: 'p0', skill: 'katon' },
      { type: 'damage', target: 'e0', damage: 9, critical: false, weak: false, resisted: false },
      { type: 'again', actor: 'p0', equip: 'kodama', trait: 'doubleCast' },
      { type: 'damage', target: 'e0', damage: 9, critical: false, weak: false, resisted: false },
    ];
    expect(battleSounds(cast, actors)).toEqual([['se_fire'], [], ['se_fire'], []]);
    const slash: BattleEvent[] = [
      { type: 'attack', actor: 'p0', target: 'e0', damage: 5, critical: false },
      { type: 'again', actor: 'p0', equip: 'kagebunshin', trait: 'doubleAttack' },
      { type: 'attack', actor: 'p0', target: 'e1', damage: 5, critical: false },
    ];
    expect(battleSounds(slash, actors)).toEqual([['se_slash'], [], ['se_slash']]);
  });

  it('仁義・かばう・防御・逃げた敵・自爆', () => {
    const events: BattleEvent[] = [
      { type: 'guard', actor: 'p1' },
      { type: 'skill', actor: 'p0', skill: 'jingi' },
      { type: 'taunt', actor: 'p0', target: 'e0' },
      { type: 'skill', actor: 'p0', skill: 'kabau' },
      { type: 'cover', actor: 'p0', target: 'p2' },
      { type: 'fled', actor: 'e0' },
      { type: 'exploded', actor: 'e1' },
    ];
    expect(battleSounds(events, actors)).toEqual([['se_guard'], ['se_jingi'], [], ['se_guard'], [], ['se_escape'], ['se_explode']]);
  });
});

describe('勝利の後のページの音', () => {
  it('お金・得た落とし物・段が上がるページに鳴らし、ページの数とそろう', () => {
    expect(victorySounds(30, [true, false], 2)).toEqual(['se_coin', 'se_item', null, 'se_levelup', 'se_levelup']);
    expect(victorySounds(0, [], 0)).toEqual([null]);
  });
});
