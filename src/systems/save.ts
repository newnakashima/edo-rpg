// セーブ/ロード。localStorage にスロットごとにバージョン付きの JSON で保存する。
import type { GameState } from './gameState';

export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;
const KEY_PREFIX = 'edo-rpg/save/';

/** localStorage と同じ形の最小のインターフェース（テストで差し替える）。 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveData {
  version: number;
  savedAt: string;
  state: GameState;
}

export function slotKey(slot: number): string {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) throw new RangeError(`invalid save slot: ${slot}`);
  return `${KEY_PREFIX}${slot}`;
}

export function serialize(state: GameState, now: Date = new Date()): string {
  const data: SaveData = { version: SAVE_VERSION, savedAt: now.toISOString(), state };
  return JSON.stringify(data);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

const CHARACTER_IDS = new Set(['hero', 'kasumi', 'gendo', 'orin']);
const FACINGS = new Set(['up', 'down', 'left', 'right']);

/** 読み込んだ値がゲームの状態として正しい形かを確かめる。 */
export function isGameState(v: unknown): v is GameState {
  if (!isObject(v)) return false;
  if (v.gender !== 'm' && v.gender !== 'f') return false;
  if (!Array.isArray(v.party) || v.party.length === 0) return false;
  for (const m of v.party) {
    if (!isObject(m) || typeof m.id !== 'string' || !CHARACTER_IDS.has(m.id)) return false;
    if (!isFiniteNumber(m.exp) || !isFiniteNumber(m.hp) || !isFiniteNumber(m.mp)) return false;
  }
  if (!isFiniteNumber(v.money) || typeof v.mapId !== 'string') return false;
  if (!isFiniteNumber(v.x) || !isFiniteNumber(v.y)) return false;
  if (typeof v.facing !== 'string' || !FACINGS.has(v.facing)) return false;
  if (!isObject(v.flags) || !Object.values(v.flags).every((f) => typeof f === 'boolean')) return false;
  if (!isFiniteNumber(v.stepsToEncounter) || !isFiniteNumber(v.playTimeSec)) return false;
  return true;
}

/** 文字列からセーブデータを読む。壊れている、または未対応のバージョンなら null。 */
export function deserialize(text: string): SaveData | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || data.version !== SAVE_VERSION || typeof data.savedAt !== 'string') return null;
  if (!isGameState(data.state)) return null;
  return { version: data.version, savedAt: data.savedAt, state: data.state };
}

export function save(storage: KeyValueStorage, slot: number, state: GameState, now?: Date): void {
  storage.setItem(slotKey(slot), serialize(state, now));
}

export function load(storage: KeyValueStorage, slot: number): SaveData | null {
  const text = storage.getItem(slotKey(slot));
  return text === null ? null : deserialize(text);
}

/** スロットの一覧（空・壊れているスロットは null）。 */
export function listSlots(storage: KeyValueStorage): (SaveData | null)[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => load(storage, i));
}

/** ブラウザの localStorage。使えない環境（プライベートモードなど）では null。 */
export function browserStorage(): KeyValueStorage | null {
  try {
    const s = window.localStorage;
    const probe = `${KEY_PREFIX}probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
