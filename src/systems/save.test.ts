import { describe, expect, it } from 'vitest';
import { STARTING_EQUIPMENT } from '../data/equipment';
import { newGame, STARTING_ITEMS } from './gameState';
import { createMember } from './party';
import { MAPS, TILES } from '../data/maps';
import { deserialize, listSlots, load, MAPS_REBUILT_IN_V6, readSlot, save, SAVE_VERSION, serialize, SLOT_COUNT, slotKey, WORLD_TOWNS_BEFORE_V7, type KeyValueStorage } from './save';

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
    expect(load(storage, 1)).toEqual({ version: SAVE_VERSION, savedAt: '2026-10-31T00:00:00.000Z', state: s });
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
    const v1state: Record<string, unknown> = { ...state(), party: state().party.map((m) => ({ id: m.id, exp: m.exp, hp: m.hp, mp: m.mp })) };
    delete v1state.items;
    const text = JSON.stringify({ version: 1, savedAt: '2026-10-31T00:00:00.000Z', state: v1state });
    expect(deserialize(text)?.state.items).toEqual(STARTING_ITEMS);
    expect(deserialize(text)?.version).toBe(SAVE_VERSION);
  });

  it('未対応の版や、おかしな道具のデータは読まない', () => {
    const ok = JSON.parse(serialize(state())) as { state: Record<string, unknown> };
    expect(deserialize(JSON.stringify({ ...ok, version: 99 }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, items: { nope: 1 } } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, items: { kizugusuri: 0 } } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, items: { kizugusuri: 100 } } }))).toBeNull();
  });
});

describe('版 3（装備）', () => {
  it('版 2 のセーブデータは加入時の装備を付けて読む', () => {
    const v2state = { ...state(), party: [{ id: 'hero', exp: 0, hp: 10, mp: 1 }] };
    const data = deserialize(JSON.stringify({ version: 2, savedAt: '2026-10-31T00:00:00.000Z', state: v2state }));
    expect(data?.version).toBe(SAVE_VERSION);
    expect(data?.state.party[0]?.equip).toEqual(STARTING_EQUIPMENT.hero);
  });

  it('付けられない装備や、枠の違う装備は読まない', () => {
    const ok = JSON.parse(serialize(state())) as { state: { party: Record<string, unknown>[] } };
    const withEquip = (equip: unknown) =>
      deserialize(JSON.stringify({ ...ok, state: { ...ok.state, party: [{ ...ok.state.party[0], equip }] } }));
    expect(withEquip({ weapon: 'dotanuki' })).not.toBeNull();
    expect(withEquip({ weapon: 'kunai' })).toBeNull();
    expect(withEquip({ armor: 'dotanuki' })).toBeNull();
    expect(withEquip({ weapon: 'nope' })).toBeNull();
    expect(withEquip({ hat: 'sandogasa' })).toBeNull();
    expect(withEquip(null)).toBeNull();
  });

  it('所持品に装備品を入れられる', () => {
    const ok = JSON.parse(serialize(state())) as { state: Record<string, unknown> };
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, items: { dotanuki: 1 } } }))).not.toBeNull();
  });
});

describe('版 4（預かり）', () => {
  it('版 3 のセーブデータは預かりを空にして読む', () => {
    const v3state: Record<string, unknown> = { ...state() };
    delete v3state.storage;
    const data = deserialize(JSON.stringify({ version: 3, savedAt: '2026-10-31T00:00:00.000Z', state: v3state }));
    expect(data?.version).toBe(SAVE_VERSION);
    expect(data?.state.storage).toEqual({});
  });

  it('おかしな預かりのデータは読まない', () => {
    const ok = JSON.parse(serialize(state())) as { state: Record<string, unknown> };
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, storage: { nope: 1 } } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, storage: [] } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, storage: { dotanuki: 2 } } }))).not.toBeNull();
  });
});

