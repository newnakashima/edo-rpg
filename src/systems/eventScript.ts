// イベントスクリプトの実行。画面に依存せず、手順を 1 つずつ進めて、画面に頼むこと（台詞・選択肢・戦闘・移動）を返す。
import { CHARACTERS, characterName, isGuest } from '../data/characters';
import type { EventStep } from '../data/eventTypes';
import { addItem, isKnownItem, itemCount, MAX_ITEM_COUNT } from '../data/items';
import type { GameState } from './gameState';
import { createMember, memberLevel, memberStats, restoreAll } from './party';
import { totalExpForLevel } from './stats';

/** パーティーの最大人数。 */
export const MAX_PARTY = 4;

export type EventRequest =
  | { kind: 'say'; pages: string[] }
  | { kind: 'choice'; prompt?: string; labels: string[] }
  | { kind: 'battle'; enemies: string[]; level: number; canEscape: boolean; loseOk: boolean }
  | { kind: 'warp'; mapId: string; x: number; y: number }
  | { kind: 'done' };

/** 画面から返す入力（選んだ選択肢、戦闘の結果）。 */
export type EventInput = { kind: 'choice'; index: number } | { kind: 'battle'; outcome: 'victory' | 'defeat' | 'escaped' };

interface Frame {
  steps: readonly EventStep[];
  index: number;
}

/** その時点のパーティーの平均レベル（切り捨て、最低 1）。 */
function averageLevel(state: GameState): number {
  return Math.max(1, Math.floor(state.party.reduce((s, m) => s + memberLevel(m), 0) / Math.max(1, state.party.length)));
}

/**
 * 仲間に加える。加入済み・満員なら何もしない。レベルはその時点のパーティーの平均（切り捨て、最低 1）。ゲストは guestLevel。
 * 一時離脱中（away にいる）の仲間も何もしない（新しく作ると二重になるため。away から戻すのは rejoinParty）。
 */
export function joinParty(state: GameState, member: GameState['party'][number]['id']): GameState {
  if (state.party.some((m) => m.id === member) || state.away.some((m) => m.id === member) || state.party.length >= MAX_PARTY) return state;
  return { ...state, party: [...state.party, createMember(member, CHARACTERS[member].guestLevel ?? averageLevel(state))] };
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

/** 台詞の {hero} を主人公の名前に置き換え、女主人公なら linesF を使う。 */
export function sayPages(step: Extract<EventStep, { type: 'say' }>, state: GameState): string[] {
  const lines = state.gender === 'f' && step.linesF ? step.linesF : step.lines;
  const hero = characterName('hero', state.gender);
  return lines.map((l) => l.replaceAll('{hero}', hero));
}

export class EventRunner {
  private readonly stack: Frame[];
  /** 入力を待っている手順（選択肢・戦闘）。 */
  private waiting: Extract<EventStep, { type: 'choice' | 'battle' }> | null = null;
  private finished = false;

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
        case 'warp':
          return { state: { ...s, mapId: step.mapId, x: step.x, y: step.y }, request: { kind: 'warp', mapId: step.mapId, x: step.x, y: step.y } };
        case 'end':
          return this.finish(s);
      }
    }
  }

  private finish(state: GameState): { state: GameState; request: EventRequest } {
    this.stack.length = 0;
    this.finished = true;
    return { state, request: { kind: 'done' } };
  }
}
