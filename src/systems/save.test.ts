import { describe, expect, it } from 'vitest';
import { STARTING_EQUIPMENT } from '../data/equipment';
import { newGame, STARTING_ITEMS } from './gameState';
import { createMember, memberLevel } from './party';
import { MAPS, TILES } from '../data/maps';
import { MAX_WARD_STEPS } from '../data/skills';
import { ITEMS } from '../data/items';
import { deserialize, EXPORT_FORMAT, exportFileName, exportText, importText, listSlots, writeSaveData, load, MAPS_REBUILT_IN_V6, MAPS_REMOVED_IN_V9, readSlot, save, SAVE_VERSION, serialize, SLOT_COUNT, slotKey, WORLD_TOWNS_BEFORE_V7, type KeyValueStorage } from './save';
import { JINGI_MAX, JINGI_START } from './jingi';

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

  it('魔除けの残りの歩数を読み戻せ（省いたセーブも読める）、多すぎる歩数は収め、負や小数の歩数は読まない', () => {
    const storage = memoryStorage();
    save(storage, 0, { ...state(), wardSteps: 42 });
    expect(load(storage, 0)?.state.wardSteps).toBe(42);
    save(storage, 1, state());
    expect(load(storage, 1)?.state.wardSteps).toBeUndefined();
    save(storage, 2, { ...state(), wardSteps: 9999 });
    expect(load(storage, 2)?.state.wardSteps).toBe(MAX_WARD_STEPS);
    // いちばん長く効く百目蝋燭（化け提灯のレアドロップ）を灯した直後の歩数も削らない
    const longest = Math.max(...Object.values(ITEMS).flatMap((i) => (i.effect.kind === 'ward' ? [i.effect.steps] : [])));
    expect(longest).toBe(MAX_WARD_STEPS);
    save(storage, 0, { ...state(), wardSteps: longest });
    expect(load(storage, 0)?.state.wardSteps).toBe(longest);
    for (const wardSteps of [-1, 1.5, '3']) {
      save(storage, 2, { ...state(), wardSteps: wardSteps as number });
      expect(load(storage, 2), String(wardSteps)).toBeNull();
    }
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
    expect(loaded?.state.party[0]).toMatchObject({ hp: 30, mp: 8 });
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
    expect(withAway([createMember('hyogo', 25)])).toBeNull();
    expect(withAway([{ ...kasumi, hp: 9999, mp: 9999 }])?.state.away[0]).toEqual(kasumi);
  });

  it('ゲスト（兵庫）がパーティーにいるセーブを読み戻せる', () => {
    const s = { ...state(), party: [...state().party, createMember('hyogo', 25)] };
    expect(deserialize(serialize(s))?.state).toEqual(s);
  });

  it('兵庫が Lv18 だったころのセーブは、読み込むと Lv25（今の guestLevel）になる。HP・MP はそのまま', () => {
    const old = createMember('hyogo', 18);
    const s = { ...state(), party: [...state().party, old] };
    const hyogo = deserialize(serialize(s))!.state.party[1]!;
    expect(memberLevel(hyogo)).toBe(25);
    expect(hyogo.hp).toBe(old.hp);
    expect(hyogo.mp).toBe(old.mp);
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

  it('版 5 以前のワールドマップのセーブも、版 6 を経て版 7 で移す', () => {
    const shimizu = town('清水湊');
    for (const version of [1, 5]) {
      const old = { ...state(), mapId: 'world', x: 41, y: 10 };
      const s = deserialize(JSON.stringify({ version, savedAt: '2026-10-31T00:00:00.000Z', state: old }))?.state;
      expect(s, `版 ${version}`).toMatchObject({ mapId: 'world', x: shimizu.x, y: shimizu.y });
    }
  });

  it('版 7 のセーブは、ワールドマップでもそのままの位置で読む', () => {
    const s = { ...state(), mapId: 'world', x: 110, y: 26 };
    expect(deserialize(serialize(s))?.state).toMatchObject({ mapId: 'world', x: 110, y: 26 });
  });

  it('ワールドマップ以外のマップの位置はそのまま', () => {
    expect(v6('osaka', 26, 9)).toMatchObject({ mapId: 'osaka', x: 26, y: 9 });
  });
});

