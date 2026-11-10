// イベントスクリプトの実行。画面に依存せず、手順を 1 つずつ進めて、画面に頼むこと（台詞・選択肢・戦闘・移動）を返す。
import { CHARACTERS, characterName, isGuest } from '../data/characters';
import type { EventStep } from '../data/eventTypes';
import { addItem, isKnownItem, itemCount, MAX_ITEM_COUNT } from '../data/items';
import type { CharacterSpriteId } from '../data/sprites';
import type { Facing, GameState } from './gameState';
import { addJingi } from './jingi';
import { createMember, memberLevel, memberStats, restoreAll } from './party';
import { totalExpForLevel } from './stats';

/** パーティーの最大人数。 */
export const MAX_PARTY = 4;

export type EventRequest =
  | { kind: 'say'; pages: string[] }
  | { kind: 'choice'; prompt?: string; labels: string[] }
  | { kind: 'battle'; enemies: string[]; level: number; canEscape: boolean; loseOk: boolean }
  | { kind: 'warp'; mapId: string; x: number; y: number }
  /** 演出（人を出す・歩かせる・向きを変える・消す・待つ）。画面が行い終えたら next を呼ぶ。 */
  | { kind: 'stage'; step: StageStep }
  /** エンディングを出す（イベントはここで終わる）。 */
  | { kind: 'ending' }
  | { kind: 'done' };

/** 画面から返す入力（選んだ選択肢、戦闘の結果）。 */
export type EventInput = { kind: 'choice'; index: number } | { kind: 'battle'; outcome: 'victory' | 'defeat' | 'escaped' };

export type StageStep = Extract<EventStep, { type: 'actor' | 'walk' | 'face' | 'vanish' | 'wait' }>;

/**
 * 演出で動かした人の今の姿（主人公は GameState が持つので含めない）。sprite・enemy は actor で出した人だけにある（マップの NPC は自分の画像）。
 * 画面が演出を行うたびに書き込み、戦闘から戻ったフィールドがこれで人を置き直す。
 */
export interface StageActor {
  sprite?: CharacterSpriteId;
  /** 敵の画像で出した人（ENEMIES の ID）。 */
  enemy?: string;
  /** 敵の画像の大きさ（省くと半分）。 */
  scale?: number;
  x: number;
  y: number;
  facing: Facing;
  visible: boolean;
}

/** 歩く道の文字と向き。 */
const PATH_FACING: Record<string, Facing> = { u: 'up', d: 'down', l: 'left', r: 'right' };

/** 歩く道（u・d・l・r の並び）を向きの並びにする。ほかの文字は無視する。 */
export function pathFacings(path: string): Facing[] {
  return [...path].flatMap((c) => (PATH_FACING[c] ? [PATH_FACING[c]] : []));
}

/** from から to のマスまで、横、縦の順にまっすぐ歩く向きの並び。 */
export function pathTo(from: { x: number; y: number }, to: { x: number; y: number }): Facing[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return [...Array<Facing>(Math.abs(dx)).fill(dx > 0 ? 'right' : 'left'), ...Array<Facing>(Math.abs(dy)).fill(dy > 0 ? 'down' : 'up')];
}

/** 道を探すときに試す向きの順。 */
const ROUTE_ORDER: readonly Facing[] = ['up', 'left', 'right', 'down'];
const ROUTE_DELTA: Record<Facing, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * from から to のマスへ、open なマスだけをたどる一番短い道（walk の route）。
 * to に入れなければ（人が立っているなど）、たどり着けるマスのうち to にいちばん近い（縦横の歩数で）マスまでの一番短い道にする
 * （人を to にすれば、その人の隣で止まる）。to のすぐ下（手前）のマスは 3 マス目と同じ近さとみなす（手前に立つと、人の画像が to の人に重なって隠すため）。
 * 手前のマスへの道は必ず 2 マス離れたマスを通るので、手前で止まるのはそこから歩き出すときだけになる。近さが同じなら、to より下でないマスを選ぶ。
 * from のマスは open でなくてよい。どこへも行けなければ空。
 */
