import { describe, expect, it } from 'vitest';
import { SHOPS } from '../data/shops';
import { newGame, type GameState } from './gameState';
import { createMember, memberStats } from './party';
import { buy, buyPrice, deposit, prayAtTemple, sell, sellPrice, templePrice, withdraw } from './shop';
import { isKnownItem } from '../data/items';

function game(over: Partial<GameState> = {}): GameState {
  return { ...newGame('m', { mapId: 'shimizu', x: 1, y: 1 }), items: {}, ...over };
}

describe('店', () => {
  it('店の品はすべて定義されている', () => {
    for (const shop of Object.values(SHOPS)) for (const id of shop.goods) expect(isKnownItem(id), id).toBe(true);
  });

  it('買うとお金が減り、所持品が増える', () => {
    const r = buy(game({ money: 100 }), 'kizugusuri', 3);
    expect(r.ok && r.state.money).toBe(100 - 8 * 3);
    expect(r.ok && r.state.items).toEqual({ kizugusuri: 3 });
    expect(buyPrice('dotanuki')).toBe(260);
  });

  it('お金が足りない、持ちきれないときは買わない', () => {
    expect(buy(game({ money: 7 }), 'kizugusuri')).toEqual({ ok: false, reason: 'money' });
    expect(buy(game({ money: 1000, items: { kizugusuri: 99 } }), 'kizugusuri')).toEqual({ ok: false, reason: 'full' });
    expect(buy(game({ money: 1000 }), 'nope')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('売値は買値の半額（切り捨て）で、持っていないものは売れない', () => {
    expect(sellPrice('mankintan')).toBe(20);
    expect(sellPrice('sandogasa')).toBe(10);
    const r = sell(game({ money: 0, items: { sandogasa: 1 } }), 'sandogasa');
    expect(r.ok && r.state.money).toBe(10);
    expect(r.ok && r.state.items).toEqual({});
    expect(sell(game(), 'sandogasa')).toEqual({ ok: false, reason: 'none' });
  });
});

describe('寺社のお祓い', () => {
  it('倒れた仲間を全員起こし、人数分の代金を取る', () => {
    const party = [createMember('hero', 1), { ...createMember('kasumi', 1), hp: 0, mp: 0 }, { ...createMember('gendo', 1), hp: 0 }];
    const r = prayAtTemple(game({ party, money: 100 }), 1);
    expect(r.ok && r.state.money).toBe(100 - templePrice(1) * 2);
    expect(r.ok && r.state.party[1]?.hp).toBe(memberStats(party[1]!).maxHp);
    expect(r.ok && r.state.party[1]?.mp).toBe(memberStats(party[1]!).maxMp);
  });

  it('倒れた仲間がいない、お金が足りないときは何もしない', () => {
    expect(prayAtTemple(game({ money: 100 }), 1)).toEqual({ ok: false, reason: 'none' });
    const party = [createMember('hero', 1), { ...createMember('kasumi', 1), hp: 0 }];
    expect(prayAtTemple(game({ party, money: 29 }), 1)).toEqual({ ok: false, reason: 'money' });
  });

  it('全員分を払えないときは、前の仲間から払える人数だけ起こす', () => {
    const party = [createMember('hero', 1), { ...createMember('kasumi', 1), hp: 0 }, { ...createMember('gendo', 1), hp: 0 }];
    const r = prayAtTemple(game({ party, money: 45 }), 1);
    expect(r.ok && r.revived).toBe(1);
    expect(r.ok && r.state.money).toBe(15);
    expect(r.ok && r.state.party.map((m) => m.hp > 0)).toEqual([true, true, false]);
    // ちょうど全員分
    expect(prayAtTemple(game({ party, money: 60 }), 1)).toMatchObject({ ok: true, revived: 2, state: { money: 0 } });
  });
});

describe('個数の検査', () => {
  it('1 以上の整数でない個数は扱わない', () => {
    const s = game({ money: 100, items: { kizugusuri: 2 }, storage: { kizugusuri: 2 } });
    for (const n of [0, -1, 1.5]) {
      expect(buy(s, 'kizugusuri', n)).toEqual({ ok: false, reason: 'unknown' });
      expect(sell(s, 'kizugusuri', n)).toEqual({ ok: false, reason: 'unknown' });
      expect(deposit(s, 'kizugusuri', n)).toEqual({ ok: false, reason: 'unknown' });
      expect(withdraw(s, 'kizugusuri', n)).toEqual({ ok: false, reason: 'unknown' });
    }
  });
});

describe('飛脚の預かり', () => {
  it('預けて引き出せる', () => {
    const d = deposit(game({ items: { kizugusuri: 2 } }), 'kizugusuri');
    expect(d.ok && [d.state.items, d.state.storage]).toEqual([{ kizugusuri: 1 }, { kizugusuri: 1 }]);
    if (!d.ok) return;
    const w = withdraw(d.state, 'kizugusuri');
    expect(w.ok && [w.state.items, w.state.storage]).toEqual([{ kizugusuri: 2 }, {}]);
  });

  it('持っていない、持ちきれないときは動かさない', () => {
    expect(deposit(game(), 'kizugusuri')).toEqual({ ok: false, reason: 'none' });
    expect(withdraw(game(), 'kizugusuri')).toEqual({ ok: false, reason: 'none' });
    expect(withdraw(game({ items: { kizugusuri: 99 }, storage: { kizugusuri: 1 } }), 'kizugusuri')).toEqual({ ok: false, reason: 'full' });
    expect(deposit(game({ items: { kizugusuri: 1 }, storage: { kizugusuri: 99 } }), 'kizugusuri')).toEqual({ ok: false, reason: 'full' });
  });
});
