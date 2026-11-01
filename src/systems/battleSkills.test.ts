import { describe, expect, it } from 'vitest';
import { actionsPerTurn, availableItemCount, createBattle, DEF_UP_RATE, itemWorks, partyAfterBattle, resolveTurn, type BattleState, type Combatant } from './battle';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import { createMember, memberStats } from './party';
import { seededRng, seqRng } from './testUtils';

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
    const gendo = createBattle([createMember('gendo', 1, {})], 'm', ['onibi'], 1);
    sleepEnemies(gendo);
    const katsu = resolveTurn(gendo, { p0: { kind: 'skill', skill: 'katsu', target: 'e0' } }, seqRng(0.5)).events.find((e) => e.type === 'damage');
    expect(katsu).toMatchObject({ type: 'damage', weak: true });
    // 喝（装備なし）: (10 + 9 × 1.2 − 3 / 4) × 1.0 = 20.05 → 20、× 1.5 = 30
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
    // 行動順の乱数 3 つの次が回数の乱数
    const three = resolveTurn(b, { p0: { kind: 'skill', skill: 'shuriken' } }, seqRng(0.5, 0.5, 0.5, 0.99, 0.5));
    expect(three.events.filter((e) => e.type === 'damage')).toHaveLength(3);
    const two = resolveTurn(b, { p0: { kind: 'skill', skill: 'shuriken' } }, seqRng(0.5, 0.5, 0.5, 0, 0.5));
    expect(two.events.filter((e) => e.type === 'damage')).toHaveLength(2);
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

  it('状態異常は確率でかかり、かからないこともある', () => {
    const b = sleepEnemies(createBattle([createMember('kasumi', 9)], 'm', ['ogaeru'], 1));
    const ok = resolveTurn(b, { p0: { kind: 'skill', skill: 'shibire', target: 'e0' } }, seqRng(0.5, 0.5, 0.1));
    expect(ok.events).toContainEqual({ type: 'status', target: 'e0', status: 'paralysis' });
    const ng = resolveTurn(b, { p0: { kind: 'skill', skill: 'shibire', target: 'e0' } }, seqRng(0.5, 0.5, 0.99));
    expect(ng.events).toContainEqual({ type: 'statusFailed', target: 'e0', status: 'paralysis' });
  });

  it('命中を下げられた敵の攻撃は 35% で外れる', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['yamainu'], 1);
    get(b, 'e0').status.accDown = 3;
    // 行動順、敵の行動（攻撃）、狙い、命中の判定
    const miss = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0.5, 0.5, 0.1, 0, 0.34, 0.5));
    expect(miss.events).toContainEqual({ type: 'miss', target: 'p0' });
    const hit = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0.5, 0.5, 0.1, 0, 0.36, 0.5));
    expect(hit.events.some((e) => e.type === 'attack' && e.actor === 'e0')).toBe(true);
  });

  it('回避を上げた味方には、敵の攻撃が外れることがある', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['yamainu'], 1);
    get(b, 'p0').status.evade = 3;
    const { events } = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0.5, 0.5, 0.1, 0, 0.34, 0.5));
    expect(events).toContainEqual({ type: 'miss', target: 'p0' });
  });

  it('攻撃↑ でダメージが増え、攻撃↓ で減る', () => {
    const base = sleepEnemies(createBattle([createMember('hero', 10)], 'm', ['ogaeru'], 1));
    const hit = (b: BattleState) => {
      const e = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.5, 0.5, 0.99, 0.5)).events.find((x) => x.type === 'attack');
      return e?.type === 'attack' ? e.damage : 0;
    };
    const normal = hit(base);
    const up = structuredClone(base);
    get(up, 'p0').status.atkUp = 3;
    const down = structuredClone(base);
    get(down, 'p0').status.atkDown = 3;
    expect(hit(up)).toBeGreaterThan(normal);
    expect(hit(down)).toBeLessThan(normal);
  });

  it('防御↑ で受けるダメージが減る（物理も術も）', () => {
    const base = sleepEnemies(createBattle([createMember('hero', 10)], 'm', ['ogaeru'], 1));
    const hit = (b: BattleState) => {
      const e = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.5, 0.5, 0.99, 0.5)).events.find((x) => x.type === 'attack');
      return e?.type === 'attack' ? e.damage : 0;
    };
    const up = structuredClone(base);
    get(up, 'e0').status.defUp = 3;
    expect(hit(up)).toBeLessThan(hit(base));
    // 防御↑ は防御を DEF_UP_RATE（1.5）倍にしたのと同じダメージになる
    const raised = structuredClone(base);
    get(raised, 'e0').stats.def *= DEF_UP_RATE;
    expect(hit(up)).toBe(hit(raised));
    const gendo = sleepEnemies(createBattle([createMember('gendo', 10)], 'm', ['tetsubin'], 7));
    const katsu = (b: BattleState) => {
      const e = resolveTurn(b, { p0: { kind: 'skill', skill: 'katsu', target: 'e0' } }, seqRng(0.5)).events.find((x) => x.type === 'damage');
      return e?.type === 'damage' ? e.damage : 0;
    };
    const guarded = structuredClone(gendo);
    get(guarded, 'e0').status.defUp = 3;
    expect(katsu(guarded)).toBeLessThan(katsu(gendo));
  });

  it('混乱すると、敵味方を問わずランダムな相手を攻撃する', () => {
    const party = [createMember('hero', 1), createMember('kasumi', 1)];
    const b = sleepEnemies(createBattle(party, 'm', ['ogaeru'], 1));
    get(b, 'p0').status.confusion = 3;
    // 行動順で主人公を先にし、狙いの乱数 0（生きている者のうち先頭 = 霞）
    const { events } = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' }, p1: { kind: 'guard' } }, seqRng(0.99, 0, 0, 0, 0.99, 0.5));
    expect(events).toContainEqual({ type: 'confused', actor: 'p0' });
    expect(events.find((e) => e.type === 'attack' && e.actor === 'p0')).toMatchObject({ target: 'p1' });
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
    expect(events).toContainEqual({ type: 'cure', target: 'p0', ailments: ['poison'] });
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

describe('効果の持続', () => {
  it.each([
    ['敵より先に', 9, 1],
    ['敵が動いた後に', 9, 12],
  ])('%s当てた麻痺は、ちょうど 3 回分の行動を止める', (_label, kasumiLevel, enemyLevel) => {
    const b = createBattle([createMember('kasumi', kasumiLevel)], 'm', ['yamainu'], enemyLevel);
    // 1 ターン目: 霞の行動順の乱数 0、敵 0.99。痺れ薬は 0.01 で成功させる
    let r = resolveTurn(b, { p0: { kind: 'skill', skill: 'shibire', target: 'e0' } }, seqRng(0, 0.99, 0, 0, 0.99, 0.5, 0.01));
    expect(r.events).toContainEqual({ type: 'status', target: 'e0', status: 'paralysis' });
    let state = r.state;
    let blocked = r.events.filter((e) => e.type === 'cannotAct').length;
    for (let t = 0; t < 4; t++) {
      r = resolveTurn(state, { p0: { kind: 'guard' } }, seqRng(0.5, 0.5, 0, 0, 0.99, 0.5));
      if (r.events.some((e) => e.type === 'cannotAct' && e.actor === 'e0')) blocked++;
      state = r.state;
    }
    expect(blocked).toBe(3);
  });

  it('自分にかけた分身の術は、次のターンから 3 ターン続く', () => {
    const b = sleepEnemies(createBattle([createMember('kasumi', 18)], 'm', ['ogaeru'], 1));
    let { state } = resolveTurn(b, { p0: { kind: 'skill', skill: 'bunshin' } }, seqRng(0.5));
    for (let t = 0; t < 3; t++) {
      expect(get(state, 'p0').status.evade).toBeGreaterThan(0);
      state = resolveTurn(state, { p0: { kind: 'guard' } }, seqRng(0.5)).state;
    }
    expect(get(state, 'p0').status.evade).toBeUndefined();
  });

  it('仁義を切られた敵は、3 回の行動のあいだ引きつけられる', () => {
    const party = [createMember('hero', 3), createMember('kasumi', 3)];
    const b = createBattle(party, 'm', ['ogaeru'], 1);
    // 主人公（0.99）が先に仁義を切る
    let r = resolveTurn(b, { p0: { kind: 'skill', skill: 'jingi', target: 'e0' }, p1: { kind: 'guard' } }, seqRng(0.99, 0.5, 0, 0, 0.99, 0.5));
    let turns = 0;
    while (get(r.state, 'e0').taunt && turns < 10) {
      r = resolveTurn(r.state, { p0: { kind: 'guard' }, p1: { kind: 'guard' } }, seqRng(0.5));
      turns++;
    }
    // 仁義を切ったターン + 次の 2 ターン = 3 回
    expect(turns).toBe(2);
  });
});

describe('効果の持続（続き）', () => {
  it('敵が動いた後に仁義を切っても、3 回の行動のあいだ引きつける', () => {
    const party = [createMember('hero', 6), createMember('kasumi', 6)];
    // 敵（Lv10、0.99）が主人公（0）より先に動き、主人公が後で仁義を切る
    const b = createBattle(party, 'm', ['ogaeru'], 10);
    let r = resolveTurn(b, { p0: { kind: 'skill', skill: 'jingi', target: 'e0' }, p1: { kind: 'guard' } }, seqRng(0, 0, 0.99, 0, 0, 0.99, 0.5));
    expect(r.events).toContainEqual({ type: 'taunt', actor: 'p0', target: 'e0' });
    let turns = 0;
    while (get(r.state, 'e0').taunt && turns < 10) {
      r = resolveTurn(r.state, { p0: { kind: 'guard' }, p1: { kind: 'guard' } }, seqRng(0.5));
      turns++;
    }
    expect(turns).toBe(3);
  });

  it('逃走に失敗したターンにかかった眠りは、次のターンから数える', () => {
    // 眠らせる技だけを使う試験用の敵
    SKILLS.testSleep = { id: 'testSleep', name: '子守唄', mp: 0, target: 'enemy', effect: { kind: 'status', status: 'sleep', turns: 2, chance: 0.95 }, description: '' };
    ENEMIES.testSleeper = { id: 'testSleeper', name: '試験', color: 0, factors: { hp: 1, atk: 1, def: 1, spd: 1 }, actions: [{ skill: 'testSleep', weight: 1 }] };
    try {
      const b = createBattle([createMember('hero', 1)], 'm', ['testSleeper'], 1);
      // 逃走の判定（失敗）、行動順、敵の行動の選択、狙い、眠りの判定
      let r = resolveTurn(b, { p0: { kind: 'escape' } }, seqRng(0.999, 0.5, 0, 0, 0));
      expect(r.events).toContainEqual({ type: 'status', target: 'p0', status: 'sleep' });
      let blocked = 0;
      for (let t = 0; t < 3; t++) {
        // 敵には眠りの技を使わせない（判定を外す）
        r = resolveTurn(r.state, { p0: { kind: 'guard' } }, seqRng(0.5, 0.5, 0, 0, 0.999));
        if (r.events.some((e) => e.type === 'cannotAct' && e.actor === 'p0')) blocked++;
      }
      expect(blocked).toBe(2);
    } finally {
      delete SKILLS.testSleep;
      delete ENEMIES.testSleeper;
    }
  });
});

describe('敵の行動', () => {
  it('重みに従って技を選ぶ（大蛙は 攻撃 4 : 毒液 1）', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['ogaeru'], 1);
    // 行動順（敵が先）、行動の選択 0.79 は攻撃、0.81 は毒液
    const attack = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0, 0.99, 0.79, 0, 0.99, 0.5));
    expect(attack.events.some((e) => e.type === 'attack' && e.actor === 'e0')).toBe(true);
    const poison = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0, 0.99, 0.81, 0, 0.1));
    expect(poison.events).toContainEqual({ type: 'skill', actor: 'e0', skill: 'dokueki' });
    expect(poison.events).toContainEqual({ type: 'status', target: 'p0', status: 'poison' });
  });

  it('金鯱からくりは金の鱗で自分の防御を上げ、尾びれで味方全員を打つ', () => {
    const party = () => [createMember('hero', 9), createMember('kasumi', 9)];
    // 行動の選択は 攻撃 3 : 尾びれ 2 : 金の鱗 1。0.9 は金の鱗、0.6 は尾びれ
    const scale = resolveTurn(createBattle(party(), 'm', ['kinshachi'], 10), { p0: { kind: 'guard' }, p1: { kind: 'guard' } }, seqRng(0, 0, 0.99, 0.9));
    expect(scale.events).toContainEqual({ type: 'skill', actor: 'e0', skill: 'kinUroko' });
    expect(scale.events).toContainEqual({ type: 'status', target: 'e0', status: 'defUp' });
    // 金の鱗は自分の行動 3 回分だけ続く（かけたターンはもう動いたあとなので数えない）
    let st = scale.state;
    for (let turn = 1; turn <= 3; turn++) {
      expect(get(st, 'e0').status.defUp, `turn ${turn}`).toBeGreaterThan(0);
      st = resolveTurn(st, { p0: { kind: 'guard' }, p1: { kind: 'guard' } }, seqRng(0, 0, 0.99, 0.1, 0.5)).state;
    }
    expect(get(st, 'e0').status.defUp).toBeFalsy();
    const tail = resolveTurn(createBattle(party(), 'm', ['kinshachi'], 10), { p0: { kind: 'guard' }, p1: { kind: 'guard' } }, seqRng(0, 0, 0.99, 0.6, 0.5));
    expect(tail.events).toContainEqual({ type: 'skill', actor: 'e0', skill: 'obire' });
    const hurt = tail.events.filter((e) => e.type === 'damage').map((e) => e.type === 'damage' && e.target);
    expect(hurt.sort()).toEqual(['p0', 'p1']);
  });

  it('鬼火の狐火は術のダメージを与える', () => {
    const b = createBattle([createMember('hero', 1)], 'm', ['onibi'], 1);
    const { events } = resolveTurn(b, { p0: { kind: 'guard' } }, seqRng(0, 0.99, 0.9, 0, 0.5));
    expect(events).toContainEqual({ type: 'skill', actor: 'e0', skill: 'kitsunebi' });
    expect(events.find((e) => e.type === 'damage')).toMatchObject({ target: 'p0' });
  });
});

