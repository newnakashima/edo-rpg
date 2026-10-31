import { describe, expect, it } from 'vitest';
import { availableItemCount, createBattle, partyAfterBattle, resolveTurn, type BattleState, type Combatant } from './battle';
import { createMember } from './party';
import { seqRng } from './testUtils';

function get(state: BattleState, key: string): Combatant {
  const c = state.combatants.find((x) => x.key === key);
  if (!c) throw new Error(key);
  return c;
}

/** 敵を眠らせて、味方の行動だけを確かめられるようにする。 */
function sleepEnemies(state: BattleState): BattleState {
  for (const c of state.combatants) if (c.side === 'enemy') c.status.sleep = 99;
  return state;
}

describe('技', () => {
  it('覚えている技だけが使え、気力を消費する', () => {
    const b = sleepEnemies(createBattle([createMember('hero', 5)], 'm', ['ogaeru'], 1));
    expect(get(b, 'p0').skills).toEqual(['jingi', 'iai']);
    const mp = get(b, 'p0').mp;
    const { state, events } = resolveTurn(b, { p0: { kind: 'skill', skill: 'iai', target: 'e0' } }, seqRng(0.5));
    expect(get(state, 'p0').mp).toBe(mp - 3);
    expect(events[0]).toEqual({ type: 'skill', actor: 'p0', skill: 'iai' });
    expect(events[1]).toMatchObject({ type: 'damage', target: 'e0' });
    // 覚えていない技は何もしない
    const none = resolveTurn(b, { p0: { kind: 'skill', skill: 'chohan', target: 'e0' } }, seqRng(0.5));
    expect(none.events.filter((e) => e.type === 'skill')).toEqual([]);
  });

  it('気力が足りないと失敗する', () => {
    const b = sleepEnemies(createBattle([{ ...createMember('hero', 5), mp: 2 }], 'm', ['ogaeru'], 1));
    const { events } = resolveTurn(b, { p0: { kind: 'skill', skill: 'iai', target: 'e0' } }, seqRng(0.5));
    expect(events[0]).toEqual({ type: 'noMp', actor: 'p0', skill: 'iai' });
  });

  it('居合は素早さに関係なく先に動く', () => {
    const b = createBattle([createMember('hero', 5)], 'm', ['onibi'], 5);
    // 行動順の乱数は主人公 0（遅い）、敵 0.99（速い）
    const { events } = resolveTurn(b, { p0: { kind: 'skill', skill: 'iai', target: 'e0' } }, seqRng(0, 0.99, 0.5));
    expect(events[0]).toEqual({ type: 'skill', actor: 'p0', skill: 'iai' });
  });

  it('弱点の属性は 1.5 倍、耐性は 0.5 倍', () => {
    // 喝（祓）は鬼火の弱点、火薬弾（火）は鬼火の耐性
    const gendo = createBattle([createMember('gendo', 1)], 'm', ['onibi'], 1);
    sleepEnemies(gendo);
    const katsu = resolveTurn(gendo, { p0: { kind: 'skill', skill: 'katsu', target: 'e0' } }, seqRng(0.5)).events.find((e) => e.type === 'damage');
    expect(katsu).toMatchObject({ type: 'damage', weak: true });
    // 喝: (10 + 9 × 1.2 − 3 / 4) × 1.0 = 20.05 → 20、× 1.5 = 30
    expect(katsu).toMatchObject({ damage: 30 });

    const orin = sleepEnemies(createBattle([createMember('orin', 1)], 'm', ['onibi'], 1));
    const fire = resolveTurn(orin, { p0: { kind: 'skill', skill: 'kayakudan', target: 'e0' } }, seqRng(0.5)).events.find((e) => e.type === 'damage');
    expect(fire).toMatchObject({ type: 'damage', resisted: true });
  });

  it('回復は最大 HP を超えない、戦闘不能には効かない', () => {
    const party = [{ ...createMember('gendo', 1), hp: 30 }, { ...createMember('hero', 1), hp: 0 }];
    const b = sleepEnemies(createBattle(party, 'm', ['ogaeru'], 1));
    const r = resolveTurn(b, { p0: { kind: 'skill', skill: 'yakushi', target: 'p0' } }, seqRng(0.5));
    expect(r.events).toContainEqual({ type: 'heal', target: 'p0', amount: 4 });
    expect(get(r.state, 'p0').hp).toBe(34);
    // 戦闘不能の仲間を選んでいたら自分を回復する
    const r2 = resolveTurn(b, { p0: { kind: 'skill', skill: 'yakushi', target: 'p1' } }, seqRng(0.5));
    expect(get(r2.state, 'p1').hp).toBe(0);
  });

  it('丁半博打は半々で空振りする', () => {
    const b = sleepEnemies(createBattle([createMember('hero', 16)], 'm', ['ogaeru'], 1));
    const miss = resolveTurn(b, { p0: { kind: 'skill', skill: 'chohan', target: 'e0' } }, seqRng(0.5, 0.5, 0.1));
    expect(miss.events[1]).toEqual({ type: 'miss', target: 'e0' });
    const hit = resolveTurn(b, { p0: { kind: 'skill', skill: 'chohan', target: 'e0' } }, seqRng(0.5, 0.5, 0.9, 0.5));
    expect(hit.events[1]).toMatchObject({ type: 'damage', target: 'e0' });
  });

  it('手裏剣は 2〜3 回当てる', () => {
    const b = sleepEnemies(createBattle([createMember('kasumi', 1)], 'm', ['ogaeru', 'ogaeru'], 1));
    const { events } = resolveTurn(b, { p0: { kind: 'skill', skill: 'shuriken' } }, seqRng(0.5, 0.5, 0.99));
    expect(events.filter((e) => e.type === 'damage')).toHaveLength(3);
  });
});

