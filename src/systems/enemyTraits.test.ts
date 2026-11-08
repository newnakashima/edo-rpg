// 雑魚敵の個性（docs/balance.md の「雑魚敵の個性」）: 無駄な行動・逃げる・自爆・HP が減ったときの行動・命中・回避・報酬の倍率。
import { afterEach, describe, expect, it } from 'vitest';
import { computeRewards, createBattle, isAlive, resolveTurn, victoryText, type BattleState, type Combatant, type Command } from './battle';
import { missChance, MISS_CHANCE_CAP } from './combat';
import { ENCOUNTERS, ENEMIES, type EnemyDef } from '../data/enemies';
import { SKILLS } from '../data/skills';
import { createMember } from './party';
import { enemyExp, enemyMoney } from './stats';
import { seededRng } from './testUtils';

function get(state: BattleState, key: string): Combatant {
  const c = state.combatants.find((x) => x.key === key);
  if (!c) throw new Error(key);
  return c;
}

const added: string[] = [];

/** 試験用の敵を足す（テストの後で消す）。 */
function testEnemy(id: string, def: Partial<EnemyDef>): string {
  ENEMIES[id] = { id, name: id, color: 0, factors: { hp: 1, atk: 1, def: 1, spd: 1 }, ...def };
  added.push(id);
  return id;
}

afterEach(() => {
  for (const id of added.splice(0)) delete ENEMIES[id];
});

const guardAll = (state: BattleState): Record<string, Command> =>
  Object.fromEntries(state.combatants.filter((c) => c.side === 'party' && isAlive(c)).map((c) => [c.key, { kind: 'guard' } as Command]));

describe('無駄な行動', () => {
  it('idle の技は何もせず、idle のイベントだけを出す', () => {
    const id = testEnemy('testIdle', { actions: [{ skill: 'akubi', weight: 1 }] });
    const b = createBattle([createMember('hero', 10)], 'm', [id], 10);
    const r = resolveTurn(b, guardAll(b), seededRng(1));
    expect(r.events).toContainEqual({ type: 'idle', actor: 'e0', skill: 'akubi' });
    expect(r.events.some((e) => e.type === 'skill' || e.type === 'attack' || e.type === 'damage')).toBe(false);
    expect(get(r.state, 'p0').hp).toBe(get(b, 'p0').hp);
  });
});

describe('逃げる敵', () => {
  it('逃げた敵は戦闘から外れ、残りがいなければ勝ちになるが、経験値・お金にならない', () => {
    const id = testEnemy('testFlee', { actions: [{ skill: 'nigeru', weight: 1 }] });
    const b = createBattle([createMember('hero', 10)], 'm', [id], 10);
    const r = resolveTurn(b, guardAll(b), seededRng(1));
    expect(r.events).toContainEqual({ type: 'fled', actor: 'e0' });
    expect(get(r.state, 'e0').fled).toBe(true);
    expect(isAlive(get(r.state, 'e0'))).toBe(false);
    expect(r.state.outcome).toBe('victory');
    const rewards = computeRewards(r.state);
    expect(rewards).toEqual({ exp: { p0: 0 }, money: 0 });
    expect(victoryText(r.state, 0, 0)).toBe('敵はみな逃げていった。');
  });

  it('ほかの敵を倒していれば、倒した分だけ経験値・お金になり、「退けた」と出す', () => {
    const id = testEnemy('testFlee', { actions: [{ skill: 'nigeru', weight: 1 }] });
    const b = createBattle([createMember('hero', 10)], 'm', [id, 'onibi'], 10);
    get(b, 'e1').hp = 0;
    const r = resolveTurn(b, guardAll(b), seededRng(1));
    expect(r.state.outcome).toBe('victory');
    expect(computeRewards(r.state).money).toBe(enemyMoney(10));
    expect(victoryText(r.state, 5, 10)).toBe('敵を退けた！\n経験値 5 と 10 文を手に入れた。');
  });

  it('逃げられない戦闘（イベントの戦闘）では、逃げる代わりに通常攻撃をする', () => {
    const id = testEnemy('testFlee', { actions: [{ skill: 'nigeru', weight: 1 }] });
    const b = createBattle([createMember('hero', 10)], 'm', [id], 10, { canEscape: false });
    const r = resolveTurn(b, guardAll(b), seededRng(1));
    expect(r.events.some((e) => e.type === 'fled')).toBe(false);
    expect(r.events.some((e) => (e.type === 'attack' || e.type === 'miss') && 'target' in e && e.target === 'p0')).toBe(true);
    expect(r.state.outcome).toBe('ongoing');
  });

  it('逃げた敵は狙われず、行動もしない', () => {
    const id = testEnemy('testFlee', { actions: [{ skill: 'nigeru', weight: 1 }] });
    const b = createBattle([createMember('hero', 30)], 'm', [id, 'ogaeru'], 1);
    get(b, 'e0').fled = true;
    get(b, 'e1').status.sleep = 99;
    const r = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, seededRng(2));
    expect(r.events.filter((e) => 'target' in e && e.target === 'e0')).toEqual([]);
    expect(r.events.filter((e) => 'actor' in e && e.actor === 'e0')).toEqual([]);
  });
});