describe('範囲・回復・お祓い', () => {
  it('一宿一飯の恩は味方全体を回復し、威力はレベルで伸びる', () => {
    const party = [{ ...createMember('hero', 12), hp: 1 }, { ...createMember('kasumi', 12), hp: 1 }];
    const b = sleepEnemies(createBattle(party, 'm', ['ogaeru'], 1));
    const { events } = resolveTurn(b, { p0: { kind: 'skill', skill: 'ichishuku' }, p1: { kind: 'guard' } }, seqRng(0.5));
    const heals = events.filter((e) => e.type === 'heal');
    expect(heals.map((e) => e.type === 'heal' && e.target)).toEqual(['p0', 'p1']);
    // 威力 8 × 1.075^11 + 術力 × 1.5
    const mag = get(b, 'p0').stats.mag;
    expect(heals[0]).toMatchObject({ amount: Math.floor(8 * 1.075 ** 11 + mag * 1.5) });
  });

  it('お祓いで状態異常を治す。倒れた味方を選んでいたら効かない', () => {
    const party = [createMember('gendo', 1), createMember('hero', 1)];
    const b = sleepEnemies(createBattle(party, 'm', ['ogaeru'], 1));
    get(b, 'p1').status.poison = 99;
    const cured = resolveTurn(b, { p0: { kind: 'skill', skill: 'oharai', target: 'p1' }, p1: { kind: 'guard' } }, seqRng(0.5));
    expect(cured.events).toContainEqual({ type: 'cure', target: 'p1', ailments: ['poison'] });
    get(b, 'p1').hp = 0;
    for (const skill of ['yakushi', 'oharai']) {
      const fallen = resolveTurn(b, { p0: { kind: 'skill', skill, target: 'p1' } }, seqRng(0.5));
      expect(fallen.events).toContainEqual({ type: 'noEffect', target: 'p1' });
      // 術者には掛からず、気力は使う
      expect(get(fallen.state, 'p0').hp).toBe(get(b, 'p0').hp);
      expect(get(fallen.state, 'p0').mp).toBe(get(b, 'p0').mp - 3);
    }
  });

  it('影縫いは技で当てると、その後の 1 回の行動を止める', () => {
    const b = createBattle([createMember('kasumi', 14)], 'm', ['ogaeru'], 1);
    // 霞が先に動くので、そのターンの敵の行動を止める
    const r = resolveTurn(b, { p0: { kind: 'skill', skill: 'kagenui', target: 'e0' } }, seqRng(0.99, 0, 0.1, 0.5));
    expect(r.events).toContainEqual({ type: 'status', target: 'e0', status: 'bind' });
    expect(r.events).toContainEqual({ type: 'cannotAct', actor: 'e0', reason: 'bind' });
    expect(get(r.state, 'e0').status.bind).toBeUndefined();
  });
});