describe('状態異常', () => {
  it('麻痺していると動けず、ターンが過ぎると治る', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['ogaeru'], 1);
    get(b, 'p0').status.paralysis = 1;
    const { state, events } = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.9, 0.1, 0.1));
    expect(events).toContainEqual({ type: 'cannotAct', actor: 'p0', reason: 'paralysis' });
    expect(events).toContainEqual({ type: 'statusEnd', target: 'p0', status: 'paralysis' });
    expect(get(state, 'p0').status.paralysis).toBeUndefined();
  });

  it('影縫いは次の 1 回の行動だけを止める', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['ogaeru'], 1);
    get(b, 'e0').status.bind = 1;
    const t1 = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0.5));
    expect(t1.events).toContainEqual({ type: 'cannotAct', actor: 'e0', reason: 'bind' });
    const t2 = resolveTurn(t1.state, { p0: { kind: 'guard' } }, seqRng(0.1));
    expect(t2.events.some((e) => e.type === 'cannotAct')).toBe(false);
  });

  it('眠りはダメージを受けると覚める', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['ogaeru'], 1);
    get(b, 'e0').status.sleep = 5;
    const { state, events } = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.9, 0.1, 0.5));
    expect(events).toContainEqual({ type: 'statusEnd', target: 'e0', status: 'sleep' });
    expect(get(state, 'e0').status.sleep).toBeUndefined();
  });

  it('毒はターンの終わりに最大 HP の 1/10 を減らす', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['ogaeru'], 1);
    get(b, 'p0').status.poison = 99;
    const { events } = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0.5));
    expect(events).toContainEqual({ type: 'poison', target: 'p0', damage: 3 });
  });

  it('状態異常のかかりやすさは運の差で変わり、かからないこともある', () => {
    const b = sleepEnemies(createBattle([createMember('kasumi', 9)], 'm', ['ogaeru'], 1));
    const ok = resolveTurn(b, { p0: { kind: 'skill', skill: 'shibire', target: 'e0' } }, seqRng(0.5, 0.5, 0.1));
    expect(ok.events).toContainEqual({ type: 'status', target: 'e0', status: 'paralysis' });
    const ng = resolveTurn(b, { p0: { kind: 'skill', skill: 'shibire', target: 'e0' } }, seqRng(0.5, 0.5, 0.99));
    expect(ng.events).toContainEqual({ type: 'statusFailed', target: 'e0', status: 'paralysis' });
  });

  it('命中を下げられた敵の攻撃は外れることがある', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['yamainu'], 1);
    get(b, 'e0').status.accDown = 3;
    // 行動順、敵の行動（攻撃）、狙い、命中の判定（0.1 で外れ）
    const { events } = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0.5, 0.5, 0.1, 0.1));
    expect(events).toContainEqual({ type: 'miss', target: 'p0' });
  });

  it('倒れると状態異常は消える', () => {
    const b = createBattle([{ ...createMember('hero', 1), hp: 1 }], 'm', ['yamainu'], 5);
    get(b, 'p0').status.poison = 99;
    const { state } = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0.1, 0.9, 0.1, 0.5));
    expect(state.outcome).toBe('defeat');
    expect(get(state, 'p0').status).toEqual({});
  });
});

