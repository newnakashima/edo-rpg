import { describe, expect, it } from 'vitest';
import { newGame, STARTING_ITEMS } from './gameState';
import { createMember } from './party';
import { deserialize, listSlots, load, readSlot, save, serialize, SLOT_COUNT, slotKey, type KeyValueStorage } from './save';

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
    expect(load(storage, 1)).toEqual({ version: 2, savedAt: '2026-10-31T00:00:00.000Z', state: s });
  });

  it('空きスロットは null', () => {
    const storage = memoryStorage();
    save(storage, 2, state());
    const slots = listSlots(storage);
    expect(slots).toHaveLength(SLOT_COUNT);
    expect(slots[0]).toEqual({ status: 'empty' });
    expect(slots[2]?.status).toBe('ok');
  });

  it('読めないデータは空きと区別する', () => {
    const storage = memoryStorage();
    storage.setItem(slotKey(0), '{broken');
    expect(readSlot(storage, 0)).toEqual({ status: 'broken' });
    expect(load(storage, 0)).toBeNull();
  });

  it('書き込み・読み込みの失敗は例外にせず結果で返す', () => {
    const failing: KeyValueStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    expect(save(failing, 0, state())).toBe(false);
    expect(readSlot(failing, 0)).toEqual({ status: 'broken' });
    expect(save(memoryStorage(), 0, state())).toBe(true);
  });

  it('HP・MP が最大値を超えるデータは最大値に収める', () => {
    const s = { ...state(), party: [{ ...createMember('hero', 1), hp: 999, mp: 999 }] };
    const loaded = deserialize(serialize(s));
    expect(loaded?.state.party[0]).toMatchObject({ hp: 30, mp: 6 });
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
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, x: 1.5 } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, money: -1 } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, money: 1.5 } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, playTimeSec: -1 } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, party: [{ id: 'hero', exp: 0, hp: -1, mp: 1 }] } }))).toBeNull();
  });

  it('版 1 のセーブデータは旅立ちの道具を持たせて読む', () => {
    const v1state: Record<string, unknown> = { ...state() };
    delete v1state.items;
    const text = JSON.stringify({ version: 1, savedAt: '2026-10-31T00:00:00.000Z', state: v1state });
    expect(deserialize(text)?.state.items).toEqual(STARTING_ITEMS);
    expect(deserialize(text)?.version).toBe(2);
  });

  it('未対応の版や、おかしな道具のデータは読まない', () => {
    const ok = JSON.parse(serialize(state())) as { state: Record<string, unknown> };
    expect(deserialize(JSON.stringify({ ...ok, version: 99 }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, items: { nope: 1 } } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, items: { kizugusuri: 0 } } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, items: { kizugusuri: 100 } } }))).toBeNull();
  });
});

describe('newGame', () => {
  it('旅立ちの道具を持って始まる', () => {
    expect(state().items).toEqual(STARTING_ITEMS);
  });
});
