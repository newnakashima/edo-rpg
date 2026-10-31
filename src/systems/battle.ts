// 戦闘の進行（画面に依存しない純粋なロジック）。フェーズ 1 では「たたかう・防御・逃げる」を扱う。
import { characterName, type Gender } from '../data/characters';
import { ENEMIES } from '../data/enemies';
import { applyGuard, escapeChance, initiative, physicalDamage } from './combat';
import { memberLevel, memberStats, type PartyMember } from './party';
import type { Rng } from './random';
import { adjustedExp, enemyExp, enemyMoney, enemyStats, type Stats } from './stats';

export type Side = 'party' | 'enemy';

export interface Combatant {
  /** 戦闘内で一意の ID（味方は p0〜、敵は e0〜）。 */
  key: string;
  side: Side;
  name: string;
  level: number;
  stats: Stats;
  hp: number;
  guarding: boolean;
  /** 敵の場合の種族 ID。 */
  enemyId?: string;
}

export type Command =
  | { kind: 'attack'; target: string }
  | { kind: 'guard' }
  | { kind: 'escape' };

export type BattleEvent =
  | { type: 'attack'; actor: string; target: string; damage: number; critical: boolean }
  | { type: 'guard'; actor: string }
  | { type: 'defeated'; target: string }
  | { type: 'escape'; success: boolean };

export type Outcome = 'ongoing' | 'victory' | 'defeat' | 'escaped';

export interface BattleState {
  combatants: Combatant[];
  canEscape: boolean;
  outcome: Outcome;
  turn: number;
}

export function isAlive(c: Combatant): boolean {
  return c.hp > 0;
}

export function aliveOf(state: BattleState, side: Side): Combatant[] {
  return state.combatants.filter((c) => c.side === side && isAlive(c));
}

/** 同じ種族が複数いるとき「鬼火 甲」「鬼火 乙」のように呼び分ける。 */
const SUFFIXES = ['甲', '乙', '丙', '丁'];

