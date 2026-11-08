import { describe, expect, it } from 'vitest';
import { newGame } from './gameState';
import { addJingi, JINGI_MAX, JINGI_START, oyabunStayCost, stayAtOyabun } from './jingi';
import { createMember, memberStats } from './party';
import { MAPS } from '../data/maps';
import { OYABUN } from '../data/oyabun';

const start = { mapId: 'shimizu', x: 1, y: 1 };

describe('仁義ポイント', () => {
  it('旅立ちのときは JINGI_START を持つ', () => {
    expect(newGame('m', start).jingi).toBe(JINGI_START);
    expect(JINGI_START).toBeGreaterThan(0);
  });

  it('増やしても減らしても 0〜100 に収まる', () => {
    const s = newGame('m', start);
    expect(JINGI_MAX).toBe(100);
    expect(addJingi(s, 5).jingi).toBe(JINGI_START + 5);
    expect(addJingi(s, 1000).jingi).toBe(100);
    expect(addJingi(s, -1000).jingi).toBe(0);
  });

  it('屋敷に泊まるのに使うポイントは、序盤の町 1・中盤 2・終盤 3（地域の敵レベルで分ける）', () => {
    expect(oyabunStayCost(1)).toBe(1);
    expect(oyabunStayCost(7)).toBe(1);
    expect(oyabunStayCost(10)).toBe(2);
    expect(oyabunStayCost(16)).toBe(2);
    expect(oyabunStayCost(19)).toBe(3);
    expect(oyabunStayCost(25)).toBe(3);
  });

  it('町の区分はユーザーの決定のとおり（序盤 = 清水湊・駿府・名古屋、中盤 = 京・伊賀上野・大坂、終盤 = 長崎・金沢・仙台・江戸、寄り道は付近の敵レベル）', () => {
    const cost = (id: string) => oyabunStayCost(MAPS[id]!.areaLevel);
    expect(['shimizu', 'sunpu', 'nagoya', 'hamamatsu'].map(cost)).toEqual([1, 1, 1, 1]);
    expect(['kyo', 'iga', 'osaka', 'hikone'].map(cost)).toEqual([2, 2, 2, 2]);
    expect(['hiroshima', 'nagasaki', 'kanazawa', 'sendai', 'edo', 'kumamoto', 'aizu'].map(cost)).toEqual([3, 3, 3, 3, 3, 3, 3]);
    // 屋敷のある町はすべて上のどれか
    expect(Object.keys(OYABUN)).toHaveLength(15);
  });

  it('泊まると全員の体力・気力が全回復し（戦闘不能も治る）、仁義ポイントを使う。お金は減らない', () => {
    const hero = { ...createMember('hero', 3), hp: 0, mp: 0 };
    const kasumi = { ...createMember('kasumi', 3), hp: 1, mp: 0 };
    const s = { ...newGame('m', start), money: 0, jingi: 5, party: [hero, kasumi] };
    const r = stayAtOyabun(s, 13);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cost).toBe(2);
    expect(r.state.jingi).toBe(3);
    expect(r.state.money).toBe(0);
    for (const m of r.state.party) {
      expect(m.hp).toBe(memberStats(m).maxHp);
      expect(m.mp).toBe(memberStats(m).maxMp);
    }
  });

  it('仁義ポイントが足りなければ泊まれない（ちょうどなら泊まれて 0 になる）', () => {
    const s = { ...newGame('m', start), jingi: 2 };
    expect(stayAtOyabun(s, 25)).toEqual({ ok: false, reason: 'jingi', cost: 3 });
    expect(stayAtOyabun({ ...s, jingi: 0 }, 1)).toEqual({ ok: false, reason: 'jingi', cost: 1 });
    const r = stayAtOyabun({ ...s, jingi: 3 }, 25);
    expect(r.ok && r.state.jingi).toBe(0);
  });
});