describe('道具の消費', () => {
  it('効かない相手には使わず、減らさない', () => {
    const party = [createMember('hero', 1), { ...createMember('kasumi', 1), hp: 0 }];
    const b = sleepEnemies(createBattle(party, 'm', ['ogaeru'], 1, { items: { kizugusuri: 1, kitsukegusuri: 1 } }));
    // 満タンの味方に傷薬、倒れた味方に傷薬、生きている味方に気付け薬、気力が満タンの味方に万金丹、毒でない味方に毒消し
    const cases = [
      ['kizugusuri', 'p0'],
      ['kizugusuri', 'p1'],
      ['kitsukegusuri', 'p0'],
      ['mankintan', 'p0'],
      ['dokukeshi', 'p0'],
    ] as const;
    b.items = { kizugusuri: 1, kitsukegusuri: 1, mankintan: 1, dokukeshi: 1 };
    for (const [item, target] of cases) {
      const r = resolveTurn(b, { p0: { kind: 'item', item, target } }, seqRng(0.5));
      expect(r.events).toContainEqual({ type: 'itemUnused', actor: 'p0', item, target });
      expect(r.state.items).toEqual(b.items);
    }
  });

  it('兵糧丸は体力と気力を回復し、両方満タンなら使わない', () => {
    // 体力・気力の最大が回復量より多いレベルにする
    const party = [{ ...createMember('hero', 30), hp: 1, mp: 0 }];
    expect(memberStats(party[0]!).maxHp).toBeGreaterThan(61);
    expect(memberStats(party[0]!).maxMp).toBeGreaterThan(12);
    const b = sleepEnemies(createBattle(party, 'm', ['ogaeru'], 1, { items: { hyorogan: 2 } }));
    const r = resolveTurn(b, { p0: { kind: 'item', item: 'hyorogan', target: 'p0' } }, seqRng(0.5));
    expect(r.events).toContainEqual({ type: 'heal', target: 'p0', amount: 60 });
    expect(r.events).toContainEqual({ type: 'healMp', target: 'p0', amount: 12 });
    expect(r.state.items).toEqual({ hyorogan: 1 });
    const full = sleepEnemies(createBattle([createMember('hero', 10)], 'm', ['ogaeru'], 1, { items: { hyorogan: 1 } }));
    const r2 = resolveTurn(full, { p0: { kind: 'item', item: 'hyorogan', target: 'p0' } }, seqRng(0.5));
    expect(r2.events).toContainEqual({ type: 'itemUnused', actor: 'p0', item: 'hyorogan', target: 'p0' });
  });

  it('梅干し・熊の胆・薄荷は、それぞれ眠り・痺れ・混乱だけに効く', () => {
    const b = createBattle([createMember('hero', 5)], 'm', ['ogaeru'], 1);
    const p0 = b.combatants.find((c) => c.key === 'p0')!;
    const cases = [
      ['umeboshi', 'sleep'],
      ['kumanoi', 'paralysis'],
      ['hakka', 'confusion'],
    ] as const;
    for (const [item, ailment] of cases) {
      for (const other of ['poison', 'sleep', 'paralysis', 'confusion'] as const) {
        p0.status = { [other]: 3 };
        expect(itemWorks(ITEMS[item]!.effect, p0), `${item} ${other}`).toBe(other === ailment);
      }
    }
  });

  it('薄荷で混乱が治る', () => {
    // 混乱した主人公に、霞が薄荷を使う
    const b = sleepEnemies(createBattle([createMember('hero', 5), createMember('kasumi', 5)], 'm', ['ogaeru'], 1, { items: { hakka: 1 } }));
    b.combatants.find((c) => c.key === 'p0')!.status.confusion = 3;
    const r = resolveTurn(b, { p0: { kind: 'guard' }, p1: { kind: 'item', item: 'hakka', target: 'p0' } }, seqRng(0.5));
    expect(r.state.combatants.find((c) => c.key === 'p0')!.status.confusion).toBeUndefined();
    expect(r.state.items).toEqual({});
  });

  it('朝鮮人参は体力の半分で起こす', () => {
    const party = [createMember('hero', 10), { ...createMember('kasumi', 10), hp: 0 }];
    const b = sleepEnemies(createBattle(party, 'm', ['ogaeru'], 1, { items: { ninjin: 1 } }));
    const r = resolveTurn(b, { p0: { kind: 'item', item: 'ninjin', target: 'p1' } }, seqRng(0.5));
    const p1 = r.state.combatants.find((c) => c.key === 'p1')!;
    expect(p1.hp).toBe(Math.floor(p1.stats.maxHp * 0.5));
  });

  it('逃走に失敗したターンは、選んだ道具・技を使わない', () => {
    const party = [createMember('hero', 5), { ...createMember('kasumi', 1), hp: 1 }];
    const b = createBattle(party, 'm', ['ogaeru'], 1, { items: { kizugusuri: 1 } });
    const { state } = resolveTurn(
      b,
      { p0: { kind: 'escape' }, p1: { kind: 'item', item: 'kizugusuri', target: 'p1' } },
      seqRng(0.999, 0.5),
    );
    expect(state.items).toEqual({ kizugusuri: 1 });
  });
});

