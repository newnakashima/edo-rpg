// 戦闘の出来事から鳴らす効果音を選ぶ（docs/audio.md の「効果音（SE）」の「戦闘」と「コードでの鳴らし方（効果音）」）。
// 画面に依存しないので、BattleScene は 1 ターンの出来事を渡して、出来事ごとの音を受け取る。
import type { CharacterId } from '../data/characters';
import { isAilment, SKILLS, type SkillDef, type StatusId } from '../data/skills';
import type { SeId } from './audio';
import type { BattleEvent, Side } from './battle';

/** 強くなる状態。かかったら se_buff。 */
const BUFFS: readonly StatusId[] = ['atkUp', 'defUp', 'evade', 'critUp'];

/** 状態がかかったときの音（強くなる・弱くなる・状態異常）。 */
export function statusSe(status: StatusId): SeId {
  if (isAilment(status)) return 'se_ailment';
  return BUFFS.includes(status) ? 'se_buff' : 'se_debuff';
}

/** 技を使ったときの音。定義の se を使い、なければ属性と効き目から決める。鳴らさない技（逃げる・自爆など、続く出来事で鳴らす）は null。 */
export function skillSe(skill: SkillDef): SeId | null {
  if (skill.se) return skill.se;
  const elements = skill.elements ?? [];
  const e = skill.effect;
  if ((e.kind === 'physical' || e.kind === 'magic') && elements.includes('fire')) return 'se_fire';
  if ((e.kind === 'physical' || e.kind === 'magic') && elements.includes('thunder')) return 'se_thunder';
  switch (e.kind) {
    case 'physical':
      return 'se_slash';
    case 'magic':
      return 'se_magic';
    case 'heal':
    case 'cure':
      return 'se_heal';
    case 'status':
      return statusSe(e.status);
    case 'taunt':
      return 'se_jingi';
    case 'cover':
      return 'se_guard';
    case 'summon':
      return 'se_summon';
    case 'charge':
      return 'se_charge';
    default:
      return null;
  }
}

/** 何度も当たる技か（2 つ目からの当たり外れでも技の音を鳴らす）。敵全体に 1 度ずつ当たる技は含めない。 */
export function isMultiHit(skill: SkillDef): boolean {
  const e = skill.effect;
  if (skill.target === 'randomEnemies') return true;
  if (e.kind === 'physical') return (e.hits ?? 1) >= 2 || (e.maxHits ?? 1) >= 2;
  if (e.kind === 'magic') return (e.hits ?? 1) >= 2;
  return false;
}

/** 通常攻撃の音。味方は武器で決め（玄道の杖は打つ音、お凛は鉄砲、ほかは刀・槍）、敵の通常攻撃は鳴らさない（受けた側の se_damage だけ）。 */
export function attackSe(character: CharacterId | undefined): SeId | null {
  if (character === undefined) return null;
  if (character === 'gendo') return 'se_hit';
  if (character === 'orin') return 'se_gun';
  return 'se_slash';
}

/**
 * 勝利の後のページごとの音。最初のページ（勝利の文）はお金を得たら se_coin、落とし物のページは道具を 1 つでも得たら se_item、
 * 段が上がるページは se_levelup。drops は落とし物のページごとに道具を得たか、levelUps は段が上がるページの数。
 */
export function victorySounds(money: number, drops: readonly boolean[], levelUps: number): (SeId | null)[] {
  return [
    money > 0 ? 'se_coin' : null,
    ...drops.map((got): SeId | null => (got ? 'se_item' : null)),
    ...Array.from({ length: levelUps }, (): SeId => 'se_levelup'),
  ];
}

/** 戦闘に出ている人。key（p0・e0 など）ごとに、味方か敵か、味方なら誰か。 */
export interface SeActor {
  side: Side;
  character?: CharacterId;
}

/** いま進めている行動（技なら、その音と、何度目の当たりか）。 */
interface Action {
  actor: string;
  /**
   * covers は、技の音が効き目の音を兼ねる技（効き目が status・summon）か。その技に続く状態・呼び出しの出来事は、
   * 技の音で済んでいるので鳴らさない（煙玉の se_smoke、からくりを呼ぶ se_karakuri など）。
   */
  skill?: { se: SeId | null; multi: boolean; hits: number; covers: boolean };
}