describe('版 5（一時離脱の仲間）', () => {
  it('版 4 のセーブデータは一時離脱の仲間なしで読む', () => {
    const v4state: Record<string, unknown> = { ...state() };
    delete v4state.away;
    const data = deserialize(JSON.stringify({ version: 4, savedAt: '2026-10-31T00:00:00.000Z', state: v4state }));
    expect(data?.version).toBe(SAVE_VERSION);
    expect(data?.state.away).toEqual([]);
  });

  it('一時離脱の仲間（経験値・装備）を読み戻せ、おかしなデータは読まない', () => {
    const s = { ...state(), away: [createMember('kasumi', 15, { weapon: 'tekkokagi' })] };
    expect(deserialize(serialize(s))?.state.away).toEqual(s.away);
    const ok = JSON.parse(serialize(state())) as { state: Record<string, unknown> };
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, away: undefined } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, away: [{ id: 'nope', exp: 0, hp: 1, mp: 1, equip: {} }] } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...ok, state: { ...ok.state, away: [{ ...createMember('kasumi', 1), equip: { weapon: 'dotanuki' } }] } }))).toBeNull();
  });

  it('同じ人物の二重、一時離脱の主人公・ゲストは読まない。一時離脱の仲間の HP・MP も最大値に収める', () => {
    const ok = JSON.parse(serialize(state())) as { state: Record<string, unknown> & { party: unknown[] } };
    const withAway = (away: unknown[], party: unknown[] = ok.state.party) => deserialize(JSON.stringify({ ...ok, state: { ...ok.state, party, away } }));
    const kasumi = createMember('kasumi', 10);
    expect(withAway([kasumi])).not.toBeNull();
    expect(withAway([kasumi], [...ok.state.party, kasumi])).toBeNull();
    expect(withAway([kasumi, kasumi])).toBeNull();
    expect(withAway([createMember('hero', 1)])).toBeNull();
    expect(withAway([createMember('hyogo', 18)])).toBeNull();
    expect(withAway([{ ...kasumi, hp: 9999, mp: 9999 }])?.state.away[0]).toEqual(kasumi);
  });

  it('ゲスト（兵庫）がパーティーにいるセーブを読み戻せる', () => {
    const s = { ...state(), party: [...state().party, createMember('hyogo', 18)] };
    expect(deserialize(serialize(s))?.state).toEqual(s);
  });
});

describe('newGame', () => {
  it('旅立ちの道具を持って始まる', () => {
    expect(state().items).toEqual(STARTING_ITEMS);
  });
});

describe('版 6（序章〜第 5 章の町・ダンジョンの作り直し）', () => {
  const v5 = (mapId: string, x: number, y: number) =>
    deserialize(JSON.stringify({ version: 5, savedAt: '2026-10-31T00:00:00.000Z', state: { ...state(), mapId, x, y } }))?.state;

  it('版 5 で作り直したマップにいたら、旅籠の前へ移す（大坂の米蔵の岸＝用心棒の向こうにいた古いセーブも）', () => {
    expect(v5('osaka', 25, 5)).toMatchObject({ mapId: 'osaka', ...MAPS.osaka!.respawn });
    expect(v5('shimizu', 3, 4)).toMatchObject({ mapId: 'shimizu', ...MAPS.shimizu!.respawn });
  });

  it('ダンジョンにいたら、近くの町の旅籠の前へ移す', () => {
    expect(v5('komeKura', 10, 14)).toMatchObject({ mapId: 'osaka', ...MAPS.osaka!.respawn });
    expect(v5('kitsunebiCave', 10, 12)).toMatchObject({ mapId: 'shimizu', ...MAPS.shimizu!.respawn });
  });

  it('作り直していない第 6 章のマップの位置はそのまま（ワールドマップは版 7 で移す）', () => {
    expect(v5('hiroshima', 40, 13)).toMatchObject({ mapId: 'hiroshima', x: 40, y: 13 });
  });

  it('版 6 のセーブは、作り直したマップの中でもそのままの位置で読む', () => {
    const s = { ...state(), mapId: 'osaka', x: 26, y: 9 };
    expect(deserialize(serialize(s))?.state).toMatchObject({ mapId: 'osaka', x: 26, y: 9 });
  });

  it('作り直したマップの一覧は、どれも実在する', () => {
    for (const id of MAPS_REBUILT_IN_V6) expect(MAPS[id], id).toBeDefined();
  });
});

describe('版 7（ワールドマップを広げた）', () => {
  const v6 = (mapId: string, x: number, y: number) =>
    deserialize(JSON.stringify({ version: 6, savedAt: '2026-10-31T00:00:00.000Z', state: { ...state(), mapId, x, y } }))?.state;
  const town = (name: string) => MAPS.world!.towns!.find((t) => t.name === name)!;

  it('版 6 でワールドマップにいたら、古い座標でいちばん近い町の、新しい印の上へ移す', () => {
    // 清水湊の印の北（清水湊から出たところ）
    expect(v6('world', 41, 10)).toMatchObject({ mapId: 'world', x: town('清水湊').x, y: town('清水湊').y });
    // 名古屋と大井川の渡し場のあいだ
    expect(v6('world', 34, 10)).toMatchObject({ mapId: 'world', x: town('名古屋').x, y: town('名古屋').y });
    // 長崎の東
    expect(v6('world', 4, 16)).toMatchObject({ mapId: 'world', x: town('長崎').x, y: town('長崎').y });
  });

  it('古い町の一覧の名前は、どれも新しいワールドマップにあり、印の上は歩ける', () => {
    for (const t of WORLD_TOWNS_BEFORE_V7) {
      const now = town(t.name);
      expect(now, t.name).toBeDefined();
      expect(TILES[MAPS.world!.rows[now.y]![now.x]!]?.blocked, t.name).toBe(false);
    }
  });

  it('ワールドマップ以外のマップの位置はそのまま', () => {
    expect(v6('osaka', 26, 9)).toMatchObject({ mapId: 'osaka', x: 26, y: 9 });
  });
});