describe('野狐（序章のボス）の技', () => {
  /** 野狐が skill を使うまでターンを進め、そのターンのイベントを返す（味方は防御だけ）。 */
  function untilSkill(skill: string) {
    let b = createBattle([createMember('hero', 20), createMember('kasumi', 20)], 'm', ['yako'], 4, { canEscape: false });
    const rng = seededRng(7);
    for (let t = 0; t < 100; t++) {
      const r = resolveTurn(b, { p0: { kind: 'guard' }, p1: { kind: 'guard' } }, rng);
      const i = r.events.findIndex((e) => e.type === 'skill' && e.actor === 'e0' && e.skill === skill);
      if (i >= 0) return r.events.slice(i + 1);
      b = r.state;
      // 状態異常で味方の防御が崩れないよう、毎ターン治しておく
      for (const c of b.combatants) if (c.side === 'party') c.status = {};
    }
    throw new Error(`${skill} was not used`);
  }

  it('狐火の渦は味方全員に当たる', () => {
    const after = untilSkill('kitsunebiUzu');
    const hit = after.filter((e) => e.type === 'damage').map((e) => (e.type === 'damage' ? e.target : ''));
    expect(hit.sort()).toEqual(['p0', 'p1']);
  });

  it('化かしは味方 1 人に混乱をかけようとする', () => {
    const next = untilSkill('bakashi')[0];
    expect(next).toMatchObject({ status: 'confusion' });
    expect(next?.type === 'status' || next?.type === 'statusFailed').toBe(true);
    if (next && 'target' in next) expect(next.target).toMatch(/^p/);
  });
});

