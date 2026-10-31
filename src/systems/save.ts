// セーブ/ロード。localStorage にスロットごとにバージョン付きの JSON で保存する。
import { CHARACTERS, isGuest, type CharacterId } from '../data/characters';
import { EQUIP_SLOTS, EQUIPMENT, STARTING_EQUIPMENT, type EquipSlot } from '../data/equipment';
import { isKnownItem, MAX_ITEM_COUNT } from '../data/items';
import { MAPS, respawnPoint } from '../data/maps';
import { STARTING_ITEMS, type GameState } from './gameState';
import { memberStats } from './party';

/**
 * セーブデータの形式の版。
 * - 1: フェーズ 1
 * - 2: 道具（items）を追加
 * - 3: 仲間の装備（party[].equip）を追加
 * - 4: 飛脚の預かり（storage）を追加
 * - 5: 一時離脱の仲間（away）を追加
 * - 6: 序章〜第 5 章の町・ダンジョンを作り直した（古い位置は、新しい形では壁の中や見張りの向こうになりうる）
 */
export const SAVE_VERSION = 7;

/** 版 6 で形を作り直したマップ。版 5 までのセーブがこの中にいたら、旅籠の前（ダンジョンなら近くの町の旅籠の前）へ移す。 */
export const MAPS_REBUILT_IN_V6: readonly string[] = [
  'shimizu', 'urayama', 'kitsunebiCave', 'sunpu', 'kobo', 'yoriki', 'karakuriYashiki',
  'nagoya', 'takoya', 'horikawaKura', 'tenshu', 'kyo', 'rashomon', 'oninosu',
  'iga', 'igaSato', 'kagiya', 'osaka', 'komeKura',
];
/**
 * 版 7 でワールドマップを広げた。版 6 までのワールドマップの町の印の位置（古い座標）と町の名前。
 * 版 6 までのセーブがワールドマップにいたら、古い座標でいちばん近い町の、新しいワールドマップの印の上へ移す。
 */
export const WORLD_TOWNS_BEFORE_V7: readonly { x: number; y: number; name: string }[] = [
  { x: 41, y: 11, name: '清水湊' }, { x: 39, y: 10, name: '駿府' }, { x: 32, y: 10, name: '名古屋' },
  { x: 27, y: 11, name: '伊賀' }, { x: 24, y: 10, name: '京' }, { x: 21, y: 11, name: '大坂' },
  { x: 14, y: 11, name: '広島' }, { x: 3, y: 16, name: '長崎' }, { x: 7, y: 16, name: '島原' },
];

function worldPositionV7(x: number, y: number): { x: number; y: number } {
  const dist = (t: { x: number; y: number }) => Math.abs(t.x - x) + Math.abs(t.y - y);
  const nearest = WORLD_TOWNS_BEFORE_V7.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  const town = MAPS.world!.towns!.find((t) => t.name === nearest.name)!;
  return { x: town.x, y: town.y };
}

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

function isNonNegativeInteger(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0;
}

const FACINGS = new Set(['up', 'down', 'left', 'right']);

/** 装備が、その人物が付けられる、枠に合った装備品だけでできているか。 */
function isValidEquip(memberId: string, equip: unknown): boolean {
  if (!isObject(equip)) return false;
  for (const [slot, id] of Object.entries(equip)) {
    if (!(EQUIP_SLOTS as readonly string[]).includes(slot) || typeof id !== 'string') return false;
    const def = Object.hasOwn(EQUIPMENT, id) ? EQUIPMENT[id] : undefined;
    if (!def || def.slot !== (slot as EquipSlot) || !(def.wearers as readonly string[]).includes(memberId)) return false;
  }
  return true;
}

/** 道具・装備品の ID ごとの個数（1〜99）か。 */
function isInventory(v: unknown): boolean {
  if (!isObject(v)) return false;
  return Object.entries(v).every(([id, n]) => isKnownItem(id) && Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_ITEM_COUNT);
}

