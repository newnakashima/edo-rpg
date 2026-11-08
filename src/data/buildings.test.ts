import { describe, expect, it } from 'vitest';
import { buildingTown, townOf } from './buildings';
import { JINGI_REQUEST_KINDS, pendingJingiRequest } from './jingiRequests';
import { canStep, MAPS, tileAt, type MapDef } from './maps';
import { isMinka } from './minka';
import { OYABUN } from './oyabun';

/** (x, y) から、人と通れないマスを避けて歩いて行けるマス。 */
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

const buildings = Object.values(MAPS).filter((m) => buildingTown(m.id));

describe('施設・民家以外の建物の屋内（テストプレイの指摘: あらゆる建物に入れるようにすべき）', () => {
  // 屋内を足した町（町を足したらここにも足す）
  const TOWNS = ['shimizu', 'sunpu', 'nagoya', 'kyo', 'iga'];

  it.each(TOWNS)('%s の戸（D）はすべて入れる（民家か、建物ごとの屋内）', (townId) => {
    const town = MAPS[townId]!;
    town.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== 'D') return;
        const entrance = town.exits.find((e) => e.x === x && e.y === y);
        expect(entrance, `${x},${y}`).toBeDefined();
        expect(canStep(town, x, y), `${x},${y}`).toBe(true);
        expect(isMinka(entrance!.to) || buildingTown(entrance!.to) === townId, `${x},${y}`).toBe(true);
      }),
    );
    // 民家でない戸口の数だけ、その町の建物の屋内がある（戸口と屋内が 1 対 1）
    const doors = town.exits.filter((e) => town.rows[e.y]?.[e.x] === 'D' && !isMinka(e.to));
    const inside = buildings.filter((m) => buildingTown(m.id) === townId).map((m) => m.id);
    expect(doors.map((e) => e.to).sort()).toEqual(inside.sort());
  });

  it.each(TOWNS)('%s の施設の人は、町の通りではなく建物の中に立つ', (townId) => {
    const outside = MAPS[townId]!.npcs.filter((n) => n.action).map((n) => n.id);
    expect(outside).toEqual([]);
  });

  it('戸口から入ると出口の 1 マス奥に立ち、出口からはその戸口の前（通れて人のいないマス）へ戻る', () => {
    for (const map of buildings) {
      const town = MAPS[buildingTown(map.id)!]!;
      const entrance = town.exits.find((e) => e.to === map.id)!;
      expect(map.exits, map.id).toHaveLength(1);
      const exit = map.exits[0]!;
      expect({ to: exit.to, x: exit.toX, y: exit.toY }, map.id).toEqual({ to: town.id, x: entrance.x, y: entrance.y + 1 });
      expect({ x: entrance.toX, y: entrance.toY }, map.id).toEqual({ x: exit.x, y: exit.y - 1 });
      // 出口は下の壁の切れ目
      expect(exit.y, map.id).toBe(map.rows.length - 1);
      expect(tileAt(map, exit.x, exit.y)?.blocked, map.id).toBe(false);
      expect(town.npcs.some((n) => n.x === exit.toX && n.y === exit.toY), map.id).toBe(false);
    }
  });

  it('屋内の名前は町の名前つきで、全滅したら町と同じ戻り先へ戻る（ダンジョンではない）', () => {
    for (const map of buildings) {
      const town = MAPS[buildingTown(map.id)!]!;
      expect(map.name.startsWith(`${town.name}の`), map.id).toBe(true);
      expect(map.respawnMap, map.id).toBe(town.respawn ? town.id : town.respawnMap);
      expect(map.encounter, map.id).toBeUndefined();
    }
  });

  it('間取りは建物ごとに違う（使い回してよいのは民家だけ）', () => {
    expect(new Set(buildings.map((m) => m.rows.join('\n'))).size).toBe(buildings.length);
  });

  it('入ったところから、屋内の人と家具のすべてに話しかけられる', () => {
    for (const map of buildings) {
      const town = MAPS[buildingTown(map.id)!]!;
      const entrance = town.exits.find((e) => e.to === map.id)!;
      const area = reachable(map, { x: entrance.toX, y: entrance.toY });
      for (const n of map.npcs) {
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => area.has(`${n.x + dx!},${n.y + dy!}`));
        expect(near, `${map.id} ${n.id}`).toBe(true);
      }
    }
  });

  it('町の ID は、建物の中では出口の行き先の町、それ以外ではマップの ID のまま', () => {
    for (const map of buildings) expect(townOf(map.id), map.id).toBe(map.exits[0]!.to);
    for (const map of Object.values(MAPS).filter((m) => !buildingTown(m.id))) expect(townOf(map.id), map.id).toBe(map.id);
  });

  it('建物の中の施設の人も、町の ID（townOf）で施設の頼みと親分の屋敷を引ける（FieldScene の施設のメニュー）', () => {
    let checked = 0;
    for (const map of buildings) {
      for (const n of map.npcs) {
        const town = townOf(map.id);
        if ((JINGI_REQUEST_KINDS as readonly (string | undefined)[]).includes(n.action)) {
          expect(pendingJingiRequest(town, n.action as (typeof JINGI_REQUEST_KINDS)[number], {}), `${map.id} ${n.id}`).not.toBeNull();
          // 屋内のマップの ID のままでは引けない（町の ID に直す必要がある）
          expect(pendingJingiRequest(map.id, n.action as (typeof JINGI_REQUEST_KINDS)[number], {}), `${map.id} ${n.id}`).toBeNull();
          checked++;
        }
        if (n.action === 'oyabun') {
          expect(OYABUN[town], `${map.id} ${n.id}`).toBeDefined();
          checked++;
        }
      }
    }
    // 清水湊・駿府・名古屋・京・伊賀上野の賭場・居酒屋・妓楼・親分の屋敷（町を足すと増える）
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it('辰五郎とお凛は一家の屋敷の中にいる。辰五郎の話（序章の頼み）は屋敷に入って聞く', () => {
    const ids = MAPS.shimizuOyabun!.npcs.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['tatsugoro', 'orin', 'shimizuOyabun']));
    expect(MAPS.shimizu!.npcs.some((n) => ['tatsugoro', 'orin', 'shimizuOyabun'].includes(n.id))).toBe(false);
  });
});
