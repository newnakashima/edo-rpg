import { describe, expect, it } from 'vitest';
import { MAPS, tileAt } from './maps';
import { OYABUN, oyabunWelcome } from './oyabun';
import { doorSignPosition, mapSigns, signKind, signPosition } from './signs';
import { townOf } from './buildings';
import { TOWN_FACILITY_DOORS } from './townFacilities';

const oyabunNpcs = (mapId: string) => MAPS[mapId]!.npcs.filter((n) => n.action === 'oyabun');

/** その町の若い衆の立つマップ（店先に立つなら町、屋敷の中に立つなら屋内。src/data/buildings.ts）と、屋内の入口（店先なら undefined）。 */
function place(town: string) {
  const def = OYABUN[town]!;
  const entrance = MAPS[town]!.exits.find((e) => e.x === def.door.x && e.y === def.door.y);
  const map = entrance ? MAPS[entrance.to]! : MAPS[town]!;
  return { map, npc: oyabunNpcs(map.id)[0]!, entrance };
}

describe('親分の屋敷', () => {
  it('湯屋・賭場などと同じ 15 の町（刀鍛冶かよろず屋のある町）に 1 軒ずつある（町か、その町の屋敷の中）。ほかのマップにはない', () => {
    expect(Object.keys(OYABUN).sort()).toEqual(Object.keys(TOWN_FACILITY_DOORS).sort());
    const count: Record<string, number> = {};
    for (const map of Object.values(MAPS)) count[townOf(map.id)] = (count[townOf(map.id)] ?? 0) + oyabunNpcs(map.id).length;
    for (const [town, n] of Object.entries(count)) expect(n, town).toBe(OYABUN[town] ? 1 : 0);
  });

  it('若い衆は屋敷の戸口の真下の通れるマスに立つか、戸口から入る屋敷の中に立つ。「親」の看板がその戸の隣の壁に掛かる', () => {
    for (const [town, def] of Object.entries(OYABUN)) {
      const townMap = MAPS[town]!;
      const { map, npc, entrance } = place(town);
      expect(townMap.rows[def.door.y]?.[def.door.x], town).toBe('D');
      expect(npc, town).toBeDefined();
      expect(tileAt(map, npc.x, npc.y)?.blocked, town).toBe(false);
      expect(signKind(npc), town).toBe('oyabun');
      if (entrance) {
        expect(entrance.sign, town).toBe('oyabun');
        expect(mapSigns(townMap), town).toContainEqual({ ...doorSignPosition(townMap, def.door)!, kind: 'oyabun' });
      } else {
        expect({ x: npc.x, y: npc.y }, town).toEqual({ x: def.door.x, y: def.door.y + 1 });
        expect(signPosition(map, npc), town).toEqual(expect.objectContaining({ y: def.door.y }));
      }
    }
  });

  it('屋敷の戸口はほかの施設・町の人と分けている（ほかの人が戸の前やすぐ横に立たず、看板も重ならない）', () => {
    for (const [town, def] of Object.entries(OYABUN)) {
      const map = MAPS[town]!;
      const near = map.npcs.filter((n) => n.action !== 'oyabun' && Math.abs(n.x - def.door.x) <= 1 && (n.y === def.door.y || n.y === def.door.y + 1));
      expect(near.map((n) => n.id), town).toEqual([]);
      const signs = mapSigns(map);
      const mine = signs.filter((p) => p.kind === 'oyabun');
      expect(mine, town).toHaveLength(1);
      expect(signs.filter((p) => p.x === mine[0]!.x && p.y === mine[0]!.y), town).toHaveLength(1);
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
      // 戸を使っているのは、戸の前に立つ人と、戸に置いた屋内への入口
      const users = map.npcs.filter((n) => doors.some(([x, y]) => Math.abs(n.x - x) <= 1 && n.y === y + 1)).map((n) => n.id);
      const entrances = map.exits.filter((e) => doors.some(([x, y]) => e.x === x && e.y === y)).map((e) => e.to);
      expect([...users, ...entrances], town).toEqual([place(town).entrance ? place(town).map.id : `${town}Oyabun`]);
    }
  });

  it('若い衆は出口・乗るイベント・関所・入口の目印と重ならない', () => {
    for (const town of Object.keys(OYABUN)) {
      const { map, npc: at } = place(town);
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