/** 読み込んだ値がゲームの状態として正しい形かを確かめる。 */
export function isGameState(v: unknown): v is GameState {
  if (!isObject(v)) return false;
  if (v.gender !== 'm' && v.gender !== 'f') return false;
  if (!Array.isArray(v.party) || v.party.length === 0 || !Array.isArray(v.away)) return false;
  const ids = new Set<string>();
  for (const m of [...v.party, ...v.away]) {
    if (!isObject(m) || typeof m.id !== 'string' || !Object.hasOwn(CHARACTERS, m.id)) return false;
    // 同じ人物が、パーティーと一時離脱の両方（またはどちらかに 2 人）にいることはない
    if (ids.has(m.id)) return false;
    ids.add(m.id);
    if (!isNonNegativeInteger(m.exp) || !isNonNegativeInteger(m.hp) || !isNonNegativeInteger(m.mp)) return false;
    if (!isValidEquip(m.id, m.equip)) return false;
  }
  // 一時離脱に預けるのは主人公でもゲストでもない仲間だけ（leaveParty が作る形）
  if (v.away.some((m: { id: CharacterId }) => m.id === 'hero' || isGuest(m.id))) return false;
  if (!isNonNegativeInteger(v.money) || typeof v.mapId !== 'string') return false;
  if (!Number.isInteger(v.x) || !Number.isInteger(v.y)) return false;
  if (typeof v.facing !== 'string' || !FACINGS.has(v.facing)) return false;
  if (!isInventory(v.items) || !isInventory(v.storage)) return false;
  if (!isObject(v.flags) || !Object.values(v.flags).every((f) => typeof f === 'boolean')) return false;
  if (!isNonNegativeInteger(v.stepsToEncounter) || !isFiniteNumber(v.playTimeSec) || v.playTimeSec < 0) return false;
  return true;
}

/** 古い版のセーブデータの状態を、1 版ずつ今の形に直す。未対応の版なら null。 */
function migrate(version: unknown, state: unknown): unknown {
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > SAVE_VERSION) return null;
  let v = version;
  let s = state;
  while (v < SAVE_VERSION && isObject(s)) {
    if (v === 1) {
      // 版 1 には道具がない。新しく始めた場合と同じく、旅立ちの道具を持たせる
      s = { ...s, items: { ...STARTING_ITEMS } };
    } else if (v === 2 && Array.isArray(s.party)) {
      // 版 2 には装備がない。新しく始めた場合と同じく、加入時の装備を付ける
      s = {
        ...s,
        party: s.party.map((m: unknown) =>
          isObject(m) && typeof m.id === 'string' && Object.hasOwn(STARTING_EQUIPMENT, m.id)
            ? { ...m, equip: { ...STARTING_EQUIPMENT[m.id as keyof typeof STARTING_EQUIPMENT] } }
            : m,
        ),
      };
    } else if (v === 3) {
      // 版 3 には預かりがない。空で始める
      s = { ...s, storage: {} };
    } else if (v === 4) {
      // 版 4 には一時離脱の仲間がない（第 5 章より前なので、抜けている仲間はいない）
      s = { ...s, away: [] };
    } else if (v === 5 && typeof s.mapId === 'string' && MAPS_REBUILT_IN_V6.includes(s.mapId)) {
      // 版 5 までの位置は、作り直したマップでは壁の中や、見張りの向こう（大坂の米蔵の岸など）になりうる
      s = { ...s, ...respawnPoint(s.mapId) };
    } else if (v === 6 && s.mapId === 'world' && typeof s.x === 'number' && typeof s.y === 'number') {
      // 版 6 までのワールドマップの座標は、広げたワールドマップでは海や野原の上になる
      s = { ...s, ...worldPositionV7(s.x, s.y) };
    }
    v++;
  }
  return v === SAVE_VERSION ? s : null;
}

/** 文字列からセーブデータを読む。壊れている、または未対応のバージョンなら null。 */
export function deserialize(text: string): SaveData | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || typeof data.savedAt !== 'string') return null;
  const migrated = migrate(data.version, data.state);
  if (!isGameState(migrated)) return null;
  // HP・MP が最大値を超えていたら最大値に収める（一時離脱の仲間も）
  const clamp = (m: GameState['party'][number]) => {
    const s = memberStats(m);
    return { ...m, hp: Math.min(m.hp, s.maxHp), mp: Math.min(m.mp, s.maxMp) };
  };
  return { version: SAVE_VERSION, savedAt: data.savedAt, state: { ...migrated, party: migrated.party.map(clamp), away: migrated.away.map(clamp) } };
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
