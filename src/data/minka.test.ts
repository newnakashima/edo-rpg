import { describe, expect, it } from 'vitest';
import { canStep, MAPS, tileAt, type MapDef } from './maps';
import { isMinka, MINKA_DOORS, MINKA_KINDS, minkaMapId } from './minka';
import { TOWN_FACILITY_DOORS } from './townFacilities';
import { OYABUN } from './oyabun';
import { fireAmong } from '../systems/fire';

const houses = Object.values(MAPS).filter((m) => isMinka(m.id));
const doors = Object.entries(MINKA_DOORS).flatMap(([town, list]) => list.map((door) => ({ town, ...door })));

/** 出口の 1 マス奥（入ったときに立つ場所）から歩いて行けるマス。 */
function reachable(map: MapDef, from: { x: number; y: number }): Set<string> {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  for (let p = queue.shift(); p; p = queue.shift()) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = p.x + dx;
      const y = p.y + dy;
      const key = `${x},${y}`;
      if (seen.has(key) || tileAt(map, x, y)?.blocked !== false || map.npcs.some((n) => n.x === x && n.y === y)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

describe('民家の屋内（テストプレイの指摘: あらゆる建物に入れるようにすべき）', () => {
  it('民家の戸口ごとに屋内マップが 1 つずつあり、町家・長屋・農家の 3 種類の間取りがすべて使われる', () => {
    expect(houses).toHaveLength(doors.length);
    for (const d of doors) expect(MAPS[minkaMapId(d.town, d)], `${d.town} ${d.x},${d.y}`).toBeDefined();
    expect(new Set(doors.map((d) => d.kind))).toEqual(new Set(MINKA_KINDS));
    // 間取りは 3 種類だけ（使い回してよいのは民家だけで、最低 3 種類の描き分け）
    expect(new Set(houses.map((h) => h.rows.join('\n'))).size).toBe(MINKA_KINDS.length);
  });

  it('民家の戸口は町の戸（D）で、前の 1 マスが通れて人がおらず、施設や親分の屋敷の戸口ではない', () => {
    for (const d of doors) {
      const town = MAPS[d.town]!;
      const label = `${d.town} ${d.x},${d.y}`;
      expect(town.rows[d.y]?.[d.x], label).toBe('D');
      expect(tileAt(town, d.x, d.y + 1)?.blocked, label).toBe(false);
      expect(town.npcs.some((n) => n.x === d.x && n.y === d.y + 1), label).toBe(false);
      expect(town.npcs.some((n) => n.action && n.x === d.x && n.y === d.y + 1), label).toBe(false);
      const facilities = Object.values(TOWN_FACILITY_DOORS[d.town] ?? {});
      expect(facilities.some((f) => f.x === d.x && f.y === d.y), label).toBe(false);
      expect(OYABUN[d.town] && OYABUN[d.town]!.door.x === d.x && OYABUN[d.town]!.door.y === d.y, label).toBeFalsy();
    }
  });

  it('戸口に歩いて入ると民家の中へ、民家の出口からはその戸口の前へ戻る', () => {
    for (const d of doors) {
      const town = MAPS[d.town]!;
      const label = `${d.town} ${d.x},${d.y}`;
      expect(canStep(town, d.x, d.y), label).toBe(true);
      const entrance = town.exits.find((e) => e.x === d.x && e.y === d.y)!;
      const house = MAPS[entrance.to]!;
      expect(house.id, label).toBe(minkaMapId(d.town, d));
      const exit = house.exits[0]!;
      expect(house.exits, label).toHaveLength(1);
      expect({ to: exit.to, x: exit.toX, y: exit.toY }, label).toEqual({ to: d.town, x: d.x, y: d.y + 1 });
      // 入ったときに立つ場所は出口のすぐ奥
      expect(Math.abs(entrance.toX - exit.x) + Math.abs(entrance.toY - exit.y), label).toBe(1);
    }
  });

  it('民家以外の戸口（出口のない戸）には、今までどおり入れない', () => {
    const shimizu = MAPS.shimizu!;
    const temple = { x: 9, y: 4 };
    expect(shimizu.rows[temple.y]?.[temple.x]).toBe('D');
    expect(canStep(shimizu, temple.x, temple.y)).toBe(false);
  });

  it('入ったところから、住人と家具のすべてに話しかけられる', () => {
    for (const house of houses) {
      const entrance = Object.values(MAPS)
        .flatMap((m) => m.exits)
        .find((e) => e.to === house.id)!;
      const open = reachable(house, { x: entrance.toX, y: entrance.toY });
      for (const npc of house.npcs) {
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => open.has(`${npc.x + dx!},${npc.y + dy!}`));
        expect(near, `${house.id} ${npc.id}`).toBe(true);
      }
      expect(open.has(`${house.exits[0]!.x},${house.exits[0]!.y}`), house.id).toBe(true);
    }
  });

  it('住人は戸口ごとに顔ぶれが変わり、町の人と同じく台詞を話す。家具は通れない床の上に置かない', () => {
    const residents = houses.map((h) => h.npcs.find((n) => n.sprite)!);
    expect(new Set(residents.map((r) => r.name)).size).toBeGreaterThanOrEqual(5);
    for (const house of houses) {
      for (const npc of house.npcs) {
        expect(npc.lines?.length, npc.id).toBeGreaterThan(0);
        expect(tileAt(house, npc.x, npc.y)?.blocked, npc.id).toBe(false);
      }
    }
  });

  it('農家の囲炉裏と、民家の竈は火の元（煙草の葉を吸える）', () => {
    const noka = houses.find((h) => h.name === '農家')!;
    const irori = noka.npcs.find((n) => n.object === 'irori')!;
    expect(fireAmong(noka.npcs, irori.x - 1, irori.y, {})).toBe(true);
    const nagaya = houses.find((h) => h.name === '長屋')!;
    const kamado = nagaya.npcs.find((n) => n.object === 'kamado')!;
    expect(fireAmong(nagaya.npcs, kamado.x - 1, kamado.y, {})).toBe(true);
  });

  it('民家で全滅したら、その町の戻り先へ戻る（ダンジョンでもないので、抜け道などは使えない）', () => {
    for (const d of doors) {
      const house = MAPS[minkaMapId(d.town, d)]!;
      expect(house.encounter, house.id).toBeUndefined();
      expect(house.respawnMap ?? MAPS[d.town]!.respawnMap, house.id).toBeDefined();
    }
  });
});
