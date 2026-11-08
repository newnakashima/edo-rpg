import { describe, expect, it } from 'vitest';
import {
  CHOHAN_BETS,
  chohanRollText,
  chohanWinnings,
  dangoPrice,
  drinkAtIzakaya,
  eatDango,
  gyoroPrice,
  innPrice,
  izakayaPrice,
  playChohan,
  reviveAfterDefeat,
  stayAtInn,
  takeBath,
  teahouseChoices,
  visitGyoro,
  yuyaPrice,
} from './facilities';
import { newGame } from './gameState';
import { createMember, memberStats } from './party';

const start = { mapId: 'shimizu', x: 1, y: 1 };

describe('施設', () => {
  it('茶屋のメニューは、品を売る店があれば「団子を食べる・品を買う・やめる」、なければ「団子を食べる・やめる」', () => {
    expect(teahouseChoices(true)).toEqual(['eat', 'buy', 'cancel']);
    expect(teahouseChoices(false)).toEqual(['eat', 'cancel']);
  });

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

  it('団子はお金が足りなければ食べられず、最大 HP を超えて回復しない', () => {
    expect(eatDango({ ...newGame('m', start), money: 5 }, 1)).toEqual({ ok: false, reason: 'money' });
    const r = eatDango({ ...newGame('m', start), money: 6, party: [{ ...createMember('hero', 1), hp: 29 }] }, 1);
    expect(r.ok && r.state.party[0]?.hp).toBe(30);
  });

  it('旅籠では MP も回復する', () => {
    const s = { ...newGame('m', start), money: 14, party: [{ ...createMember('hero', 1), mp: 0 }] };
    const r = stayAtInn(s, 1);
    expect(r.ok && r.state.party[0]?.mp).toBe(8);
  });

  it('全滅すると所持金が半分になり、旅籠の前で全回復する', () => {
    const s = { ...newGame('m', start), money: 51, party: [{ ...createMember('hero', 1), hp: 0 }] };
    const r = reviveAfterDefeat(s, { mapId: 'shimizu', x: 23, y: 5 });
    expect(r).toMatchObject({ money: 25, mapId: 'shimizu', x: 23, y: 5 });
    expect(r.party[0]?.hp).toBe(30);
  });
});

describe('湯屋・居酒屋・妓楼', () => {
  const party = () => [{ ...createMember('hero', 5), hp: 1, mp: 0 }, { ...createMember('kasumi', 5), hp: 0, mp: 0 }];
  const max = (i: number) => memberStats(party()[i]!);

  it('値段は docs/balance.md の「経済」のとおり（湯屋・居酒屋は 6 + 敵レベル × 2、妓楼は宿代の 3 倍）', () => {
    expect(yuyaPrice(1)).toBe(8);
    expect(izakayaPrice(25)).toBe(56);
    expect(gyoroPrice(1)).toBe(42);
    // 湯屋と居酒屋を合わせると、旅籠（体力・気力と戦闘不能も治す）より高い
    for (const lv of [1, 10, 25]) expect(yuyaPrice(lv) + izakayaPrice(lv)).toBeGreaterThan(innPrice(lv));
  });

  it('湯屋は体力だけ、居酒屋は気力だけ、妓楼は両方を最大まで戻す。戦闘不能は治さない', () => {
    const s = { ...newGame('m', start), money: 1000, party: party() };
    const bath = takeBath(s, 1);
    expect(bath.ok && bath.state.party.map((m) => [m.hp, m.mp])).toEqual([[max(0).maxHp, 0], [0, 0]]);
    const drink = drinkAtIzakaya(s, 1);
    expect(drink.ok && drink.state.party.map((m) => [m.hp, m.mp])).toEqual([[1, max(0).maxMp], [0, 0]]);
    const gyoro = visitGyoro(s, 1);
    expect(gyoro.ok && gyoro.state.party.map((m) => [m.hp, m.mp])).toEqual([[max(0).maxHp, max(0).maxMp], [0, 0]]);
    expect(gyoro.ok && gyoro.state.money).toBe(1000 - gyoroPrice(1));
  });

  it('お金が足りなければ入れない', () => {
    const s = { ...newGame('m', start), money: 7 };
    expect(takeBath(s, 1)).toEqual({ ok: false, reason: 'money' });
    expect(drinkAtIzakaya(s, 1)).toEqual({ ok: false, reason: 'money' });
    expect(visitGyoro({ ...s, money: 41 }, 1)).toEqual({ ok: false, reason: 'money' });
  });
});

describe('賭場の丁半', () => {
  // 1〜6 の目を出す乱数（randInt(1, 6) が n になる値）
  const die = (n: number) => (n - 1) / 6 + 0.01;
  const rolls = (...ns: number[]) => {
    let i = 0;
    return () => die(ns[i++]!);
  };
  const s = { ...newGame('m', start), money: 500 };

  it('目の和が偶数なら丁、奇数なら半。当たれば寺銭（勝ち分の 5%、切り捨て）を引いた額を得る', () => {
    const cho = playChohan(s, 100, 'cho', rolls(4, 6));
    expect(cho).toMatchObject({ ok: true, dice: [4, 6], win: true, gain: 95 });
    expect(cho.ok && cho.state.money).toBe(595);
    const lose = playChohan(s, 100, 'han', rolls(4, 6));
    expect(lose).toMatchObject({ ok: true, win: false, gain: -100 });
    expect(lose.ok && lose.state.money).toBe(400);
    expect(playChohan(s, 10, 'han', rolls(2, 5))).toMatchObject({ win: true, gain: 10 });
    expect(chohanWinnings(1000)).toBe(950);
  });

  it('持っている額より多くは張れない。張れる額は 10・100・1000 文', () => {
    expect(playChohan({ ...s, money: 99 }, 100, 'cho', rolls(1, 1))).toEqual({ ok: false, reason: 'money' });
    expect([...CHOHAN_BETS]).toEqual([10, 100, 1000]);
  });

  it('出目の読み上げ', () => {
    expect(chohanRollText([4, 6])).toBe('四・六の丁');
    expect(chohanRollText([5, 2])).toBe('五・二の半');
    expect(chohanRollText([3, 3])).toBe('三のぞろ目の丁');
  });

  it('36 通りの出目で平均すると、寺銭のぶん負ける（丁でも半でも張った額の 2.5%）', () => {
    for (const call of ['cho', 'han'] as const) {
      let total = 0;
      for (let a = 1; a <= 6; a++) {
        for (let b = 1; b <= 6; b++) {
          const r = playChohan(s, 100, call, rolls(a, b));
          if (r.ok) total += r.gain;
        }
      }
      expect(total / 36, call).toBe(-2.5);
    }
  });
});

