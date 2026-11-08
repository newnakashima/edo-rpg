import { describe, expect, it } from 'vitest';
import { canStep, MAPS, respawnPoint, tileAt, type MapDef } from './maps';
import { isMinka, MINKA_DOORS, MINKA_KINDS, minkaMapId } from './minka';
import { TOWN_FACILITY_DOORS } from './townFacilities';
import { OYABUN } from './oyabun';
import { fireAmong } from '../systems/fire';
import { buildingTown } from './buildings';

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

  it('寺社・城の戸口は民家にしない（出口のない戸には、今までどおり入れない。固有の屋内のある建物は、その屋内へ入る）', () => {
    // 寺社・城の建物の中は、民家の使い回しでなく建物ごとに固有のマップを作る（src/data/buildings.ts。清水湊の寺・駿府の浅間神社・名古屋の熱田神宮・京の五重塔の寺と八坂神社・伊賀上野の天神・大坂の天王寺・広島の寺・長崎の唐寺・金沢の寺町の三つの寺は済み、ほかは町ごとに足していく）
    const notMinka: Record<string, [number, number][]> = {
      shimizu: [[9, 4]], // 寺
      sunpu: [[7, 6]], // 浅間神社
      nagoya: [[47, 27]], // 熱田神宮
      kyo: [[21, 28], [48, 7]], // 五重塔の寺の本堂、八坂神社の社殿
      iga: [[25, 22]], // 上野天神の社殿
      osaka: [[42, 32]], // 天王寺の金堂
      hiroshima: [[15, 4]], // 城
      nagasaki: [[15, 8]], // 唐寺の本堂
      kanazawa: [[8, 35], [20, 35], [41, 35], [28, 13]], // 犀川の南の寺町、城
      kumamoto: [[18, 5]], // 城
    };
    for (const [townId, list] of Object.entries(notMinka)) {
      const town = MAPS[townId]!;
      for (const [x, y] of list) {
        expect(town.rows[y]?.[x], `${townId} ${x},${y}`).toBe('D');
        expect(MINKA_DOORS[townId]?.some((d) => d.x === x && d.y === y), `${townId} ${x},${y}`).toBeFalsy();
        const entrance = town.exits.find((e) => e.x === x && e.y === y);
        if (entrance) expect(buildingTown(entrance.to), `${townId} ${x},${y}`).toBe(townId);
        else expect(canStep(town, x, y), `${townId} ${x},${y}`).toBe(false);
      }
    }
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
    const residents = houses.flatMap((h) => h.npcs.filter((n) => n.sprite));
    expect(new Set(residents.map((r) => r.name)).size).toBeGreaterThanOrEqual(5);
    for (const house of houses) {
      for (const npc of house.npcs) {
        expect(npc.lines?.length, npc.id).toBeGreaterThan(0);
        expect(tileAt(house, npc.x, npc.y)?.blocked, npc.id).toBe(false);
      }
    }
  });

  it('敵地の伊賀者の里の家には住人がいない（旅人をもてなす町の住人は場面に合わない）。ほかの家には住人が 1 人いる', () => {
    for (const d of doors) {
      const house = MAPS[minkaMapId(d.town, d)]!;
      expect(house.npcs.filter((n) => n.sprite), house.id).toHaveLength(d.town === 'igaSato' ? 0 : 1);
    }
  });

  it('民家の名前は町の名前つき（セーブの一覧や入ったときの表示で、どの町の家か分かる）', () => {
    expect(MAPS[minkaMapId('shimizu', { x: 3, y: 20 })]!.name).toBe('駿河・清水湊の長屋');
  });

  it('農家の囲炉裏と、民家の竈は火の元（煙草の葉を吸える）', () => {
    const noka = houses.find((h) => h.name.endsWith('の農家'))!;
    const irori = noka.npcs.find((n) => n.object === 'irori')!;
    expect(fireAmong(noka.npcs, irori.x - 1, irori.y, {})).toBe(true);
    const nagaya = houses.find((h) => h.name.endsWith('の長屋'))!;
    const kamado = nagaya.npcs.find((n) => n.object === 'kamado')!;
    expect(fireAmong(nagaya.npcs, kamado.x - 1, kamado.y, {})).toBe(true);
  });

  it('民家で全滅したら、その町と同じ戻り先へ戻る（ダンジョンでもないので、抜け道などは使えない）', () => {
    for (const d of doors) {
      const house = MAPS[minkaMapId(d.town, d)]!;
      const town = MAPS[d.town]!;
      expect(house.encounter, house.id).toBeUndefined();
      expect(respawnPoint(house.id), house.id).toEqual(town.respawn ? { mapId: town.id, ...town.respawn } : respawnPoint(town.id));
    }
    // 伊賀者の里（ダンジョンの中の里）の家は、里と同じく伊賀上野へ戻る
    expect(respawnPoint(minkaMapId('igaSato', { x: 7, y: 14 })).mapId).toBe('iga');
  });
});
