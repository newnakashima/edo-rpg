import { describe, expect, it } from 'vitest';
import { availableItemCount, createBattle, partyAfterBattle, resolveTurn, type BattleState, type Combatant } from './battle';
import { ENEMIES } from '../data/enemies';
import { SKILLS } from '../data/skills';
import { createMember } from './party';
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

  it('狐火の渦は味方全員に火の術で当たる', () => {
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
