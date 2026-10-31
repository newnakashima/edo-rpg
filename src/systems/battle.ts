// 戦闘の進行（画面に依存しない純粋なロジック）。
// コマンドは「たたかう・技・道具・防御・逃げる」。技・道具・状態異常・属性は docs/balance.md、docs/characters.md に従う。
import { characterName, type Gender } from '../data/characters';
import { ENEMIES } from '../data/enemies';
import { ITEMS, itemCount, removeItem, type Inventory, type ItemEffect } from '../data/items';
import { SKILLS, isAilment, skillsAtLevel, type Ailment, type Element, type SkillDef, type StatusId } from '../data/skills';
import {
  ailmentChance,
  applyGuard,
  elementMultiplier,
  escapeChance,
  healAmount,
  initiative,
  magicDamage,
  missChance,
  physicalDamage,
} from './combat';
import { memberLevel, memberStats, type PartyMember } from './party';
import { randInt, type Rng } from './random';
import { adjustedExp, enemyExp, enemyMoney, enemyStats, growthFactor, type Stats } from './stats';

export type Side = 'party' | 'enemy';

export interface Combatant {
  /** 戦闘内で一意の ID（味方は p0〜、敵は e0〜）。 */
  key: string;
  side: Side;
  name: string;
  level: number;
  stats: Stats;
  hp: number;
  mp: number;
  guarding: boolean;
  /** 使える技の ID（味方だけ。敵の行動は ENEMIES の actions から選ぶ）。 */
  skills: string[];
  weak: Element[];
  resist: Element[];
  /** 状態異常・能力の変化と、残りのターン数。 */
  status: Partial<Record<StatusId, number>>;
  /** 仁義を切られた敵が狙う味方の key と、残りのターン数。 */
  taunt?: { by: string; turns: number };
  /** このターン、代わりに攻撃を受ける味方の key（かばう）。 */
  coveredBy?: string;
  /** 敵の場合の種族 ID。 */
  enemyId?: string;
}

export type Command =
  | { kind: 'attack'; target: string }
  | { kind: 'skill'; skill: string; target?: string }
  | { kind: 'item'; item: string; target: string }
  | { kind: 'guard' }
  | { kind: 'escape' };

export type BattleEvent =
  /** 通常攻撃が当たった。 */
  | { type: 'attack'; actor: string; target: string; damage: number; critical: boolean }
  /** 技を使った（効果は続くイベントで出す）。 */
  | { type: 'skill'; actor: string; skill: string }
  /** 道具を使った。 */
  | { type: 'item'; actor: string; item: string }
  /** 技によるダメージ。 */
  | { type: 'damage'; target: string; damage: number; critical: boolean; weak: boolean; resisted: boolean }
  | { type: 'miss'; target: string }
  | { type: 'heal'; target: string; amount: number }
  | { type: 'healMp'; target: string; amount: number }
  | { type: 'revive'; target: string; hp: number }
  /** 状態異常・能力の変化がかかった。 */
  | { type: 'status'; target: string; status: StatusId }
  /** 状態異常がかからなかった。 */
  | { type: 'statusFailed'; target: string; status: StatusId }
  | { type: 'cure'; target: string; ailments: Ailment[] }
  /** 効果がなかった（戦闘不能の味方に傷薬など）。 */
  | { type: 'noEffect'; target: string }
  | { type: 'noMp'; actor: string; skill: string }
  | { type: 'noItem'; actor: string; item: string }
  /** 効き目がないので道具を使わなかった（減らない）。 */
  | { type: 'itemUnused'; actor: string; item: string; target: string }
  /** 眠り・麻痺・影縫いで動けなかった。 */
  | { type: 'cannotAct'; actor: string; reason: Ailment }
  | { type: 'confused'; actor: string }
  | { type: 'statusEnd'; target: string; status: StatusId }
  | { type: 'poison'; target: string; damage: number }
  | { type: 'taunt'; actor: string; target: string }
  | { type: 'cover'; actor: string; target: string }
  /** かばった（actor が target の代わりに受ける）。 */
  | { type: 'covered'; actor: string; target: string }
  | { type: 'guard'; actor: string }
  | { type: 'defeated'; target: string }
  | { type: 'escape'; success: boolean };

