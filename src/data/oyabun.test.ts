import { describe, expect, it } from 'vitest';
import { MAPS, tileAt } from './maps';
import { OYABUN, oyabunWelcome } from './oyabun';
import { signKind, signPosition } from './signs';
import { TOWN_FACILITY_DOORS } from './townFacilities';

const oyabunNpcs = (mapId: string) => MAPS[mapId]!.npcs.filter((n) => n.action === 'oyabun');

describe('親分の屋敷', () => {
  it('湯屋・賭場などと同じ 15 の町（刀鍛冶かよろず屋のある町）に 1 軒ずつある。ほかのマップにはない', () => {
    expect(Object.keys(OYABUN).sort()).toEqual(Object.keys(TOWN_FACILITY_DOORS).sort());
    for (const map of Object.values(MAPS)) expect(oyabunNpcs(map.id), map.id).toHaveLength(OYABUN[map.id] ? 1 : 0);
  });

  it('若い衆は屋敷の戸口の真下の通れるマスに立ち、「親」の看板がその戸の隣の壁に掛かる', () => {
    for (const [town, def] of Object.entries(OYABUN)) {
      const map = MAPS[town]!;
      const npc = oyabunNpcs(town)[0]!;
      expect(map.rows[def.door.y]?.[def.door.x], town).toBe('D');
      expect({ x: npc.x, y: npc.y }, town).toEqual({ x: def.door.x, y: def.door.y + 1 });
      expect(tileAt(map, npc.x, npc.y)?.blocked, town).toBe(false);
      expect(signKind(npc), town).toBe('oyabun');
      expect(signPosition(map, npc), town).toEqual(expect.objectContaining({ y: def.door.y }));
    }
  });

  it('屋敷の戸口はほかの施設・町の人と分けている（ほかの人が戸の前やすぐ横に立たず、看板も重ならない）', () => {
    for (const [town, def] of Object.entries(OYABUN)) {
      const map = MAPS[town]!;
      const npc = oyabunNpcs(town)[0]!;
      const near = map.npcs.filter((n) => n !== npc && Math.abs(n.x - def.door.x) <= 1 && (n.y === def.door.y || n.y === def.door.y + 1));
      expect(near.map((n) => n.id), town).toEqual([]);
      const mine = signPosition(map, npc)!;
      const others = map.npcs.filter((n) => n !== npc).map((n) => (n.action ? signPosition(map, n) : null));
      expect(others.some((p) => p?.x === mine.x && p.y === mine.y), town).toBe(false);
    }
  });

  it('屋敷はほかの施設や町の人の家と同じ建物にしない（屋根・壁・戸でつながった建物の戸は、屋敷の戸だけが使われている）', () => {
    for (const [town, def] of Object.entries(OYABUN)) {
      const map = MAPS[town]!;
      const seen = new Set<string>();
      const queue = [def.door];
      for (let p = queue.pop(); p; p = queue.pop()) {
        const key = `${p.x},${p.y}`;
        if (seen.has(key) || !'RWD'.includes(map.rows[p.y]?.[p.x] ?? '.')) continue;
        seen.add(key);
        queue.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
      }
      const doors = [...seen].map((k) => k.split(',').map(Number) as [number, number]).filter(([x, y]) => map.rows[y]![x] === 'D');
      const users = map.npcs.filter((n) => doors.some(([x, y]) => Math.abs(n.x - x) <= 1 && n.y === y + 1)).map((n) => n.id);
      expect(users, town).toEqual([`${town}Oyabun`]);
    }
  });

  it('若い衆は出口・乗るイベント・関所・入口の目印と重ならない', () => {
    for (const town of Object.keys(OYABUN)) {
      const map = MAPS[town]!;
      const at = oyabunNpcs(town)[0]!;
      const same = (p: { x: number; y: number }) => Math.floor(p.x) === at.x && p.y === at.y;
      expect(map.exits.some(same), town).toBe(false);
      expect((map.triggers ?? []).some(same), town).toBe(false);
      expect((map.gates ?? []).some(same), town).toBe(false);
      expect((map.marks ?? []).some((m) => Math.abs(m.x - at.x) < 1 && m.y === at.y), town).toBe(false);
    }
  });

  it('清水湊は辰五郎一家の屋敷で、辰五郎が殺されたあとは若い衆が世話をする', () => {
    const def = OYABUN.shimizu!;
    expect(def.family).toBe('辰五郎一家');
    expect(oyabunWelcome(def, {})).toMatch(/^辰五郎「/);
    expect(oyabunWelcome(def, { chapter3Cleared: true })).toMatch(/^若い衆「/);
    expect(oyabunWelcome(OYABUN.edo!, { chapter3Cleared: true })).toBe(OYABUN.edo!.welcome);
  });
});