export function routeTo(from: { x: number; y: number }, to: { x: number; y: number }, open: (x: number, y: number) => boolean): Facing[] {
  const key = (x: number, y: number) => `${x},${y}`;
  const prev = new Map<string, { from: string; dir: Facing } | null>([[key(from.x, from.y), null]]);
  const queue: { x: number; y: number }[] = [{ ...from }];
  /** 近さ（歩数。すぐ手前は 3）、下か（1）、の順に小さいほど良い。queue は道の短い順なので、同じなら先に見つけたほうが道が短い。 */
  const score = (p: { x: number; y: number }) => {
    const front = p.x === to.x && p.y === to.y + 1;
    return [front ? 3 : Math.abs(to.x - p.x) + Math.abs(to.y - p.y), p.y > to.y ? 1 : 0] as const;
  };
  const better = (a: readonly [number, number], b: readonly [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  let best = { ...from };
  let bestScore = score(from);
  for (let i = 0; i < queue.length && bestScore[0] > 0; i++) {
    const cur = queue[i]!;
    for (const dir of ROUTE_ORDER) {
      const nx = cur.x + ROUTE_DELTA[dir][0];
      const ny = cur.y + ROUTE_DELTA[dir][1];
      const k = key(nx, ny);
      if (prev.has(k) || !open(nx, ny)) continue;
      prev.set(k, { from: key(cur.x, cur.y), dir });
      queue.push({ x: nx, y: ny });
      const sc = score({ x: nx, y: ny });
      if (better(sc, bestScore)) {
        best = { x: nx, y: ny };
        bestScore = sc;
      }
    }
  }
  const dirs: Facing[] = [];
  for (let step = prev.get(key(best.x, best.y)); step; step = prev.get(step.from)) dirs.unshift(step.dir);
  return dirs;
}

interface Frame {
  steps: readonly EventStep[];
  index: number;
}

/**
 * その時点のパーティーの平均レベル（切り捨て、最低 1）。加入時のレベルが決まっている仲間（Lv1 で加わるお凛）は数えない
 * （お凛の加入直後に戻る仲間のレベルが引き下げられないように）。その仲間しかいなければ全員で数える。
 */
function averageLevel(state: GameState): number {
  const counted = state.party.filter((m) => CHARACTERS[m.id].joinLevel === undefined);
  const members = counted.length > 0 ? counted : state.party;
  return Math.max(1, Math.floor(members.reduce((s, m) => s + memberLevel(m), 0) / Math.max(1, members.length)));
}

/**
 * 仲間に加える。加入済み・満員なら何もしない。レベルはその時点のパーティーの平均（切り捨て、最低 1）。ゲストは guestLevel、
 * 加入時のレベルが決まっている仲間（お凛は Lv1）は joinLevel。
 * 一時離脱中（away にいる）の仲間も何もしない（新しく作ると二重になるため。away から戻すのは rejoinParty）。
 */
export function joinParty(state: GameState, member: GameState['party'][number]['id']): GameState {
  if (state.party.some((m) => m.id === member) || state.away.some((m) => m.id === member) || state.party.length >= MAX_PARTY) return state;
  return { ...state, party: [...state.party, createMember(member, CHARACTERS[member].guestLevel ?? CHARACTERS[member].joinLevel ?? averageLevel(state))] };
}

/**
 * 一時離脱中（away にいる）の仲間を戻す。装備はそのまま、経験値は平均レベルまで引き上げ（下げない）、HP・MP は満タン。
 * away にいない・満員なら何もしない。
 */
export function rejoinParty(state: GameState, member: GameState['party'][number]['id']): GameState {
  const m = state.away.find((x) => x.id === member);
  if (!m || state.party.length >= MAX_PARTY) return state;
  const raised = { ...m, exp: Math.max(m.exp, totalExpForLevel(averageLevel(state))) };
  const stats = memberStats(raised);
  return {
    ...state,
    party: [...state.party, { ...raised, hp: stats.maxHp, mp: stats.maxMp }],
    away: state.away.filter((x) => x.id !== member),
  };
}

/** 仲間を一時的に抜く。ゲストでなければ away に預ける。主人公と、いない仲間には何もしない。 */
export function leaveParty(state: GameState, member: GameState['party'][number]['id']): GameState {
  const m = state.party.find((x) => x.id === member);
  if (!m || member === 'hero') return state;
  const party = state.party.filter((x) => x.id !== member);
  const away = isGuest(member) ? state.away : [...state.away.filter((x) => x.id !== member), m];
  return { ...state, party, away };
}

/** 台詞の {hero} を主人公の名前に、{jingi} をその時点の仁義ポイントに置き換え、女主人公なら linesF を使う。 */
export function sayPages(step: Extract<EventStep, { type: 'say' }>, state: GameState): string[] {
  const lines = state.gender === 'f' && step.linesF ? step.linesF : step.lines;
  const hero = characterName('hero', state.gender);
  return lines.map((l) => l.replaceAll('{hero}', hero).replaceAll('{jingi}', String(state.jingi)));
}

export class EventRunner {
  private readonly stack: Frame[];
  /** 入力を待っている手順（選択肢・戦闘）。 */
  private waiting: Extract<EventStep, { type: 'choice' | 'battle' }> | null = null;
  private finished = false;
  /** 演出で出した・動かした人（ID ごと）。画面が書き込む。warp で別の場所に移ると空にする。 */
  readonly stage = new Map<string, StageActor>();

  constructor(steps: readonly EventStep[]) {
    this.stack = [{ steps, index: 0 }];
  }

  get done(): boolean {
    return this.finished;
  }

  /**
   * 次に画面に頼むことが出るまで進める。input は直前の選択肢・戦闘の結果。
   * 戻り値の state は新しいオブジェクトで、引数の state は変更しない。
   */
  next(state: GameState, input?: EventInput): { state: GameState; request: EventRequest } {
    let s = state;
    if (this.waiting) {
      const w = this.waiting;
      this.waiting = null;
      if (w.type === 'choice') {
        const index = input?.kind === 'choice' ? input.index : -1;
        const option = w.options[index];
        if (option) this.stack.push({ steps: option.steps, index: 0 });
      } else if (input?.kind === 'battle' && input.outcome === 'defeat') {
        if (!w.ifLose) return this.finish(s);
        this.stack.push({ steps: w.ifLose, index: 0 });
      }
    }
    for (;;) {
      const frame = this.stack[this.stack.length - 1];
      if (!frame) return this.finish(s);
      const step = frame.steps[frame.index];
      if (!step) {
        this.stack.pop();
        continue;
      }
      frame.index++;
      switch (step.type) {
        case 'say':
          return { state: s, request: { kind: 'say', pages: sayPages(step, s) } };
        case 'setFlag':
          s = { ...s, flags: { ...s.flags, [step.flag]: step.value ?? true } };
          break;
        case 'if': {
          const branch = s.flags[step.flag] ? step.then : step.else;
          if (branch) this.stack.push({ steps: branch, index: 0 });
          break;
        }
        case 'choice':
          this.waiting = step;
          return { state: s, request: { kind: 'choice', prompt: step.prompt, labels: step.options.map((o) => o.label) } };
        case 'giveItem': {
          const n = step.count ?? 1;
          if (!isKnownItem(step.item) || n < 1) break;
          if (itemCount(s.items, step.item) + n > MAX_ITEM_COUNT) {
            if (step.ifFull) this.stack.push({ steps: step.ifFull, index: 0 });
            break;
          }
          s = { ...s, items: addItem(s.items, step.item, n) };
          break;
        }
        case 'giveMoney':
          s = { ...s, money: Math.max(0, s.money + step.amount) };
          break;
        case 'addJingi':
          s = addJingi(s, step.amount);
          break;
        case 'join':
          s = joinParty(s, step.member);
          break;
        case 'leave':
          s = leaveParty(s, step.member);
          break;
        case 'rejoin':
          s = rejoinParty(s, step.member);
          break;
        case 'heal':
          s = { ...s, party: restoreAll(s.party) };
          break;
        case 'battle':
          this.waiting = step;
          return {
            state: s,
            request: { kind: 'battle', enemies: step.enemies, level: step.level, canEscape: step.canEscape ?? false, loseOk: step.ifLose !== undefined },
          };
        case 'actor':
        case 'walk':
        case 'face':
        case 'vanish':
        case 'wait':
          return { state: s, request: { kind: 'stage', step } };
        case 'warp':
          this.stage.clear();
          return { state: { ...s, mapId: step.mapId, x: step.x, y: step.y }, request: { kind: 'warp', mapId: step.mapId, x: step.x, y: step.y } };
        case 'end':
          return this.finish(s);
        case 'ending':
          this.stack.length = 0;
          this.finished = true;
          return { state: s, request: { kind: 'ending' } };
      }
    }
  }

  private finish(state: GameState): { state: GameState; request: EventRequest } {
    this.stack.length = 0;
    this.finished = true;
    return { state, request: { kind: 'done' } };
  }
}
