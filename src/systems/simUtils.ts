// 模擬戦の共通部分（テスト専用）。docs/balance.md の「ボス」「通しの確かめ」の勝率を測る bossSim.test.ts・progressionSim.test.ts が使う。
// 味方は店で最も良い装備を付け、気力の続くかぎり最もダメージの大きい攻撃の技を使い（skills）、回復の技を持つ仲間は体力の減った仲間を回復する。
// 道具・状態異常の技・防御は使わず、装備も店の品だけなので、実際の戦闘より少し厳しい。
import { createBattle, isAlive, resolveTurn, type Combatant, type Command } from './battle';
import type { CharacterId } from '../data/characters';
import { EQUIPMENT, EQUIP_SLOTS, STARTING_EQUIPMENT, canEquip, type Equipped } from '../data/equipment';
import { SHOPS } from '../data/shops';
import { SKILLS } from '../data/skills';
import type { PartyMember } from './party';
import { growthFactor } from './stats';
import { seededRng } from './testUtils';

/** 装備の良さ（能力値の合計。体力は 1/4 に数える）。 */
function score(id: string): number {
  const b = EQUIPMENT[id]?.bonus ?? {};
  return (b.atk ?? 0) + (b.def ?? 0) + (b.mag ?? 0) + (b.spd ?? 0) + (b.luck ?? 0) + (b.maxHp ?? 0) / 4 + (b.maxMp ?? 0) / 4;
}

/** 店の品から、枠ごとに最も良い装備を選ぶ（初期装備より悪ければ初期装備のまま）。 */
export function bestEquip(id: CharacterId, shops: string[]): Equipped {
  const goods = shops.flatMap((s) => SHOPS[s]?.goods ?? []);
  const equip: Equipped = { ...STARTING_EQUIPMENT[id] };
  if (id === 'hyogo') return equip;
  for (const slot of EQUIP_SLOTS) {
    for (const g of goods) {
      const def = EQUIPMENT[g];
      if (!def || def.slot !== slot || !canEquip(id, g)) continue;
      const cur = equip[slot];
      if (!cur || score(g) > score(cur)) equip[slot] = g;
    }
  }
  return equip;
}

function healSkills(c: Combatant): string[] {
  return c.skills.filter((s) => SKILLS[s]?.effect.kind === 'heal' && (SKILLS[s]?.target === 'ally' || SKILLS[s]?.target === 'allAllies'));
}

/** 味方の戦い方。attack は通常攻撃だけ、skills は気力の続くかぎり最もダメージの大きい攻撃の技を使う。どちらも回復の技は使う。 */
export type Policy = 'attack' | 'skills';

/**
 * 技のダメージの見積もり（docs/balance.md の「戦闘計算」。乱数・会心・命中・回避・相手の防御↑は見ない）。通常攻撃は 'attack'。
 * foes を渡すと、敵全体の技は生きている敵の数だけ掛ける（雑魚敵の組を相手にするとき）。
 */
function estimate(c: Combatant, skill: string, foe: Combatant, foes?: number): number {
  const physical = (mult: number, ignoreDefense = false) => Math.max(1, c.stats.atk - (ignoreDefense ? 0 : foe.stats.def / 2)) * mult;
  if (skill === 'attack') return physical(1);
  const def = SKILLS[skill];
  if (!def) return 0;
  const element = def.elements ?? [];
  const elementRate = element.some((e) => foe.weak.includes(e)) ? 1.5 : element.some((e) => foe.resist.includes(e)) ? 0.5 : 1;
  const spread = foes !== undefined && def.target === 'allEnemies' ? foes : 1;
  const e = def.effect;
  if (e.kind === 'physical') {
    // 半々で空振りする丁半博打は使わない
    if (e.gamble) return 0;
    const hits = ((e.hits ?? 1) + (e.maxHits ?? e.hits ?? 1)) / 2;
    // ランダムに当てる技は、狙いに当たるとは限らないが、ほかに敵がいなければすべて狙いに当たる
    return physical(e.multiplier, e.ignoreDefense) * hits * elementRate * spread;
  }
  if (e.kind === 'magic') {
    const per = Math.max(1, e.power * growthFactor(c.level) + c.stats.mag * 1.2 - (e.ignoreDefense ? 0 : foe.stats.def / 4));
    return per * (e.hits ?? 1) * elementRate * spread;
  }
  return 0;
}