export function createBattle(
  party: PartyMember[],
  gender: Gender,
  enemyIds: string[],
  enemyLevel: number,
  options: { canEscape?: boolean } = {},
): BattleState {
  const partyCombatants: Combatant[] = party.map((m, i) => ({
    key: `p${i}`,
    side: 'party',
    name: characterName(m.id, gender),
    level: memberLevel(m),
    stats: memberStats(m),
    hp: m.hp,
    guarding: false,
  }));
  const counts = new Map<string, number>();
  for (const id of enemyIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const seen = new Map<string, number>();
  const enemyCombatants: Combatant[] = enemyIds.map((id, i) => {
    const def = ENEMIES[id];
    if (!def) throw new Error(`unknown enemy: ${id}`);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    const name = (counts.get(id) ?? 0) > 1 ? `${def.name} ${SUFFIXES[n] ?? n + 1}` : def.name;
    const stats = enemyStats(def.factors, enemyLevel);
    return { key: `e${i}`, side: 'enemy', name, level: enemyLevel, stats, hp: stats.maxHp, guarding: false, enemyId: id };
  });
  return {
    combatants: [...partyCombatants, ...enemyCombatants],
    canEscape: options.canEscape ?? true,
    outcome: 'ongoing',
    turn: 0,
  };
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function pick<T>(items: T[], rng: Rng): T | undefined {
  return items[Math.floor(rng() * items.length)];
}

function judge(state: BattleState): Outcome {
  if (aliveOf(state, 'enemy').length === 0) return 'victory';
  if (aliveOf(state, 'party').length === 0) return 'defeat';
  return 'ongoing';
}

/**
 * 1 ターンを進める。commands は生きている味方の key ごとのコマンド。
 * 逃げるを選んだ味方がいれば、行動の前に逃走を判定する。失敗したら、そのターンは味方は攻撃できず（防御は有効）、敵だけが行動する。
 * 戻り値の state は新しいオブジェクトで、引数の state は変更しない。
 */
export function resolveTurn(
  prev: BattleState,
  commands: Record<string, Command>,
  rng: Rng,
): { state: BattleState; events: BattleEvent[] } {
  if (prev.outcome !== 'ongoing') return { state: prev, events: [] };
  const state: BattleState = {
    ...prev,
    turn: prev.turn + 1,
    combatants: prev.combatants.map((c) => ({ ...c, guarding: false })),
  };
  const events: BattleEvent[] = [];
  const byKey = new Map(state.combatants.map((c) => [c.key, c]));

  let partyActs = true;
  const wantsEscape = aliveOf(state, 'party').some((c) => commands[c.key]?.kind === 'escape');
  if (wantsEscape) {
    const chance = state.canEscape
      ? escapeChance(average(aliveOf(state, 'party').map((c) => c.stats.spd)), average(aliveOf(state, 'enemy').map((c) => c.stats.spd)))
      : 0;
    const success = rng() < chance;
    events.push({ type: 'escape', success });
    if (success) {
      state.outcome = 'escaped';
      return { state, events };
    }
    partyActs = false;
  }

  // 防御は行動順より先に効く（逃走に失敗したターンも有効）
  for (const c of aliveOf(state, 'party')) {
    if (commands[c.key]?.kind === 'guard') {
      c.guarding = true;
      events.push({ type: 'guard', actor: c.key });
    }
  }

  const order = state.combatants
    .filter((c) => isAlive(c) && (c.side === 'enemy' || partyActs))
    .map((c) => ({ c, init: initiative(c.stats.spd, rng) }))
    .sort((a, b) => b.init - a.init)
    .map((x) => x.c);

  for (const actor of order) {
    if (!isAlive(actor) || judge(state) !== 'ongoing') continue;
    let target: Combatant | undefined;
    if (actor.side === 'party') {
      const cmd = commands[actor.key];
      if (cmd?.kind !== 'attack') continue;
      const chosen = byKey.get(cmd.target);
      // 狙った敵がすでに倒れていたら、生きている別の敵を狙う
      target = chosen && chosen.side === 'enemy' && isAlive(chosen) ? chosen : pick(aliveOf(state, 'enemy'), rng);
    } else {
      target = pick(aliveOf(state, 'party'), rng);
    }
    if (!target) continue;
    const result = physicalDamage(actor.stats.atk, target.stats.def, actor.stats.luck, rng);
    const damage = applyGuard(result.damage, target.guarding);
    target.hp = Math.max(0, target.hp - damage);
    events.push({ type: 'attack', actor: actor.key, target: target.key, damage, critical: result.critical });
    if (!isAlive(target)) events.push({ type: 'defeated', target: target.key });
  }

  state.outcome = judge(state);
  return { state, events };
}

export interface Rewards {
  /** 味方の key ごとの経験値（戦闘不能の味方は 0）。 */
  exp: Record<string, number>;
  money: number;
}

/** 勝利したときの経験値とお金。経験値は生き残った味方それぞれが全額を得る。 */
export function computeRewards(state: BattleState): Rewards {
  const enemies = state.combatants.filter((c) => c.side === 'enemy');
  const money = enemies.reduce((sum, e) => sum + enemyMoney(e.level), 0);
  const exp: Record<string, number> = {};
  for (const member of state.combatants.filter((c) => c.side === 'party')) {
    exp[member.key] = isAlive(member)
      ? enemies.reduce((sum, e) => sum + adjustedExp(enemyExp(e.level), member.level, e.level), 0)
      : 0;
  }
  return { exp, money };
}

/** 戦闘後の HP を仲間の状態に書き戻す。 */
export function partyAfterBattle(party: PartyMember[], state: BattleState): PartyMember[] {
  return party.map((m, i) => {
    const c = state.combatants.find((x) => x.key === `p${i}`);
    return c ? { ...m, hp: c.hp } : m;
  });
}