describe('第 4 章（伊賀）の敵の技', () => {
  /** enemy が skill を使うまでターンを進め、そのターン、技を使ったあとのイベントを返す（味方は防御だけ）。 */
  function untilSkill(enemy: string, level: number, skill: string, setup: (b: BattleState) => void = () => {}, seed = 0) {
    let b = createBattle([createMember('hero', 30), createMember('kasumi', 30), createMember('gendo', 30), createMember('orin', 30)], 'm', [enemy], level, { canEscape: false });
    setup(b);
    const rng = seededRng(11 + seed);
    const guard = { p0: { kind: 'guard' }, p1: { kind: 'guard' }, p2: { kind: 'guard' }, p3: { kind: 'guard' } } as const;
    for (let t = 0; t < 200; t++) {
      const r = resolveTurn(b, guard, rng);
      const i = r.events.findIndex((e) => e.type === 'skill' && e.actor === 'e0' && e.skill === skill);
      if (i >= 0) return { events: r.events.slice(i + 1), state: r.state };
      b = r.state;
      for (const c of b.combatants) {
        if (c.side === 'party') {
          c.status = {};
          c.hp = c.stats.maxHp;
        } else delete c.status.evade;
      }
      setup(b);
    }
    throw new Error(`${skill} was not used`);
  }
  const hits = (events: { type: string }[]) => events.filter((e) => e.type === 'damage' || e.type === 'miss').length;

  it('朧の手裏剣の雨は味方に 3〜4 回当たる', () => {
    for (let k = 0; k < 5; k++) {
      const n = hits(untilSkill('oboro', 15, 'shurikenAme', undefined, k).events);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(4);
    }
  });

  it('朧の空蝉は自分の回避を上げる', () => {
    const { events, state } = untilSkill('oboro', 15, 'utsusemi');
    expect(events[0]).toEqual({ type: 'status', target: 'e0', status: 'evade' });
    expect(get(state, 'e0').status.evade).toBeGreaterThan(0);
  });

  it('権六の二連撃は同じ味方に 2 回当たる', () => {
    const { events } = untilSkill('gonroku', 16, 'nirengeki');
    const targets = events.filter((e) => e.type === 'damage' || e.type === 'miss').map((e) => ('target' in e ? e.target : ''));
    expect(targets).toHaveLength(2);
    expect(new Set(targets).size).toBe(1);
  });

  it('権六のからくり義手は防御を無視する（防御がとても高い味方にも、ふつうに当たる）', () => {
    const tough = (b: BattleState) => {
      for (const c of b.combatants) if (c.side === 'party') c.stats = { ...c.stats, def: 9999 };
    };
    const { events } = untilSkill('gonroku', 16, 'gishu', tough);
    const hit = events.find((e) => e.type === 'damage');
    // 防御 9999 なら通常の攻撃はほとんど通らない。防御を無視すれば、防御（半減）していても 10 を超える
    expect(hit?.type === 'damage' && hit.damage).toBeGreaterThan(10);
  });

  it('伊賀者の手裏剣は 2 回投げる', () => {
    expect(hits(untilSkill('iganin', 13, 'igaShuriken').events)).toBe(2);
  });
});

describe('榊兵庫（侍、ゲスト）の技', () => {
  it('Lv18 で加わったときから 3 つの技を覚えている', () => {
    const b = createBattle([createMember('hyogo', 18)], 'm', ['ogaeru'], 1);
    expect(get(b, 'p0').skills).toEqual(['hyogoKesagiri', 'tsubamegaeshi', 'munenmuso']);
  });

  it('袈裟斬りは気力 3 で、通常攻撃の 1.5 倍', () => {
    const b = sleepEnemies(createBattle([createMember('hyogo', 18)], 'm', ['karakuriTawara'], 16));
    const mp = get(b, 'p0').mp;
    // 乱数 0.5 は会心なし・ダメージの揺れが同じになる
    const atk = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.5)).events.find((e) => e.type === 'attack');
    const r = resolveTurn(b, { p0: { kind: 'skill', skill: 'hyogoKesagiri', target: 'e0' } }, seqRng(0.5));
    const hit = r.events.find((e) => e.type === 'damage');
    expect(get(r.state, 'p0').mp).toBe(mp - 3);
    const base = atk?.type === 'attack' ? atk.damage : 0;
    expect(hit?.type === 'damage' && hit.damage).toBeGreaterThanOrEqual(Math.floor(base * 1.5) - 1);
    expect(hit?.type === 'damage' && hit.damage).toBeLessThanOrEqual(Math.ceil(base * 1.5) + 1);
  });

  it('燕返しは気力 6 で、同じ敵に 2 回斬る', () => {
    const b = sleepEnemies(createBattle([createMember('hyogo', 18)], 'm', ['karakuriTawara'], 16));
    const r = resolveTurn(b, { p0: { kind: 'skill', skill: 'tsubamegaeshi', target: 'e0' } }, seqRng(0.5));
    expect(r.events.filter((e) => (e.type === 'damage' || e.type === 'miss') && e.target === 'e0')).toHaveLength(2);
    expect(get(r.state, 'p0').mp).toBe(get(b, 'p0').mp - 6);
  });

  it('無念無想は気力 5 で、自分の会心↑ を 3 ターン付ける', () => {
    const b = sleepEnemies(createBattle([createMember('hyogo', 18)], 'm', ['karakuriTawara'], 16));
    const r = resolveTurn(b, { p0: { kind: 'skill', skill: 'munenmuso' } }, seqRng(0.5));
    expect(r.events).toContainEqual({ type: 'status', target: 'p0', status: 'critUp' });
    expect(get(r.state, 'p0').status.critUp).toBeGreaterThan(0);
    expect(get(r.state, 'p0').mp).toBe(get(b, 'p0').mp - 5);
  });
});

