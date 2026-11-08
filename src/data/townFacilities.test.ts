import { describe, expect, it } from 'vitest';
import { MAPS } from './maps';
import { signKind, signPosition } from './signs';
import { TOWN_FACILITY_DOORS, TOWN_FACILITY_KINDS } from './townFacilities';

// 武器屋（刀鍛冶）か道具屋（よろず屋）のある町
const shopTowns = Object.values(MAPS).filter((m) => m.npcs.some((n) => n.action === 'shop' && /(Yorozu|Kaji)$/.test(n.shop ?? '')));

describe('湯屋・賭場・居酒屋・妓楼', () => {
  it('刀鍛冶かよろず屋のあるすべての町（15 町）に、4 つの施設が 1 つずつある。ほかのマップにはない', () => {
    expect(shopTowns.map((m) => m.id).sort()).toEqual(Object.keys(TOWN_FACILITY_DOORS).sort());
    expect(shopTowns).toHaveLength(15);
    for (const map of Object.values(MAPS)) {
      const kinds = map.npcs.map((n) => n.action).filter((a) => (TOWN_FACILITY_KINDS as readonly (string | undefined)[]).includes(a));
      expect(kinds.sort(), map.id).toEqual(TOWN_FACILITY_DOORS[map.id] ? [...TOWN_FACILITY_KINDS].sort() : []);
    }
  });

  it('施設の人は戸口の真下に立ち、看板はその戸の隣の壁に掛かる', () => {
    for (const map of shopTowns) {
      for (const npc of map.npcs.filter((n) => (TOWN_FACILITY_KINDS as readonly (string | undefined)[]).includes(n.action))) {
        expect(map.rows[npc.y - 1]?.[npc.x], `${map.id} ${npc.id}`).toBe('D');
        expect(signKind(npc), `${map.id} ${npc.id}`).toBe(npc.action);
        expect(signPosition(map, npc), `${map.id} ${npc.id}`).toEqual(expect.objectContaining({ y: npc.y - 1 }));
      }
    }
  });

  it('施設の戸は、ほかの施設の人やほかの町の人の戸口と重ならない（戸の前に別の人が立たない）', () => {
    for (const map of shopTowns) {
      for (const kind of TOWN_FACILITY_KINDS) {
        const door = TOWN_FACILITY_DOORS[map.id]![kind];
        const front = map.npcs.filter((n) => n.x === door.x && n.y === door.y + 1);
        expect(front.map((n) => n.action), `${map.id} ${kind}`).toEqual([kind]);
      }
    }
  });
});
