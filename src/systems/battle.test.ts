import { describe, expect, it } from 'vitest';
import { aliveOf, computeRewards, createBattle, partyAfterBattle, resolveTurn, type BattleState } from './battle';
import { createMember } from './party';
import { enemyExp, enemyMoney } from './stats';
import { seededRng, seqRng } from './testUtils';

const hero = () => [createMember('hero', 1)];

describe('createBattle', () => {
  it('同じ種族が複数いると呼び分ける', () => {
    const b = createBattle(hero(), 'm', ['onibi', 'onibi', 'yamainu'], 1);
    expect(b.combatants.map((c) => c.name)).toEqual(['弥太郎', '鬼火 甲', '鬼火 乙', '山犬']);
  });

  it('主人公の名前は男女で変わる', () => {
    expect(createBattle(hero(), 'f', ['onibi'], 1).combatants[0]?.name).toBe('お志乃');
  });

  it('知らない敵は例外にする', () => {
    expect(() => createBattle(hero(), 'm', ['nope'], 1)).toThrow();
  });
});

describe('resolveTurn', () => {
  it('引数の状態を変更しない', () => {
    const b = createBattle(hero(), 'm', ['onibi'], 1);
    const snapshot = JSON.stringify(b);
    resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seededRng(1));
    expect(JSON.stringify(b)).toBe(snapshot);
  });

  it('倒れた敵を狙っていたら、生きている別の敵を狙う', () => {
    const b = createBattle(hero(), 'm', ['onibi', 'onibi'], 1);
    const e0 = b.combatants.find((c) => c.key === 'e0');
    if (e0) e0.hp = 0;
    const { events } = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seededRng(2));
    const heroAttack = events.find((e) => e.type === 'attack' && e.actor === 'p0');
    expect(heroAttack).toMatchObject({ target: 'e1' });
  });

  it('防御するとそのターンの被ダメージが半分になる', () => {
    const base = createBattle(hero(), 'm', ['yamainu'], 1);
    // 乱数を固定し、防御あり・なしで敵の攻撃のダメージを比べる
    const rng = () => seqRng(0.5, 0.1, 0.5);
    const normal = resolveTurn(base, { p0: { kind: 'attack', target: 'e0' } }, rng());
    const guarded = resolveTurn(base, { p0: { kind: 'guard' } }, rng());
    const hit = (events: typeof normal.events) => events.find((e) => e.type === 'attack' && e.actor === 'e0');
    const n = hit(normal.events);
    const g = hit(guarded.events);
    expect(n && n.type === 'attack' && g && g.type === 'attack').toBe(true);
    if (n?.type === 'attack' && g?.type === 'attack') expect(g.damage).toBe(Math.max(1, Math.floor(n.damage / 2)));
  });

  it('逃走に成功すると escaped で終わる', () => {
    const b = createBattle(hero(), 'm', ['ogaeru'], 1);
    const { state, events } = resolveTurn(b, { p0: { kind: 'escape' } }, seqRng(0));
    expect(state.outcome).toBe('escaped');
    expect(events).toEqual([{ type: 'escape', success: true }]);
  });

  it('逃走に失敗すると、そのターンは敵だけが行動する（防御は有効）', () => {
    const party = [createMember('hero', 1), createMember('kasumi', 1)];
    const b = createBattle(party, 'm', ['ogaeru'], 1);
    const { state, events } = resolveTurn(b, { p0: { kind: 'escape' }, p1: { kind: 'guard' } }, seqRng(0.999, 0.5));
    expect(state.outcome).toBe('ongoing');
    expect(events[0]).toEqual({ type: 'escape', success: false });
    expect(events).toContainEqual({ type: 'guard', actor: 'p1' });
    const attacks = events.filter((e) => e.type === 'attack');
    expect(attacks.length).toBeGreaterThan(0);
    expect(attacks.every((e) => e.actor === 'e0')).toBe(true);
    expect(state.combatants.find((c) => c.key === 'p1')?.guarding).toBe(true);
  });

  it('逃走率は生きている味方の平均素早さで決まる', () => {
    // 霞（速 13）と主人公（速 8）の平均 10.5、大蛙（速 4）との差 6.5 で 63%
    const party = [createMember('hero', 1), createMember('kasumi', 1)];
    const b = createBattle(party, 'm', ['ogaeru'], 1);
    expect(resolveTurn(b, { p0: { kind: 'escape' } }, seqRng(0.62)).state.outcome).toBe('escaped');
    expect(resolveTurn(b, { p0: { kind: 'escape' } }, seqRng(0.64, 0.5)).state.outcome).toBe('ongoing');
  });

  it('会心と撃破のイベントを出す', () => {
    const b = createBattle([createMember('hero', 10)], 'm', ['onibi'], 1);
    // 主人公が先に動く: 行動順の乱数 2 つ、会心の判定（0 で会心）、ダメージの乱数
    const { events } = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.9, 0.1, 0, 0.5));
    expect(events[0]).toMatchObject({ type: 'attack', actor: 'p0', target: 'e0', critical: true });
    expect(events[1]).toEqual({ type: 'defeated', target: 'e0' });
  });

  it('逃げられない戦闘では必ず失敗する', () => {
    const b = createBattle(hero(), 'm', ['ogaeru'], 1, { canEscape: false });
    const { events } = resolveTurn(b, { p0: { kind: 'escape' } }, seqRng(0));
    expect(events[0]).toEqual({ type: 'escape', success: false });
  });

  it('敵を全滅させると victory、味方が全滅すると defeat', () => {
    const win = createBattle([createMember('hero', 20)], 'm', ['onibi'], 1);
    expect(resolveTurn(win, { p0: { kind: 'attack', target: 'e0' } }, seededRng(3)).state.outcome).toBe('victory');

    const lose = createBattle(hero(), 'm', ['yamainu'], 30);
    let state: BattleState = lose;
    const rng = seededRng(4);
    for (let i = 0; i < 20 && state.outcome === 'ongoing'; i++) {
      state = resolveTurn(state, { p0: { kind: 'guard' } }, rng).state;
    }
    expect(state.outcome).toBe('defeat');
  });

  it('決着がついた戦闘は進めない', () => {
    const b: BattleState = { ...createBattle(hero(), 'm', ['onibi'], 1), outcome: 'victory' };
    expect(resolveTurn(b, {}, seededRng(5))).toEqual({ state: b, events: [] });
  });

  it('序章の 1 体戦は Lv1 の主人公がほぼ勝てる（docs/balance.md の確かめ）', () => {
    const rng = seededRng(42);
    let wins = 0;
    const trials = 300;
    for (let t = 0; t < trials; t++) {
      let state = createBattle(hero(), 'm', ['yamainu'], 1);
      while (state.outcome === 'ongoing') {
        state = resolveTurn(state, { p0: { kind: 'attack', target: 'e0' } }, rng).state;
      }
      if (state.outcome === 'victory') wins++;
    }
    expect(wins / trials).toBeGreaterThan(0.95);
  });
});