describe('仁義を切る・かばう', () => {
  it('仁義を切られた敵は、その味方を狙う', () => {
    const party = [createMember('hero', 3), createMember('kasumi', 3)];
    const b = createBattle(party, 'm', ['yamainu'], 1);
    get(b, 'e0').taunt = { by: 'p0', turns: 3 };
    // 狙いの乱数を 0.99（霞）にしても主人公を狙う
    const { events } = resolveTurn(b, { p0: { kind: 'guard' }, p1: { kind: 'guard' } }, seqRng(0.5, 0.5, 0.9, 0.1, 0.99));
    const hit = events.find((e) => e.type === 'attack' && e.actor === 'e0');
    expect(hit).toMatchObject({ target: 'p0' });
  });

  it('かばうと、代わりに攻撃を受ける', () => {
    const party = [createMember('hero', 8), createMember('kasumi', 8)];
    const b = createBattle(party, 'm', ['yamainu'], 1);
    // 行動順の乱数 3 つ、敵の行動（攻撃）、狙い（0.99 で霞）
    const { events } = resolveTurn(
      b,
      { p0: { kind: 'skill', skill: 'kabau', target: 'p1' }, p1: { kind: 'guard' } },
      seqRng(0.5, 0.5, 0.5, 0.1, 0.99, 0.5),
    );
    expect(events).toContainEqual({ type: 'cover', actor: 'p0', target: 'p1' });
    expect(events).toContainEqual({ type: 'covered', actor: 'p0', target: 'p1' });
    expect(events.find((e) => e.type === 'attack' && e.actor === 'e0')).toMatchObject({ target: 'p0' });
  });
});

describe('道具', () => {
  it('使うと減り、なければ失敗する', () => {
    const b = sleepEnemies(createBattle([{ ...createMember('hero', 1), hp: 5 }], 'm', ['ogaeru'], 1, { items: { kizugusuri: 1 } }));
    const r1 = resolveTurn(b, { p0: { kind: 'item', item: 'kizugusuri', target: 'p0' } }, seqRng(0.5));
    expect(r1.events).toContainEqual({ type: 'heal', target: 'p0', amount: 25 });
    expect(r1.state.items).toEqual({});
    expect(b.items).toEqual({ kizugusuri: 1 });
    const r2 = resolveTurn(r1.state, { p0: { kind: 'item', item: 'kizugusuri', target: 'p0' } }, seqRng(0.5));
    expect(r2.events[0]).toEqual({ type: 'noItem', actor: 'p0', item: 'kizugusuri' });
  });

  it('気付け薬で戦闘不能の仲間を起こす', () => {
    const party = [createMember('hero', 1), { ...createMember('kasumi', 1), hp: 0 }];
    const b = sleepEnemies(createBattle(party, 'm', ['ogaeru'], 1, { items: { kitsukegusuri: 1 } }));
    const { state, events } = resolveTurn(b, { p0: { kind: 'item', item: 'kitsukegusuri', target: 'p1' } }, seqRng(0.5));
    expect(events).toContainEqual({ type: 'revive', target: 'p1', hp: 6 });
    expect(get(state, 'p1').hp).toBe(6);
  });

  it('毒消しで毒を治す', () => {
    const b = sleepEnemies(createBattle([createMember('hero', 1)], 'm', ['ogaeru'], 1, { items: { dokukeshi: 1 } }));
    get(b, 'p0').status.poison = 99;
    const { state, events } = resolveTurn(b, { p0: { kind: 'item', item: 'dokukeshi', target: 'p0' } }, seqRng(0.5));
    expect(events).toContainEqual({ type: 'cure', target: 'p0' });
    expect(get(state, 'p0').status.poison).toBeUndefined();
  });

  it('同じターンに使う予定の分を残りの数から引く', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['ogaeru'], 1, { items: { kizugusuri: 2 } });
    expect(availableItemCount(b, 'kizugusuri', { p0: { kind: 'item', item: 'kizugusuri', target: 'p0' } })).toBe(1);
  });

  it('戦闘後に HP と気力を書き戻す', () => {
    const party = [createMember('hero', 5)];
    const b = createBattle(party, 'm', ['ogaeru'], 1);
    get(b, 'p0').mp = 1;
    expect(partyAfterBattle(party, b)[0]?.mp).toBe(1);
  });
});