describe('自爆', () => {
  it('相手の全員に防御を無視したダメージを与え、自分は倒れる。倒したのと同じく経験値・お金になる', () => {
    const id = testEnemy('testBomb', { actions: [{ skill: 'kayakuBakuhatsu', weight: 1 }] });
    const party = [createMember('hero', 30), createMember('gendo', 30)];
    const b = createBattle(party, 'm', [id, 'ogaeru'], 10);
    get(b, 'e1').status.sleep = 99;
    const r = resolveTurn(b, guardAll(b), seededRng(3));
    expect(r.events).toContainEqual({ type: 'skill', actor: 'e0', skill: 'kayakuBakuhatsu' });
    const hits = r.events.filter((e) => e.type === 'damage').map((e) => (e.type === 'damage' ? e.target : ''));
    expect(hits.sort()).toEqual(['p0', 'p1']);
    expect(r.events).toContainEqual({ type: 'exploded', actor: 'e0' });
    expect(r.events.some((e) => e.type === 'defeated' && e.target === 'e0')).toBe(false);
    expect(get(r.state, 'e0').hp).toBe(0);
    // 防御を無視する: 攻撃 × 1.5 の ±12.5%、防御で半分
    const atk = get(b, 'e0').stats.atk;
    for (const e of r.events) {
      if (e.type !== 'damage') continue;
      expect(e.damage).toBeGreaterThanOrEqual(Math.floor((atk * 1.5 * 0.875) / 2) - 1);
      expect(e.damage).toBeLessThanOrEqual(Math.ceil((atk * 1.5 * 1.125) / 2) + 1);
    }
    get(r.state, 'e1').hp = 0;
    expect(computeRewards(r.state).money).toBe(enemyMoney(10) * 2);
  });

  it('自爆で味方が全員倒れたら、敵も残っていなくても負けになる', () => {
    const id = testEnemy('testBomb', { factors: { hp: 1, atk: 30, def: 1, spd: 1 }, actions: [{ skill: 'kayakuBakuhatsu', weight: 1 }] });
    const b = createBattle([createMember('hero', 3)], 'm', [id], 10);
    const r = resolveTurn(b, guardAll(b), seededRng(3));
    expect(get(r.state, 'p0').hp).toBe(0);
    expect(get(r.state, 'e0').hp).toBe(0);
    expect(r.state.outcome).toBe('defeat');
  });
});

describe('HP が減ったときの行動（whenHpBelow）', () => {
  it('からくり俵は HP が半分以上なら自爆せず、半分を切ると自爆することがある', () => {
    const full = createBattle([createMember('hero', 40)], 'm', ['karakuriTawara'], 16);
    const rng = seededRng(5);
    for (let i = 0; i < 100; i++) {
      const r = resolveTurn(full, guardAll(full), rng);
      expect(r.events.some((e) => e.type === 'exploded')).toBe(false);
    }
    const low = createBattle([createMember('hero', 40)], 'm', ['karakuriTawara'], 16);
    get(low, 'e0').hp = Math.floor(get(low, 'e0').stats.maxHp / 2) - 1;
    let exploded = 0;
    for (let i = 0; i < 100; i++) if (resolveTurn(low, guardAll(low), rng).events.some((e) => e.type === 'exploded')) exploded++;
    // 重みは自爆 6 : ほか 4
    expect(exploded).toBeGreaterThan(45);
    expect(exploded).toBeLessThan(75);
  });

  it('HP がちょうど半分のときは自爆しない（半分を「切った」ときだけ）', () => {
    const b = createBattle([createMember('hero', 40)], 'm', ['karakuriTawara'], 16);
    const e = get(b, 'e0');
    e.stats = { ...e.stats, maxHp: 100 };
    e.hp = 50;
    const rng = seededRng(6);
    for (let i = 0; i < 100; i++) expect(resolveTurn(b, guardAll(b), rng).events.some((x) => x.type === 'exploded')).toBe(false);
    e.hp = 49;
    let exploded = 0;
    for (let i = 0; i < 100; i++) if (resolveTurn(b, guardAll(b), rng).events.some((x) => x.type === 'exploded')) exploded++;
    expect(exploded).toBeGreaterThan(0);
  });
});