describe('装備', () => {
  it('戦闘の能力値は装備を含む', () => {
    const bare = createBattle([createMember('hero', 1, {})], 'm', ['onibi'], 1);
    const armed = createBattle([createMember('hero', 1, { weapon: 'dotanuki' })], 'm', ['onibi'], 1);
    expect(armed.combatants[0]!.stats.atk).toBe(bare.combatants[0]!.stats.atk + 7);
    const hit = (b: BattleState) => {
      const e = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.99, 0.1, 0.99, 0.5)).events[0];
      return e?.type === 'attack' ? e.damage : 0;
    };
    expect(hit(armed)).toBeGreaterThan(hit(bare));
  });
});

describe('報酬', () => {
  it('生き残った味方はそれぞれ全額、倒れた味方は 0', () => {
    const b = createBattle([createMember('hero', 1), createMember('kasumi', 1)], 'm', ['onibi', 'yamainu'], 1);
    const p1 = b.combatants.find((c) => c.key === 'p1');
    if (p1) p1.hp = 0;
    const rewards = computeRewards(b);
    expect(rewards.exp).toEqual({ p0: enemyExp(1) * 2, p1: 0 });
    expect(rewards.money).toBe(enemyMoney(1) * 2);
  });

  it('味方が敵より 4 レベル以上高いと、その味方の経験値は半分', () => {
    const b = createBattle([createMember('hero', 5), createMember('kasumi', 4)], 'm', ['onibi'], 1);
    expect(computeRewards(b).exp).toEqual({ p0: Math.floor(enemyExp(1) / 2), p1: enemyExp(1) });
  });

  it('ボスは経験値とお金が rewardScale 倍', () => {
    const b = createBattle([createMember('hero', 3)], 'm', ['yako'], 4, { canEscape: false });
    expect(computeRewards(b)).toEqual({ exp: { p0: enemyExp(4) * 3 }, money: enemyMoney(4) * 3 });
  });

  it('倍率は敵ごとに掛かり、半分にする決まりは倍率を掛けたあとの値に使う', () => {
    const b = createBattle([createMember('hero', 3), createMember('kasumi', 8)], 'm', ['yako', 'onibi'], 4);
    expect(computeRewards(b)).toEqual({
      // Lv8 の霞は敵（Lv4）より 4 高いので半分
      exp: { p0: enemyExp(4) * 3 + enemyExp(4), p1: Math.floor((enemyExp(4) * 3) / 2) + Math.floor(enemyExp(4) / 2) },
      money: enemyMoney(4) * 3 + enemyMoney(4),
    });
  });

  it('戦闘後の HP を仲間に書き戻す', () => {
    const party = hero();
    const b = createBattle(party, 'm', ['onibi'], 1);
    const p0 = b.combatants.find((c) => c.key === 'p0');
    if (p0) p0.hp = 3;
    expect(partyAfterBattle(party, b)[0]?.hp).toBe(3);
    expect(aliveOf(b, 'party')).toHaveLength(1);
  });
});