/**
 * 回復の技を持つ仲間は、体力が 4 割を切った仲間がいれば回復する（2 人以上なら全体の回復）。
 * ほかは focus の敵（いなければ先頭の敵）を狙う。skills では、通常攻撃より大きいと見積もった攻撃の技を気力の続くかぎり使う
 * （回復の技を持つ仲間は、気力を最大の 4 割は残す）。spread なら、敵全体の技は生きている敵の数だけ高く見積もる。
 */
function commandsFor(combatants: Combatant[], policy: Policy, focus: string | undefined, spread: boolean): Record<string, Command> {
  const allies = combatants.filter((c) => c.side === 'party' && isAlive(c));
  const foes = combatants.filter((c) => c.side === 'enemy' && isAlive(c));
  const foe = foes.find((c) => c.enemyId === focus) ?? foes[0];
  const commands: Record<string, Command> = {};
  let healed = false;
  for (const c of allies) {
    const heals = healSkills(c);
    const low = allies.filter((a) => a.hp < a.stats.maxHp * 0.4).sort((a, b) => a.hp / a.stats.maxHp - b.hp / b.stats.maxHp);
    if (!healed && low.length > 0) {
      const usable = heals.filter((s) => (SKILLS[s]?.mp ?? 0) <= c.mp);
      const all = usable.find((s) => SKILLS[s]?.target === 'allAllies');
      const single = usable.find((s) => SKILLS[s]?.target === 'ally');
      const skill = low.length >= 2 && all ? all : (single ?? all);
      if (skill) {
        commands[c.key] = { kind: 'skill', skill, target: low[0]!.key };
        healed = true;
        continue;
      }
    }
    if (!foe) continue;
    let best = 'attack';
    if (policy === 'skills') {
      const reserve = heals.length > 0 ? c.stats.maxMp * 0.4 : 0;
      const n = spread ? foes.length : undefined;
      for (const s of c.skills) {
        if ((SKILLS[s]?.mp ?? 0) > c.mp - reserve) continue;
        if (estimate(c, s, foe, n) > estimate(c, best, foe, n)) best = s;
      }
    }
    commands[c.key] = best === 'attack' ? { kind: 'attack', target: foe.key } : { kind: 'skill', skill: best, target: foe.key };
  }
  return commands;
}

export interface SimResult {
  win: number;
  /** 勝った戦闘の、味方の HP の減り（最大 HP の合計に対する割合）の平均。 */
  hpLoss: number;
  /** 勝った戦闘のターン数の平均。 */
  turns: number;
}

export interface SimOptions {
  enemies: string[];
  level: number;
  policy: Policy;
  runs: number;
  /** 狙う敵の種族（ボス）。なければ先頭の敵を狙う。 */
  focus?: string;
  /** 敵全体の技を、生きている敵の数だけ高く見積もる（雑魚敵の組）。 */
  spread?: boolean;
  canEscape?: boolean;
  seed?: number;
}

/** 同じ味方・同じ敵で runs 回戦い、勝率・HP の減り・ターン数を求める。 */
export function simulateBattle(party: PartyMember[], o: SimOptions): SimResult {
  const rng = seededRng(o.seed ?? 7);
  let win = 0;
  let hpLoss = 0;
  let turns = 0;
  for (let k = 0; k < o.runs; k++) {
    let b = createBattle(party, 'm', o.enemies, o.level, { canEscape: o.canEscape ?? false });
    let t = 0;
    while (b.outcome === 'ongoing' && t < 60) {
      b = resolveTurn(b, commandsFor(b.combatants, o.policy, o.focus, o.spread ?? false), rng).state;
      t++;
    }
    if (b.outcome !== 'victory') continue;
    win++;
    const members = b.combatants.filter((c) => c.side === 'party');
    hpLoss += 1 - members.reduce((s, c) => s + c.hp, 0) / members.reduce((s, c) => s + c.stats.maxHp, 0);
    turns += t;
  }
  return { win: win / o.runs, hpLoss: hpLoss / Math.max(1, win), turns: turns / Math.max(1, win) };
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;
