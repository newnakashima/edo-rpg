import { describe, expect, it } from 'vitest';
import { dangoPrice, eatDango, innPrice, reviveAfterDefeat, stayAtInn } from './facilities';
import { newGame } from './gameState';
import { createMember, memberStats } from './party';

const start = { mapId: 'shimizu', x: 1, y: 1 };

describe('施設', () => {
  it('値段は docs/balance.md の「経済」のとおり', () => {
    expect(innPrice(1)).toBe(14);
    expect(dangoPrice(1)).toBe(6);
  });

  it('旅籠に泊まると全回復し、宿代を払う', () => {
    const s = { ...newGame('m', start), money: 20, party: [{ ...createMember('hero', 2), hp: 0, mp: 0 }] };
    const r = stayAtInn(s, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.money).toBe(6);
    const m = r.state.party[0];
    expect(m?.hp).toBe(m && memberStats(m).maxHp);
  });

  it('お金が足りなければ泊まれない', () => {
    expect(stayAtInn({ ...newGame('m', start), money: 13 }, 1)).toEqual({ ok: false, reason: 'money' });
  });

  it('団子は最大 HP の 3 割を回復し、戦闘不能は治さない', () => {
    const hero = { ...createMember('hero', 1), hp: 1 };
    const fallen = { ...createMember('kasumi', 1), hp: 0 };
    const r = eatDango({ ...newGame('m', start), money: 6, party: [hero, fallen] }, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.money).toBe(0);
    expect(r.state.party[0]?.hp).toBe(1 + 9);
    expect(r.state.party[1]?.hp).toBe(0);
  });

  it('全滅すると所持金が半分になり、旅籠の前で全回復する', () => {
    const s = { ...newGame('m', start), money: 51, party: [{ ...createMember('hero', 1), hp: 0 }] };
    const r = reviveAfterDefeat(s, { mapId: 'shimizu', x: 23, y: 5 });
    expect(r).toMatchObject({ money: 25, mapId: 'shimizu', x: 23, y: 5 });
    expect(r.party[0]?.hp).toBe(30);
  });
});