describe('第 5 章（大坂）の敵の技', () => {
  /** enemy が skill を使うまでターンを進め、そのターン、技を使ったあとのイベントを返す（味方は防御だけ）。 */
  function untilSkill(enemy: string, level: number, skill: string, setup: (b: BattleState) => void = () => {}, seed = 0) {
    let b = createBattle([createMember('hero', 30), createMember('gendo', 30), createMember('orin', 30), createMember('hyogo', 18)], 'm', [enemy], level, { canEscape: false });
    setup(b);
    const rng = seededRng(13 + seed);
    const guard = { p0: { kind: 'guard' }, p1: { kind: 'guard' }, p2: { kind: 'guard' }, p3: { kind: 'guard' } } as const;
    for (let t = 0; t < 200; t++) {
      const r = resolveTurn(b, guard, rng);
      const i = r.events.findIndex((e) => e.type === 'skill' && e.actor === 'e0' && e.skill === skill);
      if (i >= 0) return r.events.slice(i + 1);
      b = r.state;
      for (const c of b.combatants) {
        if (c.side === 'party') {
          c.status = {};
          c.hp = c.stats.maxHp;
        }
      }
      setup(b);
    }
    throw new Error(`${skill} was not used`);
  }

  it('百俵からくりの俵落としは味方 4 人全員に当たる', () => {
    const hit = untilSkill('hyakuhyo', 19, 'tawaraOtoshi').filter((e) => e.type === 'damage' || e.type === 'miss').map((e) => ('target' in e ? e.target : ''));
    expect(hit.sort()).toEqual(['p0', 'p1', 'p2', 'p3']);
  });

  it('百俵からくりの米ぬかの煙は味方全員に命中↓ をかけようとする', () => {
    const after = untilSkill('hyakuhyo', 19, 'komenuka').filter((e) => e.type === 'status' || e.type === 'statusFailed');
    expect(after.map((e) => ('target' in e ? e.target : '')).sort()).toEqual(['p0', 'p1', 'p2', 'p3']);
    for (const e of after) expect(e).toMatchObject({ status: 'accDown' });
  });

  it('鉄砲足軽の鉄砲は必ず当たる（回避↑ の味方にも。回避↑ では 1 回に 35% 外れるので、10 回試す）', () => {
    for (let k = 0; k < 10; k++) {
      const evade = (b: BattleState) => {
        for (const c of b.combatants) if (c.side === 'party') c.status.evade = 9;
      };
      const after = untilSkill('teppoAshigaru', 16, 'teppo', evade, k);
      expect(after.some((e) => e.type === 'damage')).toBe(true);
      expect(after.some((e) => e.type === 'miss')).toBe(false);
    }
  });
});

