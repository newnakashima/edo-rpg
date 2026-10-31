// 実行中のゲームの状態。シーンをまたいで共有する。
import type { GameState } from './systems/gameState';

let current: GameState | null = null;

export function getState(): GameState {
  if (!current) throw new Error('game state is not initialized');
  return current;
}

export function setState(state: GameState): void {
  current = state;
}
