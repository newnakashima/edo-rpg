import { describe, expect, it } from 'vitest';
import { MAPS, tileAt, type NpcDef } from './maps';
import { doorSignPosition, mapSigns, signKind, signPosition } from './signs';
import { TOWN_FACILITY_DOORS, TOWN_FACILITY_KINDS, type TownFacilityKind } from './townFacilities';
import { townOf } from './buildings';

const isFacility = (n: NpcDef) => (TOWN_FACILITY_KINDS as readonly (string | undefined)[]).includes(n.action);
/** 町と、その町の建物の中（src/data/buildings.ts）の人。 */
const townNpcs = (town: string) => Object.values(MAPS).filter((m) => townOf(m.id) === town).flatMap((m) => m.npcs);

// 武器屋（刀鍛冶）か道具屋（よろず屋）のある町（店の主人が建物の中にいる町も含める）
const shopTowns = [...new Set(Object.values(MAPS).filter((m) => m.npcs.some((n) => n.action === 'shop' && /(Yorozu|Kaji)$/.test(n.shop ?? ''))).map((m) => townOf(m.id)))].map(
  (id) => MAPS[id]!,
);

/** 施設の人の立つマップと人（店先に立つなら町、建物の中に立つなら屋内）と、屋内の入口（店先なら undefined）。 */
function place(town: string, kind: TownFacilityKind) {
  const door = TOWN_FACILITY_DOORS[town]![kind];
  const entrance = MAPS[town]!.exits.find((e) => e.x === door.x && e.y === door.y);
  const map = entrance ? MAPS[entrance.to]! : MAPS[town]!;
  return { door, map, npc: map.npcs.find((n) => n.action === kind)!, entrance };
}

describe('湯屋・賭場・居酒屋・妓楼', () => {
  it('刀鍛冶かよろず屋のあるすべての町（15 町）に、4 つの施設が 1 つずつある（町か、その町の建物の中）。ほかの町にはない', () => {
    expect(shopTowns.map((m) => m.id).sort()).toEqual(Object.keys(TOWN_FACILITY_DOORS).sort());
    expect(shopTowns).toHaveLength(15);
    for (const town of new Set(Object.keys(MAPS).map(townOf))) {
      const kinds = townNpcs(town).filter(isFacility).map((n) => n.action);
      expect(kinds.sort(), town).toEqual(TOWN_FACILITY_DOORS[town] ? [...TOWN_FACILITY_KINDS].sort() : []);
    }
  });

  it('施設の人は戸口の真下に立ち、看板はその戸の隣の壁に掛かる。建物の中にいる施設は、その戸口から入れて看板が戸の隣に掛かる', () => {
    for (const town of shopTowns) {
      for (const kind of TOWN_FACILITY_KINDS) {
        const { door, map, npc, entrance } = place(town.id, kind);
        const label = `${town.id} ${kind}`;
        expect(town.rows[door.y]?.[door.x], label).toBe('D');
        expect(npc, label).toBeDefined();
        expect(signKind(npc), label).toBe(kind);
        if (entrance) {
          expect(entrance.sign, label).toBe(kind);
          expect(mapSigns(town), label).toContainEqual({ ...doorSignPosition(town, door)!, kind });
        } else {
          expect({ x: npc.x, y: npc.y }, label).toEqual({ x: door.x, y: door.y + 1 });
          expect(signPosition(map, npc), label).toEqual(expect.objectContaining({ y: door.y }));
        }
      }
    }
  });

  it('施設の戸の真下に立つのは、その施設の人だけ（ほかの町の人が戸口をふさがない。建物の中の施設なら、戸の前に誰も立たない）', () => {
    for (const map of shopTowns) {
      for (const kind of TOWN_FACILITY_KINDS) {
        const { door, entrance } = place(map.id, kind);
        const front = map.npcs.filter((n) => n.x === door.x && n.y === door.y + 1);
        expect(front.map((n) => n.action), `${map.id} ${kind}`).toEqual(entrance ? [] : [kind]);
      }
    }
  });

  it('施設の人は通れるマスに立ち、出口・乗るイベント・関所・入口の目印と重ならない', () => {
    for (const town of shopTowns) {
      for (const kind of TOWN_FACILITY_KINDS) {
        const { map, npc: at } = place(town.id, kind);
        const label = `${town.id} ${kind}`;
        expect(tileAt(map, at.x, at.y)?.blocked, label).toBe(false);
        const same = (p: { x: number; y: number }) => Math.floor(p.x) === at.x && p.y === at.y;
        expect(map.exits.some(same), label).toBe(false);
        expect((map.triggers ?? []).some(same), label).toBe(false);
        expect((map.gates ?? []).some(same), label).toBe(false);
        expect((map.marks ?? []).some((m) => Math.abs(m.x - at.x) < 1 && m.y === at.y), label).toBe(false);
      }
    }
  });
});