describe('版 8（仁義ポイント）', () => {
  it('版 7 のセーブには仁義ポイントがないので、新しく始めたときと同じだけ持たせる', () => {
    const old: Record<string, unknown> = { ...state(), money: 120 };
    delete old.jingi;
    const s = deserialize(JSON.stringify({ version: 7, savedAt: '2026-10-31T00:00:00.000Z', state: old }))?.state;
    expect(s).toMatchObject({ money: 120, jingi: JINGI_START });
  });

  it('仁義ポイントは記録して読み戻せる', () => {
    expect(deserialize(serialize({ ...state(), jingi: 0 }))?.state.jingi).toBe(0);
    expect(deserialize(serialize({ ...state(), jingi: JINGI_MAX }))?.state.jingi).toBe(JINGI_MAX);
  });

  it('版 8 で仁義ポイントがない、負・小数・上限を超える記録は読まない', () => {
    const missing: Record<string, unknown> = { ...state() };
    delete missing.jingi;
    for (const st of [missing, { ...state(), jingi: -1 }, { ...state(), jingi: 1.5 }, { ...state(), jingi: JINGI_MAX + 1 }]) {
      expect(deserialize(JSON.stringify({ version: 8, savedAt: '2026-10-31T00:00:00.000Z', state: st })), String(st.jingi)).toBeNull();
    }
  });
});

describe('記録のファイル', () => {
  const data = () => ({ version: SAVE_VERSION, savedAt: '2026-10-31T00:00:00.000Z', state: { ...state(), money: 77 } });

  it('書き出したファイルを読み込むと同じ記録になり、記録した日時を変えずにスロットへ書き込める', () => {
    const text = exportText(data());
    expect(JSON.parse(text).format).toBe(EXPORT_FORMAT);
    const read = importText(text);
    expect(read).toEqual(data());
    const storage = memoryStorage();
    expect(writeSaveData(storage, 2, read!)).toBe(true);
    expect(load(storage, 2)).toEqual(data());
  });

  it('目印のないもの・壊れたもの・正しくない状態・未対応の版は読まない', () => {
    expect(importText(serialize(state()))).toBeNull();
    expect(importText('{broken')).toBeNull();
    expect(importText('null')).toBeNull();
    expect(importText(JSON.stringify({ format: 'other-game', ...data() }))).toBeNull();
    expect(importText(JSON.stringify({ format: EXPORT_FORMAT, ...data(), state: { ...state(), money: -1 } }))).toBeNull();
    expect(importText(JSON.stringify({ format: EXPORT_FORMAT, ...data(), version: SAVE_VERSION + 1 }))).toBeNull();
    for (const mapId of ['constructor', 'toString', 'nowhere']) {
      expect(importText(JSON.stringify({ format: EXPORT_FORMAT, ...data(), state: { ...state(), mapId } })), mapId).toBeNull();
    }
  });

  it('古い版のファイルも今の形に直して読む', () => {
    const v1: Record<string, unknown> = { ...state() };
    delete v1.items;
    const read = importText(JSON.stringify({ format: EXPORT_FORMAT, version: 1, savedAt: '2026-01-01T00:00:00.000Z', state: v1 }));
    expect(read?.version).toBe(SAVE_VERSION);
    expect(read?.state.items).toEqual(STARTING_ITEMS);
  });

  it('ファイル名はスロットを 1 から数え、端末の日時を付ける', () => {
    expect(exportFileName(0, new Date(2026, 10, 8, 9, 5))).toBe('edo-rpg-save-1-20261108-0905.json');
    expect(() => exportFileName(SLOT_COUNT)).toThrow(RangeError);
  });

  it('記録した日時が読めないときは、書き込んだ日時にする', () => {
    const storage = memoryStorage();
    expect(writeSaveData(storage, 0, { ...data(), savedAt: 'x' }, new Date('2026-11-08T00:00:00Z'))).toBe(true);
    expect(load(storage, 0)?.savedAt).toBe('2026-11-08T00:00:00.000Z');
  });

  it('書き込みに失敗したら false', () => {
    const failing = { ...memoryStorage(), setItem: () => { throw new Error('full'); } };
    expect(writeSaveData(failing, 0, data())).toBe(false);
  });
});

describe('版 9（金沢の湊の町家の戸を動かした）', () => {
  const v8 = (mapId: string, x: number, y: number) =>
    deserialize(JSON.stringify({ version: 8, savedAt: '2026-10-31T00:00:00.000Z', state: { ...state(), mapId, x, y } }))?.state;

  it('版 8 でなくした民家の中にいたら、その町の旅籠の前へ移す。ほかの場所はそのまま', () => {
    expect(v8('minka_kanazawa_6_21', 2, 9)).toMatchObject({ mapId: 'kanazawa', ...MAPS.kanazawa!.respawn });
    expect(v8('minka_kanazawa_52_21', 2, 9)).toMatchObject({ mapId: 'minka_kanazawa_52_21', x: 2, y: 9 });
  });

  it('なくしたマップは今はなく、移す先の町はある', () => {
    for (const [id, town] of Object.entries(MAPS_REMOVED_IN_V9)) {
      expect(MAPS[id], id).toBeUndefined();
      expect(MAPS[town]?.respawn, town).toBeDefined();
    }
  });
});