describe('仲間を呼ぶ敵', () => {
  it('化け鼠は行動の半分以上で仲間を呼ぶ', () => {
    const b = createBattle([createMember('hero', 40)], 'm', ['bakeNezumi'], 16);
    const rng = seededRng(11);
    let summoned = 0;
    const n = 500;
    for (let i = 0; i < n; i++) if (resolveTurn(b, guardAll(b), rng).events.some((e) => e.type === 'summon')) summoned++;
    // 重みは 4/7
    expect(summoned / n).toBeGreaterThan(0.5);
    expect(summoned / n).toBeLessThan(0.65);
  });

  it('送り狼は行動の約半分で仲間を呼び、呼んだ送り狼が 1 体生きていれば呼ばない', () => {
    const b = createBattle([createMember('hero', 50)], 'm', ['okuriOkami'], 25);
    const rng = seededRng(16);
    let summoned = 0;
    const n = 500;
    for (let i = 0; i < n; i++) if (resolveTurn(b, guardAll(b), rng).events.some((e) => e.type === 'summon')) summoned++;
    // 重みは 3/6
    expect(summoned / n).toBeGreaterThan(0.42);
    expect(summoned / n).toBeLessThan(0.58);
    let state = b;
    for (let i = 0; i < 100 && !state.combatants.some((c) => c.summoned); i++) state = resolveTurn(state, guardAll(state), rng).state;
    expect(state.combatants.filter((c) => c.summoned)).toHaveLength(1);
    for (const c of state.combatants) if (c.key !== 'e0' && c.side === 'enemy') c.status.sleep = 99;
    for (let i = 0; i < 100; i++) {
      const r = resolveTurn(state, guardAll(state), rng);
      expect(r.events.some((e) => e.type === 'summon')).toBe(false);
    }
  });

  it('敵が 4 体残っていれば、呼ぶ代わりに通常攻撃をする', () => {
    const id = testEnemy('testCaller', { actions: [{ skill: 'nezumiYobi', weight: 1 }] });
    const b = createBattle([createMember('hero', 40)], 'm', [id, 'ogaeru', 'ogaeru', 'ogaeru'], 16);
    for (const key of ['e1', 'e2', 'e3']) get(b, key).status.sleep = 99;
    const r = resolveTurn(b, guardAll(b), seededRng(12));
    expect(r.events.some((e) => e.type === 'summon')).toBe(false);
    expect(r.events.some((e) => (e.type === 'attack' || e.type === 'miss') && 'target' in e && e.target === 'p0')).toBe(true);
  });

  it('逃げた敵がいても、呼ばれた敵の key は重ならない', () => {
    const id = testEnemy('testCaller', { actions: [{ skill: 'nezumiYobi', weight: 1 }] });
    const b = createBattle([createMember('hero', 40)], 'm', [id, 'ogaeru'], 16);
    get(b, 'e1').fled = true;
    const r = resolveTurn(b, guardAll(b), seededRng(12));
    expect(r.events).toContainEqual({ type: 'summon', actor: 'e0', target: 'e2' });
    expect(new Set(r.state.combatants.map((c) => c.key)).size).toBe(r.state.combatants.length);
  });
});

describe('支え役の技', () => {
  /** 敵がその技を使ったターンのイベント（味方は防御だけ）。 */
  function used(skill: string, allies: string[] = []) {
    const id = testEnemy('testSupport', { actions: [{ skill, weight: 1 }] });
    const b = createBattle([createMember('hero', 25), createMember('gendo', 25)], 'm', [id, ...allies], 22);
    for (const c of b.combatants) if (c.side === 'enemy' && c.key !== 'e0') c.status.sleep = 99;
    return resolveTurn(b, guardAll(b), seededRng(13)).events;
  }

  it('眠りの経・縛りの呪は味方に状態異常をかけようとする', () => {
    const sleep = used('nemuriNoKyo').filter((e) => e.type === 'status' || e.type === 'statusFailed');
    expect(sleep.map((e) => ('target' in e ? e.target : '')).sort()).toEqual(['p0', 'p1']);
    for (const e of sleep) expect(e).toMatchObject({ status: 'sleep' });
    const bind = used('shibariNoJu').filter((e) => e.type === 'status' || e.type === 'statusFailed');
    expect(bind).toHaveLength(1);
    expect(bind[0]).toMatchObject({ status: 'paralysis' });
  });

  it('読経・雪化粧は敵の仲間全員に必ず防御↑・回避↑ をかける', () => {
    for (const [skill, status] of [['dokyo', 'defUp'], ['yukiGomori', 'evade']] as const) {
      const events = used(skill, ['ogaeru']).filter((e) => e.type === 'status');
      expect(events.map((e) => ('target' in e ? e.target : '')).sort(), skill).toEqual(['e0', 'e1']);
      for (const e of events) expect(e).toMatchObject({ status });
    }
  });
});

