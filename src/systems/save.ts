// セーブ/ロード。localStorage にスロットごとにバージョン付きの JSON で保存する。
import { CHARACTERS } from '../data/characters';
import type { GameState } from './gameState';
import { memberStats } from './party';

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

const FACINGS = new Set(['up', 'down', 'left', 'right']);

/** 読み込んだ値がゲームの状態として正しい形かを確かめる。 */
export function isGameState(v: unknown): v is GameState {
  if (!isObject(v)) return false;
  if (v.gender !== 'm' && v.gender !== 'f') return false;
  if (!Array.isArray(v.party) || v.party.length === 0) return false;
  for (const m of v.party) {
    if (!isObject(m) || typeof m.id !== 'string' || !Object.hasOwn(CHARACTERS, m.id)) return false;
    if (!isFiniteNumber(m.exp) || !isFiniteNumber(m.hp) || !isFiniteNumber(m.mp)) return false;
    if (m.exp < 0 || m.hp < 0 || m.mp < 0) return false;
  }
  if (!isFiniteNumber(v.money) || typeof v.mapId !== 'string') return false;
  if (!Number.isInteger(v.x) || !Number.isInteger(v.y)) return false;
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
  // HP・MP が最大値を超えていたら最大値に収める
  const party = data.state.party.map((m) => {
    const s = memberStats(m);
    return { ...m, hp: Math.min(m.hp, s.maxHp), mp: Math.min(m.mp, s.maxMp) };
  });
  return { version: data.version, savedAt: data.savedAt, state: { ...data.state, party } };
}

/** 書き込む。保存領域が一杯などで失敗したら false。 */
export function save(storage: KeyValueStorage, slot: number, state: GameState, now?: Date): boolean {
  const key = slotKey(slot);
  try {
    storage.setItem(key, serialize(state, now));
    return true;
  } catch {
    return false;
  }
}

export type SlotInfo = { status: 'empty' } | { status: 'ok'; data: SaveData } | { status: 'broken' };

/** スロットを読む。空き・読めるデータ・読めないデータ（壊れている、未対応のバージョン）を区別する。 */
export function readSlot(storage: KeyValueStorage, slot: number): SlotInfo {
  const key = slotKey(slot);
  let text: string | null;
  try {
    text = storage.getItem(key);
  } catch {
    return { status: 'broken' };
  }
  if (text === null) return { status: 'empty' };
  const data = deserialize(text);
  return data ? { status: 'ok', data } : { status: 'broken' };
}

export function load(storage: KeyValueStorage, slot: number): SaveData | null {
  const info = readSlot(storage, slot);
  return info.status === 'ok' ? info.data : null;
}

export function listSlots(storage: KeyValueStorage): SlotInfo[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(storage, i));
}

/**
 * ブラウザの localStorage。使えない環境（設定で禁止されているなど）では null。
 * 書き込めるかどうかは試さない（容量が一杯でも既存のセーブは読めるようにするため）。書き込みの失敗は save が返す。
 */
export function browserStorage(): KeyValueStorage | null {
  try {
    const s = window.localStorage;
    s.getItem(`${KEY_PREFIX}probe`);
    return s;
  } catch {
    return null;
  }
}