describe('第 6 章（長崎・島原）の敵の技', () => {
  const four = () => [createMember('hero', 30), createMember('kasumi', 30), createMember('gendo', 30), createMember('orin', 30)];
  const guard = { p0: { kind: 'guard' }, p1: { kind: 'guard' }, p2: { kind: 'guard' }, p3: { kind: 'guard' } } as const;

  /** 南蛮大筒からくりが装填するまでターンを進め、装填した直後の戦闘を返す（味方は防御だけ。毎ターン全回復）。 */
  function untilCharged(seed: number): { state: BattleState; events: ReturnType<typeof resolveTurn>['events'] } {
    let b = createBattle(four(), 'm', ['nanbanOzutsu'], 22, { canEscape: false });
    const rng = seededRng(29 + seed);
    for (let t = 0; t < 200; t++) {
      const r = resolveTurn(b, guard, rng);
      b = r.state;
      for (const c of b.combatants) if (c.side === 'party') c.hp = c.stats.maxHp;
      if (r.events.some((e) => e.type === 'charge')) return { state: b, events: r.events };
    }
    throw new Error('soten was not used');
  }

  it('装填すると構えに入り（charge のイベント）、次のターンに必ず大筒で味方 4 人全員を撃つ', () => {
    for (let k = 0; k < 5; k++) {
      const { state, events } = untilCharged(k);
      expect(events.find((e) => e.type === 'charge')).toEqual({ type: 'charge', actor: 'e0', skill: 'ozutsu' });
      expect(get(state, 'e0').charged).toBe('ozutsu');
      const next = resolveTurn(state, guard, seededRng(100 + k));
      expect(next.events.filter((e) => e.type === 'skill' && e.actor === 'e0').map((e) => (e.type === 'skill' ? e.skill : ''))).toEqual(['ozutsu']);
      const hit = next.events.filter((e) => e.type === 'damage' || e.type === 'miss').map((e) => ('target' in e ? e.target : ''));
      expect(hit.sort()).toEqual(['p0', 'p1', 'p2', 'p3']);
      expect(get(next.state, 'e0').charged).toBeUndefined();
    }
  });

  it.each(['sleep', 'paralysis', 'confusion'] as const)('構えのあいだに %s で思うように動けなくても構えは解けず、次に動けたときに大筒を撃つ', (status) => {
    const { state } = untilCharged(0);
    get(state, 'e0').status[status] = 1;
    const held = resolveTurn(state, guard, seededRng(7));
    expect(held.events.some((e) => e.type === 'skill' && e.actor === 'e0')).toBe(false);
    expect(get(held.state, 'e0').charged).toBe('ozutsu');
    const fired = resolveTurn(held.state, guard, seededRng(8));
    expect(fired.events.some((e) => e.type === 'skill' && e.actor === 'e0' && e.skill === 'ozutsu')).toBe(true);
  });

  it('大筒は防御した味方へのダメージが、防御しないときより小さい', () => {
    const { state } = untilCharged(1);
    // 味方が何もしない（乱数を使わない）ときと防御するときを、同じ乱数で比べる
    const idle = {};
    const sum = (r: ReturnType<typeof resolveTurn>) =>
      r.events.filter((e) => e.type === 'damage' && e.target.startsWith('p')).reduce((s, e) => s + (e.type === 'damage' ? e.damage : 0), 0);
    expect(sum(resolveTurn(state, guard, seededRng(3)))).toBeLessThan(sum(resolveTurn(state, idle, seededRng(3))));
  });

  it('ぶどう弾は味方にランダムに 2〜3 回当たる', () => {
    let b = createBattle(four(), 'm', ['nanbanOzutsu'], 22, { canEscape: false });
    const rng = seededRng(41);
    for (let t = 0; t < 200; t++) {
      const r = resolveTurn(b, guard, rng);
      const i = r.events.findIndex((e) => e.type === 'skill' && e.actor === 'e0' && e.skill === 'budodan');
      if (i >= 0) {
        const rest = r.events.slice(i + 1);
        const end = rest.findIndex((e) => e.type === 'skill' || e.type === 'attack');
        const hits = (end < 0 ? rest : rest.slice(0, end)).filter((e) => e.type === 'damage' || e.type === 'miss');
        expect(hits.length).toBeGreaterThanOrEqual(2);
        expect(hits.length).toBeLessThanOrEqual(3);
        return;
      }
      b = r.state;
      for (const c of b.combatants) if (c.side === 'party') c.hp = c.stats.maxHp;
    }
    throw new Error('budodan was not used');
  });

  it('海坊主の大波は味方 4 人全員に当たる', () => {
    let b = createBattle(four(), 'm', ['umibozu'], 19, { canEscape: false });
    const rng = seededRng(5);
    for (let t = 0; t < 200; t++) {
      const r = resolveTurn(b, guard, rng);
      const i = r.events.findIndex((e) => e.type === 'skill' && e.actor === 'e0' && e.skill === 'onami');
      if (i >= 0) {
        const hit = r.events.slice(i + 1).filter((e) => e.type === 'damage' || e.type === 'miss').map((e) => ('target' in e ? e.target : ''));
        expect(hit.slice(0, 4).sort()).toEqual(['p0', 'p1', 'p2', 'p3']);
        return;
      }
      b = r.state;
      for (const c of b.combatants) if (c.side === 'party') c.hp = c.stats.maxHp;
    }
    throw new Error('onami was not used');
  });

  /** enemy が skill を使うまでターンを進め、技を使ったあとのイベントを返す（味方は防御だけ。毎ターン全回復）。 */
  function untilSkill(enemy: string, skill: string, setup: (b: BattleState) => void = () => {}) {
    let b = createBattle(four(), 'm', [enemy], 19, { canEscape: false });
    setup(b);
    const rng = seededRng(17);
    for (let t = 0; t < 200; t++) {
      const r = resolveTurn(b, guard, rng);
      const i = r.events.findIndex((e) => e.type === 'skill' && e.actor === 'e0' && e.skill === skill);
      if (i >= 0) return r.events.slice(i + 1);
      b = r.state;
      for (const c of b.combatants) {
        if (c.side === 'party') {
          c.status = {};
          c.hp = c.stats.maxHp;
        }
      }
      setup(b);
    }
    throw new Error(`${skill} was not used`);
  }

  it('亡霊武者の亡者の太刀は防御を無視する（防御がとても高い味方にも、ふつうに当たる）', () => {
    const tough = (b: BattleState) => {
      for (const c of b.combatants) if (c.side === 'party') c.stats = { ...c.stats, def: 9999 };
    };
    const hit = untilSkill('boreiMusha', 'monoTachi', tough).find((e) => e.type === 'damage');
    expect(hit?.type === 'damage' && hit.damage).toBeGreaterThan(10);
  });

  it('外法使いの外法の炎は火の術で、味方にダメージを与える', () => {
    expect(SKILLS.gehoHomura?.effect.kind).toBe('magic');
    expect(SKILLS.gehoHomura?.elements).toEqual(['fire']);
    expect(untilSkill('gehoTsukai', 'gehoHomura').some((e) => e.type === 'damage')).toBe(true);
  });

  it('外法使いの惑わしの香は混乱を、平家蟹の泡は命中↓ をかけようとする', () => {
    for (const [enemy, skill, status] of [['gehoTsukai', 'madowashi', 'confusion'], ['heikegani', 'awa', 'accDown']] as const) {
      const after = untilSkill(enemy, skill).filter((e) => e.type === 'status' || e.type === 'statusFailed');
      expect(after.length, skill).toBeGreaterThan(0);
      for (const e of after) expect(e).toMatchObject({ status });
    }
  });

  it('南蛮からくり兵の南蛮剣と平家蟹の大ばさみは、味方 1 人に当たる', () => {
    for (const [enemy, skill] of [['nanbanHei', 'nanbanKen'], ['heikegani', 'hasami']] as const) {
      const first = untilSkill(enemy, skill).find((e) => e.type === 'damage' || e.type === 'miss');
      expect(first && 'target' in first && first.target.startsWith('p'), skill).toBe(true);
    }
  });
});