describe('同時に倒れたとき', () => {
  it('ターンの終わりの毒で敵味方が同時に倒れたら負けになる', () => {
    const b = createBattle([createMember('hero', 10)], 'm', ['ogaeru'], 10);
    for (const c of b.combatants) {
      c.hp = 1;
      c.status.poison = 99;
    }
    get(b, 'e0').status.sleep = 99;
    const r = resolveTurn(b, { p0: { kind: 'guard' } }, seededRng(14));
    expect(get(r.state, 'p0').hp).toBe(0);
    expect(get(r.state, 'e0').hp).toBe(0);
    expect(r.state.outcome).toBe('defeat');
  });

  it('1 ターンに 2 回動く敵が 1 回目で逃げたら、2 回目は動かない', () => {
    const id = testEnemy('testFlee', { actionsPerTurn: 2, actions: [{ skill: 'nigeru', weight: 1 }] });
    const b = createBattle([createMember('hero', 10)], 'm', [id, 'ogaeru'], 10);
    get(b, 'e1').status.sleep = 99;
    const r = resolveTurn(b, guardAll(b), seededRng(15));
    expect(r.events.filter((e) => 'actor' in e && e.actor === 'e0')).toEqual([{ type: 'fled', actor: 'e0' }]);
  });
});

describe('命中の低い敵・回避の高い敵', () => {
  it('外れる確率は、命中↓・回避↑（上限 70%）に生まれつきの値を足し、85% までにする', () => {
    expect(missChance(false, false, 0.35)).toBe(0.35);
    expect(missChance(true, false, 0.35)).toBeCloseTo(0.7);
    expect(missChance(true, true, 0.5)).toBe(MISS_CHANCE_CAP);
    expect(missChance(false, false)).toBe(0);
  });

  it('missRate の敵の通常攻撃は、その割合ほど外れる', () => {
    const id = testEnemy('testWild', { missRate: 0.35 });
    const b = createBattle([createMember('hero', 30)], 'm', [id], 10);
    const rng = seededRng(7);
    let miss = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) if (resolveTurn(b, guardAll(b), rng).events.some((e) => e.type === 'miss')) miss++;
    expect(miss / n).toBeGreaterThan(0.3);
    expect(miss / n).toBeLessThan(0.4);
  });

  it('missRate は物理の技にも効く', () => {
    const id = testEnemy('testWild', { missRate: 0.35, actions: [{ skill: 'kanabo', weight: 1 }] });
    const b = createBattle([createMember('hero', 30)], 'm', [id], 10);
    const rng = seededRng(9);
    let miss = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) if (resolveTurn(b, guardAll(b), rng).events.some((e) => e.type === 'miss')) miss++;
    expect(miss / n).toBeGreaterThan(0.3);
    expect(miss / n).toBeLessThan(0.4);
  });

  it('evasion の敵は、味方の通常攻撃をその割合ほどかわすが、術はかわせない', () => {
    // 敵は何もしない（あくびだけ）
    const id = testEnemy('testDodge', { evasion: 0.5, actions: [{ skill: 'akubi', weight: 1 }] });
    const b = createBattle([createMember('orin', 30)], 'm', [id], 10);
    const rng = seededRng(8);
    let miss = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) if (resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, rng).events.some((e) => e.type === 'miss')) miss++;
    expect(miss / n).toBeGreaterThan(0.45);
    expect(miss / n).toBeLessThan(0.55);
    for (let i = 0; i < 50; i++) {
      const r = resolveTurn(b, { p0: { kind: 'skill', skill: 'neraiuchi', target: 'e0' } }, rng);
      expect(r.events.some((e) => e.type === 'miss')).toBe(false);
    }
  });

  it('眠り・麻痺・影縫いで動けない敵はかわせない', () => {
    const id = testEnemy('testDodge', { evasion: 0.5, actions: [{ skill: 'akubi', weight: 1 }] });
    const rng = seededRng(10);
    for (const status of ['sleep', 'paralysis', 'bind'] as const) {
      const b = createBattle([createMember('hero', 30)], 'm', [id], 10);
      get(b, 'e0').status[status] = 9;
      for (let i = 0; i < 100; i++) {
        const r = resolveTurn(b, { p0: { kind: 'attack', target: 'e0' } }, rng);
        expect(r.events.some((e) => e.type === 'miss'), status).toBe(false);
      }
    }
  });
});