/**
 * 1 ターンの出来事ごとに鳴らす効果音（鳴らさない出来事は空の配列）。
 * 技の音は技を使った出来事で鳴らし、何度も当たる技は 2 つ目からの当たり外れでも鳴らす。
 * 回復・状態の出来事は、同じ音の技に続くときは鳴らさない（技の音で済んでいる）。状態をつける技・呼び出す技に続く状態・呼び出しの出来事は、技の音が違っても（煙玉の se_smoke、からくりを呼ぶ se_karakuri）鳴らさない。道具を使った出来事は鳴らさず、続く出来事で鳴らす。
 */
export function battleSounds(events: readonly BattleEvent[], actors: ReadonlyMap<string, SeActor>): SeId[][] {
  const sideOf = (key: string): Side => actors.get(key)?.side ?? (key.startsWith('p') ? 'party' : 'enemy');
  let action: Action | null = null;
  /** 技の音と同じなら鳴らさない。 */
  const effect = (se: SeId): SeId[] => (action?.skill?.se === se ? [] : [se]);
  /** 当たり外れの数を数え、何度も当たる技の 2 つ目からなら技の音を返す。 */
  const hitSe = (actor: string | undefined): SeId[] => {
    const skill = action?.skill;
    if (!skill || (actor !== undefined && action?.actor !== actor)) return [];
    skill.hits++;
    return skill.multi && skill.hits >= 2 && skill.se ? [skill.se] : [];
  };
  return events.map((e): SeId[] => {
    switch (e.type) {
      case 'attack': {
        action = { actor: e.actor };
        const out: SeId[] = [];
        const own = sideOf(e.actor) === 'party' ? attackSe(actors.get(e.actor)?.character) : null;
        if (own) out.push(own);
        if (sideOf(e.target) === 'party') out.push('se_damage');
        if (e.critical) out.push('se_critical');
        return out;
      }
      case 'skill': {
        const def = SKILLS[e.skill];
        const se = def ? skillSe(def) : null;
        action = { actor: e.actor, skill: { se, multi: def ? isMultiHit(def) : false, hits: 0, covers: def?.effect.kind === 'status' || def?.effect.kind === 'summon' } };
        return se ? [se] : [];
      }
      case 'item':
        action = { actor: e.actor };
        return [];
      case 'damage': {
        const out = hitSe(undefined);
        if (sideOf(e.target) === 'party') out.push('se_damage');
        if (e.critical) out.push('se_critical');
        return out;
      }
      case 'miss': {
        // 通常攻撃が外れた（攻撃の出来事が出ない）なら、行動が替わった（同じ人が続けて動いたときも、前の技の当たりに数えない）
        if (e.attack || action?.actor !== e.actor) action = { actor: e.actor };
        return [...hitSe(e.actor), 'se_miss'];
      }
      case 'poison':
        return sideOf(e.target) === 'party' ? ['se_damage'] : [];
      case 'heal':
      case 'healMp':
      case 'cure':
        return effect('se_heal');
      case 'revive':
        return effect('se_revive');
      case 'status':
        return action?.skill?.covers ? [] : effect(statusSe(e.status));
      case 'statusFailed':
      case 'noEffect':
      case 'noMp':
      case 'noItem':
      case 'itemUnused':
        return ['se_buzzer'];
      case 'taunt':
        return effect('se_jingi');
      case 'cover':
      case 'covered':
      case 'guard':
        return effect('se_guard');
      case 'defeated':
        return [sideOf(e.target) === 'party' ? 'se_ko' : 'se_enemy_down'];
      case 'summon':
        return action?.skill?.covers ? [] : effect('se_summon');
      case 'charge':
        return effect('se_charge');
      case 'again': {
        // 木霊の数珠（術がもう一度）: 2 度目も技の音を鳴らし、新しい 1 回として数え直す。
        // 影分身の秘伝書（もう一度斬る）: 続く通常攻撃の出来事が武器の音を鳴らすので、ここでは鳴らさない
        const skill = action?.skill;
        if (!skill) return [];
        skill.hits = 0;
        return skill.se ? [skill.se] : [];
      }
      case 'fled':
        return ['se_escape'];
      case 'exploded':
        return ['se_explode'];
      case 'escape':
        return [e.success ? 'se_escape' : 'se_buzzer'];
      case 'cannotAct':
      case 'confused':
      case 'idle':
      case 'statusEnd':
        return [];
    }
  });
}