describe('第 7 章（北前船・金沢）の敵の技', () => {
  const four = () => [createMember('hero', 30), createMember('kasumi', 30), createMember('gendo', 30), createMember('orin', 30)];
  const guard = { p0: { kind: 'guard' }, p1: { kind: 'guard' }, p2: { kind: 'guard' }, p3: { kind: 'guard' } } as const;

  /** 味方は防御だけで、毎ターン全回復しながら進め、各ターンのイベントを返す。 */
  function turns(enemies: string[], level: number, n: number, seed: number) {
    let b = createBattle(four(), 'm', enemies, level, { canEscape: false });
    const rng = seededRng(seed);
    const all: { state: BattleState; events: ReturnType<typeof resolveTurn>['events'] }[] = [];
    for (let t = 0; t < n && b.outcome === 'ongoing'; t++) {
      const r = resolveTurn(b, guard, rng);
      b = r.state;
      for (const c of b.combatants) if (c.side === 'party') c.hp = c.stats.maxHp;
      all.push({ state: b, events: r.events });
    }
    return all;
  }

  it('影武者の御下知はからくり藩士（Lv22）を呼び、呼んだ藩士が 2 体生きているあいだは呼ばない', () => {
    const log = turns(['kagemusha'], 24, 80, 7);
    const summons = log.flatMap((t) => t.events.filter((e) => e.type === 'summon'));
    expect(summons.length).toBeGreaterThan(0);
    for (const t of log) {
      const called = t.state.combatants.filter((c) => c.side === 'enemy' && c.enemyId === 'karakuriHanshi');
      expect(called.filter((c) => c.hp > 0).length).toBeLessThanOrEqual(2);
      for (const c of called) expect(c.level).toBe(22);
    }
  });

  it('夜叉丸の呪いは味方 4 人全員を狙い（攻撃↓）、分身は自分の回避↑', () => {
    const log = turns(['yashamaru'], 25, 120, 11);
    const noroi = log.find((t) => t.events.some((e) => e.type === 'skill' && e.skill === 'noroi'))!;
    expect(noroi).toBeDefined();
    const i = noroi.events.findIndex((e) => e.type === 'skill' && e.skill === 'noroi');
    const targets = noroi.events
      .slice(i + 1, i + 5)
      .filter((e) => e.type === 'status' || e.type === 'statusFailed')
      .map((e) => ('target' in e ? e.target : ''));
    expect(targets.sort()).toEqual(['p0', 'p1', 'p2', 'p3']);
    const bunshin = log.find((t) => t.events.some((e) => e.type === 'skill' && e.skill === 'yashaBunshin'))!;
    expect(bunshin.events).toContainEqual({ type: 'status', target: 'e0', status: 'evade' });
  });

  it('夜叉丸の妖術と雪入道の雪崩は味方 4 人全員に当てる', () => {
    for (const [enemy, level, skill] of [['yashamaru', 25, 'yojutsu'], ['yukiNyudo', 22, 'nadare']] as const) {
      const log = turns([enemy], level, 120, 3);
      const t = log.find((x) => x.events.some((e) => e.type === 'skill' && e.skill === skill))!;
      expect(t, skill).toBeDefined();
      const i = t.events.findIndex((e) => e.type === 'skill' && e.skill === skill);
      const hit = t.events.slice(i + 1, i + 5).filter((e) => e.type === 'damage' || e.type === 'miss').map((e) => ('target' in e ? e.target : ''));
      expect(hit.sort(), skill).toEqual(['p0', 'p1', 'p2', 'p3']);
    }
  });
});

describe('1 ターンに何度も動く敵（終章のからくり大権現）', () => {
  it('からくり大権現は 1 ターンに 2 回動き、ほかの敵と味方は 1 回', () => {
    const b = createBattle([createMember('hero', 31), createMember('gendo', 31)], 'm', ['karakuriDaigongen', 'karakuriKinju'], 32);
    expect(actionsPerTurn(get(b, 'e0'))).toBe(2);
    expect(actionsPerTurn(get(b, 'e1'))).toBe(1);
    expect(actionsPerTurn(get(b, 'p0'))).toBe(1);
    // 乱数をいつも 0.99 にすると、敵は重みの最後の行動（大権現は魂のゼンマイ、近習は小太刀）を選ぶ
    const { events } = resolveTurn(b, { p0: { kind: 'guard' }, p1: { kind: 'guard' } }, () => 0.99);
    const acts = (key: string) => events.filter((e) => e.type === 'skill' && e.actor === key).length;
    expect(acts('e0')).toBe(2);
    expect(acts('e1')).toBe(1);
  });

  it('眠っていれば 2 回とも動けない', () => {
    const b = createBattle([createMember('hero', 31)], 'm', ['karakuriDaigongen'], 32);
    get(b, 'e0').status.sleep = 3;
    const { events } = resolveTurn(b, { p0: { kind: 'guard' } }, () => 0.99);
    expect(events.filter((e) => e.type === 'cannotAct' && e.actor === 'e0').length).toBe(2);
    expect(events.some((e) => e.type === 'skill' && e.actor === 'e0')).toBe(false);
  });
});