describe('逃げる高報酬の敵の報酬', () => {
  it('reward の倍率を経験値とお金に掛ける', () => {
    const b = createBattle([createMember('hero', 22)], 'm', ['kinpakuNingyo'], 22);
    get(b, 'e0').hp = 0;
    const r = computeRewards(b);
    expect(r.money).toBe(Math.round(enemyMoney(22) * 8));
    expect(r.exp.p0).toBe(Math.round(enemyExp(22) * 5));
  });
});

describe('雑魚敵の個性のデータ', () => {
  const tablesOf = (pred: (level: number) => boolean) =>
    new Set(
      Object.values(ENCOUNTERS)
        .filter((t) => pred(t.level))
        .flatMap((t) => t.groups.flatMap((g) => g.members)),
    );
  const mid = [...tablesOf((l) => l >= 10)].map((id) => ENEMIES[id]!);
  const early = [...tablesOf((l) => l < 10)].map((id) => ENEMIES[id]!);
  const share = (e: EnemyDef, pred: (skill: string) => boolean) => {
    const actions = e.actions ?? [];
    const total = actions.reduce((s, a) => s + a.weight, 0);
    return total === 0 ? 0 : actions.filter((a) => pred(a.skill)).reduce((s, a) => s + a.weight, 0) / total;
  };
  const kind = (skill: string) => SKILLS[skill]?.effect.kind;

  it('中盤（京）以降の出現表に、goal の個性がそろっている', () => {
    // 体力が非常に多い・防御が非常に高い・体力が極めて少なく回避が高い
    expect(mid.filter((e) => e.factors.hp >= 2.2).length).toBeGreaterThanOrEqual(3);
    expect(mid.filter((e) => e.factors.def >= 2.4).length).toBeGreaterThanOrEqual(3);
    expect(mid.filter((e) => (e.evasion ?? 0) >= 0.4 && e.factors.hp <= 0.5).length).toBeGreaterThanOrEqual(3);
    // 攻撃が非常に高いが、命中が低く無駄な行動をする
    expect(mid.filter((e) => e.factors.atk >= 1.8 && (e.missRate ?? 0) > 0 && share(e, (s) => kind(s) === 'idle') > 0).length).toBeGreaterThanOrEqual(2);
    // 防御と素早さが高く、すぐ逃げるが、倒せば報酬が多い
    expect(
      mid.filter((e) => e.factors.def >= 2 && e.factors.spd >= 1.8 && share(e, (s) => kind(s) === 'flee') > 0 && (e.reward?.exp ?? 1) > 1).length,
    ).toBeGreaterThanOrEqual(2);
    // 仲間を呼ぶ行動が非常に多い
    expect(mid.filter((e) => share(e, (s) => kind(s) === 'summon') >= 0.5).length).toBeGreaterThanOrEqual(2);
    // 状態変化を繰り返すサポート役
    expect(mid.filter((e) => share(e, (s) => kind(s) === 'status') >= 0.6).length).toBeGreaterThanOrEqual(2);
    // 自爆
    expect(mid.filter((e) => share(e, (s) => kind(s) === 'selfDestruct') > 0).length).toBeGreaterThanOrEqual(2);
  });

  it('序盤（序章〜第 2 章）の敵には極端な耐久・命中・回避・逃走・自爆を付けない（2 回で倒せるまま）', () => {
    for (const e of early) {
      expect(e.factors.hp, e.id).toBeLessThanOrEqual(1.5);
      expect(e.factors.def, e.id).toBeLessThanOrEqual(1.5);
      expect(e.evasion, e.id).toBeUndefined();
      expect(e.missRate, e.id).toBeUndefined();
      expect(e.reward, e.id).toBeUndefined();
      expect(share(e, (s) => kind(s) === 'flee' || kind(s) === 'selfDestruct'), e.id).toBe(0);
    }
  });

  it('無駄な行動・逃げる・自爆の技は、どれも敵の行動に使われている', () => {
    const enemyOnly = Object.values(SKILLS).filter((s) => ['idle', 'flee', 'selfDestruct'].includes(s.effect.kind));
    expect(enemyOnly.length).toBeGreaterThan(0);
    const used = new Set(Object.values(ENEMIES).flatMap((e) => (e.actions ?? []).map((a) => a.skill)));
    for (const s of enemyOnly) expect(used.has(s.id), s.id).toBe(true);
  });
});
