// 実行中のゲームの状態。シーンをまたいで共有する。
import type { EventInput, EventRunner } from './systems/eventScript';
import type { GameState } from './systems/gameState';

let current: GameState | null = null;

export function getState(): GameState {
  if (!current) throw new Error('game state is not initialized');
  return current;
}

export function setState(state: GameState): void {
  current = state;
}

/**
 * 戦闘や場所の移動でフィールドを離れている間、途中のイベントを預かる。
 * 戻ってきたフィールドが resume に結果（戦闘の勝ち負けなど）を渡して続きを行う。
 */
export interface PendingEvent {
  runner: EventRunner;
  /** フィールドを離れたときのマップ。戻ったときに別のマップなら（移動・全滅）、そのマップに入ったときのイベントも行う。 */
  fromMapId: string;
  /**
   * 離れたときに、まだ行っていない「マップに入ったときのイベント」があったか。
   * warp で移動した先のイベントの続きで戦闘に入ると fromMapId は移動先のマップになるので、これで引き継ぐ。
   */
  enterPending: boolean;
  resume?: EventInput;
}

let pending: PendingEvent | null = null;

export function setPendingEvent(p: PendingEvent | null): void {
  pending = p;
}

/**
 * フィールドに来たとき、そのマップに入ったときのイベント（onEnter）を、途中のイベントのあとに行うか。
 * pending: 預かっていたイベント。dataFromMapId: 戦闘から戻ったとき、戦闘を始めたマップ（イベントの外の戦闘）。
 * どちらもなければ（始めたとき・読み込んだとき）行う。
 */
export function shouldRunEnterEvent(mapId: string, pending: PendingEvent | null, dataFromMapId?: string): boolean {
  if (pending) return pending.enterPending || pending.fromMapId !== mapId;
  return dataFromMapId !== mapId;
}

/** 預かっているイベントを取り出す（取り出したら空にする）。 */
export function takePendingEvent(): PendingEvent | null {
  const p = pending;
  pending = null;
  return p;
}

/** 戦闘の結果を、預かっているイベントに渡す。イベント中の戦闘でなければ何もしない。 */
export function reportBattleOutcome(outcome: 'victory' | 'defeat' | 'escaped'): void {
  if (pending) pending.resume = { kind: 'battle', outcome };
}
