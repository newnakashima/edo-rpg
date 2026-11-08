import { describe, expect, it } from 'vitest';
import { aliveOf, availableItemCount, computeRewards, createBattle, partyAfterBattle, resolveTurn, type BattleEvent, type BattleState } from './battle';
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

  it('戦闘の外だけの技（抜け道）と道具（道しるべの札）は戦闘では選べない', () => {
    const b = createBattle([createMember('kasumi', 1)], 'm', ['onibi'], 1, { items: { michishirube: 2, kizugusuri: 1 } });
    expect(b.combatants[0]?.skills).not.toContain('nukemichi');
    expect(b.combatants[0]?.skills).toContain('shuriken');
    expect(availableItemCount(b, 'michishirube', {})).toBe(0);
    expect(availableItemCount({ ...b, items: { mayokeKo: 1 } }, 'mayokeKo', {})).toBe(0);
    expect(availableItemCount(b, 'kizugusuri', {})).toBe(1);
    // 万一、札を使う指示が来ても何も起こらず、札は減らない
    const { state, events } = resolveTurn(b, { p0: { kind: 'item', item: 'michishirube', target: 'p0' } }, seededRng(1));
    expect(state.items.michishirube).toBe(2);
    expect(events).toContainEqual(expect.objectContaining({ type: 'itemUnused', item: 'michishirube' }));
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
    // 霞（速 14）と主人公（速 8）の平均 11、大蛙（速 4）との差 7 で 64%
    const party = [createMember('hero', 1), createMember('kasumi', 1)];
    const b = createBattle(party, 'm', ['ogaeru'], 1);
    expect(resolveTurn(b, { p0: { kind: 'escape' } }, seqRng(0.63)).state.outcome).toBe('escaped');
    expect(resolveTurn(b, { p0: { kind: 'escape' } }, seqRng(0.65, 0.5)).state.outcome).toBe('ongoing');
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

describe('レア装備の特性', () => {
  const attacks = (events: BattleEvent[], actor: string) => events.filter((e) => e.type === 'attack' && e.actor === actor);

  it('影分身の秘伝書を付けた霞は、たたかうで 2 回攻撃する（付けていなければ 1 回）', () => {
    const kasumi = (accessory?: string) => [createMember('kasumi', 20, { weapon: 'kunai', accessory })];
    // 敵の HP を大きくして、1 回目で倒れないようにする
    const battle = (accessory?: string) => {
      const b = createBattle(kasumi(accessory), 'm', ['yamainu'], 1);
      b.combatants[1]!.hp = 9999;
      return b;
    };
    const twin = resolveTurn(battle('kagebunshin'), { p0: { kind: 'attack', target: 'e0' } }, seededRng(3)).events;
    expect(attacks(twin, 'p0').map((e) => (e.type === 'attack' ? e.target : ''))).toEqual(['e0', 'e0']);
    expect(twin).toContainEqual({ type: 'again', actor: 'p0', equip: 'kagebunshin', trait: 'doubleAttack' });
    const single = resolveTurn(battle(), { p0: { kind: 'attack', target: 'e0' } }, seededRng(3)).events;
    expect(attacks(single, 'p0')).toHaveLength(1);
    expect(single.some((e) => e.type === 'again')).toBe(false);
  });

  it('2 回攻撃の 1 回目で狙いが倒れたら、2 回目は別の敵を狙い、敵が残っていなければ斬りかからない', () => {
    const party = [createMember('kasumi', 20, { weapon: 'kunai', accessory: 'kagebunshin' })];
    const two = createBattle(party, 'm', ['onibi', 'onibi'], 1);
    two.combatants[1]!.hp = 1;
    two.combatants[2]!.hp = 9999;
    const events = resolveTurn(two, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.5)).events;
    expect(attacks(events, 'p0').map((e) => (e.type === 'attack' ? e.target : ''))).toEqual(['e0', 'e1']);

    const one = createBattle(party, 'm', ['onibi'], 1);
    one.combatants[1]!.hp = 1;
    const last = resolveTurn(one, { p0: { kind: 'attack', target: 'e0' } }, seqRng(0.5));
    expect(attacks(last.events, 'p0')).toHaveLength(1);
    expect(last.events.some((e) => e.type === 'again')).toBe(false);
    expect(last.state.outcome).toBe('victory');
  });

  it('影分身の秘伝書は技（手裏剣）を 2 回にしない', () => {
    const b = createBattle([createMember('kasumi', 20, { accessory: 'kagebunshin' })], 'm', ['yamainu'], 1);
    b.combatants[1]!.hp = 9999;
    const events = resolveTurn(b, { p0: { kind: 'skill', skill: 'shuriken', target: 'e0' } }, seededRng(4)).events;
    expect(events.some((e) => e.type === 'again')).toBe(false);
  });

  it('木霊の数珠を付けると、術がもう一度発動し、気力は 1 回分だけ減る', () => {
    const orin = (accessory?: string) => {
      const b = createBattle([createMember('orin', 10, { accessory })], 'm', ['yamainu'], 1);
      b.combatants[1]!.hp = 9999;
      return b;
    };
    const cast = (b: BattleState) => resolveTurn(b, { p0: { kind: 'skill', skill: 'neraiuchi', target: 'e0' } }, seededRng(5));
    const damages = (events: BattleEvent[]) => events.filter((e) => e.type === 'damage' && e.target === 'e0');
    const echoed = orin('kodamaJuzu');
    const r = cast(echoed);
    expect(damages(r.events)).toHaveLength(2);
    expect(r.events.filter((e) => e.type === 'skill')).toHaveLength(1);
    expect(r.events).toContainEqual({ type: 'again', actor: 'p0', equip: 'kodamaJuzu', trait: 'doubleCast' });
    expect(r.state.combatants[0]!.mp).toBe(echoed.combatants[0]!.mp - 3);
    expect(damages(cast(orin()).events)).toHaveLength(1);
  });

  it('木霊の数珠で回復の術も 2 回効く。状態異常の術や、戦いが決まった後には発動しない', () => {
    const party = [createMember('gendo', 10, { accessory: 'kodamaJuzu' }), createMember('hero', 10)];
    const b = createBattle(party, 'm', ['yamainu'], 1);
    // 1 回目で満タンにならないよう、体力の上限を大きくする
    b.combatants[1]!.stats = { ...b.combatants[1]!.stats, maxHp: 9999 };
    b.combatants[1]!.hp = 1;
    b.combatants[2]!.hp = 9999;
    // 敵が眠っていて、主人公が先に倒されることはない
    b.combatants[2]!.status = { sleep: 3 };
    const healed = resolveTurn(b, { p0: { kind: 'skill', skill: 'yakushi', target: 'p1' }, p1: { kind: 'guard' } }, seededRng(6));
    const heals = healed.events.flatMap((e) => (e.type === 'heal' && e.target === 'p1' ? [e.amount] : []));
    expect(heals).toHaveLength(2);
    expect(heals.every((n) => n > 0)).toBe(true);
    expect(healed.state.combatants[1]!.hp).toBe(1 + heals[0]! + heals[1]!);

    // 1 回目が効かない（倒れた味方への回復）ときは、もう一度は発動しない
    const fallen = createBattle(party, 'm', ['yamainu'], 1);
    fallen.combatants[1]!.hp = 0;
    fallen.combatants[2]!.status = { sleep: 3 };
    const none = resolveTurn(fallen, { p0: { kind: 'skill', skill: 'yakushi', target: 'p1' } }, seededRng(6)).events;
    expect(none.some((e) => e.type === 'again')).toBe(false);

    const sleepy = createBattle([createMember('kasumi', 20, { accessory: 'kodamaJuzu' })], 'm', ['yamainu'], 1);
    const smoke = resolveTurn(sleepy, { p0: { kind: 'skill', skill: 'kemuridama' } }, seededRng(7)).events;
    expect(smoke.some((e) => e.type === 'again')).toBe(false);

    const weak = createBattle([createMember('orin', 10, { accessory: 'kodamaJuzu' })], 'm', ['onibi'], 1);
    weak.combatants[1]!.hp = 1;
    const won = resolveTurn(weak, { p0: { kind: 'skill', skill: 'neraiuchi', target: 'e0' } }, seededRng(8));
    expect(won.state.outcome).toBe('victory');
    expect(won.events.some((e) => e.type === 'again')).toBe(false);
  });

  it('木霊の数珠の単体の術は、1 回目で狙いが倒れたら 2 回目は別の敵を狙う', () => {
    const b = createBattle([createMember('orin', 10, { accessory: 'kodamaJuzu' })], 'm', ['onibi', 'onibi'], 1);
    b.combatants[1]!.hp = 1;
    b.combatants[2]!.hp = 9999;
    const events = resolveTurn(b, { p0: { kind: 'skill', skill: 'neraiuchi', target: 'e0' } }, seededRng(9)).events;
    expect(events.flatMap((e) => (e.type === 'damage' ? [e.target] : []))).toEqual(['e0', 'e1']);
  });

  it('混乱した霞は、影分身の秘伝書を付けていても 1 回しか攻撃しない', () => {
    const b = createBattle([createMember('kasumi', 20, { accessory: 'kagebunshin' })], 'm', ['yamainu'], 1);
    b.combatants[0]!.status = { confusion: 3 };
    b.combatants[1]!.hp = 9999;
    const events = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seededRng(10)).events;
    expect(events.some((e) => e.type === 'again')).toBe(false);
  });

  it('韋駄天の守りは素早さを大きく上げる', () => {
    const bare = createBattle([createMember('orin', 10, {})], 'm', ['onibi'], 1).combatants[0]!.stats.spd;
    const fast = createBattle([createMember('orin', 10, { accessory: 'idatenMamori' })], 'm', ['onibi'], 1).combatants[0]!.stats.spd;
    expect(fast - bare).toBe(30);
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
    // 敵 Lv7 の経験値は奇数なので、倍率と半分にする順で値が変わる
    expect(Math.floor((enemyExp(7) * 3) / 2)).not.toBe(Math.floor(enemyExp(7) / 2) * 3);
    const b = createBattle([createMember('hero', 7), createMember('kasumi', 11)], 'm', ['yako', 'onibi'], 7);
    expect(computeRewards(b)).toEqual({
      // Lv11 の霞は敵（Lv7）より 4 高いので半分
      exp: { p0: enemyExp(7) * 3 + enemyExp(7), p1: Math.floor((enemyExp(7) * 3) / 2) + Math.floor(enemyExp(7) / 2) },
      money: enemyMoney(7) * 3 + enemyMoney(7),
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

describe('敵が仲間を呼ぶ（鉄瓶のからくり兵を呼ぶ）', () => {
  // 鉄瓶の行動の重みは 通常攻撃 3・鉄拳 2・蒸気 2・からくり兵を呼ぶ 1（合計 8）。乱数 0.9 なら 7.2 で呼ぶを選ぶ
  const party = () => [createMember('hero', 6), createMember('kasumi', 6)];
  const guard = { p0: { kind: 'guard' as const }, p1: { kind: 'guard' as const } };

  it('からくり人形を Lv4 で呼び、呼ばれた敵はそのターンには動かない', () => {
    const b = createBattle(party(), 'm', ['tetsubin'], 7, { canEscape: false });
    const { state, events } = resolveTurn(b, guard, seqRng(0.9));
    const added = state.combatants.find((c) => c.key === 'e1');
    expect(added).toMatchObject({ side: 'enemy', enemyId: 'karakuriNingyo', level: 4, name: 'からくり人形 甲', summoned: true });
    expect(events).toContainEqual({ type: 'summon', actor: 'e0', target: 'e1' });
    expect(events.some((e) => 'actor' in e && e.actor === 'e1')).toBe(false);
    // 引数の状態は変わらない
    expect(b.combatants).toHaveLength(3);
  });

  it('呼んだ敵が 2 体生きていれば、呼ぶ代わりに通常攻撃をする。倒れていればまた呼ぶ', () => {
    let b = createBattle(party(), 'm', ['tetsubin'], 7, { canEscape: false });
    b = resolveTurn(b, guard, seqRng(0.9)).state;
    b = resolveTurn(b, guard, seqRng(0.9)).state;
    expect(b.combatants.filter((c) => c.summoned).map((c) => c.name)).toEqual(['からくり人形 甲', 'からくり人形 乙']);
    // 呼ばれたからくり人形は通常攻撃だけ。鉄瓶は呼べないので通常攻撃
    const full = resolveTurn(b, guard, seqRng(0.9));
    expect(full.events.filter((e) => e.type === 'summon')).toHaveLength(0);
    expect(full.events.filter((e) => e.type === 'attack' && e.actor === 'e0')).toHaveLength(1);
    // 1 体倒れていれば、また呼ぶ（名前は 3 体目の「丙」）
    const fallen = { ...full.state, combatants: full.state.combatants.map((c) => (c.key === 'e1' ? { ...c, hp: 0 } : c)) };
    const again = resolveTurn(fallen, guard, seqRng(0.9));
    expect(again.events).toContainEqual({ type: 'summon', actor: 'e0', target: 'e3' });
    expect(again.state.combatants.find((c) => c.key === 'e3')?.name).toBe('からくり人形 丙');
  });

  it('呼ばれた敵は倒しても経験値・お金にならない', () => {
    let b = createBattle(party(), 'm', ['tetsubin'], 7, { canEscape: false });
    b = resolveTurn(b, guard, seqRng(0.9)).state;
    expect(b.combatants.some((c) => c.summoned)).toBe(true);
    expect(computeRewards(b)).toEqual({ exp: { p0: enemyExp(7) * 5, p1: enemyExp(7) * 5 }, money: enemyMoney(7) * 5 });
  });
});