export type Outcome = 'ongoing' | 'victory' | 'defeat' | 'escaped';

export interface BattleState {
  combatants: Combatant[];
  /** 戦闘中に使える道具（使うと減る）。 */
  items: Inventory;
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
  options: { canEscape?: boolean; items?: Inventory } = {},
): BattleState {
  const partyCombatants: Combatant[] = party.map((m, i) => {
    const level = memberLevel(m);
    return {
      key: `p${i}`,
      side: 'party',
      name: characterName(m.id, gender),
      level,
      stats: memberStats(m),
      hp: m.hp,
      mp: m.mp,
      guarding: false,
      skills: skillsAtLevel(m.id, level),
      weak: [],
      resist: [],
      status: {},
    };
  });
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
    return {
      key: `e${i}`,
      side: 'enemy',
      name,
      level: enemyLevel,
      stats,
      hp: stats.maxHp,
      mp: 0,
      guarding: false,
      skills: [],
      weak: def.weak ?? [],
      resist: def.resist ?? [],
      status: {},
      enemyId: id,
    };
  });
  return {
    combatants: [...partyCombatants, ...enemyCombatants],
    items: { ...(options.items ?? {}) },
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

function opponentSide(side: Side): Side {
  return side === 'party' ? 'enemy' : 'party';
}

/** 攻撃力の補正（攻撃↑ は 1.3 倍、攻撃↓ は 0.75 倍）。 */
function effectiveAtk(c: Combatant): number {
  let atk = c.stats.atk;
  if (c.status.atkUp) atk *= 1.3;
  if (c.status.atkDown) atk *= 0.75;
  return atk;
}

/** 会心↑ で会心率に足す値。 */
const CRIT_UP_BONUS = 0.3;

/** 状態異常のかかる基本の確率（技に指定がないとき）。 */
const DEFAULT_AILMENT_CHANCE = 0.75;

/** 技の対象を選べるか（UI でターゲットを聞くか）。 */
export function needsTarget(skill: SkillDef): 'enemy' | 'ally' | null {
  if (skill.target === 'enemy') return 'enemy';
  if (skill.target === 'ally') return 'ally';
  return null;
}

class TurnContext {
  readonly byKey: Map<string, Combatant>;
  /** このターンにすでに行動した者。 */
  readonly acted = new Set<string>();
  /**
   * このターンに付いた効果のうち、ターンの終わりに残りを減らさないもの。
   * 対象がこのターンにもう行動していたら、付けたターンは数えない（効く行動の回数をちょうど N 回にする）。
   */
  readonly fresh = new Set<string>();

  constructor(
    readonly state: BattleState,
    readonly events: BattleEvent[],
    readonly rng: Rng,
  ) {
    this.byKey = new Map(state.combatants.map((c) => [c.key, c]));
  }

  alive(side: Side): Combatant[] {
    return aliveOf(this.state, side);
  }

  /** ダメージを与える。眠っていたら起こし、倒れたら状態異常を消して撃破のイベントを出す。 */
  hurt(target: Combatant, damage: number): void {
    target.hp = Math.max(0, target.hp - damage);
    if (!isAlive(target)) {
      target.status = {};
      target.taunt = undefined;
      this.events.push({ type: 'defeated', target: target.key });
      return;
    }
    if (target.status.sleep) {
      delete target.status.sleep;
      this.events.push({ type: 'statusEnd', target: target.key, status: 'sleep' });
    }
  }

  /** 敵の単体攻撃の狙いを決める。仁義を切られていればその味方を、かばわれていればかばう味方を狙う。 */
  enemyTarget(actor: Combatant, chosen?: Combatant): Combatant | undefined {
    let target = chosen;
    if (!target && actor.taunt) {
      const by = this.byKey.get(actor.taunt.by);
      if (by && isAlive(by)) target = by;
    }
    target ??= pick(this.alive(opponentSide(actor.side)), this.rng);
    return target ? this.coverRedirect(target) : undefined;
  }

  /** 味方が狙う敵の単体。選んだ敵が倒れていたら、生きている別の敵にする。 */
  partyEnemyTarget(key: string | undefined): Combatant | undefined {
    const chosen = key ? this.byKey.get(key) : undefined;
    if (chosen && chosen.side === 'enemy' && isAlive(chosen)) return chosen;
    return pick(this.alive('enemy'), this.rng);
  }

  coverRedirect(target: Combatant): Combatant {
    if (!target.coveredBy || target.coveredBy === target.key) return target;
    const by = this.byKey.get(target.coveredBy);
    if (!by || !isAlive(by)) return target;
    this.events.push({ type: 'covered', actor: by.key, target: target.key });
    return by;
  }

  /** 物理の一撃。外れたら null。 */
  physicalHit(
    actor: Combatant,
    target: Combatant,
    options: { multiplier?: number; sureHit?: boolean; ignoreDefense?: boolean; elements?: Element[] } = {},
  ): { damage: number; critical: boolean; weak: boolean; resisted: boolean } | null {
    if (!options.sureHit) {
      const miss = missChance(!!actor.status.accDown, !!target.status.evade);
      if (miss > 0 && this.rng() < miss) return null;
    }
    const def = options.ignoreDefense ? 0 : target.stats.def;
    const result = physicalDamage(effectiveAtk(actor), def, actor.stats.luck, this.rng, actor.status.critUp ? CRIT_UP_BONUS : 0);
    const elementRate = elementMultiplier(options.elements ?? [], target.weak, target.resist);
    const raw = Math.max(1, Math.floor(result.damage * (options.multiplier ?? 1) * elementRate));
    return { damage: applyGuard(raw, target.guarding), critical: result.critical, weak: elementRate > 1, resisted: elementRate < 1 };
  }

  /** 通常攻撃。 */
  attack(actor: Combatant, target: Combatant): void {
    const hit = this.physicalHit(actor, target);
    if (!hit) {
      this.events.push({ type: 'miss', target: target.key });
      return;
    }
    this.events.push({ type: 'attack', actor: actor.key, target: target.key, damage: hit.damage, critical: hit.critical });
    this.hurt(target, hit.damage);
  }

  applyStatus(actor: Combatant, target: Combatant, status: StatusId, turns: number, chance: number | undefined): void {
    if (!isAlive(target)) return;
    const hostile = actor.side !== target.side;
    if (hostile) {
      const p = isAilment(status) ? ailmentChance(chance ?? DEFAULT_AILMENT_CHANCE, actor.stats.luck, target.stats.luck) : (chance ?? 0.9);
      if (this.rng() >= p) {
        this.events.push({ type: 'statusFailed', target: target.key, status });
        return;
      }
    }
    target.status[status] = Math.max(target.status[status] ?? 0, turns);
    if (this.acted.has(target.key)) this.fresh.add(`${target.key}:${status}`);
    this.events.push({ type: 'status', target: target.key, status });
  }

  cure(target: Combatant, only?: Ailment): void {
    const ailments = (Object.keys(target.status) as StatusId[]).filter((id): id is Ailment => isAilment(id) && (!only || id === only));
    for (const id of ailments) delete target.status[id];
    this.events.push(ailments.length > 0 ? { type: 'cure', target: target.key, ailments } : { type: 'noEffect', target: target.key });
  }

  /** 技の対象を決める。 */
  skillTargets(actor: Combatant, skill: SkillDef, targetKey: string | undefined): Combatant[] {
    const foes = opponentSide(actor.side);
    switch (skill.target) {
      case 'self':
        return [actor];
      case 'allEnemies':
        return this.alive(foes);
      case 'allAllies':
        return this.alive(actor.side);
      case 'randomEnemies':
        return [];
      case 'ally': {
        if (actor.side === 'enemy') {
          const t = pick(this.alive(actor.side), this.rng);
          return t ? [t] : [];
        }
        // 選んだ味方は、倒れていても対象のまま（技の効果の側で「効かなかった」にする）
        const chosen = targetKey ? this.byKey.get(targetKey) : undefined;
        return [chosen && chosen.side === actor.side ? chosen : actor];
      }
      case 'enemy': {
        const t = actor.side === 'enemy' ? this.enemyTarget(actor) : this.partyEnemyTarget(targetKey);
        return t ? [t] : [];
      }
    }
  }

  useSkill(actor: Combatant, skill: SkillDef, targetKey: string | undefined): void {
    if (actor.mp < skill.mp) {
      this.events.push({ type: 'noMp', actor: actor.key, skill: skill.id });
      return;
    }
    actor.mp -= skill.mp;
    this.events.push({ type: 'skill', actor: actor.key, skill: skill.id });
    const effect = skill.effect;
    const elements = skill.elements ?? [];

    if (skill.target === 'randomEnemies' && effect.kind === 'physical') {
      const hits = randInt(this.rng, effect.hits ?? 1, effect.maxHits ?? effect.hits ?? 1);
      for (let i = 0; i < hits; i++) {
        const foes = this.alive(opponentSide(actor.side));
        const target = pick(foes, this.rng);
        if (!target) break;
        this.physicalSkillHit(actor, target, effect, elements);
      }
      return;
    }

    for (const target of this.skillTargets(actor, skill, targetKey)) {
      // 選んだ味方が先に倒れていたら効かない
      if (!isAlive(target)) {
        this.events.push({ type: 'noEffect', target: target.key });
        continue;
      }
      switch (effect.kind) {
        case 'physical': {
          if (effect.gamble && this.rng() < 0.5) {
            this.events.push({ type: 'miss', target: target.key });
            break;
          }
          const hits = effect.hits ?? 1;
          for (let i = 0; i < hits && isAlive(target); i++) this.physicalSkillHit(actor, target, effect, elements);
          break;
        }
        case 'magic': {
          const rate = elementMultiplier(elements, target.weak, target.resist);
          const raw = magicDamage(effect.power * growthFactor(actor.level), actor.stats.mag, target.stats.def, this.rng);
          const damage = applyGuard(Math.max(1, Math.floor(raw * rate)), target.guarding);
          this.events.push({ type: 'damage', target: target.key, damage, critical: false, weak: rate > 1, resisted: rate < 1 });
          this.hurt(target, damage);
          break;
        }
        case 'heal': {
          const amount = Math.min(target.stats.maxHp - target.hp, healAmount(effect.power * growthFactor(actor.level), actor.stats.mag));
          target.hp += amount;
          this.events.push({ type: 'heal', target: target.key, amount });
          break;
        }
        case 'status':
          this.applyStatus(actor, target, effect.status, effect.turns, effect.chance);
          break;
        case 'cure':
          this.cure(target);
          break;
        case 'taunt':
          target.taunt = { by: actor.key, turns: effect.turns };
          if (this.acted.has(target.key)) this.fresh.add(`${target.key}:taunt`);
          this.events.push({ type: 'taunt', actor: actor.key, target: target.key });
          break;
        case 'cover':
          if (target.key === actor.key) {
            this.events.push({ type: 'noEffect', target: target.key });
            break;
          }
          target.coveredBy = actor.key;
          this.events.push({ type: 'cover', actor: actor.key, target: target.key });
          break;
      }
    }
  }

  private physicalSkillHit(
    actor: Combatant,
    target: Combatant,
    effect: Extract<SkillDef['effect'], { kind: 'physical' }>,
    elements: Element[],
  ): void {
    const hit = this.physicalHit(actor, target, {
      multiplier: effect.multiplier,
      sureHit: effect.sureHit,
      ignoreDefense: effect.ignoreDefense,
      elements,
    });
    if (!hit) {
      this.events.push({ type: 'miss', target: target.key });
      return;
    }
    this.events.push({ type: 'damage', target: target.key, ...hit });
    this.hurt(target, hit.damage);
  }

  /** 道具を使う。効かない相手（倒れた味方に傷薬、満タンの味方に傷薬など）には使わず、減らさない。 */
  useItem(actor: Combatant, itemId: string, targetKey: string): void {
    const item = ITEMS[itemId];
    const rest = item ? removeItem(this.state.items, itemId) : null;
    if (!item || !rest) {
      this.events.push({ type: 'noItem', actor: actor.key, item: itemId });
      return;
    }
    const chosen = this.byKey.get(targetKey);
    const target = chosen && chosen.side === actor.side ? chosen : actor;
    const effect = item.effect;
    if (!itemWorks(effect, target)) {
      this.events.push({ type: 'itemUnused', actor: actor.key, item: itemId, target: target.key });
      return;
    }
    this.state.items = rest;
    this.events.push({ type: 'item', actor: actor.key, item: itemId });
    switch (effect.kind) {
      case 'revive':
        target.hp = Math.max(1, Math.floor(target.stats.maxHp * effect.rate));
        this.events.push({ type: 'revive', target: target.key, hp: target.hp });
        return;
      case 'healHp': {
        const amount = Math.min(target.stats.maxHp - target.hp, effect.amount);
        target.hp += amount;
        this.events.push({ type: 'heal', target: target.key, amount });
        return;
      }
      case 'healMp': {
        const amount = Math.min(target.stats.maxMp - target.mp, effect.amount);
        target.mp += amount;
        this.events.push({ type: 'healMp', target: target.key, amount });
        return;
      }
      case 'cure':
        this.cure(target, effect.ailment);
        return;
    }
  }

  /** 敵の行動を重みで選ぶ。 */
  enemyAction(actor: Combatant): string {
    const def = actor.enemyId ? ENEMIES[actor.enemyId] : undefined;
    const actions = def?.actions;
    if (!actions || actions.length === 0) return 'attack';
    const total = actions.reduce((s, a) => s + a.weight, 0);
    let r = this.rng() * total;
    for (const a of actions) {
      r -= a.weight;
      if (r < 0) return a.skill;
    }
    return actions[actions.length - 1]?.skill ?? 'attack';
  }

  /** 1 人分の行動。 */
  act(actor: Combatant, command: Command | undefined): void {
    this.acted.add(actor.key);
    // 動けない状態異常
    for (const reason of ['sleep', 'paralysis', 'bind'] as const) {
      if (actor.status[reason]) {
        if (reason === 'bind') delete actor.status.bind;
        this.events.push({ type: 'cannotAct', actor: actor.key, reason });
        return;
      }
    }
    if (actor.status.confusion) {
      this.events.push({ type: 'confused', actor: actor.key });
      const target = pick(
        this.state.combatants.filter((c) => isAlive(c) && c.key !== actor.key),
        this.rng,
      );
      if (target) this.attack(actor, target);
      return;
    }

    if (actor.side === 'enemy') {
      const action = this.enemyAction(actor);
      const skill = SKILLS[action];
      if (action === 'attack' || !skill) {
        const target = this.enemyTarget(actor);
        if (target) this.attack(actor, target);
      } else {
        this.useSkill(actor, skill, undefined);
      }
      return;
    }

    switch (command?.kind) {
      case 'attack': {
        const target = this.partyEnemyTarget(command.target);
        if (target) this.attack(actor, target);
        return;
      }
      case 'skill': {
        const skill = SKILLS[command.skill];
        if (skill && actor.skills.includes(skill.id)) this.useSkill(actor, skill, command.target);
        return;
      }
      case 'item':
        this.useItem(actor, command.item, command.target);
        return;
      default:
        return;
    }
  }

  /** ターンの終わり: 毒のダメージと、効果の残りターンを減らす。 */
  endOfTurn(): void {
    for (const c of this.state.combatants) {
      if (!isAlive(c)) continue;
      if (c.status.poison) {
        const damage = Math.max(1, Math.floor(c.stats.maxHp / 10));
        this.events.push({ type: 'poison', target: c.key, damage });
        this.hurt(c, damage);
        if (!isAlive(c)) continue;
      }
      for (const id of Object.keys(c.status) as StatusId[]) {
        // 影縫いは次の行動を止めるまで残す
        if (id === 'bind' || this.fresh.has(`${c.key}:${id}`)) continue;
        const left = (c.status[id] ?? 0) - 1;
        if (left > 0) {
          c.status[id] = left;
        } else {
          delete c.status[id];
          this.events.push({ type: 'statusEnd', target: c.key, status: id });
        }
      }
      if (c.taunt && !this.fresh.has(`${c.key}:taunt`)) {
        c.taunt = c.taunt.turns > 1 ? { ...c.taunt, turns: c.taunt.turns - 1 } : undefined;
      }
    }
  }
}

/** 道具がその相手に効くか。 */
export function itemWorks(effect: ItemEffect, target: Combatant): boolean {
  if (effect.kind === 'revive') return !isAlive(target);
  if (!isAlive(target)) return false;
  switch (effect.kind) {
    case 'healHp':
      return target.hp < target.stats.maxHp;
    case 'healMp':
      return target.mp < target.stats.maxMp;
    case 'cure':
      return Object.keys(target.status).some((id) => isAilment(id as StatusId) && (!effect.ailment || id === effect.ailment));
  }
}

function commandPriority(c: Combatant, command: Command | undefined): number {
  if (c.side !== 'party' || command?.kind !== 'skill') return 0;
  return SKILLS[command.skill]?.priority ? 1 : 0;
}

/**
 * 1 ターンを進める。commands は生きている味方の key ごとのコマンド。
 * 逃げるを選んだ味方がいれば、行動の前に逃走を判定する。失敗したら、そのターンは味方は行動できず（防御は有効）、敵だけが行動する。
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
    items: { ...prev.items },
    turn: prev.turn + 1,
    combatants: prev.combatants.map((c) => ({
      ...c,
      status: { ...c.status },
      taunt: c.taunt ? { ...c.taunt } : undefined,
      guarding: false,
      coveredBy: undefined,
    })),
  };
  const events: BattleEvent[] = [];
  const ctx = new TurnContext(state, events, rng);

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
    // 逃げようとしてこのターンの行動を使ったものとして扱う（このターンにかかった効果は、次のターンから数える）
    for (const c of aliveOf(state, 'party')) ctx.acted.add(c.key);
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
    .map((c) => ({ c, init: initiative(c.stats.spd, rng), prio: commandPriority(c, commands[c.key]) }))
    .sort((a, b) => b.prio - a.prio || b.init - a.init)
    .map((x) => x.c);

  for (const actor of order) {
    if (!isAlive(actor) || judge(state) !== 'ongoing') continue;
    ctx.act(actor, commands[actor.key]);
  }

  if (judge(state) === 'ongoing') ctx.endOfTurn();
  state.outcome = judge(state);
  return { state, events };
}

/** 戦闘中にその道具を使える残りの数（他の味方がこのターンに使う予定の分を除く）。 */
export function availableItemCount(state: BattleState, item: string, reserved: Record<string, Command>): number {
  const planned = Object.values(reserved).filter((c) => c.kind === 'item' && c.item === item).length;
  return itemCount(state.items, item) - planned;
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

/** 戦闘後の HP・MP を仲間の状態に書き戻す。状態異常は戦闘が終わると治る。 */
export function partyAfterBattle(party: PartyMember[], state: BattleState): PartyMember[] {
  return party.map((m, i) => {
    const c = state.combatants.find((x) => x.key === `p${i}`);
    return c ? { ...m, hp: c.hp, mp: c.mp } : m;
  });
}
