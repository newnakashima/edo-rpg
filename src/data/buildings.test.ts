import { describe, expect, it } from 'vitest';
import { buildingTown, townOf } from './buildings';
import { SHIMIZU_BUILDINGS } from './buildingsShimizu';
import { canStep, MAPS, tileAt } from './maps';
import { isMinka } from './minka';

const buildings = Object.values(MAPS).filter((m) => buildingTown(m.id));

describe('施設・民家以外の建物の屋内（テストプレイの指摘: あらゆる建物に入れるようにすべき）', () => {
  it('清水湊の戸（D）はすべて入れる（民家か、建物ごとの屋内）', () => {
    const town = MAPS.shimizu!;
    town.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== 'D') return;
        const entrance = town.exits.find((e) => e.x === x && e.y === y);
        expect(entrance, `${x},${y}`).toBeDefined();
        expect(canStep(town, x, y), `${x},${y}`).toBe(true);
        expect(isMinka(entrance!.to) || buildingTown(entrance!.to) === 'shimizu', `${x},${y}`).toBe(true);
      }),
    );
    expect(buildings.filter((m) => buildingTown(m.id) === 'shimizu')).toHaveLength(SHIMIZU_BUILDINGS.length);
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

  it('町の ID は、建物の中では建物のある町、それ以外ではマップの ID のまま', () => {
    expect(townOf('shimizuTobaku')).toBe('shimizu');
    expect(townOf('shimizu')).toBe('shimizu');
    expect(townOf('urayama')).toBe('urayama');
  });

  it('辰五郎とお凛は一家の屋敷の中にいる。辰五郎の話（序章の頼み）は屋敷に入って聞く', () => {
    const ids = MAPS.shimizuOyabun!.npcs.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['tatsugoro', 'orin', 'shimizuOyabun']));
    expect(MAPS.shimizu!.npcs.some((n) => ['tatsugoro', 'orin', 'shimizuOyabun'].includes(n.id))).toBe(false);
  });
});
