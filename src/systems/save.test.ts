import { describe, expect, it } from 'vitest';
import { newGame } from './gameState';
import { deserialize, listSlots, load, save, serialize, SLOT_COUNT, slotKey, type KeyValueStorage } from './save';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const state = () => newGame('f', { mapId: 'shimizu', x: 3, y: 4 });

describe('save', () => {
  it('保存した状態をそのまま読み戻せる', () => {
    const storage = memoryStorage();
    const s = { ...state(), money: 123, flags: { intro: true } };
    save(storage, 1, s, new Date('2026-10-31T00:00:00Z'));
    expect(load(storage, 1)).toEqual({ version: 1, savedAt: '2026-10-31T00:00:00.000Z', state: s });
  });

  it('空きスロットは null', () => {
    const storage = memoryStorage();
    save(storage, 2, state());
    const slots = listSlots(storage);
    expect(slots).toHaveLength(SLOT_COUNT);
    expect(slots[0]).toBeNull();
    expect(slots[2]).not.toBeNull();
  });

  it('範囲外のスロットは例外にする', () => {
    expect(() => slotKey(-1)).toThrow(RangeError);
    expect(() => slotKey(SLOT_COUNT)).toThrow(RangeError);
    expect(() => slotKey(0.5)).toThrow(RangeError);
  });

  it('壊れたデータや未対応のバージョンは null', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('null')).toBeNull();
    const ok = JSON.parse(serialize(state()));
    expect(deserialize(JSON.stringify({ ...ok, version: 999 }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, gender: 'x' } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, party: [] } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, party: [{ id: 'nobody', exp: 0, hp: 1, mp: 1 }] } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, flags: { a: 'yes' } } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, x: 'NaN' } }))).toBeNull();
  });
});
